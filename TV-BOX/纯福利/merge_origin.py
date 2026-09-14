#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 origin.json 中“有效且 testok.json 尚未包含”的站点合并进 testok.json。
- origin.json 是 JSONC(含 // 注释)，需先去注释再解析
- 有效性判定复用 prune_dead 的 decide() 逻辑：“明确失效才不算”
   死站判定: 本地 .py 脚本 MISSING / 全部真实 HTTP 4xx5xx / ext 文件缺失且无 URL
   其余(可达OK / 代理EOF / 通用FAIL / jar无ext / ext无URL / 本地脚本存在) -> 视为可加
- 去重: 与 testok.json 已有站点按 key / name / (http)api 完全一致判定为重复, 跳过
用法:
   python3 merge_origin.py            # 仅分析, 打印计划
   python3 merge_origin.py --apply    # 实际合并并写回 testok.json (先备份)
"""
import json, os, re, sys, ssl, time, argparse
import urllib.request, urllib.error
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

ssl._create_default_https_context = ssl._create_unverified_context

ORIGIN = "/home/daixiao/Data/MultiMedia/Tvbox/TV-BOX/纯福利/origin.json"
TESTOK = "/home/daixiao/Data/MultiMedia/Tvbox/TV-BOX/纯福利/testok.json"
PROXY  = "http://127.0.0.1:10808"
UA     = ("Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")


# ---------- JSONC 解析(支持 // 与 /* */ 注释, 忽略字符串内的 //) ----------
def jsonc_load(text):
    out, i, n = [], 0, len(text)
    in_str, q, esc = False, '', False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == q:
                in_str = False
            i += 1
            continue
        if c == '"' or c == "'":
            in_str, q = True, c
            out.append(c)
        elif c == '/' and i + 1 < n and text[i+1] == '/':
            while i < n and text[i] != '\n':
                i += 1
            continue
        elif c == '/' and i + 1 < n and text[i+1] == '*':
            i += 2
            while i + 1 < n and not (text[i] == '*' and text[i+1] == '/'):
                i += 1
            i += 2
            continue
        else:
            out.append(c)
        i += 1
    return json.loads(''.join(out))


# ---------- 网络探测 ----------
def fetch(url, timeout=12):
    if not url.isascii():
        url = quote(url, safe=':/?#@&=+$,%')
    last = None
    for attempt in range(2):
        try:
            if PROXY:
                op = urllib.request.build_opener(
                    urllib.request.ProxyHandler({'http': PROXY, 'https': PROXY}))
            else:
                op = urllib.request.build_opener()
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with op.open(req, timeout=timeout) as r:
                head = r.read(65536)
                return True, r.getcode(), head
        except urllib.error.HTTPError as e:
            return False, e.code, b''
        except Exception as e:
            last = type(e).__name__ + ":" + str(e)[:60]
            if attempt == 0:
                time.sleep(1)
    return False, last, b''


def urls_from_obj(d):
    out = []
    if isinstance(d, dict):
        items = list(d.items())
    elif isinstance(d, list):
        items = []
        for it in d:
            if isinstance(it, dict):
                items += list(it.items())
    else:
        return out
    for k, v in items:
        if isinstance(v, str):
            base = re.split(r'\{', v)[0]
            if re.match(r'https?://', base):
                out.append((k, base))
    return out


def urls_in_ext(ext_path):
    try:
        d = jsonc_load(open(ext_path, encoding='utf-8').read())
    except Exception:
        return []
    return urls_from_obj(d)


def collect(site, cfg_dir):
    """返回 [(name, kind, url)] 待探测项; 非 URL 类返回 CHECK 标记."""
    api  = site.get('api', '')
    name = site.get('name', site.get('key', ''))
    if api.startswith('http'):
        sep = '&' if '?' in api else '?'
        return [(name, 'A:http-api', api + sep + 'ac=detail&t=1&pg=1')]
    if api.startswith('csp') or site.get('jar'):
        ext = site.get('ext', '')
        if not ext:
            return [(name, 'B:jar-spider', 'NO-EXT')]
        if isinstance(ext, dict):
            us = urls_from_obj(ext)
            return [(name, 'B:jar-spider:' + k, u) for k, u in us] or \
                   [(name, 'B:jar-spider', 'NO-URL-IN-EXT')]
        if isinstance(ext, str):
            if ext.startswith('http'):
                return [(name, 'B:jar-spider(ext-url)', ext)]
            ep = os.path.join(cfg_dir, ext)
            if os.path.isfile(ep):
                return [(name, 'B:jar-spider:' + k, u) for k, u in urls_in_ext(ep)] or \
                       [(name, 'B:jar-spider', 'NO-URL-IN-EXT')]
            return [(name, 'B:jar-spider', 'MISSING:' + ep)]
        return [(name, 'B:jar-spider', 'BAD-EXT-TYPE')]
    if api.startswith('./') or api.startswith('../'):
        lp = os.path.join(cfg_dir, api)
        return [(name, 'C:py-spider', 'EXISTS' if os.path.isfile(lp) else 'MISSING:' + lp)]
    return [(name, 'unknown', api)]


def verdict_of(url):
    if url.startswith('MISSING'):   return 'MISSING'
    if url == 'NO-EXT':             return 'NOEXT'
    if url == 'EXISTS':             return 'EXISTS'
    if url.startswith('NO-URL'):    return 'NOURL'
    if url.startswith('BAD-EXT'):   return 'BAD'
    ok, st, _ = fetch(url)
    if ok:
        return 'OK'
    if isinstance(st, int):
        return 'HTTP%d' % st
    if 'UNEXPECTED_EOF' in str(st):
        return 'EOF'
    return 'FAIL'


def decide(verdicts):
    if 'MISSING' in verdicts:
        return False, '脚本缺失'
    if any(v == 'OK' for v in verdicts):
        return True, '有可用URL(200)'
    if 'EOF' in verdicts:
        return True, '代理TLS不可达(不确定)'
    if 'EXISTS' in verdicts:
        return True, '本地py脚本存在'
    if 'NOEXT' in verdicts:
        return True, 'jar无ext(不确定)'
    if 'NOURL' in verdicts:
        return True, 'ext无URL(不确定)'
    if any(v.startswith('HTTP') for v in verdicts):
        return False, '全部真实HTTP错误(4xx/5xx)'
    if any(v == 'FAIL' or v == 'BAD' for v in verdicts):
        return True, '通用网络失败(不确定, 同EOF)'
    return True, '其它'


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='实际写回 testok.json')
    args = ap.parse_args()

    origin = jsonc_load(open(ORIGIN, encoding='utf-8').read())
    testok = json.load(open(TESTOK, encoding='utf-8'))
    o_dir  = os.path.dirname(os.path.abspath(ORIGIN))
    t_dir  = os.path.dirname(os.path.abspath(TESTOK))
    osites = origin.get('sites', [])
    tsites = testok.get('sites', [])

    # 已有站点标识集合(去重用)
    exist_keys = {s.get('key') for s in tsites}
    exist_names = {s.get('name') for s in tsites}
    exist_httpapi = {s.get('api') for s in tsites
                     if isinstance(s.get('api'), str) and s['api'].startswith('http')}

    def is_dup(s):
        k, nm, api = s.get('key'), s.get('name'), s.get('api')
        if k in exist_keys:
            return True, 'key'
        if nm in exist_names:
            return True, 'name'
        if isinstance(api, str) and api.startswith('http') and api in exist_httpapi:
            return True, 'api'
        return False, ''

    # 分类
    dup, dead, add_candidates = [], [], []
    for s in osites:
        d, why = is_dup(s)
        if d:
            dup.append((s.get('name', s.get('key', '')), why))
            continue
        tasks = collect(s, o_dir)
        vs = [verdict_of(t[2]) for t in tasks]
        ok_flag, reason = decide(vs)
        if ok_flag:
            add_candidates.append((s, reason, vs))
        else:
            dead.append((s.get('name', s.get('key', '')), reason, vs))

    print(f"origin 站点: {len(osites)} | testok 已有: {len(tsites)}")
    print(f"重复(跳过): {len(dup)} | 明确失效(跳过): {len(dead)} | 待添加(有效/不确定): {len(add_candidates)}")
    print('=' * 72)
    print("【重复站点】")
    for nm, why in dup:
        print(f"  - {nm}  (匹配 {why})")
    print("【明确失效(不添加)】")
    for nm, reason, vs in dead:
        print(f"  - {nm} | {reason} | {vs}")
    print("【将添加】")
    for s, reason, vs in add_candidates:
        print(f"  + {s.get('name', s.get('key',''))} | {reason} | {vs}")

    if not args.apply:
        print('=' * 72)
        print("（dry-run, 未写回。加 --apply 执行实际合并）")
        return

    # 实际合并
    bak = TESTOK + '.bak_merge_' + time.strftime('%Y%m%d%H%M%S')
    import shutil
    shutil.copy2(TESTOK, bak)
    testok['sites'] = tsites + [s for s, _, _ in add_candidates]
    json.dump(testok, open(TESTOK, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print('=' * 72)
    print(f"已写回 testok.json: {len(tsites)} -> {len(testok['sites'])}")
    print(f"备份: {bak}")


if __name__ == '__main__':
    main()

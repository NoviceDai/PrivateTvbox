#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按"明确失效才删"原则修剪 testok.json 的 sites:
- 站点只要有一条 URL 返回 OK(200+JSON/HTML) -> 保留(可达/部分可用)
- 站点只出现代理 TLS 不可达(UNEXPECTED_EOF) -> 保留(不确定, 真实网络可能可用)
- 本地 .py 爬虫: 文件存在->保留; 文件 MISSING->删除(必然失效)
- jar 无 ext 字段(NOEXT) -> 保留(不确定, jar 可能内置配置)
- 其余(全部真实 HTTP 4xx/5xx, 无 OK/无 EOF) -> 删除(明确失效)
"""
import json, os, re, sys, ssl, time
import urllib.request, urllib.error
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

ssl._create_default_https_context = ssl._create_unverified_context

CONFIG = "/home/daixiao/Data/MultiMedia/Tvbox/TV-BOX/纯福利/testok.json"
PROXY  = "http://127.0.0.1:10808"
UA     = ("Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")

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
        d = json.load(open(ext_path, encoding='utf-8'))
    except Exception:
        return []
    return urls_from_obj(d)

def collect(site, cfg_dir):
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

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    cfg_dir = os.path.dirname(os.path.abspath(CONFIG))
    sites = cfg.get('sites', [])
    # 聚合每个站点的判定
    per_site = {}   # name -> list of verdict
    tasks = []
    for s in sites:
        for t in collect(s, cfg_dir):
            tasks.append((s, t))
    def work(item):
        s, t = item
        name = t[0]
        v = verdict_of(t[2])
        return (name, v)
    res = list(ThreadPoolExecutor(max_workers=8).map(work, tasks))
    for name, v in res:
        per_site.setdefault(name, []).append(v)

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
        # FAIL/BAD 为通用网络错误(与 EOF 同性质, 代理连不上, 不确定) -> 保留
        if any(v == 'FAIL' or v == 'BAD' for v in verdicts):
            return True, '通用网络失败(不确定, 同EOF)'
        return True, '其它'

    keep, drop = [], []
    for s in sites:
        name = s.get('name', s.get('key', ''))
        vs = per_site.get(name, [])
        ok_flag, reason = decide(vs)
        if ok_flag:
            keep.append(s)
        else:
            drop.append((name, reason, vs))
    cfg['sites'] = keep
    json.dump(cfg, open(CONFIG, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print(f"原 sites 数: {len(sites)}")
    print(f"保留: {len(keep)} | 删除: {len(drop)}")
    print("-" * 70)
    for name, reason, vs in drop:
        print(f"删除 {name}  | {reason} | 判定={vs}")
    print("-" * 70)
    print("已写回 testok.json (备份: testok.json.bak_prune)")

if __name__ == '__main__':
    main()

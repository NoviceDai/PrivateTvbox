#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 TVBox 配置文件中 sites 的有效性（连通性 + 接口结构校验）。
- 类型A(http api): 直接探测 {api}?ac=detail&t=1&pg=1，要求 HTTP200 且响应为 JSON(含 list/code)
- 类型B(jar爬虫 csp_*): 探测 ext json 内真实站点地址(分类url/url/搜索...)
- 类型C(本地 .py): 仅检查脚本文件是否存在
需本机 HTTP 代理(直连外网被墙)；按需修改 PROXY。
"""
import json, os, re, sys, ssl, time
import urllib.request, urllib.error
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

# 本机代理(10808)做 TLS 拦截，关闭证书校验以免误判失效
ssl._create_default_https_context = ssl._create_unverified_context

CONFIG = "/home/daixiao/Data/MultiMedia/Tvbox/TV-BOX/纯福利/testok.json"
PROXY  = "http://127.0.0.1:10808"     # 本机 HTTP 代理；若无需代理改为 None
UA     = ("Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 "
         "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")

def fetch(url, timeout=12):
    # GitHub raw 等路径可能含中文，需 quote 成 ascii 合法 URL
    if not url.isascii():
        url = quote(url, safe=':/?#@&=+$,%')
    last = None
    for attempt in range(2):                      # 代理偶发 TLS 中断，重试一次
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
    """从 dict/list 中提取所有 http(s) 地址（去掉 {占位符}）。"""
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
            base = re.split(r'\{', v)[0]          # 去掉 {cateId} 等占位符
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
        if isinstance(ext, dict):                 # ext 为内联 JSON 对象
            us = urls_from_obj(ext)
            return [(name, 'B:jar-spider:' + k, u) for k, u in us] or \
                   [(name, 'B:jar-spider', 'NO-URL-IN-EXT:inline')]
        if isinstance(ext, str):
            if ext.startswith('http'):
                return [(name, 'B:jar-spider(ext-url)', ext)]
            ep = os.path.join(cfg_dir, ext)
            if os.path.isfile(ep):
                return [(name, 'B:jar-spider:' + k, u) for k, u in urls_in_ext(ep)] or \
                       [(name, 'B:jar-spider', 'NO-URL-IN-EXT:' + ep)]
            return [(name, 'B:jar-spider', 'MISSING:' + ep)]
        return [(name, 'B:jar-spider', 'BAD-EXT-TYPE:' + type(ext).__name__)]
    if api.startswith('./') or api.startswith('../'):
        lp = os.path.join(cfg_dir, api)
        return [(name, 'C:py-spider', 'EXISTS' if os.path.isfile(lp) else 'MISSING:' + lp)]
    return [(name, 'unknown', api)]

def run(t):
    name, kind, url = t
    if url in ('EXISTS',) or url.startswith(('MISSING', 'NO-EXT', 'NO-URL')):
        return (name, kind, url, 'CHECK')
    ok, st, head = fetch(url)
    if ok:
        first = head.lstrip()[:1]
        verdict = 'OK' if first in (b'{', b'[') else 'OK:HTTP200(非JSON)'
    else:
        verdict = 'HTTP%d' % st if isinstance(st, int) else 'FAIL:' + str(st)
    return (name, kind, url[:58], verdict)

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    cfg_dir = os.path.dirname(os.path.abspath(CONFIG))
    tasks = [t for s in cfg.get('sites', []) for t in collect(s, cfg_dir)]
    rows, ok_n, fail_n = [], 0, 0
    for r in ThreadPoolExecutor(max_workers=8).map(run, tasks):
        rows.append(r)
        if r[3].startswith('OK'):
            ok_n += 1
        elif r[3] != 'CHECK':
            fail_n += 1
    print(f"{'站点':<16}{'类型':<18}{'探测地址':<60}判定")
    print('-' * 110)
    for r in rows:
        print(f"{r[0]:<14} {r[1]:<16} {r[2]:<58} {r[3]}")
    print('-' * 110)
    print(f"总计 {len(tasks)} 项 | 有效(OK类) {ok_n} | 失效/异常 {fail_n} | 仅文件检查 {sum(1 for x in rows if x[3]=='CHECK')}")

if __name__ == '__main__':
    main()

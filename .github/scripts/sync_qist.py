#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每日从 qist/tvbox 同步 tvboxconfig.json 中引用的本地文件（如 plugin/spider.jar、plugin/fan.txt）。

源目录：jar、xiaosa（在 qist/tvbox 的 master 分支下，可用环境变量 SRC_DIRS 调整，
空格分隔，靠前的目录优先；同名文件在多个源目录都存在时，取靠前的那个）。

逻辑：
  1. 解析 tvboxconfig.json，收集所有以 "./" 开头的本地引用（jar 字段与字符串型 ext 字段）。
  2. 对每个引用的文件名，按 SRC_DIRS 顺序到源仓对应目录下找同名文件。
  3. 比对本地文件与源文件的 SHA256：不同则覆盖本地并记录，相同则忽略。
  4. 有更新则追加写入 UPDATE_LOG.md。

用法：
  python3 sync_qist.py            # 实际同步并写盘
  python3 sync_qist.py --dry-run  # 只检查、打印将要更新的内容，不写盘
"""
import argparse
import json
import os
import sys
import hashlib
import datetime
import urllib.request

REPO_ROOT = os.environ.get("GITHUB_WORKSPACE") or os.getcwd()
CONFIG = os.path.join(REPO_ROOT, "tvboxconfig.json")
SRC_REPO = os.environ.get("SRC_REPO", "qist/tvbox")
SRC_BRANCH = os.environ.get("SRC_BRANCH", "master")
SRC_DIRS = [d.strip() for d in os.environ.get("SRC_DIRS", "jar xiaosa").split() if d.strip()]
LOG_FILE = os.path.join(REPO_ROOT, "UPDATE_LOG.md")
UA = "Mozilla/5.0 (compatible; sync-qist-bot/1.0)"


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def collect_refs():
    """从 tvboxconfig.json 收集所有以 ./ 开头的本地引用（去重保序）。"""
    with open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    refs = []
    for site in cfg.get("sites", []):
        for key in ("jar", "ext"):
            v = site.get(key)
            if isinstance(v, str) and v.strip().startswith("./"):
                refs.append(v.strip())
    seen, out = set(), []
    for r in refs:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def fetch_raw(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 200:
                return resp.read()
    except Exception:
        return None
    return None


def resolve_source(basename):
    """按 SRC_DIRS 顺序返回第一个命中的 (url, bytes)。"""
    for d in SRC_DIRS:
        url = "https://raw.githubusercontent.com/%s/%s/%s/%s" % (SRC_REPO, SRC_BRANCH, d, basename)
        data = fetch_raw(url)
        if data:
            return url, data
    return None, None


def safe_join(root, rel):
    """把配置里的 ./plugin/x 合并到仓库根，并确保不越界。"""
    rel = rel.lstrip("./")
    target = os.path.normpath(os.path.join(root, rel))
    root_norm = os.path.normpath(root)
    if not (target == root_norm or target.startswith(root_norm + os.sep)):
        return None
    return target


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只检查不写入")
    args = ap.parse_args()

    if not os.path.exists(CONFIG):
        print("未找到 %s，退出" % CONFIG)
        return 1

    refs = collect_refs()
    print("tvboxconfig.json 涉及的本地文件共 %d 个，源目录：%s" % (len(refs), ", ".join(SRC_DIRS)))

    changes, skipped = [], []
    for rel in refs:
        local = safe_join(REPO_ROOT, rel)
        if not local:
            print("[跳过] 非法路径: %s" % rel)
            continue
        basename = os.path.basename(rel)
        url, data = resolve_source(basename)
        if not data:
            print("[跳过] 源仓未找到: %s (在 %s)" % (rel, ", ".join(SRC_DIRS)))
            skipped.append(rel)
            continue
        old_hash = sha256_file(local) if os.path.exists(local) else None
        new_hash = sha256_bytes(data)
        if old_hash == new_hash:
            print("[无变化] %s" % rel)
            continue
        if args.dry_run:
            print("[dry-run] 将更新 %s <- %s (%d B)" % (rel, url, len(data)))
            changes.append((rel, url, len(data), old_hash, new_hash))
            continue
        os.makedirs(os.path.dirname(local), exist_ok=True)
        with open(local, "wb") as f:
            f.write(data)
        changes.append((rel, url, len(data), old_hash, new_hash))
        print("[更新] %s <- %s (%d B)" % (rel, url, len(data)))

    if changes and not args.dry_run:
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("\n## %s\n\n" % now)
            f.write("同步自 `%s@%s`（源目录：%s）\n\n" % (SRC_REPO, SRC_BRANCH, ", ".join(SRC_DIRS)))
            for rel, url, size, old, new in changes:
                f.write("- `%s` <- %s  (%d B)\n" % (rel, url, size))
                f.write("  - 旧SHA: `%s`\n" % (old or "（新增）"))
                f.write("  - 新SHA: `%s`\n" % new)
        print("\n共更新 %d 个文件，已记录到 %s" % (len(changes), LOG_FILE))
    elif changes and args.dry_run:
        print("\n[dry-run] 共 %d 个文件需要更新（未写入）" % len(changes))
    else:
        print("\n无文件需要更新，忽略")

    if skipped:
        print("（另有 %d 个引用在源目录未找到，已跳过：%s）" % (len(skipped), ", ".join(skipped)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

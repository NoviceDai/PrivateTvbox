# 项目记忆

## 环境配置

### Git 代理
- `127.0.0.1:10808` 是 **HTTP 代理**（非 SOCKS5）。验证：`curl -x http://127.0.0.1:10808` 可达；`--socks5` 失败。
- git 全局 `http.proxy` / `https.proxy` = `http://127.0.0.1:10808`（正确，HTTPS 推送可用）。
- SSH 推送 github 走 `~/.ssh/config` 的 `ProxyCommand connect ...`。原配置错写成 `connect -S`（SOCKS 模式），导致 SSH 推送失败。已修正为 `connect -H`（HTTP CONNECT）。\n- **完整可用配置**（2026-07-18 修正）：\n  ```\n  Host github.com\n      Hostname ssh.github.com\n      Port 443\n      User git\n      ProxyCommand connect -H 127.0.0.1:10808 %h %p\n  ```\n  关键两点：`connect -H`（HTTP 代理非 SOCKS）+ `Port 443`（GitHub 的 ssh.github.com 必须走 443，22 端口握手会被远端关闭）。\n- 验证：`ssh -T git@github.com` 返回 `Hi NoviceDai! ... authenticated`；`git ls-remote origin` 正常。
- 设置/纠正日期：2026-07-18

### CodeBuddy 自定义模型
- 本地 Ollama 模型配置：`~/.codebuddy/models.json`
- 模型：qwen3.5:9b，服务地址 `http://localhost:11434/v1/chat/completions`
- 配置日期：2026-07-08

# Cnmd

基于 [Oxichrome](https://crates.io/crates/oxichrome) 与 Leptos 的 Chromium 扩展。打开本地 `file://` 下的 `.md` / `.markdown` 时，**在当前标签页内**替换为可阅读的渲染视图（思路与 [md-reader](https://github.com/md-reader/md-reader) 一致：不单独打开扩展选项页，而是就地改写页面）。

渲染在页面内通过 **content script** 完成：使用 [marked](https://github.com/markedjs/marked) 解析 Markdown，[DOMPurify](https://github.com/cure53/DOMPurify) 消毒 HTML。

## 依赖

- Rust（stable）、目标 `wasm32-unknown-unknown`
- [`cargo-oxichrome`](https://crates.io/crates/cargo-oxichrome)：`cargo install cargo-oxichrome`
- **`jq`**：`brew install jq`（用于合并 manifest）

## 构建

```sh
cargo oxichrome build
./scripts/merge-manifest.sh
```

`oxichrome` 生成的 `manifest.json` 需与 [`manifest.fragment.json`](manifest.fragment.json) 合并（`host_permissions`、`content_scripts`）。请运行 [`scripts/merge-manifest.sh`](scripts/merge-manifest.sh)。

样式写在 [`static/md_viewer.css`](static/md_viewer.css)；构建前由 [`scripts/embed_md_viewer_css.py`](scripts/embed_md_viewer_css.py) 写入 [`static/md_file_inject.js`](static/md_file_inject.js) 内的 `const CSS`（`file://` 页的 content script 无法可靠地 `fetch`/外链扩展 CSS）。[`scripts/build.sh`](scripts/build.sh) 已包含该步骤。

发布可加 `--release`。

## 安装与权限

1. `chrome://extensions` → 开发者模式 → **加载已解压的扩展程序** → 选择 **`dist/chromium/`**。
2. 在扩展详情中开启 **「允许访问文件网址」**，否则无法在本地 Markdown 页注入脚本。

## 使用

- 用 Chrome **直接打开**本地 Markdown 文件（地址栏为 `file:///.../xxx.md`），页面会自动变为带右上角菜单的阅读视图。
- 左侧 **大纲**：贴窗口左缘、与视口同高；与正文之间无空隙，中间 **竖条分隔** 可左右拖拽调整侧栏宽度（宽度会记入 `localStorage`）。有标题时按 `h1`–`h6` 列出并可点击跳转；无标题时按正文顶层块生成导航；滚动时高亮当前节。
- 菜单：**打开文件**（本页重新选择/拖拽文件）、**清理**（刷新标签页恢复浏览器默认展示）、**显示原文** / **显示预览**（原文为未渲染的纯文本）。

若系统将 `.md` 设为下载而非在标签页打开，扩展无法生效。

## 仓库中的静态脚本

- [`static/marked.min.js`](static/marked.min.js)、[`static/purify.min.js`](static/purify.min.js)：自 jsDelivr 拉取的构建产物。
- [`static/md_file_inject.js`](static/md_file_inject.js)：入口逻辑（构建时嵌入 `const CSS`）。
- [`static/md_viewer.css`](static/md_viewer.css)：阅读页样式源文件；修改后运行 `python3 scripts/embed_md_viewer_css.py` 或使用 [`scripts/build.sh`](scripts/build.sh)。

## 许可证

以各依赖为准；扩展业务代码以本仓库为准。

# Catch Nothing Markdown

基于 [Oxichrome](https://crates.io/crates/oxichrome) 与 Leptos 的 Chromium 扩展。打开本地 `file://` 下的 `.md` / `.markdown` 时，**在当前标签页内**替换为可阅读的渲染视图（思路与 [md-reader](https://github.com/md-reader/md-reader) 一致：不单独打开扩展选项页，而是就地改写页面）。

Markdown 阅读器的 **交互与渲染**（菜单、侧栏、大纲、拖拽调整宽度、`marked` + DOMPurify 等）均在 [`vue-md-viewer/`](vue-md-viewer/) 中用 Vue 3 实现；扩展侧的 content script 仅为打包产物 [`static/cnmd_viewer.js`](static/cnmd_viewer.js)，其入口 [`extension-entry.ts`](vue-md-viewer/src/extension-entry.ts) 负责：判断 `file://` + `.md`、从原始页面读出正文文本、写入 `<head>`（含内联 [`static/md_viewer.css`](static/md_viewer.css)）、挂载 Vue 应用。

## 依赖

- Rust（stable）、目标 `wasm32-unknown-unknown`
- [`cargo-oxichrome`](https://crates.io/crates/cargo-oxichrome)：`cargo install cargo-oxichrome`
- **`jq`**：`brew install jq`（用于合并 manifest）
- **Node.js**（建议 18+）：构建阅读器脚本（[`vue-md-viewer/package.json`](vue-md-viewer/package.json)）

## 构建

**macOS / Linux**：一键脚本在 [`scripts/unix/build.sh`](scripts/unix/build.sh)（先打 Vue 扩展包，再编译扩展并合并 manifest）。

```sh
./scripts/unix/build.sh
```

**Windows**：[`scripts/windows/build.bat`](scripts/windows/build.bat) 或 PowerShell [`scripts/windows/build.ps1`](scripts/windows/build.ps1)。

```bat
scripts\windows\build.bat
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\build.ps1
```

或手动：

```sh
(cd vue-md-viewer && npm install && npm run build:extension)
cargo oxichrome build
./scripts/unix/merge-manifest.sh
bash ./scripts/unix/patch-background-dir-fetch.sh
```

`oxichrome` 生成的 `manifest.json` 需与 [`manifest.fragment.json`](manifest.fragment.json) 合并（见 [`scripts/unix/merge-manifest.sh`](scripts/unix/merge-manifest.sh)）。合并后需运行 [`scripts/unix/patch-background-dir-fetch.sh`](scripts/unix/patch-background-dir-fetch.sh)（Windows 为 [`scripts/windows/patch-background-dir-fetch.bat`](scripts/windows/patch-background-dir-fetch.bat) / [`.ps1`](scripts/windows/patch-background-dir-fetch.ps1)），在 service worker 中注册对 `file://` 的 `fetch` 转发（content script 无法直接 `fetch` 目录页）；补丁内容与 [`scripts/sw-fetch-prelude.js`](scripts/sw-fetch-prelude.js) 一并写入 background。一键构建脚本已包含上述步骤。Content script 仅加载 **`cnmd_viewer.js`**（内含 Vue + marked + DOMPurify）。

发布可加 `--release`。

## 安装与权限

1. `chrome://extensions` → 开发者模式 → **加载已解压的扩展程序** → 选择 **`dist/chromium/`**。
2. 在扩展详情中开启 **「允许访问文件网址」**，否则无法在本地 Markdown 页注入脚本。

## 使用

- 用 Chrome **直接打开**本地 Markdown 文件（地址栏为 `file:///.../xxx.md`），页面会自动变为带右上角菜单的阅读视图。
- 左侧 **大纲**：贴窗口左缘、与视口同高；与正文之间无空隙，中间 **竖条分隔** 可左右拖拽调整侧栏宽度（宽度会记入 `localStorage`）。有标题时按 `h1`–`h6` 列出并可点击跳转；无标题时按正文顶层块生成导航；滚动时高亮当前节。
- 菜单：**打开文件**（本页重新选择/拖拽文件）、**显示原文** / **显示预览**（原文为未渲染的纯文本）。

若系统将 `.md` 设为下载而非在标签页打开，扩展无法生效。

## 仓库中的静态资源

- [`static/md_viewer.css`](static/md_viewer.css)：阅读页样式源文件；由 Vue 扩展构建通过 `?raw` 打进 `cnmd_viewer.js`。**修改样式后请在 `vue-md-viewer` 目录执行 `npm run build:extension`**（或使用 `./scripts/unix/build.sh` / `scripts\windows\build.bat`）。
- [`static/cnmd_viewer.js`](static/cnmd_viewer.js)：由 `vue-md-viewer` 产出（勿手改）；构建命令见上。
- [`vue-md-viewer/`](vue-md-viewer/)：阅读器源码；本地调试：`npm install && npm run dev`。

## 许可证

以各依赖为准；扩展业务代码以本仓库为准。

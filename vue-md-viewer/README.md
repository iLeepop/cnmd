# Cnmd — Markdown 阅读器（Vue）

与 Chromium 扩展共用一套 UI：**菜单、打开文件、源码/预览切换、侧栏与大纲、分隔条拖拽** 以及 **marked + DOMPurify 渲染** 均在此项目中开发。

## 命令

```sh
npm install
npm run dev
```

本地开发与扩展一致的行为（同一套 `MarkdownViewer.vue`）。

```sh
npm run build:extension
```

将 **`extension-entry.ts`** 与 Vue 应用打成单个 **IIFE**，输出到仓库根目录 [`../static/cnmd_viewer.js`](../static/cnmd_viewer.js)，供 [`manifest.fragment.json`](../manifest.fragment.json) 作为唯一 content script 加载。构建时会通过 `?raw` 内联 [`../static/md_viewer.css`](../static/md_viewer.css)。

仓库根目录 [`scripts/unix/build.sh`](../scripts/unix/build.sh)（Windows：[`scripts/windows/build.bat`](../scripts/windows/build.bat)）会先执行本命令再 `cargo oxichrome build`。

## 架构说明

| 位置 | 职责 |
|------|------|
| [`src/extension-entry.ts`](src/extension-entry.ts) | 扩展入口：校验 `file://` + `.md`，读取页面正文为 Markdown，装配 `<head>` 与样式，挂载 [`MdViewerApp.vue`](src/MdViewerApp.vue)。 |
| [`src/MarkdownViewer.vue`](src/MarkdownViewer.vue) | 全部交互与正文展示逻辑。 |
| [`src/fragments/`](src/fragments/) | 菜单下拉、打开文件面板等子组件。 |

## 许可证

以仓库根目录说明为准。

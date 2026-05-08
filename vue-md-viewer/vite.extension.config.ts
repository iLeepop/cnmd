import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 单个 IIFE，供 Chromium content script 加载（内含 Vue + marked + DOMPurify + 阅读器 UI）。
 * 注意：lib 模式会把 .vue 里的 <style> 抽到独立 CSS 文件，扩展入口只内联了 md_viewer.css?raw，
 * 因此组件样式须放进 static/md_viewer.css，否则生产环境不生效。
 */
export default defineConfig({
  plugins: [vue()],
  define: {
    // 扩展页面无 Node 的 process；Vue / 依赖里常有 process.env.NODE_ENV 分支
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    emptyOutDir: false,
    outDir: path.resolve(__dirname, "../static"),
    lib: {
      entry: path.resolve(__dirname, "src/extension-entry.ts"),
      name: "CnmdViewer",
      formats: ["iife"],
      fileName: () => "cnmd_viewer.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

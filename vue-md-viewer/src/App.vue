<script setup lang="ts">
import { ref } from "vue";
import MdViewerApp from "./MdViewerApp.vue";

const md = ref(`# Vue 内开发

在 **vue-md-viewer** 中调试菜单、侧栏、大纲与 Markdown 渲染；扩展构建产物为仓库 \`static/cnmd_viewer.js\`。

- 列表项 A
- 列表项 B

\`\`\`js
console.log("preview");
\`\`\`
`);
const title = ref("preview.md");
</script>

<template>
  <MdViewerApp :initial-markdown="md" :initial-title="title" />
</template>

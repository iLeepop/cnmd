<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  close: [];
  loaded: [text: string, fileName: string];
}>();

const dzActive = ref(false);

function loadFile(file: File | undefined) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    emit("loaded", String(reader.result ?? "").replace(/\r\n/g, "\n"), file.name);
  };
  reader.readAsText(file);
}

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("cnmd-open-file-panel")) {
    emit("close");
  }
}
</script>

<template>
  <div class="cnmd-open-file-panel" @click="onBackdropClick">
    <div
      class="cnmd-dropzone"
      :class="{ 'cnmd-dropzone-active': dzActive }"
      @click.stop
      @dragover.prevent="dzActive = true"
      @dragleave.prevent="dzActive = false"
      @drop.prevent="
        dzActive = false;
        loadFile($event.dataTransfer?.files?.[0]);
      "
    >
      <p>将 Markdown 文件拖到此处，或点击下方按钮选择。</p>
      <label class="cnmd-btn cnmd-btn-primary"
        >选择文件
        <input
          type="file"
          class="cnmd-file-input"
          accept=".md,.markdown,text/markdown"
          @change="
            loadFile(($event.target as HTMLInputElement).files?.[0]);
            (($event.target as HTMLInputElement).value = '');
          "
        />
      </label>
      <div><button type="button" class="cnmd-btn" @click="$emit('close')">关闭</button></div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    srcLabel?: string;
  }>(),
  { srcLabel: "显示原文" }
);

defineEmits<{
  close: [];
  openFile: [];
  openTheme: [];
  toggleSource: [];
}>();
</script>

<template>
  <div class="cnmd-menu-backdrop" @click="$emit('close')"></div>
  <nav class="cnmd-menu-dropdown">
    <button type="button" class="cnmd-menu-item" @click="$emit('openFile')">打开文件</button>
    <button type="button" class="cnmd-menu-item" @click="$emit('openTheme')">主题</button>
    <button type="button" class="cnmd-menu-item" @click="$emit('toggleSource')">
      {{ srcLabel }}
    </button>
  </nav>
</template>

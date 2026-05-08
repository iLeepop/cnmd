<script setup lang="ts">
import { ref, watch } from "vue";
import MarkdownViewer from "./MarkdownViewer.vue";

const props = defineProps<{
  initialMarkdown: string;
  initialTitle: string;
}>();

const markdown = ref(props.initialMarkdown);
const displayName = ref(props.initialTitle);

watch(
  () => props.initialMarkdown,
  (v) => {
    markdown.value = v;
  }
);
watch(
  () => props.initialTitle,
  (v) => {
    displayName.value = v;
  }
);

watch(
  displayName,
  (t) => {
    document.title = t;
  },
  { immediate: true }
);
</script>

<template>
  <MarkdownViewer v-model:markdown="markdown" v-model:display-name="displayName" />
</template>

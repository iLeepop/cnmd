<script setup lang="ts">
import { computed, inject } from "vue";
import {
  CNMD_DIR_TREE_KEY,
  joinDir,
  type CnmdDirTreeApi,
  type DirEntry,
} from "../cnmd-dir-tree";
import DirectoryTreeRows from "./DirectoryTreeRows.vue";

const props = defineProps<{
  parentPath: string;
  entries: DirEntry[];
  depth: number;
}>();

const api = inject(CNMD_DIR_TREE_KEY) as CnmdDirTreeApi;

const rows = computed(() =>
  props.entries.map((entry) => ({
    entry,
    dirPath:
      entry.kind === "dir" ? joinDir(props.parentPath, entry.name) : "",
  }))
);
</script>

<template>
  <ul
    class="cnmd-dir-tree-ul"
    :class="{ 'cnmd-dir-tree-ul--nested': depth > 0 }"
  >
    <li
      v-for="{ entry, dirPath } in rows"
      :key="props.parentPath + ':' + entry.kind + ':' + entry.name"
      class="cnmd-dir-tree-li"
    >
      <template v-if="entry.kind === 'dir'">
        <button
          type="button"
          class="cnmd-dir-tree-folder"
          :title="
            entry.name +
            (entry.sizeStr ? ` · ${entry.sizeStr}` : '') +
            (entry.mtimeStr ? ` · ${entry.mtimeStr}` : '')
          "
          @click="api.toggleDir(dirPath)"
        >
          <span
            class="cnmd-dir-tree-chevron"
            :class="{
              'cnmd-dir-tree-chevron--open': api.isExpanded(dirPath),
            }"
            aria-hidden="true"
            >▸</span
          >
          <span class="cnmd-dir-tree-name">{{ entry.name }}</span>
        </button>
        <div v-show="api.isExpanded(dirPath)" class="cnmd-dir-tree-children">
          <div v-if="api.isLoading(dirPath)" class="cnmd-dir-tree-loading">
            加载中…
          </div>
          <div v-else-if="api.getError(dirPath)" class="cnmd-dir-tree-err">
            {{ api.getError(dirPath) }}
          </div>
          <DirectoryTreeRows
            v-else
            :parent-path="dirPath"
            :entries="api.getChildren(dirPath)"
            :depth="depth + 1"
          />
        </div>
      </template>
      <button
        v-else-if="entry.kind === 'md'"
        type="button"
        class="cnmd-dir-tree-file"
        :title="
          entry.name +
          (entry.sizeStr ? ` · ${entry.sizeStr}` : '') +
          (entry.mtimeStr ? ` · ${entry.mtimeStr}` : '')
        "
        @click="api.openMd(parentPath, entry.name)"
      >
        <span class="cnmd-dir-tree-leaf-icon" aria-hidden="true">≡</span>
        <span class="cnmd-dir-tree-name">{{ entry.name }}</span>
      </button>
      <div v-else class="cnmd-dir-tree-other" :title="entry.name">
        <span class="cnmd-dir-tree-leaf-icon" aria-hidden="true">·</span>
        <span class="cnmd-dir-tree-name">{{ entry.name }}</span>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import {
  CNMD_DIR_TREE_KEY,
  normalizeDirPath,
  type CnmdDirTreeApi,
  type DirEntry,
} from "../cnmd-dir-tree";
import { cnmdFetchFileText } from "../cnmd-fetch-file";
import DirectoryTreeRows from "./DirectoryTreeRows.vue";

const props = defineProps<{
  initialDir: string;
}>();

/** 与 MarkdownViewer 中 cnmd_dir_panel_root 对应：整棵树展开状态与子目录缓存 */
const TREE_STATE_KEY = "cnmd_dir_tree_state";

const rootDir = computed(() =>
  props.initialDir ? normalizeDirPath(props.initialDir) : ""
);

/** 避免初次清空 / 恢复树时触发写入把 session 冲掉 */
const allowTreePersist = ref(false);

function isUnderRoot(absDir: string): boolean {
  const root = rootDir.value;
  if (!root) return false;
  const c = normalizeDirPath(absDir);
  return c === root || c.startsWith(root);
}

const rootEntries = ref<DirEntry[]>([]);
const loadingRoot = ref(false);
const errorRoot = ref("");

const expandedPaths = ref<Record<string, boolean>>({});
const childrenByPath = ref<Record<string, DirEntry[]>>({});
const loadingPaths = ref<Record<string, boolean>>({});
const errorsByPath = ref<Record<string, string>>({});

function isMarkdownName(name: string): boolean {
  return /\.(md|markdown)$/i.test(name);
}

function classifyKind(name: string, isDir: boolean): DirEntry["kind"] {
  if (isDir) return "dir";
  if (isMarkdownName(name)) return "md";
  return "other";
}

function sortEntries(list: DirEntry[]): DirEntry[] {
  const order: Record<DirEntry["kind"], number> = { dir: 0, md: 1, other: 2 };
  return list
    .slice()
    .sort((a, b) => {
      if (a.kind !== b.kind) return order[a.kind] - order[b.kind];
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function parseChromiumDirIndex(html: string): DirEntry[] {
  const out: DirEntry[] = [];

  const addRowRe =
    /<script>\s*addRow\(([\s\S]*?)\)\s*;?\s*<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = addRowRe.exec(html)) !== null) {
    try {
      const args = JSON.parse("[" + m[1] + "]");
      const name = String(args[0] ?? "");
      if (!name || name === "." || name === "..") continue;
      const isDir = Boolean(args[2]);
      const sizeStr = String(args[4] ?? "");
      const mtimeStr = String(args[6] ?? "");
      const cleanName = isDir ? name.replace(/\/+$/, "") : name;
      out.push({
        name: cleanName,
        kind: classifyKind(cleanName, isDir),
        sizeStr,
        mtimeStr,
      });
    } catch {
      // skip malformed row
    }
  }

  if (out.length > 0) return out;

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = doc.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("?") || href.startsWith("#")) return;
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return;
      if (href.startsWith("/")) return;
      const isDir = href.endsWith("/");
      const raw = decodeURIComponent(href.replace(/\/+$/, ""));
      if (!raw || raw === "." || raw === "..") return;
      out.push({
        name: raw,
        kind: classifyKind(raw, isDir),
        sizeStr: "",
        mtimeStr: "",
      });
    });
  } catch {
    // ignore
  }

  return out;
}

async function fetchDirHtml(dirPath: string): Promise<string> {
  const url = "file://" + encodeURI(dirPath);
  return cnmdFetchFileText(url);
}

function persistTreeState(): void {
  try {
    const root = rootDir.value;
    if (!root) return;
    sessionStorage.setItem(
      TREE_STATE_KEY,
      JSON.stringify({
        root,
        expanded: expandedPaths.value,
        children: childrenByPath.value,
      })
    );
  } catch {
    // Quota / 隐私模式等
  }
}

function tryRestoreTreeState(): void {
  try {
    const raw = sessionStorage.getItem(TREE_STATE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as {
      root?: string;
      expanded?: Record<string, boolean>;
      children?: Record<string, DirEntry[]>;
    };
    const r = rootDir.value;
    if (!r || !data.root || normalizeDirPath(data.root) !== r) return;
    if (data.expanded && typeof data.expanded === "object") {
      expandedPaths.value = { ...data.expanded };
    }
    if (data.children && typeof data.children === "object") {
      childrenByPath.value = { ...data.children };
    }
  } catch {
    // ignore
  }
}

async function loadChildren(dirPath: string) {
  if (!isUnderRoot(dirPath)) return;
  if (childrenByPath.value[dirPath] !== undefined) return;

  const errNext = { ...errorsByPath.value };
  delete errNext[dirPath];
  errorsByPath.value = errNext;

  loadingPaths.value = { ...loadingPaths.value, [dirPath]: true };
  try {
    const html = await fetchDirHtml(dirPath);
    const parsed = sortEntries(parseChromiumDirIndex(html));
    childrenByPath.value = { ...childrenByPath.value, [dirPath]: parsed };
  } catch (e) {
    errorsByPath.value = {
      ...errorsByPath.value,
      [dirPath]: String((e as Error)?.message ?? e),
    };
  } finally {
    const { [dirPath]: _rm, ...rest } = loadingPaths.value;
    loadingPaths.value = rest;
  }
}

function toggleDir(dirPath: string) {
  if (!isUnderRoot(dirPath)) return;
  const nextOpen = !expandedPaths.value[dirPath];
  expandedPaths.value = { ...expandedPaths.value, [dirPath]: nextOpen };
  if (nextOpen) void loadChildren(dirPath);
}

function isExpanded(dirPath: string): boolean {
  return !!expandedPaths.value[dirPath];
}

function isLoading(dirPath: string): boolean {
  return !!loadingPaths.value[dirPath];
}

function getError(dirPath: string): string | undefined {
  return errorsByPath.value[dirPath];
}

function getChildren(dirPath: string): DirEntry[] {
  return childrenByPath.value[dirPath] ?? [];
}

function openMd(parentPath: string, fileName: string): void {
  persistTreeState();
  const dir = normalizeDirPath(parentPath).replace(/\/+$/, "");
  window.location.href = "file://" + encodeURI(dir + "/" + fileName);
}

const api: CnmdDirTreeApi = {
  toggleDir,
  isExpanded,
  isLoading,
  getError,
  getChildren,
  openMd,
};

provide(CNMD_DIR_TREE_KEY, api);

watch(
  () => props.initialDir,
  async (dir) => {
    allowTreePersist.value = false;
    expandedPaths.value = {};
    childrenByPath.value = {};
    loadingPaths.value = {};
    errorsByPath.value = {};
    rootEntries.value = [];
    errorRoot.value = "";

    if (!dir) {
      allowTreePersist.value = true;
      return;
    }

    loadingRoot.value = true;
    try {
      const base = normalizeDirPath(dir);
      const html = await fetchDirHtml(base);
      const parsed = sortEntries(parseChromiumDirIndex(html));
      rootEntries.value = parsed;
      if (parsed.length === 0) {
        errorRoot.value = "（该目录为空，或无法解析目录索引）";
      }
      tryRestoreTreeState();
    } catch (e) {
      errorRoot.value = `读取目录失败：${String((e as Error)?.message ?? e)}`;
    } finally {
      loadingRoot.value = false;
      allowTreePersist.value = true;
    }
  },
  { immediate: true }
);

watch(
  [expandedPaths, childrenByPath],
  () => {
    if (!allowTreePersist.value || loadingRoot.value) return;
    persistTreeState();
  },
  { deep: true }
);
</script>

<template>
  <div class="cnmd-dir">
    <div class="cnmd-dir-path" :title="rootDir">{{ rootDir }}</div>
    <div v-if="loadingRoot" class="cnmd-dir-status">正在读取目录…</div>
    <div
      v-else-if="errorRoot"
      class="cnmd-dir-status cnmd-dir-status-error"
    >
      {{ errorRoot }}
    </div>
    <div v-else class="cnmd-dir-list cnmd-dir-list--tree">
      <DirectoryTreeRows
        :parent-path="rootDir"
        :entries="rootEntries"
        :depth="0"
      />
    </div>
  </div>
</template>

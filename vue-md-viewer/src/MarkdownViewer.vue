<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import codeSvgRaw from "../public/code.svg?raw";
import contentSvgRaw from "../public/content.svg?raw";
import editSvgRaw from "../public/edit.svg?raw";
import folderSvgRaw from "../public/folder.svg?raw";
import leftSvgRaw from "../public/left.svg?raw";
import listSvgRaw from "../public/list.svg?raw";
import { htmlToMarkdown, markdownToHtml } from "./cnmd-md-html";
import { getFileUrl, saveMarkdown } from "./cnmd-save-file";
import { normalizeDirPath } from "./cnmd-dir-tree";
import CnmdTopBar from "./fragments/CnmdTopBar.vue";
import DirectoryPanel from "./fragments/DirectoryPanel.vue";
import MenuDropdown from "./fragments/MenuDropdown.vue";
import OpenFilePanel from "./fragments/OpenFilePanel.vue";
import ThemePanel from "./fragments/ThemePanel.vue";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { watchCnmdTheme } from "./useCnmdTheme";

const markdown = defineModel<string>("markdown", { required: true });
const displayName = defineModel<string>("displayName", { required: true });

const viewMode = ref<"rendered" | "source">("rendered");
const editMode = ref(false);
const editContentMode = ref<"visual" | "source">("visual");
const draft = ref("");
const lastSavedDraft = ref("");
const menuOpen = ref(false);
const panelOpen = ref(false);
const themePanelOpen = ref(false);
const sidebarHidden = ref(false);
const resizing = ref(false);
const sidebarTab = ref<"outline" | "dir">("outline");

/** 目录面板根目录：会话内固定为第一次打开的 md 所在目录，不因后续在同标签打开其它 md 而改变 */
const CNMD_DIR_PANEL_ROOT_KEY = "cnmd_dir_panel_root";

function computeDirFromLocation(): string {
  try {
    if (window.location.protocol !== "file:") return "";
    const path = decodeURIComponent(window.location.pathname);
    return path.replace(/[^/]+$/, "");
  } catch {
    return "";
  }
}

function getInitialDirForPanel(): string {
  const fromUrl = computeDirFromLocation();
  if (!fromUrl) return "";
  try {
    const saved = sessionStorage.getItem(CNMD_DIR_PANEL_ROOT_KEY);
    if (saved) return normalizeDirPath(saved);
    const normalized = normalizeDirPath(fromUrl);
    sessionStorage.setItem(CNMD_DIR_PANEL_ROOT_KEY, normalized);
    return normalized;
  } catch {
    return normalizeDirPath(fromUrl);
  }
}

const initialDir = getInitialDirForPanel();

/** Bootstrap Icons SVG，内联进 bundle（扩展 content script 不可用外链 URL） */
const iconList = listSvgRaw;
const iconEdit = editSvgRaw;
const iconCode = codeSvgRaw;
const iconLeft = leftSvgRaw;
const iconFolder = folderSvgRaw;
const iconContent = contentSvgRaw;

const articleRef = ref<HTMLElement | null>(null);
const visualEditorRef = ref<HTMLElement | null>(null);
const editorRef = ref<HTMLTextAreaElement | null>(null);
let visualSyncTimer: ReturnType<typeof setTimeout> | undefined;
const rootRef = ref<HTMLElement | null>(null);
const resizerRef = ref<HTMLElement | null>(null);

type OutlineItem =
  | { kind: "h"; id: string; level: number; text: string }
  | { kind: "b"; id: string; text: string };

const outlineItems = ref<OutlineItem[]>([]);
const activeOutlineIndex = ref(0);

const safeHtml = computed(() => markdownToHtml(markdown.value));

const srcToggleLabel = computed(() =>
  viewMode.value === "source" ? "显示预览" : "显示原文"
);

let scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    if (
      viewMode.value !== "rendered" ||
      editMode.value ||
      outlineItems.value.length === 0
    )
      return;
    const margin = 100;
    let active = 0;
    const items = outlineItems.value;
    for (let i = items.length - 1; i >= 0; i--) {
      const el = document.getElementById(items[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= margin) {
        active = i;
        break;
      }
    }
    activeOutlineIndex.value = active;
  });
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function rebuildOutline() {
  outlineItems.value = [];
  activeOutlineIndex.value = 0;
  if (viewMode.value !== "rendered") return;
  if (editMode.value && editContentMode.value === "source") return;

  nextTick(() => {
    const article =
      editMode.value && editContentMode.value === "visual"
        ? visualEditorRef.value
        : articleRef.value;
    if (!article) return;

    const headings = article.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const next: OutlineItem[] = [];

    if (headings.length) {
      headings.forEach((el, i) => {
        const id = `cnmd-sec-${i}`;
        el.id = id;
        const lv = Number(el.tagName.slice(1)) || 1;
        next.push({
          kind: "h",
          id,
          level: Math.min(6, Math.max(1, lv)),
          text: el.textContent?.trim() || `标题 ${i + 1}`,
        });
      });
    } else {
      const blocks = article.querySelectorAll(
        ":scope > p, :scope > pre, :scope > ul, :scope > ol, :scope > blockquote, :scope > table"
      );
      let n = 0;
      blocks.forEach((el) => {
        const t = (el.textContent || "").trim().replace(/\s+/g, " ");
        if (!t && el.tagName !== "PRE") return;
        const id = `cnmd-b-${n}`;
        el.id = id;
        n += 1;
        const preview =
          (t || "(空)").slice(0, 52) + (t.length > 52 ? "…" : "");
        next.push({
          kind: "b",
          id,
          text: preview || `段落 ${n}`,
        });
      });
    }

    outlineItems.value = next;
    if (next.length === 0) return;
    onScroll();
  });
}

watch([safeHtml, viewMode], rebuildOutline, { flush: "post" });

watch(markdown, (v) => {
  if (!editMode.value) {
    draft.value = v;
    lastSavedDraft.value = v;
  }
});

watch(viewMode, (v) => {
  document.body.classList.toggle("cnmd-body-source", v === "source");
  menuOpen.value = false;
  if (v === "source") editMode.value = false;
});

function isDraftDirty(): boolean {
  return draft.value !== lastSavedDraft.value;
}

function syncDraftFromMarkdown() {
  draft.value = markdown.value;
  lastSavedDraft.value = markdown.value;
}

function flushVisualToDraft() {
  if (editContentMode.value !== "visual") return;
  const el = visualEditorRef.value;
  if (!el) return;
  draft.value = htmlToMarkdown(el.innerHTML);
}

function initVisualEditor() {
  const el = visualEditorRef.value;
  if (!el) return;
  el.innerHTML = markdownToHtml(draft.value);
}

function onVisualInput() {
  if (visualSyncTimer) clearTimeout(visualSyncTimer);
  visualSyncTimer = setTimeout(() => {
    visualSyncTimer = undefined;
    flushVisualToDraft();
    rebuildOutline();
  }, 300);
}

function toggleEditContentMode() {
  if (editContentMode.value === "visual") {
    flushVisualToDraft();
    editContentMode.value = "source";
    nextTick(() => editorRef.value?.focus());
  } else {
    editContentMode.value = "visual";
    nextTick(() => {
      initVisualEditor();
      visualEditorRef.value?.focus();
    });
  }
}

const editFabTitle = computed(() =>
  editContentMode.value === "visual" ? "切换到源代码" : "切换到渲染"
);

async function saveDocument(): Promise<void> {
  if (!editMode.value) return;
  if (editContentMode.value === "visual") flushVisualToDraft();
  markdown.value = draft.value;
  const fileUrl = getFileUrl();
  if (!fileUrl) {
    window.alert(
      "当前文档不是通过本地 file:// 路径打开的，无法写回原文件。请用 Chrome 直接打开本地 .md 文件后再保存。"
    );
    return;
  }
  try {
    await saveMarkdown(fileUrl, draft.value);
    lastSavedDraft.value = draft.value;
  } catch (e) {
    window.alert(
      `保存失败：${e instanceof Error ? e.message : String(e)}\n\n首次保存时请在文件选择器中选择正在编辑的同一个 .md 文件。`
    );
    throw e;
  }
}

function enterEditMode() {
  syncDraftFromMarkdown();
  editContentMode.value = "visual";
  editMode.value = true;
  nextTick(() => {
    initVisualEditor();
    visualEditorRef.value?.focus();
  });
}

function exitEditMode() {
  if (editContentMode.value === "visual") flushVisualToDraft();
  if (isDraftDirty()) {
    const ok = window.confirm("有未保存的修改，确定退出编辑模式吗？");
    if (!ok) return;
  }
  markdown.value = draft.value;
  editMode.value = false;
  editContentMode.value = "visual";
  nextTick(() => rebuildOutline());
}

function toggleEdit() {
  if (editMode.value) exitEditMode();
  else enterEditMode();
}

useEditorShortcuts(editMode, saveDocument);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function openFilePanel() {
  menuOpen.value = false;
  panelOpen.value = true;
}

function closePanel() {
  panelOpen.value = false;
}

function openThemePanel() {
  menuOpen.value = false;
  themePanelOpen.value = true;
}

function closeThemePanel() {
  themePanelOpen.value = false;
}

function toggleViewMode() {
  menuOpen.value = false;
  if (editMode.value) {
    if (editContentMode.value === "visual") flushVisualToDraft();
    if (isDraftDirty()) {
      const ok = window.confirm("有未保存的修改，确定切换显示模式吗？");
      if (!ok) return;
    }
  }
  editMode.value = false;
  editContentMode.value = "visual";
  viewMode.value = viewMode.value === "source" ? "rendered" : "source";
}

function onFileLoaded(text: string, fileName: string) {
  editMode.value = false;
  markdown.value = text;
  displayName.value = fileName;
  draft.value = text;
  lastSavedDraft.value = text;
  viewMode.value = "rendered";
  panelOpen.value = false;
}

function toggleSidebar() {
  sidebarHidden.value = !sidebarHidden.value;
  localStorage.setItem(
    "cnmd_sidebar_hidden",
    sidebarHidden.value ? "1" : "0"
  );
}

function onResizerDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const root = rootRef.value;
  const rz = resizerRef.value;
  if (!root || !rz || sidebarHidden.value) return;
  e.preventDefault();
  resizing.value = true;
  rz.classList.add("cnmd-resizer--drag");
  root.classList.add("cnmd--resizing");

  const startX = e.clientX;
  const cur = getComputedStyle(document.documentElement)
    .getPropertyValue("--cnmd-sb")
    .trim();
  const startW = parseInt(cur, 10) || 260;

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX;
    let w = startW + dx;
    w = Math.min(560, Math.max(160, w));
    document.documentElement.style.setProperty("--cnmd-sb", `${w}px`);
  };

  const onUp = () => {
    resizing.value = false;
    rz.classList.remove("cnmd-resizer--drag");
    root.classList.remove("cnmd--resizing");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--cnmd-sb")
      .trim();
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) localStorage.setItem("cnmd_sb_w", String(n));
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

watch(sidebarTab, (v) => {
  localStorage.setItem("cnmd_sidebar_tab", v);
});

let stopThemeWatch: (() => void) | undefined;

onMounted(() => {
  stopThemeWatch = watchCnmdTheme();

  const stored = parseInt(localStorage.getItem("cnmd_sb_w") ?? "", 10);
  if (!Number.isNaN(stored)) {
    document.documentElement.style.setProperty(
      "--cnmd-sb",
      `${Math.min(560, Math.max(160, stored))}px`
    );
  }
  sidebarHidden.value =
    localStorage.getItem("cnmd_sidebar_hidden") === "1";

  const storedTab = localStorage.getItem("cnmd_sidebar_tab");
  if (storedTab === "dir" && initialDir) {
    sidebarTab.value = "dir";
  } else {
    sidebarTab.value = "outline";
  }

  syncDraftFromMarkdown();

  window.addEventListener("scroll", onScroll, { passive: true });
  rebuildOutline();
});

onUnmounted(() => {
  if (visualSyncTimer) clearTimeout(visualSyncTimer);
  stopThemeWatch?.();
  window.removeEventListener("scroll", onScroll);
  document.body.classList.remove("cnmd-body-source");
});
</script>

<template>
  <template v-if="viewMode === 'source'">
    <CnmdTopBar
      :edit-mode="false"
      :icon-list="iconList"
      :menu-open="menuOpen"
      @toggle-menu="toggleMenu"
    />
    <div
      v-show="menuOpen"
      id="cnmd-menu-layer"
      style="display: block"
    >
      <MenuDropdown
        :src-label="srcToggleLabel"
        @close="menuOpen = false"
        @open-file="openFilePanel"
        @open-theme="openThemePanel"
        @toggle-source="toggleViewMode"
      />
    </div>
    <div
      v-show="panelOpen"
      id="cnmd-panel-layer"
      style="display: block"
    >
      <OpenFilePanel @close="closePanel" @loaded="onFileLoaded" />
    </div>
    <div
      v-show="themePanelOpen"
      id="cnmd-theme-layer"
      style="display: block"
    >
      <ThemePanel @close="closeThemePanel" />
    </div>
    <pre id="cnmd-source-plain">{{ markdown }}</pre>
  </template>

  <div
    v-else
    id="cnmd-root"
    ref="rootRef"
    class="cnmd-root"
    :class="{
      'cnmd--sidebar-hidden': sidebarHidden,
      'cnmd--resizing': resizing,
    }"
  >
    <CnmdTopBar
      :edit-mode="editMode"
      :icon-list="iconList"
      :menu-open="menuOpen"
      @toggle-menu="toggleMenu"
    />
    <div
      v-show="menuOpen"
      id="cnmd-menu-layer"
      style="display: block"
    >
      <MenuDropdown
        :src-label="srcToggleLabel"
        @close="menuOpen = false"
        @open-file="openFilePanel"
        @open-theme="openThemePanel"
        @toggle-source="toggleViewMode"
      />
    </div>
    <div
      v-show="panelOpen"
      id="cnmd-panel-layer"
      style="display: block"
    >
      <OpenFilePanel @close="closePanel" @loaded="onFileLoaded" />
    </div>
    <div
      v-show="themePanelOpen"
      id="cnmd-theme-layer"
      style="display: block"
    >
      <ThemePanel @close="closeThemePanel" />
    </div>

    <aside class="cnmd-sidebar" id="cnmd-sidebar" aria-label="大纲侧栏">
      <div class="cnmd-sidebar-track" id="cnmd-sidebar-track">
        <div class="cnmd-sidebar-drawer" id="cnmd-sidebar-drawer">
          <div class="cnmd-sidebar-tabs-row">
            <span
              class="cnmd-sidebar-tabs-label"
              :title="sidebarTab === 'outline' ? '大纲' : '目录'"
            >
              {{ sidebarTab === "outline" ? "大纲" : "目录" }}
            </span>
            <div class="cnmd-sidebar-tabs-seg" role="tablist">
              <span
                class="cnmd-sidebar-tabs-thumb"
                :class="{ 'cnmd-sidebar-tabs-thumb--dir': sidebarTab === 'dir' }"
                aria-hidden="true"
              ></span>
              <button
                type="button"
                role="tab"
                class="cnmd-sidebar-tab cnmd-sidebar-tab--seg"
                :class="{ 'cnmd-sidebar-tab--seg-active': sidebarTab === 'outline' }"
                :aria-pressed="sidebarTab === 'outline'"
                @click="sidebarTab = 'outline'"
              >
                <span class="cnmd-sidebar-tab-icon" aria-hidden="true" v-html="iconContent"></span>
                <span class="cnmd-sidebar-tab-text">大纲</span>
              </button>
              <button
                type="button"
                role="tab"
                class="cnmd-sidebar-tab cnmd-sidebar-tab--seg"
                :class="{ 'cnmd-sidebar-tab--seg-active': sidebarTab === 'dir' }"
                :aria-pressed="sidebarTab === 'dir'"
                :disabled="!initialDir"
                :title="initialDir ? '查看当前文件所在目录' : '当前文档不在本地文件路径下'"
                @click="initialDir && (sidebarTab = 'dir')"
              >
                <span class="cnmd-sidebar-tab-icon" aria-hidden="true" v-html="iconFolder"></span>
                <span class="cnmd-sidebar-tab-text">目录</span>
              </button>
            </div>
          </div>
          <ul
            v-if="sidebarTab === 'outline'"
            class="cnmd-sidebar-nav"
            id="cnmd-sidebar-nav"
          >
            <template v-if="outlineItems.length === 0">
              <li class="cnmd-sidebar-empty">（暂无段落导航）</li>
            </template>
            <template v-else>
              <li v-for="(item, i) in outlineItems" :key="item.id">
                <button
                  type="button"
                  :class="[
                    item.kind === 'h'
                      ? `cnmd-nav-h${item.level}`
                      : 'cnmd-nav-block',
                    { 'cnmd-nav-active': i === activeOutlineIndex },
                  ]"
                  @click="scrollToId(item.id)"
                >
                  {{ item.text }}
                </button>
              </li>
            </template>
          </ul>
          <DirectoryPanel v-else :initial-dir="initialDir" />
        </div>
      </div>
    </aside>

    <div
      ref="resizerRef"
      class="cnmd-resizer"
      id="cnmd-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="拖拽调整侧栏与主视图宽度"
      title="拖拽调整宽度"
      @mousedown="onResizerDown"
    ></div>

    <div class="cnmd-main-column" id="cnmd-main-column">
      <div class="cnmd-sidebar-rail" id="cnmd-sidebar-rail" aria-label="工具栏">
        <button
          type="button"
          class="cnmd-sidebar-toggle-btn"
          id="cnmd-sidebar-hide"
          :aria-label="sidebarHidden ? '展开大纲' : '收起大纲'"
          :title="sidebarHidden ? '展开大纲' : '收起大纲'"
          @click="toggleSidebar"
        >
          <span
            class="cnmd-sidebar-toggle-icon"
            :class="{ 'cnmd-sidebar-toggle-icon--expand': sidebarHidden }"
            aria-hidden="true"
            v-html="iconLeft"
          ></span>
        </button>
        <div class="cnmd-sidebar-rail-stack" id="cnmd-sidebar-rail-stack">
          <button
            type="button"
            class="cnmd-sidebar-toggle-btn cnmd-rail-edit-btn"
            :class="{ 'cnmd-rail-edit-btn--active': editMode }"
            :aria-label="editMode ? '退出编辑' : '编辑'"
            :aria-pressed="editMode"
            :title="editMode ? '退出编辑' : '编辑'"
            @click="toggleEdit"
          >
            <span
              class="cnmd-sidebar-toggle-icon cnmd-rail-edit-icon"
              aria-hidden="true"
              v-html="iconEdit"
            ></span>
          </button>
        </div>
      </div>
      <div v-if="editMode" class="cnmd-edit-pane" id="cnmd-edit-pane">
        <article
          v-show="editContentMode === 'visual'"
          ref="visualEditorRef"
          class="cnmd-preview cnmd-prose cnmd-preview--editable"
          id="cnmd-visual-editor"
          contenteditable="true"
          spellcheck="false"
          aria-label="Markdown 渲染编辑"
          @input="onVisualInput"
        ></article>
        <textarea
          v-show="editContentMode === 'source'"
          ref="editorRef"
          v-model="draft"
          class="cnmd-editor"
          id="cnmd-editor"
          aria-label="Markdown 源代码编辑器"
          spellcheck="false"
        ></textarea>
      </div>
      <article
        v-else
        ref="articleRef"
        class="cnmd-preview cnmd-prose"
        id="cnmd-article"
        v-html="safeHtml"
      ></article>
    </div>
    <Teleport to="body">
      <button
        v-if="editMode"
        type="button"
        class="cnmd-edit-mode-fab"
        :class="{ 'cnmd-edit-mode-fab--source': editContentMode === 'source' }"
        :title="editFabTitle"
        :aria-label="editFabTitle"
        @click="toggleEditContentMode"
      >
        <span class="cnmd-menu-icon" aria-hidden="true" v-html="iconCode"></span>
      </button>
    </Teleport>
  </div>
</template>

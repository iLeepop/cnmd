<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { CnmdColorAlpha } from "../cnmd-theme-types";
import { useCnmdTheme } from "../useCnmdTheme";

type ThemeSection = "accent" | "chrome" | "prose" | "source";

const emit = defineEmits<{ close: [] }>();
const { theme, resetToDefaults } = useCnmdTheme();

const activeSection = ref<ThemeSection>("accent");
const themePanelEl = ref<HTMLElement | null>(null);

function canElementScrollY(el: HTMLElement, deltaY: number): boolean {
  const st = getComputedStyle(el);
  const oy = st.overflowY;
  if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return false;
  const top = el.scrollTop;
  if (deltaY < 0 && top > 0) return true;
  if (deltaY > 0 && top < max - 0.5) return true;
  return false;
}

function canElementScrollX(el: HTMLElement, deltaX: number): boolean {
  const st = getComputedStyle(el);
  const ox = st.overflowX;
  if (ox !== "auto" && ox !== "scroll" && ox !== "overlay") return false;
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 0) return false;
  const left = el.scrollLeft;
  if (deltaX < 0 && left > 0) return true;
  if (deltaX > 0 && left < max - 0.5) return true;
  return false;
}

function onThemePanelWheelCapture(e: WheelEvent) {
  const panel = themePanelEl.value;
  if (!panel) return;
  const t = e.target;
  if (!(t instanceof Node) || !panel.contains(t)) return;
  let node: HTMLElement | null = t instanceof HTMLElement ? t : t.parentElement;
  while (node) {
    if (
      canElementScrollY(node, e.deltaY) ||
      canElementScrollX(node, e.deltaX)
    ) {
      return;
    }
    if (node === panel) break;
    node = node.parentElement;
  }
  e.preventDefault();
}

let themePanelWheelCleanup: (() => void) | undefined;

onMounted(() => {
  const el = themePanelEl.value;
  if (!el) return;
  el.addEventListener("wheel", onThemePanelWheelCapture, {
    capture: true,
    passive: false,
  });
  themePanelWheelCleanup = () => {
    el.removeEventListener("wheel", onThemePanelWheelCapture, {
      capture: true,
    } as AddEventListenerOptions);
  };
});

onUnmounted(() => {
  themePanelWheelCleanup?.();
  themePanelWheelCleanup = undefined;
});

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("cnmd-theme-panel")) {
    emit("close");
  }
}

function onHexInput(m: CnmdColorAlpha, ev: Event) {
  const raw = (ev.target as HTMLInputElement).value;
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
    m.hex = raw.toLowerCase();
  }
}

function alphaPct(m: CnmdColorAlpha): number {
  return Math.round(clamp01(m.alpha) * 100);
}

function setAlphaPct(m: CnmdColorAlpha, pct: number) {
  m.alpha = clamp01(pct / 100);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
</script>

<template>
  <div ref="themePanelEl" class="cnmd-theme-panel" @click="onBackdropClick">
    <div class="cnmd-theme-dialog" role="dialog" aria-labelledby="cnmd-theme-title" @click.stop>
      <header class="cnmd-theme-header">
        <h2 id="cnmd-theme-title" class="cnmd-theme-title">主题</h2>
        <div class="cnmd-theme-header-actions">
          <button
            type="button"
            class="cnmd-btn cnmd-theme-header-btn cnmd-theme-reset"
            @click="resetToDefaults"
          >
            恢复默认
          </button>
          <button type="button" class="cnmd-btn cnmd-theme-header-btn" @click="emit('close')">
            关闭
          </button>
        </div>
      </header>

      <div class="cnmd-theme-body">
        <nav class="cnmd-theme-nav" role="tablist" aria-label="主题配置分类">
          <button
            id="cnmd-theme-tab-accent"
            type="button"
            class="cnmd-theme-nav-btn"
            role="tab"
            :aria-selected="activeSection === 'accent'"
            :tabindex="activeSection === 'accent' ? 0 : -1"
            @click="activeSection = 'accent'"
          >
            主题色
          </button>
          <button
            id="cnmd-theme-tab-chrome"
            type="button"
            class="cnmd-theme-nav-btn"
            role="tab"
            :aria-selected="activeSection === 'chrome'"
            :tabindex="activeSection === 'chrome' ? 0 : -1"
            @click="activeSection = 'chrome'"
          >
            界面颜色
          </button>
          <button
            id="cnmd-theme-tab-prose"
            type="button"
            class="cnmd-theme-nav-btn"
            role="tab"
            :aria-selected="activeSection === 'prose'"
            :tabindex="activeSection === 'prose' ? 0 : -1"
            @click="activeSection = 'prose'"
          >
            Markdown 渲染
          </button>
          <button
            id="cnmd-theme-tab-source"
            type="button"
            class="cnmd-theme-nav-btn"
            role="tab"
            :aria-selected="activeSection === 'source'"
            :tabindex="activeSection === 'source' ? 0 : -1"
            @click="activeSection = 'source'"
          >
            源码视图
          </button>
        </nav>

        <div class="cnmd-theme-content-scroller">
          <div
            v-show="activeSection === 'accent'"
            id="cnmd-theme-panel-accent"
            class="cnmd-theme-content"
            role="tabpanel"
            aria-labelledby="cnmd-theme-tab-accent"
          >
            <h3 class="cnmd-theme-content-heading">主题色</h3>
            <p class="cnmd-theme-hint">用于主按钮、焦点环、分隔条高亮与强调状态。</p>
            <div class="cnmd-theme-props">
              <div class="cnmd-theme-row">
                <span class="cnmd-theme-label">强调色</span>
                <div class="cnmd-theme-field">
                  <input
                    class="cnmd-theme-color"
                    type="color"
                    :value="theme.accent.hex"
                    aria-label="强调色"
                    @input="onHexInput(theme.accent, $event)"
                  />
                  <label class="cnmd-theme-alpha">
                    <span class="cnmd-theme-alpha-label">透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="alphaPct(theme.accent)"
                      @input="
                        setAlphaPct(theme.accent, +($event.target as HTMLInputElement).value)
                      "
                    />
                    <span class="cnmd-theme-alpha-val">{{ alphaPct(theme.accent) }}%</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-show="activeSection === 'chrome'"
            id="cnmd-theme-panel-chrome"
            class="cnmd-theme-content"
            role="tabpanel"
            aria-labelledby="cnmd-theme-tab-chrome"
          >
            <h3 class="cnmd-theme-content-heading">界面颜色</h3>
            <p class="cnmd-theme-hint">侧栏、正文区、菜单与遮罩等壳层颜色（含透明度）。</p>
            <div class="cnmd-theme-props">
              <div
                v-for="(label, key) in ({
                  primaryText: '主文字',
                  secondaryText: '次要文字',
                  mutedText: '弱化文字',
                  labelText: '标签文字',
                  surfaceMain: '主表面',
                  surfaceSidebar: '侧栏背景',
                  surfaceHover: '悬停背景',
                  surfaceElevated: '浅层表面（按钮悬停等）',
                  surfaceSubtle: '浅灰表面',
                  border: '边框',
                  borderMuted: '弱化边框',
                  overlayHeavy: '弹窗遮罩',
                  overlayLight: '菜单遮罩',
                  shadow: '阴影基调',
                  menuButtonBg: '菜单按钮背景',
                  menuButtonFg: '菜单按钮前景',
                } as const)"
                :key="key"
                class="cnmd-theme-row"
              >
                <span class="cnmd-theme-label">{{ label }}</span>
                <div class="cnmd-theme-field">
                  <input
                    class="cnmd-theme-color"
                    type="color"
                    :value="theme.chrome[key].hex"
                    :aria-label="label"
                    @input="onHexInput(theme.chrome[key], $event)"
                  />
                  <label class="cnmd-theme-alpha">
                    <span class="cnmd-theme-alpha-label">透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="alphaPct(theme.chrome[key])"
                      @input="
                        setAlphaPct(
                          theme.chrome[key],
                          +($event.target as HTMLInputElement).value
                        )
                      "
                    />
                    <span class="cnmd-theme-alpha-val">{{ alphaPct(theme.chrome[key]) }}%</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-show="activeSection === 'prose'"
            id="cnmd-theme-panel-prose"
            class="cnmd-theme-content"
            role="tabpanel"
            aria-labelledby="cnmd-theme-tab-prose"
          >
            <h3 class="cnmd-theme-content-heading">Markdown 渲染</h3>
            <p class="cnmd-theme-hint">正文与各文本块颜色（含透明度）。</p>
            <div class="cnmd-theme-props">
              <div
                v-for="(label, key) in ({
                  body: '正文',
                  headingMajor: '标题（一至三级）',
                  headingMid: '标题（四级）',
                  headingMinor: '标题（五至六级）',
                  link: '链接',
                  linkHover: '链接悬停',
                  strong: '加粗',
                  hr: '分隔线 / 一级标题下划线',
                  marker: '列表符号',
                  blockquoteText: '引用文字',
                  blockquoteBorder: '引用左边框',
                  blockquoteBg: '引用背景渐变起点',
                  codeInlineBg: '行内代码背景',
                  codeInlineFg: '行内代码文字',
                  preBg: '代码块背景',
                  preFg: '代码块文字',
                  tableBorder: '表格线',
                  tableHeadBg: '表头背景',
                  tableHeadText: '表头文字',
                  errorBg: '错误提示背景',
                  errorBorder: '错误提示边框',
                  errorText: '错误提示文字',
                  imgShadow: '图片阴影',
                } as const)"
                :key="key"
                class="cnmd-theme-row"
              >
                <span class="cnmd-theme-label">{{ label }}</span>
                <div class="cnmd-theme-field">
                  <input
                    class="cnmd-theme-color"
                    type="color"
                    :value="theme.prose[key].hex"
                    :aria-label="label"
                    @input="onHexInput(theme.prose[key], $event)"
                  />
                  <label class="cnmd-theme-alpha">
                    <span class="cnmd-theme-alpha-label">透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="alphaPct(theme.prose[key])"
                      @input="
                        setAlphaPct(
                          theme.prose[key],
                          +($event.target as HTMLInputElement).value
                        )
                      "
                    />
                    <span class="cnmd-theme-alpha-val">{{ alphaPct(theme.prose[key]) }}%</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-show="activeSection === 'source'"
            id="cnmd-theme-panel-source"
            class="cnmd-theme-content"
            role="tabpanel"
            aria-labelledby="cnmd-theme-tab-source"
          >
            <h3 class="cnmd-theme-content-heading">源码视图</h3>
            <p class="cnmd-theme-hint">纯文本阅读模式下的背景与文字颜色。</p>
            <div class="cnmd-theme-props">
              <div class="cnmd-theme-row">
                <span class="cnmd-theme-label">背景</span>
                <div class="cnmd-theme-field">
                  <input
                    class="cnmd-theme-color"
                    type="color"
                    :value="theme.source.background.hex"
                    aria-label="源码视图背景"
                    @input="onHexInput(theme.source.background, $event)"
                  />
                  <label class="cnmd-theme-alpha">
                    <span class="cnmd-theme-alpha-label">透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="alphaPct(theme.source.background)"
                      @input="
                        setAlphaPct(
                          theme.source.background,
                          +($event.target as HTMLInputElement).value
                        )
                      "
                    />
                    <span class="cnmd-theme-alpha-val">{{ alphaPct(theme.source.background) }}%</span>
                  </label>
                </div>
              </div>
              <div class="cnmd-theme-row">
                <span class="cnmd-theme-label">文字</span>
                <div class="cnmd-theme-field">
                  <input
                    class="cnmd-theme-color"
                    type="color"
                    :value="theme.source.foreground.hex"
                    aria-label="源码视图文字"
                    @input="onHexInput(theme.source.foreground, $event)"
                  />
                  <label class="cnmd-theme-alpha">
                    <span class="cnmd-theme-alpha-label">透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="alphaPct(theme.source.foreground)"
                      @input="
                        setAlphaPct(
                          theme.source.foreground,
                          +($event.target as HTMLInputElement).value
                        )
                      "
                    />
                    <span class="cnmd-theme-alpha-val">{{ alphaPct(theme.source.foreground) }}%</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

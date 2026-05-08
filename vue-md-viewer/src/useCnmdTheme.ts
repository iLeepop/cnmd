import { reactive, watchEffect } from "vue";
import {
  CNMD_THEME_DEFAULTS,
  CNMD_THEME_STORAGE_KEY,
  type CnmdColorAlpha,
  type CnmdTheme,
} from "./cnmd-theme-types";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function caToRgba(c: CnmdColorAlpha): string {
  const rgb = hexToRgb(c.hex);
  if (!rgb) return "transparent";
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp01(c.alpha)})`;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  const u = clamp01(t);
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

function rgbToRgba(
  rgb: { r: number; g: number; b: number },
  a: number
): string {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp01(a)})`;
}

function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const d = mixRgb(rgb, { r: 0, g: 0, b: 0 }, amount);
  const n = (d.r << 16) | (d.g << 8) | d.b;
  return `#${n.toString(16).padStart(6, "0")}`;
}

function deepCloneTheme(t: CnmdTheme): CnmdTheme {
  return JSON.parse(JSON.stringify(t)) as CnmdTheme;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Shallow-merge nested objects; leaves unknown keys from stored JSON. */
function mergeTheme(stored: unknown): CnmdTheme {
  const base = deepCloneTheme(CNMD_THEME_DEFAULTS);
  if (!isRecord(stored)) return base;

  function mergeCa(dst: CnmdColorAlpha, src: unknown): CnmdColorAlpha {
    if (!isRecord(src)) return dst;
    const hex =
      typeof src.hex === "string" && src.hex.length > 0 ? src.hex : dst.hex;
    const alpha =
      typeof src.alpha === "number" && Number.isFinite(src.alpha)
        ? src.alpha
        : dst.alpha;
    return { hex, alpha: clamp01(alpha) };
  }

  if (isRecord(stored.accent)) {
    base.accent = mergeCa(base.accent, stored.accent);
  }
  if (isRecord(stored.chrome)) {
    const ch = stored.chrome;
    for (const k of Object.keys(base.chrome) as (keyof CnmdTheme["chrome"])[]) {
      if (isRecord(ch[k])) {
        base.chrome[k] = mergeCa(base.chrome[k], ch[k]);
      }
    }
  }
  if (isRecord(stored.prose)) {
    const pr = stored.prose;
    for (const k of Object.keys(base.prose) as (keyof CnmdTheme["prose"])[]) {
      if (isRecord(pr[k])) {
        base.prose[k] = mergeCa(base.prose[k], pr[k]);
      }
    }
  }
  if (isRecord(stored.source)) {
    const so = stored.source;
    for (const k of Object.keys(base.source) as (keyof CnmdTheme["source"])[]) {
      if (isRecord(so[k])) {
        base.source[k] = mergeCa(base.source[k], so[k]);
      }
    }
  }
  return base;
}

function loadRaw(): unknown {
  try {
    const raw = localStorage.getItem(CNMD_THEME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function applyCnmdThemeToDocument(theme: CnmdTheme): void {
  const root = document.documentElement.style;
  const { accent, chrome: ch, prose: pr, source: src } = theme;

  const accentRgb = hexToRgb(accent.hex);
  const accentStrongHex = darkenHex(accent.hex, 0.18);
  const accentStrongRgb = hexToRgb(accentStrongHex) || { r: 37, g: 99, b: 235 };
  const white = { r: 255, g: 255, b: 255 };

  const navActiveBg =
    accentRgb != null
      ? rgbToRgba(mixRgb(white, accentRgb, 0.12), 1)
      : caToRgba(ch.surfaceHover);
  const dropzoneActiveBg =
    accentRgb != null
      ? rgbToRgba(mixRgb(white, accentRgb, 0.06), 1)
      : caToRgba(ch.surfaceMain);
  const tabThumbRing =
    accentRgb != null
      ? rgbToRgba(mixRgb(white, accentRgb, 0.35), 0.9)
      : caToRgba(ch.border);

  const menuBtnBorderHover = caToRgba({
    hex: ch.labelText.hex,
    alpha: ch.labelText.alpha * 0.55,
  });
  const menuBtnShadow = caToRgba({
    hex: ch.shadow.hex,
    alpha: ch.shadow.alpha * (0.08 / 0.12),
  });
  const menuBtnFgHover = caToRgba({
    hex: ch.primaryText.hex,
    alpha: ch.primaryText.alpha,
  });
  const toggleHoverShadow = caToRgba({
    hex: ch.shadow.hex,
    alpha: ch.shadow.alpha * (0.07 / 0.12),
  });
  const sidebarBorder = caToRgba({
    hex: ch.border.hex,
    alpha: ch.border.alpha * 0.8,
  });
  const tabSegBg = caToRgba({
    hex: ch.border.hex,
    alpha: ch.border.alpha * 0.95,
  });
  const previewBorderBottom = caToRgba({
    hex: ch.border.hex,
    alpha: ch.border.alpha * 0.9,
  });
  const dirTreeBorder = caToRgba({
    hex: ch.labelText.hex,
    alpha: ch.labelText.alpha * 0.4,
  });
  const preInset = caToRgba({ hex: "#ffffff", alpha: 0.06 });

  root.setProperty("--cnmd-accent", caToRgba(accent));
  root.setProperty("--cnmd-accent-strong", accentStrongHex);
  root.setProperty("--cnmd-focus-ring", caToRgba(accent));

  root.setProperty("--cnmd-root-text", caToRgba(ch.primaryText));

  root.setProperty("--cnmd-menu-btn-bg", caToRgba(ch.menuButtonBg));
  root.setProperty("--cnmd-menu-btn-fg", caToRgba(ch.menuButtonFg));
  root.setProperty("--cnmd-menu-btn-border-hover", menuBtnBorderHover);
  root.setProperty("--cnmd-menu-btn-bg-hover", caToRgba(ch.surfaceMain));
  root.setProperty("--cnmd-menu-btn-shadow", menuBtnShadow);
  root.setProperty("--cnmd-menu-btn-fg-hover", menuBtnFgHover);

  root.setProperty("--cnmd-menu-backdrop-bg", caToRgba(ch.overlayLight));

  root.setProperty("--cnmd-menu-dd-border", tabSegBg);
  root.setProperty("--cnmd-menu-dd-bg", caToRgba(ch.menuButtonBg));
  root.setProperty(
    "--cnmd-menu-dd-shadow",
    `0 16px 48px ${caToRgba(ch.shadow)}`
  );

  root.setProperty("--cnmd-menu-item-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-menu-item-hover-bg", caToRgba(ch.surfaceHover));

  root.setProperty("--cnmd-panel-overlay-bg", caToRgba(ch.overlayHeavy));

  root.setProperty("--cnmd-dropzone-border", caToRgba(ch.borderMuted));
  root.setProperty("--cnmd-dropzone-bg", caToRgba(ch.surfaceMain));
  root.setProperty("--cnmd-dropzone-fg", caToRgba(ch.secondaryText));
  root.setProperty("--cnmd-dropzone-shadow", `0 20px 50px ${caToRgba(ch.shadow)}`);
  root.setProperty("--cnmd-dropzone-active-border", caToRgba(accent));
  root.setProperty("--cnmd-dropzone-active-bg", dropzoneActiveBg);
  root.setProperty("--cnmd-dropzone-active-fg", caToRgba(pr.linkHover));

  root.setProperty("--cnmd-btn-border", caToRgba(ch.border));
  root.setProperty("--cnmd-btn-bg", caToRgba(ch.surfaceMain));
  root.setProperty("--cnmd-btn-fg", caToRgba(ch.menuButtonFg));
  root.setProperty("--cnmd-btn-hover-bg", caToRgba(ch.surfaceElevated));
  root.setProperty("--cnmd-btn-hover-border", caToRgba(ch.borderMuted));
  root.setProperty(
    "--cnmd-btn-primary-bg",
    `linear-gradient(180deg,${caToRgba(accent)},${rgbToRgba(accentStrongRgb, 1)})`
  );
  root.setProperty("--cnmd-btn-primary-fg", caToRgba({ hex: "#ffffff", alpha: 1 }));

  root.setProperty("--cnmd-toggle-bg", caToRgba(ch.surfaceMain));
  root.setProperty("--cnmd-toggle-fg", caToRgba(ch.secondaryText));
  root.setProperty("--cnmd-toggle-hover-bg", caToRgba(ch.surfaceHover));
  root.setProperty("--cnmd-toggle-hover-border", caToRgba(ch.labelText));
  root.setProperty("--cnmd-toggle-hover-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-toggle-hover-shadow", toggleHoverShadow);

  root.setProperty("--cnmd-sidebar-bg", caToRgba(ch.surfaceSidebar));
  root.setProperty("--cnmd-sidebar-border", sidebarBorder);
  root.setProperty("--cnmd-sidebar-drawer-bg", caToRgba(ch.surfaceSidebar));

  root.setProperty("--cnmd-rail-bg", caToRgba(ch.surfaceMain));

  root.setProperty("--cnmd-resizer-bg", caToRgba(ch.borderMuted));
  root.setProperty("--cnmd-resizer-hover-bg", caToRgba(accent));

  root.setProperty("--cnmd-main-bg", caToRgba(ch.surfaceMain));

  root.setProperty("--cnmd-tab-label-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-tab-seg-bg", tabSegBg);
  root.setProperty("--cnmd-tab-thumb-bg", caToRgba(ch.surfaceMain));
  root.setProperty(
    "--cnmd-tab-thumb-shadow",
    `0 1px 3px ${caToRgba({ hex: ch.shadow.hex, alpha: ch.shadow.alpha * (0.08 / 0.12) })},0 0 0 1px ${tabThumbRing}`
  );
  root.setProperty("--cnmd-tab-fg", caToRgba(ch.mutedText));
  root.setProperty("--cnmd-tab-fg-hover", caToRgba(ch.menuButtonFg));
  root.setProperty("--cnmd-tab-active-fg", caToRgba(pr.linkHover));

  root.setProperty("--cnmd-dir-path-bg", caToRgba(ch.surfaceSubtle));
  root.setProperty("--cnmd-dir-path-fg", caToRgba(ch.secondaryText));
  root.setProperty("--cnmd-dir-status-fg", caToRgba(ch.mutedText));
  root.setProperty("--cnmd-dir-error-fg", caToRgba(pr.errorText));

  root.setProperty("--cnmd-dir-item-fg", caToRgba(ch.secondaryText));
  root.setProperty("--cnmd-dir-item-hover-bg", caToRgba(ch.surfaceSubtle));
  root.setProperty("--cnmd-dir-item-hover-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-dir-item-disabled-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-dir-icon-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-dir-folder-icon-fg", caToRgba(accent));
  root.setProperty("--cnmd-dir-folder-fg", caToRgba(ch.primaryText));
  root.setProperty(
    "--cnmd-dir-md-icon-fg",
    caToRgba({ hex: accentStrongHex, alpha: 1 })
  );
  root.setProperty("--cnmd-dir-md-fg", caToRgba(pr.linkHover));
  root.setProperty("--cnmd-dir-up-icon-fg", caToRgba(ch.mutedText));

  root.setProperty("--cnmd-dir-tree-border", dirTreeBorder);
  root.setProperty("--cnmd-dir-tree-row-hover-bg", caToRgba(ch.surfaceSubtle));
  root.setProperty("--cnmd-dir-tree-row-hover-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-dir-tree-file-hover-bg", navActiveBg);
  root.setProperty("--cnmd-dir-tree-file-hover-fg", caToRgba(pr.linkHover));
  root.setProperty("--cnmd-dir-tree-chevron-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-dir-tree-leaf-icon-fg", caToRgba(ch.labelText));
  root.setProperty(
    "--cnmd-dir-tree-leaf-md-icon-fg",
    caToRgba({ hex: accentStrongHex, alpha: 1 })
  );
  root.setProperty("--cnmd-dir-tree-file-fg", caToRgba(pr.linkHover));
  root.setProperty("--cnmd-dir-tree-folder-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-dir-tree-other-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-dir-tree-meta-fg", caToRgba(ch.mutedText));

  root.setProperty("--cnmd-nav-empty-fg", caToRgba(ch.labelText));
  root.setProperty("--cnmd-nav-btn-fg", caToRgba(ch.secondaryText));
  root.setProperty("--cnmd-nav-btn-hover-bg", caToRgba(ch.surfaceSubtle));
  root.setProperty("--cnmd-nav-btn-hover-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-nav-active-bg", navActiveBg);
  root.setProperty("--cnmd-nav-active-fg", caToRgba(pr.linkHover));
  root.setProperty("--cnmd-nav-active-border", caToRgba(accent));
  root.setProperty("--cnmd-nav-h1-fg", caToRgba(ch.primaryText));
  root.setProperty("--cnmd-nav-h4-fg", caToRgba(ch.mutedText));
  root.setProperty("--cnmd-nav-block-fg", caToRgba(ch.mutedText));

  root.setProperty("--cnmd-error-bg", caToRgba(pr.errorBg));
  root.setProperty("--cnmd-error-border", caToRgba(pr.errorBorder));
  root.setProperty("--cnmd-error-fg", caToRgba(pr.errorText));

  root.setProperty("--cnmd-preview-bg", caToRgba(ch.surfaceMain));
  root.setProperty("--cnmd-preview-border-bottom", previewBorderBottom);

  root.setProperty("--cnmd-prose-body", caToRgba(pr.body));
  root.setProperty("--cnmd-prose-heading-major", caToRgba(pr.headingMajor));
  root.setProperty("--cnmd-prose-heading-mid", caToRgba(pr.headingMid));
  root.setProperty("--cnmd-prose-heading-minor", caToRgba(pr.headingMinor));
  root.setProperty("--cnmd-prose-h1-border", caToRgba(pr.hr));
  root.setProperty("--cnmd-prose-link", caToRgba(pr.link));
  root.setProperty("--cnmd-prose-link-hover", caToRgba(pr.linkHover));
  root.setProperty("--cnmd-prose-strong", caToRgba(pr.strong));
  root.setProperty(
    "--cnmd-prose-hr",
    `linear-gradient(90deg,transparent,${caToRgba(pr.hr)},transparent)`
  );
  root.setProperty("--cnmd-prose-marker", caToRgba(pr.marker));
  root.setProperty("--cnmd-prose-bq-fg", caToRgba(pr.blockquoteText));
  root.setProperty("--cnmd-prose-bq-border", caToRgba(pr.blockquoteBorder));
  root.setProperty(
    "--cnmd-prose-bq-bg",
    `linear-gradient(90deg,${caToRgba(pr.blockquoteBg)},transparent)`
  );
  root.setProperty("--cnmd-prose-pre-bg", caToRgba(pr.preBg));
  root.setProperty("--cnmd-prose-pre-fg", caToRgba(pr.preFg));
  root.setProperty("--cnmd-prose-pre-inset", preInset);
  root.setProperty("--cnmd-prose-code-bg", caToRgba(pr.codeInlineBg));
  root.setProperty("--cnmd-prose-code-fg", caToRgba(pr.codeInlineFg));
  root.setProperty("--cnmd-prose-table-border", caToRgba(pr.tableBorder));
  root.setProperty("--cnmd-prose-th-bg", caToRgba(pr.tableHeadBg));
  root.setProperty("--cnmd-prose-th-fg", caToRgba(pr.tableHeadText));
  root.setProperty("--cnmd-prose-td-border", caToRgba(pr.tableBorder));
  root.setProperty("--cnmd-prose-img-shadow", `0 8px 24px ${caToRgba(pr.imgShadow)}`);

  root.setProperty("--cnmd-source-body-bg", caToRgba(src.background));
  root.setProperty("--cnmd-source-body-fg", caToRgba(src.foreground));
  root.setProperty("--cnmd-source-plain-bg", caToRgba(src.background));
  root.setProperty("--cnmd-source-plain-fg", caToRgba(src.foreground));
}

/** Single reactive theme; applied on import so early paint matches saved prefs. */
export const cnmdTheme = reactive(mergeTheme(loadRaw())) as CnmdTheme;
applyCnmdThemeToDocument(cnmdTheme);

export function useCnmdTheme(): {
  theme: CnmdTheme;
  resetToDefaults: () => void;
} {
  return {
    theme: cnmdTheme,
    resetToDefaults() {
      const d = deepCloneTheme(CNMD_THEME_DEFAULTS);
      Object.assign(cnmdTheme.accent, d.accent);
      Object.assign(cnmdTheme.chrome, d.chrome);
      Object.assign(cnmdTheme.prose, d.prose);
      Object.assign(cnmdTheme.source, d.source);
    },
  };
}

export function persistCnmdTheme(): void {
  try {
    localStorage.setItem(CNMD_THEME_STORAGE_KEY, JSON.stringify(cnmdTheme));
  } catch {
    /* ignore */
  }
}

/** Call once from root viewer so deep edits persist and apply. */
export function watchCnmdTheme(): () => void {
  return watchEffect(() => {
    JSON.stringify(cnmdTheme);
    applyCnmdThemeToDocument(cnmdTheme);
    persistCnmdTheme();
  });
}

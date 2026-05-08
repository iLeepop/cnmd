/** Single color with optional opacity (applied as rgba in CSS). */
export interface CnmdColorAlpha {
  hex: string;
  /** 0–1 */
  alpha: number;
}

export interface CnmdTheme {
  accent: CnmdColorAlpha;
  chrome: {
    primaryText: CnmdColorAlpha;
    secondaryText: CnmdColorAlpha;
    mutedText: CnmdColorAlpha;
    labelText: CnmdColorAlpha;
    surfaceMain: CnmdColorAlpha;
    surfaceSidebar: CnmdColorAlpha;
    surfaceHover: CnmdColorAlpha;
    surfaceElevated: CnmdColorAlpha;
    surfaceSubtle: CnmdColorAlpha;
    border: CnmdColorAlpha;
    borderMuted: CnmdColorAlpha;
    overlayHeavy: CnmdColorAlpha;
    overlayLight: CnmdColorAlpha;
    shadow: CnmdColorAlpha;
    menuButtonBg: CnmdColorAlpha;
    menuButtonFg: CnmdColorAlpha;
  };
  prose: {
    body: CnmdColorAlpha;
    headingMajor: CnmdColorAlpha;
    headingMid: CnmdColorAlpha;
    headingMinor: CnmdColorAlpha;
    link: CnmdColorAlpha;
    linkHover: CnmdColorAlpha;
    strong: CnmdColorAlpha;
    hr: CnmdColorAlpha;
    marker: CnmdColorAlpha;
    blockquoteText: CnmdColorAlpha;
    blockquoteBorder: CnmdColorAlpha;
    blockquoteBg: CnmdColorAlpha;
    codeInlineBg: CnmdColorAlpha;
    codeInlineFg: CnmdColorAlpha;
    preBg: CnmdColorAlpha;
    preFg: CnmdColorAlpha;
    tableBorder: CnmdColorAlpha;
    tableHeadBg: CnmdColorAlpha;
    tableHeadText: CnmdColorAlpha;
    errorBg: CnmdColorAlpha;
    errorBorder: CnmdColorAlpha;
    errorText: CnmdColorAlpha;
    imgShadow: CnmdColorAlpha;
  };
  source: {
    background: CnmdColorAlpha;
    foreground: CnmdColorAlpha;
  };
}

export function ca(hex: string, alpha = 1): CnmdColorAlpha {
  return { hex: normalizeHex(hex), alpha };
}

function normalizeHex(hex: string): string {
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  return h.slice(0, 7).toLowerCase();
}

/** Defaults aligned with the original static/md_viewer.css palette. */
export const CNMD_THEME_DEFAULTS: CnmdTheme = {
  accent: ca("#3b82f6", 1),
  chrome: {
    primaryText: ca("#1e293b", 1),
    secondaryText: ca("#475569", 1),
    mutedText: ca("#64748b", 1),
    labelText: ca("#94a3b8", 1),
    surfaceMain: ca("#ffffff", 1),
    surfaceSidebar: ca("#f1f5f9", 1),
    surfaceHover: ca("#f1f5f9", 1),
    surfaceElevated: ca("#f8fafc", 1),
    surfaceSubtle: ca("#e2e8f0", 1),
    border: ca("#e2e8f0", 1),
    borderMuted: ca("#cbd5e1", 1),
    overlayHeavy: ca("#0f172a", 0.4),
    overlayLight: ca("#0f172a", 0.18),
    shadow: ca("#0f172a", 0.12),
    menuButtonBg: ca("#ffffff", 0.96),
    menuButtonFg: ca("#334155", 1),
  },
  prose: {
    body: ca("#334155", 1),
    headingMajor: ca("#0f172a", 1),
    headingMid: ca("#1e293b", 1),
    headingMinor: ca("#475569", 1),
    link: ca("#2563eb", 1),
    linkHover: ca("#1d4ed8", 1),
    strong: ca("#0f172a", 1),
    hr: ca("#e2e8f0", 1),
    marker: ca("#94a3b8", 1),
    blockquoteText: ca("#475569", 1),
    blockquoteBorder: ca("#93c5fd", 1),
    blockquoteBg: ca("#eff6ff", 0.9),
    codeInlineBg: ca("#f1f5f9", 1),
    codeInlineFg: ca("#0f172a", 1),
    preBg: ca("#0f172a", 1),
    preFg: ca("#e2e8f0", 1),
    tableBorder: ca("#e2e8f0", 1),
    tableHeadBg: ca("#f8fafc", 1),
    tableHeadText: ca("#0f172a", 1),
    errorBg: ca("#fef2f2", 1),
    errorBorder: ca("#fecdd3", 1),
    errorText: ca("#b91c1c", 1),
    imgShadow: ca("#0f172a", 0.1),
  },
  source: {
    background: ca("#ffffff", 1),
    foreground: ca("#111111", 1),
  },
};

export const CNMD_THEME_STORAGE_KEY = "cnmd_theme_v1";

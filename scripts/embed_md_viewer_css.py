#!/usr/bin/env python3
"""Inline static/md_viewer.css into static/md_file_inject.js (const CSS + sync inject)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS_PATH = ROOT / "static" / "md_viewer.css"
JS_PATH = ROOT / "static" / "md_file_inject.js"

BUILD_DOM_TAIL = """    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    renderMain();
  }"""

OLD_FETCH_BLOCK = """    const injectStyleFromText = (cssText) => {
      const style = document.createElement("style");
      style.textContent = cssText;
      document.head.appendChild(style);
      renderMain();
    };

    if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
      const cssUrl = chrome.runtime.getURL(MD_VIEWER_CSS);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.onload = () => renderMain();
      link.onerror = () => {
        console.warn("[Cnmd] <link> stylesheet failed, trying fetch…", cssUrl);
        fetch(cssUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
          })
          .then(injectStyleFromText)
          .catch((err) => {
            console.error("[Cnmd] failed to load", MD_VIEWER_CSS, err);
            renderMain();
          });
      };
      document.head.appendChild(link);
      return;
    }

    console.warn("[Cnmd] chrome.runtime.getURL unavailable; skipping stylesheet");
    renderMain();
  }"""


def main() -> None:
    css = CSS_PATH.read_text(encoding="utf8")
    css_esc = css.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    js = JS_PATH.read_text(encoding="utf8")

    js = js.replace("/* global marked, DOMPurify, chrome */", "/* global marked, DOMPurify */")
    js = js.replace('  const MD_VIEWER_CSS = "md_viewer.css";\n', "")

    if OLD_FETCH_BLOCK in js:
        js = js.replace(OLD_FETCH_BLOCK, BUILD_DOM_TAIL)
    elif "style.textContent = CSS" in js:
        pass
    else:
        raise SystemExit(
            "md_file_inject.js: unknown buildDom() stylesheet pattern "
            "(expected legacy fetch/link block or style.textContent = CSS)"
        )

    css_block = f"  const CSS = `{css_esc}`;\n"
    if "  const CSS = `" in js:
        start = js.find("  const CSS = `")
        end = js.find("`;", start)
        if end == -1:
            raise SystemExit("md_file_inject.js: unterminated const CSS")
        js = js[:start] + css_block + js[end + 2 :]
    else:
        needle = "  let outlineScrollCleanup = null;\n\n"
        if needle not in js:
            raise SystemExit("md_file_inject.js: outlineScrollCleanup anchor missing")
        js = js.replace(needle, needle + css_block, 1)

    JS_PATH.write_text(js, encoding="utf8")
    print(f"embed_md_viewer_css: inlined {CSS_PATH.name} → {JS_PATH.name}")


if __name__ == "__main__":
    main()

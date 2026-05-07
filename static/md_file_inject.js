/* global marked, DOMPurify */
(() => {
  const loc = window.location;
  if (loc.protocol !== "file:") return;

  const path = loc.pathname.toLowerCase();
  if (!/\.(md|markdown)$/.test(path)) return;

  let displayName = decodeURIComponent(
    (loc.pathname.split(/[/\\]/).pop() || "document.md").replace(/\+/g, " ")
  );

  let rawMarkdown = (document.body && document.body.innerText) || "";
  rawMarkdown = rawMarkdown.replace(/\r\n/g, "\n");

  let viewMode = "rendered"; // rendered | source
  let menuOpen = false;
  let panelOpen = false;
  let outlineScrollCleanup = null;

  const CSS = `:root{color-scheme:light;--cnmd-rail:44px;--cnmd-sb:260px;--cnmd-split:5px}
body{margin:0}
.cnmd-root{box-sizing:border-box;min-height:100vh;padding-top:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","PingFang SC","Microsoft YaHei",sans-serif;color:#1e293b;margin:0}
.cnmd-menu-button{
  position:fixed;top:12px;right:16px;z-index:10001;display:flex;flex-direction:column;justify-content:center;gap:4px;width:36px;height:36px;padding:8px;
  border:1px solid rgba(203,213,225,.65);border-radius:10px;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);cursor:pointer;box-shadow:0 1px 5px rgba(15,23,42,.05);
  transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;
}
.cnmd-menu-button:hover{border-color:rgba(148,163,184,.55);background:#fff}
.cnmd-menu-button:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}
.cnmd-menu-bar{display:block;height:2px;border-radius:1px;background:#334155}
.cnmd-menu-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.18)}
.cnmd-menu-dropdown{
  position:fixed;top:54px;right:16px;z-index:10002;min-width:208px;padding:8px;border:1px solid rgba(226,232,240,.95);border-radius:14px;
  background:rgba(255,255,255,.97);backdrop-filter:blur(10px);box-shadow:0 16px 48px rgba(15,23,42,.12);
}
.cnmd-menu-item{display:block;width:100%;padding:11px 14px;border:none;border-radius:8px;background:transparent;font-size:14px;text-align:left;color:#1e293b;cursor:pointer;transition:background-color .15s ease}
.cnmd-menu-item:hover{background:#f1f5f9}
.cnmd-menu-item:focus-visible{outline:2px solid #3b82f6;outline-offset:-2px}
.cnmd-open-file-panel{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.4)}
.cnmd-dropzone{max-width:520px;width:100%;margin:0;padding:40px 24px;text-align:center;border:2px dashed #cbd5e1;border-radius:16px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.12);color:#475569}
.cnmd-dropzone.cnmd-dropzone-active{border-color:#3b82f6;background:#eff6ff;color:#1e40af}
.cnmd-btn{appearance:none;border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:10px 18px;font-size:14px;cursor:pointer;margin-top:12px;font-weight:500;color:#334155;transition:background-color .15s ease,border-color .15s ease}
.cnmd-btn:hover{background:#f8fafc;border-color:#cbd5e1}
.cnmd-btn:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}
.cnmd-btn-primary{position:relative;overflow:hidden;display:inline-block;margin-top:16px;background:linear-gradient(180deg,#3b82f6,#2563eb);border:none;color:#fff;transition:filter .15s ease}
.cnmd-btn-primary:hover{filter:brightness(1.05)}
.cnmd-btn-primary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.cnmd-file-input{position:absolute;inset:0;opacity:0;cursor:pointer}
.cnmd-sidebar-toggle-btn{
  box-sizing:border-box;width:32px;height:32px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;
  border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-size:14px;line-height:1;color:#475569;cursor:pointer;flex-shrink:0;
  transition:background-color .15s ease,border-color .15s ease,color .15s ease;
}
.cnmd-sidebar-toggle-btn:hover{background:#f1f5f9;border-color:#94a3b8;color:#0f172a}
.cnmd-sidebar-toggle-btn:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}
.cnmd-sidebar{
  position:fixed;left:0;top:0;z-index:8;box-sizing:border-box;height:100vh;width:var(--cnmd-sb);margin:0;padding:0;background:#f1f5f9;border-right:1px solid rgba(226,232,240,.8);overflow:hidden;
  transition:width .28s cubic-bezier(0.4,0,0.2,1);
}
.cnmd-root.cnmd--sidebar-hidden .cnmd-sidebar{width:0;border-right:none}
.cnmd-sidebar-track{display:flex;flex-direction:row;height:100%;width:var(--cnmd-sb);transform:translateX(0);transition:transform .28s cubic-bezier(0.4,0,0.2,1)}
.cnmd-root.cnmd--sidebar-hidden .cnmd-sidebar-track{transform:translateX(calc(-1 * var(--cnmd-sb)))}
.cnmd-sidebar-drawer{
  flex:0 0 var(--cnmd-sb);width:var(--cnmd-sb);box-sizing:border-box;display:flex;flex-direction:column;padding:52px 12px 16px 10px;overflow:hidden;background:#f1f5f9;
}
.cnmd-root.cnmd--sidebar-hidden .cnmd-sidebar-drawer{pointer-events:none}
.cnmd-sidebar-rail{
  position:fixed;top:0;left:calc(var(--cnmd-sb) + var(--cnmd-split));z-index:10;box-sizing:border-box;width:var(--cnmd-rail);height:100vh;margin:0;padding:12px 6px 16px;gap:10px;
  display:flex;flex-direction:column;align-items:center;background:#fff;
  transition:left .28s cubic-bezier(0.4,0,0.2,1);
}
.cnmd-root.cnmd--sidebar-hidden .cnmd-sidebar-rail{left:0}
.cnmd-root.cnmd--resizing .cnmd-sidebar,.cnmd-root.cnmd--resizing .cnmd-sidebar-track,.cnmd-root.cnmd--resizing .cnmd-resizer,.cnmd-root.cnmd--resizing .cnmd-main-column,.cnmd-root.cnmd--resizing .cnmd-sidebar-rail{transition:none!important}
.cnmd-sidebar-rail-stack{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;width:100%;min-height:0}
.cnmd-resizer{
  position:fixed;left:var(--cnmd-sb);top:0;z-index:9;width:var(--cnmd-split);height:100vh;margin:0;padding:0;cursor:col-resize;background:#cbd5e1;touch-action:none;
  transition:left .28s cubic-bezier(0.4,0,0.2,1),opacity .2s ease,width .28s cubic-bezier(0.4,0,0.2,1),background-color .15s ease;
}
.cnmd-root.cnmd--sidebar-hidden .cnmd-resizer{left:0;width:0;opacity:0;pointer-events:none}
.cnmd-resizer:hover,.cnmd-resizer.cnmd-resizer--drag{background:#3b82f6}
.cnmd-main-column{
  display:flex;flex-direction:row;align-items:stretch;margin:0 0 0 calc(var(--cnmd-sb) + var(--cnmd-split));padding:0;min-height:100vh;
  width:calc(100vw - var(--cnmd-sb) - var(--cnmd-split));max-width:none;box-sizing:border-box;background:#fff;
  transition:margin-left .28s cubic-bezier(0.4,0,0.2,1),width .28s cubic-bezier(0.4,0,0.2,1);
}
.cnmd-root.cnmd--sidebar-hidden .cnmd-main-column{margin-left:0!important;width:100vw!important}
.cnmd-main-column > article.cnmd-preview{flex:1;min-width:0;margin-left:var(--cnmd-rail)}
.cnmd-sidebar-title{flex-shrink:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:0 0 8px 4px}
.cnmd-sidebar-nav{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;list-style:none;margin:0;padding:0 2px 8px 0}
.cnmd-sidebar-empty{font-size:13px;color:#94a3b8;line-height:1.5;padding:4px}
.cnmd-sidebar-nav li{margin:2px 0}
.cnmd-sidebar-nav button{
  display:block;width:100%;text-align:left;padding:8px 10px;border:none;border-radius:8px;background:transparent;font-size:13px;line-height:1.35;color:#475569;cursor:pointer;border-left:3px solid transparent;
  transition:background-color .15s ease,color .15s ease;
}
.cnmd-sidebar-nav button:hover{background:#e2e8f0;color:#0f172a}
.cnmd-sidebar-nav button.cnmd-nav-active{background:#dbeafe;color:#1d4ed8;border-left-color:#3b82f6;font-weight:600}
.cnmd-sidebar-nav button:focus-visible{outline:2px solid #3b82f6;outline-offset:-2px}
.cnmd-sidebar-nav .cnmd-nav-h1{padding-left:8px;font-weight:600;color:#0f172a}
.cnmd-sidebar-nav .cnmd-nav-h2{padding-left:14px}
.cnmd-sidebar-nav .cnmd-nav-h3{padding-left:20px;font-size:12.5px}
.cnmd-sidebar-nav .cnmd-nav-h4{padding-left:26px;font-size:12.5px;color:#64748b}
.cnmd-sidebar-nav .cnmd-nav-h5,.cnmd-sidebar-nav .cnmd-nav-h6{padding-left:30px;font-size:12px;color:#64748b}
.cnmd-sidebar-nav .cnmd-nav-block{padding-left:8px;font-size:12.5px;color:#64748b}
.cnmd-error{margin:16px 0;padding:14px 16px;border-radius:12px;background:#fef2f2;border:1px solid #fecdd3;color:#b91c1c;font-size:14px}
article.cnmd-preview{margin:0;padding:40px 48px 56px 48px;width:100%;max-width:none;background:#fff;border-radius:0;border:none;border-bottom:1px solid rgba(226,232,240,.9);box-sizing:border-box}
@media(max-width:640px){article.cnmd-preview{padding:28px 20px 40px}}
.cnmd-prose{font-size:17px;line-height:1.75;color:#334155;letter-spacing:.01em}
.cnmd-prose>:first-child{margin-top:0}
.cnmd-prose h1,.cnmd-prose h2,.cnmd-prose h3,.cnmd-prose h4,.cnmd-prose h5,.cnmd-prose h6{font-weight:700;color:#0f172a;letter-spacing:-.02em;scroll-margin-top:72px}
.cnmd-prose h1{font-size:2rem;line-height:1.2;margin:0 0 1rem;padding-bottom:.6rem;border-bottom:1px solid #e2e8f0}
.cnmd-prose h2{font-size:1.45rem;margin:2rem 0 .75rem}
.cnmd-prose h3{font-size:1.2rem;margin:1.75rem 0 .5rem}
.cnmd-prose h4{font-size:1.05rem;margin:1.5rem 0 .4rem;color:#1e293b}
.cnmd-prose h5,.cnmd-prose h6{font-size:1rem;margin:1.25rem 0 .35rem;color:#475569}
.cnmd-prose p{margin:.9em 0}
.cnmd-prose a{color:#2563eb;text-decoration-thickness:1px;text-underline-offset:3px}
.cnmd-prose a:hover{color:#1d4ed8}
.cnmd-prose strong{color:#0f172a}
.cnmd-prose hr{border:none;height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);margin:2.5em 0}
.cnmd-prose ul,.cnmd-prose ol{padding-left:1.35em;margin:.85em 0}
.cnmd-prose li{margin:.35em 0}
.cnmd-prose li::marker{color:#94a3b8}
.cnmd-prose blockquote{margin:1.25em 0;padding:.6em 0 .6em 1.1em;border-left:4px solid #93c5fd;background:linear-gradient(90deg,rgba(239,246,255,.9),transparent);border-radius:0 8px 8px 0;color:#475569;font-style:italic}
.cnmd-prose pre{margin:1.25em 0;padding:18px 20px;overflow:auto;border-radius:14px;background:#0f172a;color:#e2e8f0;font-size:14px;line-height:1.55;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.cnmd-prose pre code{background:transparent;color:inherit;font-size:inherit}
.cnmd-prose code:not(pre code){padding:.15em .45em;border-radius:6px;background:#f1f5f9;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.88em}
.cnmd-prose table{border-collapse:separate;border-spacing:0;width:100%;margin:1.5em 0;font-size:15px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
.cnmd-prose th,.cnmd-prose td{border-bottom:1px solid #e2e8f0;padding:10px 14px;text-align:left}
.cnmd-prose th{background:#f8fafc;font-weight:600;color:#0f172a}
.cnmd-prose tr:last-child td{border-bottom:none}
.cnmd-prose img{max-width:100%;height:auto;border-radius:12px;margin:1em 0;box-shadow:0 8px 24px rgba(15,23,42,.1)}
.cnmd-body-source{margin:0;padding:0;background:#fff;color:#111}
.cnmd-body-source #cnmd-source-plain{display:block;margin:0;padding:56px 16px 24px;min-height:100vh;box-sizing:border-box;border:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;white-space:pre;overflow-wrap:normal;tab-size:2;background:#fff;color:inherit}
@media (prefers-reduced-motion: reduce){
  .cnmd-menu-button,.cnmd-menu-item,.cnmd-sidebar-toggle-btn,.cnmd-btn,.cnmd-btn-primary,.cnmd-sidebar-nav button,.cnmd-resizer{transition-duration:0.01ms!important}
}
`;



  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function mdToSafeHtml(md) {
    try {
      const dirty = marked.parse(md);
      return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
    } catch (e) {
      return `<p class="cnmd-error">Markdown 解析错误：${escapeHtml(String(e))}</p>`;
    }
  }

  function buildOutline() {
    const article = document.getElementById("cnmd-article");
    const nav = document.getElementById("cnmd-sidebar-nav");
    if (!article || !nav) return;

    if (outlineScrollCleanup) {
      outlineScrollCleanup();
      outlineScrollCleanup = null;
    }

    nav.innerHTML = "";
    const items = [];

    const headings = article.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length) {
      headings.forEach((el, i) => {
        el.id = `cnmd-sec-${i}`;
        const level = Number(el.tagName.slice(1)) || 1;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `cnmd-nav-h${Math.min(6, Math.max(1, level))}`;
        btn.textContent = el.textContent.trim() || `标题 ${i + 1}`;
        btn.addEventListener("click", () => {
          document.getElementById(el.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        li.appendChild(btn);
        nav.appendChild(li);
        items.push({ el, btn });
      });
    } else {
      const blocks = article.querySelectorAll(
        ":scope > p, :scope > pre, :scope > ul, :scope > ol, :scope > blockquote, :scope > table"
      );
      let n = 0;
      blocks.forEach((el) => {
        const t = (el.textContent || "").trim().replace(/\s+/g, " ");
        if (!t && el.tagName !== "PRE") return;
        el.id = `cnmd-b-${n}`;
        n += 1;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cnmd-nav-block";
        const preview = (t || "(空)").slice(0, 52) + (t.length > 52 ? "…" : "");
        btn.textContent = preview || `段落 ${n}`;
        btn.addEventListener("click", () => {
          document.getElementById(el.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        li.appendChild(btn);
        nav.appendChild(li);
        items.push({ el, btn });
      });
      if (!nav.children.length) {
        nav.innerHTML = '<li class="cnmd-sidebar-empty">（暂无段落导航）</li>';
        return;
      }
    }

    if (!items.length) {
      nav.innerHTML = '<li class="cnmd-sidebar-empty">（暂无段落导航）</li>';
      return;
    }

    const updateActive = () => {
      const margin = 100;
      let active = 0;
      for (let i = items.length - 1; i >= 0; i--) {
        const rect = items[i].el.getBoundingClientRect();
        if (rect.top <= margin) {
          active = i;
          break;
        }
      }
      items.forEach(({ btn }, i) => btn.classList.toggle("cnmd-nav-active", i === active));
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateActive();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateActive();
    outlineScrollCleanup = () => window.removeEventListener("scroll", onScroll);
  }

  function mountSourceShell() {
    document.body.className = "cnmd-body-source";
    document.body.innerHTML = `
<button type="button" class="cnmd-menu-button" id="cnmd-menu-btn" aria-label="Menu" aria-expanded="false">
  <span class="cnmd-menu-bar"></span><span class="cnmd-menu-bar"></span><span class="cnmd-menu-bar"></span>
</button>
<div id="cnmd-menu-layer" style="display:none"></div>
<div id="cnmd-panel-layer" style="display:none"></div>
<pre id="cnmd-source-plain"></pre>`;
    document.getElementById("cnmd-source-plain").textContent = rawMarkdown;
  }

  function mountRenderedShell() {
    document.body.className = "";
    document.body.innerHTML = `
<div class="cnmd-root" id="cnmd-root">
  <button type="button" class="cnmd-menu-button" id="cnmd-menu-btn" aria-label="Menu" aria-expanded="false">
    <span class="cnmd-menu-bar"></span><span class="cnmd-menu-bar"></span><span class="cnmd-menu-bar"></span>
  </button>
  <div id="cnmd-menu-layer" style="display:none"></div>
  <div id="cnmd-panel-layer" style="display:none"></div>
  <aside class="cnmd-sidebar" id="cnmd-sidebar" aria-label="大纲侧栏">
    <div class="cnmd-sidebar-track" id="cnmd-sidebar-track">
      <div class="cnmd-sidebar-drawer" id="cnmd-sidebar-drawer">
        <p class="cnmd-sidebar-title">大纲</p>
        <ul class="cnmd-sidebar-nav" id="cnmd-sidebar-nav"></ul>
      </div>
    </div>
  </aside>
  <div class="cnmd-resizer" id="cnmd-resizer" role="separator" aria-orientation="vertical" aria-label="拖拽调整侧栏与主视图宽度" title="拖拽调整宽度"></div>
  <div class="cnmd-main-column" id="cnmd-main-column">
    <div class="cnmd-sidebar-rail" id="cnmd-sidebar-rail" aria-label="工具栏">
      <button type="button" class="cnmd-sidebar-toggle-btn" id="cnmd-sidebar-hide" aria-label="收起大纲" title="收起大纲">◀</button>
      <div class="cnmd-sidebar-rail-stack" id="cnmd-sidebar-rail-stack"></div>
    </div>
    <article class="cnmd-preview cnmd-prose" id="cnmd-article"></article>
  </div>
</div>`;

    const stored = parseInt(localStorage.getItem("cnmd_sb_w"), 10);
    if (!Number.isNaN(stored)) {
      const clamped = Math.min(560, Math.max(160, stored));
      document.documentElement.style.setProperty("--cnmd-sb", `${clamped}px`);
    }

    const root = document.getElementById("cnmd-root");
    const collapsed = localStorage.getItem("cnmd_sidebar_hidden") === "1";
    if (collapsed) root.classList.add("cnmd--sidebar-hidden");
    syncSidebarToggleUi(collapsed);
  }

  function syncSidebarToggleUi(collapsed) {
    const btn = document.getElementById("cnmd-sidebar-hide");
    if (!btn) return;
    if (collapsed) {
      btn.textContent = "▶";
      btn.setAttribute("aria-label", "展开大纲");
      btn.title = "展开大纲";
    } else {
      btn.textContent = "◀";
      btn.setAttribute("aria-label", "收起大纲");
      btn.title = "收起大纲";
    }
  }

  function wireResizer() {
    const rz = document.getElementById("cnmd-resizer");
    const root = document.getElementById("cnmd-root");
    if (!rz || !root) return;
    let startX = 0;
    let startW = 0;

    const onMove = (e) => {
      const dx = e.clientX - startX;
      let w = startW + dx;
      w = Math.min(560, Math.max(160, w));
      document.documentElement.style.setProperty("--cnmd-sb", `${w}px`);
    };

    const onUp = () => {
      rz.classList.remove("cnmd-resizer--drag");
      root.classList.remove("cnmd--resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const v = getComputedStyle(document.documentElement).getPropertyValue("--cnmd-sb").trim();
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) localStorage.setItem("cnmd_sb_w", String(n));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    rz.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (root.classList.contains("cnmd--sidebar-hidden")) return;
      e.preventDefault();
      rz.classList.add("cnmd-resizer--drag");
      root.classList.add("cnmd--resizing");
      startX = e.clientX;
      const cur = getComputedStyle(document.documentElement).getPropertyValue("--cnmd-sb").trim();
      startW = parseInt(cur, 10) || 260;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function wireSidebarToggle() {
    const root = document.getElementById("cnmd-root");
    const toggleBtn = document.getElementById("cnmd-sidebar-hide");
    if (!root || !toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      const next = !root.classList.contains("cnmd--sidebar-hidden");
      root.classList.toggle("cnmd--sidebar-hidden", next);
      localStorage.setItem("cnmd_sidebar_hidden", next ? "1" : "0");
      syncSidebarToggleUi(next);
    });
  }

  function renderMain() {
    if (viewMode === "source") {
      if (outlineScrollCleanup) {
        outlineScrollCleanup();
        outlineScrollCleanup = null;
      }
      mountSourceShell();
      wireMenuAndPanel();
      return;
    }

    mountRenderedShell();
    wireResizer();
    wireSidebarToggle();
    wireMenuAndPanel();

    const article = document.getElementById("cnmd-article");
    if (!article) return;
    article.innerHTML = mdToSafeHtml(rawMarkdown);
    buildOutline();
  }

  function wireMenuAndPanel() {
    const menuBtn = document.getElementById("cnmd-menu-btn");
    const menuLayer = document.getElementById("cnmd-menu-layer");
    const panelLayer = document.getElementById("cnmd-panel-layer");
    if (!menuBtn || !menuLayer || !panelLayer) return;

    function closeMenu() {
      menuOpen = false;
      menuBtn.setAttribute("aria-expanded", "false");
      menuLayer.style.display = "none";
      menuLayer.innerHTML = "";
    }

    function openMenu() {
      menuOpen = true;
      menuBtn.setAttribute("aria-expanded", "true");
      menuLayer.style.display = "block";
      const srcLabel = viewMode === "source" ? "显示预览" : "显示原文";
      menuLayer.innerHTML = `
<div class="cnmd-menu-backdrop" id="cnmd-backdrop"></div>
<nav class="cnmd-menu-dropdown">
  <button type="button" class="cnmd-menu-item" id="cnmd-m-open">打开文件</button>
  <button type="button" class="cnmd-menu-item" id="cnmd-m-src">${srcLabel}</button>
</nav>`;
      document.getElementById("cnmd-backdrop").addEventListener("click", closeMenu);
      document.getElementById("cnmd-m-open").addEventListener("click", () => {
        closeMenu();
        openFilePanel();
      });
      document.getElementById("cnmd-m-src").addEventListener("click", () => {
        closeMenu();
        viewMode = viewMode === "source" ? "rendered" : "source";
        renderMain();
      });
    }

    menuBtn.addEventListener("click", () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });

    function closePanel() {
      panelOpen = false;
      panelLayer.style.display = "none";
      panelLayer.innerHTML = "";
    }

    function openFilePanel() {
      panelLayer.style.display = "block";
      panelLayer.innerHTML = `
<div class="cnmd-open-file-panel">
  <div class="cnmd-dropzone" id="cnmd-dz">
    <p>将 Markdown 文件拖到此处，或点击下方按钮选择。</p>
    <label class="cnmd-btn cnmd-btn-primary">选择文件
      <input type="file" class="cnmd-file-input" id="cnmd-file" accept=".md,.markdown,text/markdown"/>
    </label>
    <div><button type="button" class="cnmd-btn" id="cnmd-panel-close">关闭</button></div>
  </div>
</div>`;
      const dz = document.getElementById("cnmd-dz");
      dz.addEventListener("dragover", (e) => {
        e.preventDefault();
        dz.classList.add("cnmd-dropzone-active");
      });
      dz.addEventListener("dragleave", () => dz.classList.remove("cnmd-dropzone-active"));
      dz.addEventListener("drop", (e) => {
        e.preventDefault();
        dz.classList.remove("cnmd-dropzone-active");
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) loadFile(f);
      });
      document.getElementById("cnmd-file").addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) loadFile(f);
        e.target.value = "";
      });
      document.getElementById("cnmd-panel-close").addEventListener("click", closePanel);
      panelLayer.querySelector(".cnmd-open-file-panel").addEventListener("click", (e) => {
        if (e.target.classList.contains("cnmd-open-file-panel")) closePanel();
      });
    }

    function loadFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        rawMarkdown = String(reader.result || "").replace(/\r\n/g, "\n");
        displayName = file.name || displayName;
        viewMode = "rendered";
        closePanel();
        renderMain();
      };
      reader.readAsText(file);
    }
  }

  function buildDom() {
    document.documentElement.setAttribute("lang", "zh-CN");
    document.head.replaceChildren();
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    document.head.appendChild(meta);
    const viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    viewport.setAttribute("content", "width=device-width, initial-scale=1");
    document.head.appendChild(viewport);
    const title = document.createElement("title");
    title.textContent = displayName;
    document.head.appendChild(title);

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    renderMain();
  }

  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    console.error("[Cnmd] marked or DOMPurify not loaded");
    return;
  }

  buildDom();
})();

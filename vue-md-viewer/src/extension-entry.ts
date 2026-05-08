import { createApp } from "vue";
import viewerCss from "../../static/md_viewer.css?raw";
import MdViewerApp from "./MdViewerApp.vue";

(function cnmdBootstrap() {
  const loc = window.location;
  if (loc.protocol !== "file:") return;

  const pathLower = loc.pathname.toLowerCase();
  if (!/\.(md|markdown)$/.test(pathLower)) return;

  const initialTitle = decodeURIComponent(
    (loc.pathname.split(/[/\\]/).pop() || "document.md").replace(/\+/g, " ")
  );
  const initialMarkdown = (
    (document.body && document.body.innerText) ||
    ""
  ).replace(/\r\n/g, "\n");

  document.documentElement.setAttribute("lang", "zh-CN");
  document.head.replaceChildren();

  const charset = document.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  document.head.appendChild(charset);

  const viewport = document.createElement("meta");
  viewport.setAttribute("name", "viewport");
  viewport.setAttribute("content", "width=device-width, initial-scale=1");
  document.head.appendChild(viewport);

  const titleEl = document.createElement("title");
  titleEl.textContent = initialTitle;
  document.head.appendChild(titleEl);

  const style = document.createElement("style");
  style.textContent = viewerCss;
  document.head.appendChild(style);

  document.body.replaceChildren();
  const mountEl = document.createElement("div");
  mountEl.id = "cnmd-app-root";
  document.body.appendChild(mountEl);

  createApp(MdViewerApp, {
    initialMarkdown,
    initialTitle,
  }).mount(mountEl);
})();

import { gfm } from "@joplin/turndown-plugin-gfm";
import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";

marked.use({ gfm: true });

let turndown: TurndownService | undefined;

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });
    turndown.use(gfm);
  }
  return turndown;
}

export function markdownToHtml(md: string): string {
  try {
    const dirty = marked.parse(md, { async: false }) as string;
    return DOMPurify.sanitize(dirty, {
      USE_PROFILES: { html: true },
    });
  } catch (e) {
    const msg = String(e)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<p class="cnmd-error">Markdown 解析错误：${msg}</p>`;
  }
}

export function htmlToMarkdown(html: string): string {
  return getTurndown().turndown(html || "");
}

// Prepended to oxichrome-generated background.js by patch-background-dir-fetch.sh.
// Content scripts cannot fetch(file://...); the service worker can with host_permissions.
// Save uses offscreen document + File System Access API (see static/cnmd-offscreen-save.js).

const CNMD_OFFSCREEN_PAGE = "cnmd-offscreen.html";

async function ensureOffscreenDocument() {
  if (!chrome.offscreen) {
    throw new Error("chrome.offscreen API unavailable");
  }
  const url = chrome.runtime.getURL(CNMD_OFFSCREEN_PAGE);
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url],
  });
  if (existing.length > 0) return;
  await chrome.offscreen.createDocument({
    url,
    reasons: ["WORKERS"],
    justification: "Save local markdown files via File System Access API",
  });
}

function forwardToOffscreen(payload) {
  return ensureOffscreenDocument().then(
    () =>
      new Promise((resolve) => {
        chrome.runtime.sendMessage(payload, (res) => {
          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              error: String(chrome.runtime.lastError.message),
            });
          } else {
            resolve(res || { ok: false, error: "no response from offscreen" });
          }
        });
      })
  );
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (
    msg &&
    msg.type === "CNMD_FETCH_FILE" &&
    typeof msg.url === "string" &&
    msg.url.startsWith("file:")
  ) {
    fetch(msg.url)
      .then(async (r) => {
        const text = await r.text();
        // Chromium：file:// 成功时常见 status === 0，此时 ok 仍为 false
        if (r.status === 0 || r.ok) return text;
        throw new Error("HTTP " + r.status);
      })
      .then((text) => sendResponse({ ok: true, text }))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e && e.message ? String(e.message) : String(e),
        })
      );
    return true;
  }

  if (
    msg &&
    msg.type === "CNMD_ENSURE_WRITE_HANDLE" &&
    typeof msg.fileUrl === "string"
  ) {
    forwardToOffscreen({
      type: "CNMD_OFFSCREEN_ENSURE_HANDLE",
      fileUrl: msg.fileUrl,
    }).then(sendResponse);
    return true;
  }

  if (
    msg &&
    msg.type === "CNMD_WRITE_FILE" &&
    typeof msg.fileUrl === "string" &&
    typeof msg.text === "string"
  ) {
    forwardToOffscreen({
      type: "CNMD_OFFSCREEN_WRITE",
      fileUrl: msg.fileUrl,
      text: msg.text,
    }).then(sendResponse);
    return true;
  }
});

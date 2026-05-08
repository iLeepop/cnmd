// Prepended to oxichrome-generated background.js by patch-background-dir-fetch.sh.
// Content scripts cannot fetch(file://...); the service worker can with host_permissions.
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
});

// Offscreen page: File System Access API + IndexedDB handle cache (extension origin).
(function () {
  const DB_NAME = "cnmd-offscreen";
  const STORE = "write-handles";
  const OFFSCREEN_PAGE = "cnmd-offscreen.html";

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getHandle(fileUrl) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(fileUrl);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function putHandle(fileUrl, handle) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, fileUrl);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function ensureHandle(fileUrl) {
    let handle = await getHandle(fileUrl);
    if (handle) {
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") return handle;
      const req = await handle.requestPermission({ mode: "readwrite" });
      if (req === "granted") return handle;
    }
    const [picked] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Markdown",
          accept: { "text/markdown": [".md", ".markdown"] },
        },
      ],
    });
    handle = picked;
    await putHandle(fileUrl, handle);
    return handle;
  }

  async function writeText(fileUrl, text) {
    const handle = await ensureHandle(fileUrl);
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  function respond(sendResponse, promise) {
    promise
      .then(() => sendResponse({ ok: true }))
      .catch((e) =>
        sendResponse({
          ok: false,
          error: e && e.message ? String(e.message) : String(e),
        })
      );
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "CNMD_OFFSCREEN_ENSURE_HANDLE") {
      if (typeof msg.fileUrl !== "string") {
        sendResponse({ ok: false, error: "missing fileUrl" });
        return true;
      }
      respond(sendResponse, ensureHandle(msg.fileUrl).then(() => {}));
      return true;
    }
    if (msg.type === "CNMD_OFFSCREEN_WRITE") {
      if (typeof msg.fileUrl !== "string" || typeof msg.text !== "string") {
        sendResponse({ ok: false, error: "missing fileUrl or text" });
        return true;
      }
      respond(sendResponse, writeText(msg.fileUrl, msg.text));
      return true;
    }
    if (msg.type === "CNMD_OFFSCREEN_PING") {
      sendResponse({ ok: true, page: OFFSCREEN_PAGE });
      return true;
    }
  });
})();

/** 经 background + offscreen 用 File System Access API 写回 file:// 文件。 */

type CnmdIoResponse = { ok?: boolean; error?: string };

function extensionSendMessage(payload: object): Promise<CnmdIoResponse> {
  const g = globalThis as typeof globalThis & {
    chrome?: { runtime?: { sendMessage: (m: object) => Promise<unknown> } };
  };
  const send = g.chrome?.runtime?.sendMessage;
  if (typeof send !== "function") {
    return Promise.reject(
      new Error("扩展运行时不可用，无法保存到本地文件")
    );
  }
  return send(payload).then((raw) => {
    if (raw && typeof raw === "object") return raw as CnmdIoResponse;
    return { ok: false, error: "empty response" };
  });
}

export function getFileUrl(): string | null {
  if (window.location.protocol === "file:") return window.location.href;
  return null;
}

export async function ensureWriteHandle(fileUrl: string): Promise<void> {
  const res = await extensionSendMessage({
    type: "CNMD_ENSURE_WRITE_HANDLE",
    fileUrl,
  });
  if (res.ok === true) return;
  throw new Error(
    typeof res.error === "string" ? res.error : "CNMD_ENSURE_WRITE_HANDLE failed"
  );
}

export async function writeFileText(
  fileUrl: string,
  text: string
): Promise<void> {
  const res = await extensionSendMessage({
    type: "CNMD_WRITE_FILE",
    fileUrl,
    text,
  });
  if (res.ok === true) return;
  throw new Error(
    typeof res.error === "string" ? res.error : "CNMD_WRITE_FILE failed"
  );
}

export async function saveMarkdown(
  fileUrl: string,
  text: string
): Promise<void> {
  await ensureWriteHandle(fileUrl);
  await writeFileText(fileUrl, text);
}

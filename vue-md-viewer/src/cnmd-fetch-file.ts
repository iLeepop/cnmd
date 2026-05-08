/** Content script 无法对 file:// 使用 fetch；经 background 转发（构建时将 scripts/sw-fetch-prelude.js 拼入 background，见 scripts/unix 或 scripts/windows 下的 patch-background-dir-fetch）。 */
export async function cnmdFetchFileText(url: string): Promise<string> {
  const g = globalThis as typeof globalThis & {
    chrome?: { runtime?: { sendMessage: (m: object) => Promise<unknown> } };
  };
  const send = g.chrome?.runtime?.sendMessage;
  if (typeof send === "function") {
    const raw = await send({ type: "CNMD_FETCH_FILE", url });
    const res = raw as { ok?: boolean; text?: string; error?: string };
    if (res?.ok === true && typeof res.text === "string") return res.text;
    throw new Error(
      typeof res?.error === "string" ? res.error : "CNMD_FETCH_FILE failed"
    );
  }
  const r = await fetch(url);
  const text = await r.text();
  if (url.startsWith("file:") && r.status === 0) return text;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return text;
}

/** KV records, ids and limits (SITE.md "Routes", D65, D69, D71). */

/** The subset of Workers KV the site uses; tests pass an in-memory stand-in. */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export const LIMITS = {
  pasteBytes: 32 * 1024,
  title: 100,
  author: 60,
  reason: 500,
  contact: 200,
  /** Request bodies are refused past this before parsing; form encoding can triple a 32 KB paste. */
  bodyBytes: 160 * 1024,
} as const;

/** `p:<id>` → the share. Immutable, no TTL (D65). */
export interface PasteRecord { v: 1; title: string; author: string; paste: string; created: string }
/** `r:<iso>:<id>` → a report. Stored, never shown (D71). */
export interface ReportRecord { id: string; reason: string; contact: string; created: string }

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const ID_RE = /^[0-9A-Za-z]{10}$/;

/** 10 random base62 characters from `crypto.getRandomValues`, by rejection sampling (no modulo bias). */
export function newId(): string {
  let id = "";
  const buf = new Uint8Array(16);
  while (id.length < 10) {
    crypto.getRandomValues(buf);
    for (const b of buf) if (b < 248 && id.length < 10) id += ALPHABET[b % 62];
  }
  return id;
}

export async function getPaste(kv: KVLike, id: string): Promise<PasteRecord | null> {
  if (!ID_RE.test(id)) return null;
  const raw = await kv.get(`p:${id}`);
  if (raw === null) return null;
  try {
    const r = JSON.parse(raw) as Partial<PasteRecord>;
    if (typeof r.paste !== "string") return null;
    return { v: 1, title: str(r.title), author: str(r.author), paste: r.paste, created: str(r.created) };
  } catch {
    return null;
  }
}
const str = (x: unknown): string => (typeof x === "string" ? x : "");

/** Check-then-put with a retry on collision; returns the new id. */
export async function putPaste(kv: KVLike, rec: PasteRecord, makeId: () => string = newId): Promise<string> {
  for (let tries = 0; tries < 5; tries++) {
    const id = makeId();
    if (!ID_RE.test(id)) continue;
    if ((await kv.get(`p:${id}`)) !== null) continue;
    await kv.put(`p:${id}`, JSON.stringify(rec));
    return id;
  }
  throw new Error("no free id after 5 tries");
}

export async function putReport(kv: KVLike, rep: ReportRecord): Promise<void> {
  await kv.put(`r:${rep.created}:${rep.id}`, JSON.stringify(rep));
}

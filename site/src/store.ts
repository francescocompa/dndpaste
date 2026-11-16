/** KV records, ids and limits (SITE.md "Routes", D65, D69, D71). */

/** The subset of Workers KV the site uses; tests pass an in-memory stand-in. */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * D95: the site saves a build only when it has at least one key besides its name (a header key, an entity or a level).
 * The format allows a name-only paste; this site is stricter, so a pasted link kept as text can't become a share.
 */
export const isBare = (p: { header: ReadonlyMap<string, unknown>; entities: readonly unknown[]; levels: readonly unknown[] }): boolean =>
  p.header.size === 0 && p.entities.length === 0 && p.levels.length === 0;
export const BARE = "A build needs at least one key besides its name, such as Species:. Add one to save.";

export const LIMITS = {
  pasteBytes: 32 * 1024,
  title: 100,
  author: 60,
  reason: 500,
  contact: 200,
  /** Request bodies are refused past this before parsing; form encoding can triple a 32 KB paste. */
  bodyBytes: 160 * 1024,
  /** Writes per rate key (an IPv4 address or an IPv6 /64) per UTC day, on top of the per-minute limiters (D71). */
  savesPerDay: 50,
  reportsPerDay: 20,
} as const;

/**
 * The view page's body, rendered once at save and kept in the same KV value (no extra write). `v` is the renderer's
 * RENDER_VERSION at save time; a record with another `v` is re-rendered on read (pages.ts `rendered`).
 */
export interface Rendered { v: number; body: string; clean: boolean; folds: boolean; canon: string }

/** `p:<id>` → the share. Immutable, no TTL (D65). `r` is a cache of derived output, never served as data. */
export interface PasteRecord { v: 1; title: string; author: string; paste: string; created: string; r?: Rendered }
/** `r:<iso>:<id>:<nonce>` → a report. Stored, never shown (D71). */
export interface ReportRecord { id: string; reason: string; contact: string; created: string }

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const ID_RE = /^[0-9A-Za-z]{10}$/;

/** `len` random base62 characters from `crypto.getRandomValues`, by rejection sampling (no modulo bias). */
export function newId(len = 10): string {
  let id = "";
  const buf = new Uint8Array(16);
  while (id.length < len) {
    crypto.getRandomValues(buf);
    for (const b of buf) if (b < 248 && id.length < len) id += ALPHABET[b % 62];
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
    const rec: PasteRecord = { v: 1, title: str(r.title), author: str(r.author), paste: r.paste, created: str(r.created) };
    if (isRendered(r.r)) rec.r = r.r;
    return rec;
  } catch {
    return null;
  }
}
const str = (x: unknown): string => (typeof x === "string" ? x : "");
const isRendered = (x: unknown): x is Rendered => {
  const r = x as Partial<Rendered> | null | undefined;
  return !!r && typeof r.v === "number" && typeof r.body === "string" && typeof r.clean === "boolean" &&
    typeof r.folds === "boolean" && typeof r.canon === "string";
};

/** Check-then-put with a retry on collision; returns the new id. A failed put (KV write quota spent) throws. */
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

/** The nonce keeps two reports on one id in the same millisecond apart. */
export async function putReport(kv: KVLike, rep: ReportRecord, nonce: string = newId(6)): Promise<void> {
  await kv.put(`r:${rep.created}:${rep.id}:${nonce}`, JSON.stringify(rep));
}

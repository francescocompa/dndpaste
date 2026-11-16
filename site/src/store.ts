/** KV records, ids, edit keys and limits (SITE.md "Routes" and "KV", D65, D69, D71, D97). */

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

/**
 * `p:<id>` → the share's latest revision (the head); `p:<id>:<n>` → revision n, frozen when revision n + 1 is saved
 * (D97). No TTL. `r` is a cache of derived output, never served as data. `n` is the revision number (absent = 1: a
 * record from before D97 is revision 1); `edited` is when this revision was saved (absent for revision 1); `k` is the
 * SHA-256 of the edit key, hex, on the head only (absent = no one can edit it).
 */
export interface PasteRecord {
  v: 1; title: string; author: string; paste: string; created: string; r?: Rendered;
  n?: number; edited?: string; k?: string;
}
/** `r:<iso>:<id>:<nonce>` → a report. Stored, never shown (D71). */
export interface ReportRecord { id: string; reason: string; contact: string; created: string; revision?: number }

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
  return parseRecord(await kv.get(`p:${id}`));
}

function parseRecord(raw: string | null): PasteRecord | null {
  if (raw === null) return null;
  try {
    const r = JSON.parse(raw) as Partial<PasteRecord>;
    if (typeof r.paste !== "string") return null;
    const rec: PasteRecord = { v: 1, title: str(r.title), author: str(r.author), paste: r.paste, created: str(r.created) };
    if (isRendered(r.r)) rec.r = r.r;
    if (typeof r.n === "number" && Number.isSafeInteger(r.n) && r.n > 1) rec.n = r.n;
    if (typeof r.edited === "string") rec.edited = r.edited;
    if (typeof r.k === "string" && KEY_HASH_RE.test(r.k)) rec.k = r.k;
    return rec;
  } catch {
    return null;
  }
}

/** A record's revision number: absent (a record from before D97, or a share never edited) is 1. */
export const revOf = (rec: PasteRecord): number => rec.n ?? 1;

/** Revision numbers in a URL: 1 to 999999, no leading zero. */
export const REV_RE = /^[1-9][0-9]{0,5}$/;

/**
 * Revision `n` of a share: the head when `n` is its revision, else the frozen copy. The head is read first: a frozen
 * copy is written before the head moves past it, so a head that says n + 1 means `p:<id>:<n>` is in central storage
 * (reading the frozen key first could cache a miss from before the edit). Null past the latest or when taken down.
 */
export async function getRevision(kv: KVLike, id: string, n: number): Promise<{ rec: PasteRecord; head: PasteRecord } | null> {
  const head = await getPaste(kv, id);
  if (!head || n < 1 || n > revOf(head)) return null;
  if (n === revOf(head)) return { rec: head, head };
  const rec = parseRecord(await kv.get(`p:${id}:${n}`));
  return rec ? { rec: { ...rec, n }, head } : null;
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

/**
 * An edit (D97): freezes the current head as `p:<id>:<n>`, then writes the new head as revision n + 1, keeping the
 * share's `created` and edit-key hash. Two KV writes, frozen copy first: if the second fails, the share is unchanged
 * and the frozen copy holds what the head still holds. A failed put throws (the caller answers 503).
 */
export async function putRevision(kv: KVLike, id: string, head: PasteRecord, next: Omit<PasteRecord, "created" | "n" | "k">): Promise<PasteRecord> {
  const n = revOf(head);
  const frozen: PasteRecord = { ...head, n };
  delete frozen.k;
  await kv.put(`p:${id}:${n}`, JSON.stringify(frozen));
  const rec: PasteRecord = { ...next, created: head.created, n: n + 1, ...(head.k ? { k: head.k } : {}) };
  await kv.put(`p:${id}`, JSON.stringify(rec));
  return rec;
}

// ─── edit keys (D97) ────────────────────────────────────────────────────────

/** 32 random bytes, base64url: 43 characters. Only its SHA-256 is stored. */
export const KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const KEY_HASH_RE = /^[0-9a-f]{64}$/;

export function newEditKey(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashKey(key: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)));
  return [...d].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Whether `key` opens `rec`: a well-formed key whose hash equals the stored one, compared in constant time. */
export async function keyOpens(rec: PasteRecord, key: string): Promise<boolean> {
  if (!rec.k) return false;
  const want = rec.k;
  // Hash even a malformed key, so a refusal takes the same time either way.
  const got = await hashKey(KEY_RE.test(key) ? key : `bad:${key.slice(0, 64)}`);
  let diff = KEY_RE.test(key) ? 0 : 1;
  for (let i = 0; i < 64; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/** The nonce keeps two reports on one id in the same millisecond apart. */
export async function putReport(kv: KVLike, rep: ReportRecord, nonce: string = newId(6)): Promise<void> {
  await kv.put(`r:${rep.created}:${rep.id}:${nonce}`, JSON.stringify(rep));
}

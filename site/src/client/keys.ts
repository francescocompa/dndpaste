/**
 * Edit keys (D97): the secret that lets this browser edit a share it saved, kept in localStorage only (the server
 * keeps a hash). Every read and write is in try/catch: with storage blocked, `set` says so and `get` finds nothing,
 * and the page offers the private edit link instead.
 */
import { ID_RE, KEY_RE } from "../store.ts";

const KEY = "dndpaste.keys";
/** Oldest dropped past this; far more shares than one browser makes. */
export const MAX_KEYS = 1000;

export interface KeyStore {
  get(id: string): string | null;
  /** False when the key could not be kept (storage blocked or full). */
  set(id: string, key: string): boolean;
  /** Whether this browser can keep keys at all (writes and removes a probe). */
  writable(): boolean;
}

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function keyStore(storage: () => Storage | null): KeyStore {
  const read = (): Record<string, string> => {
    try {
      const raw = storage()?.getItem(KEY);
      const data: unknown = raw ? JSON.parse(raw) : {};
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      const out: Record<string, string> = {};
      for (const [id, k] of Object.entries(data)) if (ID_RE.test(id) && typeof k === "string" && KEY_RE.test(k)) out[id] = k;
      return out;
    } catch {
      return {};
    }
  };
  return {
    get: (id) => (ID_RE.test(id) ? read()[id] ?? null : null),
    set: (id, key) => {
      if (!ID_RE.test(id) || !KEY_RE.test(key)) return false;
      const all = read();
      delete all[id];
      all[id] = key;
      const ids = Object.keys(all);
      for (const old of ids.slice(0, Math.max(0, ids.length - MAX_KEYS))) delete all[old];
      try {
        const s = storage();
        if (!s) return false;
        s.setItem(KEY, JSON.stringify(all));
        return s.getItem(KEY) !== null;
      } catch {
        return false;
      }
    },
    writable: () => {
      try {
        const s = storage();
        if (!s) return false;
        s.setItem(`${KEY}.probe`, "1");
        s.removeItem(`${KEY}.probe`);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** The key in a `#k=<key>` (edit link) or `#new=<key>` (just saved) fragment, if well formed. */
export function keyFromHash(hash: string, name: "k" | "new"): string | null {
  const m = new RegExp(`^#${name}=([A-Za-z0-9_-]{43})$`).exec(hash);
  return m ? m[1] : null;
}

/** What the edit route answered: its status and JSON body (`{}` when the body was not JSON). */
export interface EditReply { ok: boolean; status: number; data: Record<string, unknown> }

/** The keys an edit tries, in order: the edit link's (held in memory only), then the one this browser kept. */
export function editKeys(fromLink: string | null, kept: string | null): string[] {
  return [...new Set([fromLink, kept].filter((k): k is string => k !== null))];
}

/**
 * Sends an edit with each key in turn, moving to the next only when the server refuses one (403). A key is kept in
 * `store` only once the server took it, so a crafted `#k=` link can never replace a working key; a refused key
 * leaves storage as it was. Returns the last reply and the keys still worth trying (a refused key drops out while
 * another remains).
 */
export async function sendEdit(id: string, tries: string[], send: (key: string) => Promise<EditReply>, store: KeyStore):
Promise<{ reply: EditReply; keys: string[] }> {
  let left = tries;
  let reply: EditReply = { ok: false, status: 0, data: {} };
  for (const key of tries) {
    reply = await send(key);
    if (reply.status !== 403) {
      if (reply.ok && store.get(id) !== key) store.set(id, key);
      return { reply, keys: left };
    }
    if (left.length > 1) left = left.filter((k) => k !== key);
  }
  return { reply, keys: left };
}

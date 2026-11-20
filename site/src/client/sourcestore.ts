/**
 * Where your own sources live (D245): IndexedDB in this browser, never uploaded. Every call is in try/catch and
 * resolves to an empty answer when storage is blocked (a private window, cleared or refused site data), so the page
 * and the editor still work, with the built-in names only.
 *
 * A one-line summary goes to localStorage as well, for the Settings menu and the autocomplete's no-match line
 * (D256), which read it without opening the database.
 */
import type { SourceRec, Switches } from "../yours.ts";
import { NO_SWITCHES } from "../yours.ts";
import { SUMMARY_KEY } from "./summary.ts";

const DB = "dndpaste-sources";
const SOURCES = "sources";
const STATE = "state";

let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SOURCES)) db.createObjectStore(SOURCES, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STATE)) db.createObjectStore(STATE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opening;
}

/** One request in its own transaction; `fallback` when storage is unavailable or the request fails. */
async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  const db = await open();
  if (!db) return fallback;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      let value: T = fallback;
      req.onsuccess = () => { value = (req.result as T) ?? fallback; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => resolve(fallback);
      tx.onabort = () => resolve(fallback);
    } catch { resolve(fallback); }
  });
}

/** True once the database opened: false means nothing can be kept in this browser. */
export async function storageWorks(): Promise<boolean> {
  return Boolean(await open());
}

export async function listSources(): Promise<SourceRec[]> {
  const all = await run<SourceRec[]>(SOURCES, "readonly", (s) => s.getAll(), []);
  return all.sort((a, b) => (a.added < b.added ? -1 : a.added > b.added ? 1 : 0));
}

/** Saves a source; false when it could not be kept (no storage, or the browser's quota is full). */
export async function putSource(rec: SourceRec): Promise<boolean> {
  const ok = await run<IDBValidKey | false>(SOURCES, "readwrite", (s) => s.put(rec), false);
  await writeSummary();
  return ok !== false;
}

export async function deleteSource(id: string): Promise<void> {
  await run(SOURCES, "readwrite", (s) => s.delete(id), null);
  await writeSummary();
}

export async function getSwitches(): Promise<Switches> {
  const sw = await run<Switches | null>(STATE, "readonly", (s) => s.get("switches"), null);
  return sw ? { ...NO_SWITCHES, ...sw } : { ...NO_SWITCHES };
}

export async function putSwitches(sw: Switches): Promise<void> {
  await run(STATE, "readwrite", (s) => s.put(sw, "switches"), null);
}

async function writeSummary(): Promise<void> {
  const all = await listSources();
  try { localStorage.setItem(SUMMARY_KEY, JSON.stringify({ n: all.length, on: all.filter((s) => s.on).length })); } catch { /* storage blocked */ }
}

/**
 * D150: the author you last saved with, in this browser's localStorage only (SITE.md), never sent anywhere. The form
 * fills a new build's Author field with it as plain, editable text. Every read and write is in try/catch; with storage
 * blocked it lives in memory for the visit, and the form keeps working.
 */
import { LIMITS } from "../store.ts";

const KEY = "dndpaste.author";

export interface AuthorStore {
  /** The remembered author, or "" when there is none. */
  get(): string;
  /** Remembers `author` (trimmed, at most LIMITS.author); an empty one forgets it. */
  set(author: string): void;
}

const clean = (v: string): string => v.replace(/\s+/g, " ").trim().slice(0, LIMITS.author);

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function authorStore(storage: () => Storage | null): AuthorStore {
  let mem: string | null = null;
  return {
    get() {
      if (mem !== null) return mem;
      try {
        const raw = storage()?.getItem(KEY);
        return typeof raw === "string" ? clean(raw) : "";
      } catch {
        return "";
      }
    },
    set(author) {
      const v = clean(author);
      try {
        const s = storage();
        if (!s) throw new Error("no storage");
        if (v) s.setItem(KEY, v);
        else s.removeItem(KEY);
        mem = null;
      } catch {
        mem = v;
      }
    },
  };
}

/** The Author a form opens with: the share's own for an edit or a prefilled form, else the remembered one. */
export function openingAuthor(current: string, editing: boolean, remembered: string): string {
  return editing || current ? current : remembered;
}

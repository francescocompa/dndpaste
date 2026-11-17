/**
 * Unsaved drafts (D102): the form's title, author and text, kept in localStorage as you type, so closing the tab or a
 * crash doesn't lose work and nobody publishes a revision just to keep progress. One draft for a new build, one per
 * share being edited (with the revision the form opened on). Nothing goes to the server. Every read and write is in
 * try/catch: with storage blocked or full there is simply no draft, and no error.
 */
import { esc } from "../render.ts";
import { dayLabel } from "./recent.ts";

const KEY = "dndpaste.drafts";
/** Oldest dropped past this. */
export const MAX_DRAFTS = 20;

export interface Fields { title: string; author: string; paste: string }
/** `rev`: the revision an edit form opened on; null for a new build. `saved`: ISO time of the last write. */
export interface Draft extends Fields { rev: number | null; saved: string }

export interface DraftStore {
  get(slot: string): Draft | null;
  /** False when the draft could not be kept (storage blocked or full). */
  set(slot: string, d: Draft): boolean;
  clear(slot: string): void;
}

/** "new" for a new build (Duplicate and edit included), `edit:<id>` for a share being edited. */
export const draftSlot = (editId: string | null): string => (editId ? `edit:${editId}` : "new");
const SLOT_RE = /^(new|edit:[0-9A-Za-z]{10})$/;

const valid = (d: unknown): d is Draft => {
  const o = d as Draft;
  return !!o && typeof o === "object" && typeof o.title === "string" && typeof o.author === "string" &&
    typeof o.paste === "string" && typeof o.saved === "string" && (o.rev === null || (Number.isInteger(o.rev) && o.rev > 0));
};

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function draftStore(storage: () => Storage | null): DraftStore {
  const read = (): Record<string, Draft> => {
    try {
      const raw = storage()?.getItem(KEY);
      const data: unknown = raw ? JSON.parse(raw) : {};
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      const out: Record<string, Draft> = {};
      for (const [slot, d] of Object.entries(data)) if (SLOT_RE.test(slot) && valid(d)) out[slot] = d;
      return out;
    } catch {
      return {};
    }
  };
  const write = (all: Record<string, Draft>): boolean => {
    try {
      const s = storage();
      if (!s) return false;
      if (Object.keys(all).length) s.setItem(KEY, JSON.stringify(all));
      else s.removeItem(KEY);
      return true;
    } catch {
      return false;
    }
  };
  return {
    get: (slot) => (SLOT_RE.test(slot) ? read()[slot] ?? null : null),
    set: (slot, d) => {
      if (!SLOT_RE.test(slot) || !valid(d)) return false;
      const all = read();
      delete all[slot];
      all[slot] = d;
      const slots = Object.keys(all).sort((a, b) => all[a].saved.localeCompare(all[b].saved));
      for (const old of slots.slice(0, Math.max(0, slots.length - MAX_DRAFTS))) delete all[old];
      return write(all);
    },
    clear: (slot) => {
      const all = read();
      if (!(slot in all)) return;
      delete all[slot];
      write(all);
    },
  };
}

export const sameFields = (a: Fields, b: Fields): boolean => a.title === b.title && a.author === b.author && a.paste === b.paste;

/** The draft worth offering when the form opens: one that differs from what the form loaded. */
export const draftToOffer = (d: Draft | null, loaded: Fields): Draft | null => (d && !sameFields(d, loaded) ? d : null);

/** The form's side of D102, DOM-free so tests run the same logic the form does. */
export interface DraftKeeper {
  /** The draft offered when the form opened, until Restore or Discard. */
  readonly offered: Draft | null;
  /** Keeps `f` as the draft: skipped while the offer stands (the old draft stays) or after a save; text equal to what the form loaded clears it. */
  keep(f: Fields): void;
  /** Closes the offer and returns the draft to put back in the form. */
  restore(): Draft | null;
  /** Closes the offer and deletes the stored draft. */
  discard(): void;
  /** After a successful save or edit: deletes the draft and keeps no more. */
  saved(): void;
  /**
   * Before an update reload (D139): keeps `f` now, replacing an offer still standing (the text in the form is newer).
   * True when the stored draft holds `f`, so the reloaded form can put it back. Text equal to what the form loaded
   * keeps nothing and leaves an offer for its bar.
   */
  handOver(f: Fields): boolean;
}

export function draftKeeper(store: DraftStore, slot: string, loaded: Fields, rev: number | null, now: () => Date = () => new Date()): DraftKeeper {
  let offered = draftToOffer(store.get(slot), loaded);
  let done = false;
  return {
    get offered() { return offered; },
    keep(f) {
      if (offered || done) return;
      if (sameFields(f, loaded)) store.clear(slot);
      else store.set(slot, { title: f.title, author: f.author, paste: f.paste, rev, saved: now().toISOString() });
    },
    restore() {
      const d = offered;
      offered = null;
      return d;
    },
    discard() {
      offered = null;
      store.clear(slot);
    },
    saved() {
      done = true;
      store.clear(slot);
    },
    handOver(f) {
      if (done || sameFields(f, loaded)) return false;
      offered = null;
      return store.set(slot, { title: f.title, author: f.author, paste: f.paste, rev, saved: now().toISOString() });
    },
  };
}

/** "today at 14:05", "12 Nov at 9:30", "12 Nov 2025 at 9:30"; local time. */
export function draftWhen(iso: string, now: Date): string {
  const d = new Date(iso);
  const day = dayLabel(iso, now);
  if (!day) return "earlier";
  return `${day === "Today" ? "today" : day} at ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The restore bar. `rev`: the revision the edit form opened on (null for a new build). */
export function draftBarHtml(d: Draft, now: Date, rev: number | null): string {
  const older = rev !== null && d.rev !== null && d.rev < rev;
  const note = older ? ` They were made on revision ${d.rev}; restoring them replaces the changes saved since.` : "";
  return `<span>You have unsaved changes from ${esc(draftWhen(d.saved, now))}.${note}</span><span class="grow"></span>` +
    `<button type="button" class="bt pri" data-act="restore">Restore</button><button type="button" class="bt" data-act="discard">Discard</button>`;
}

/**
 * My recent shares: the ids and titles saved from this browser, in localStorage only (D68, SITE.md). Every read and
 * write is in try/catch; with storage blocked the list lives in memory for the visit, and the page keeps working.
 */
import { esc } from "../render.ts";
import { ID_RE } from "../store.ts";

export interface Recent { id: string; title: string; created: string }

const KEY = "dndpaste.recent";
export const MAX_RECENT = 20;

export interface RecentStore { list(): Recent[]; add(r: Recent): Recent[] }

const valid = (r: unknown): r is Recent => {
  const o = r as Recent;
  return !!o && typeof o === "object" && typeof o.id === "string" && ID_RE.test(o.id) &&
    typeof o.title === "string" && typeof o.created === "string";
};

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function recentStore(storage: () => Storage | null): RecentStore {
  let mem: Recent[] | null = null;
  const list = (): Recent[] => {
    if (mem) return mem;
    try {
      const raw = storage()?.getItem(KEY);
      const data: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.filter(valid).slice(0, MAX_RECENT) : [];
    } catch {
      return [];
    }
  };
  const add = (r: Recent): Recent[] => {
    const next = [r, ...list().filter((x) => x.id !== r.id)].slice(0, MAX_RECENT);
    try {
      const s = storage();
      if (!s) throw new Error("no storage");
      s.setItem(KEY, JSON.stringify(next));
      mem = null;
    } catch {
      mem = next;
    }
    return next;
  };
  return { list, add };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "12 Nov", or "12 Nov 2025" outside this year; in the visitor's local time. */
export function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) return "Today";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

export function recentHtml(list: readonly Recent[], now: Date, shown = 8): string {
  if (!list.length) return `<div class="recent"><span class="empty">Builds you save appear here. Kept in this browser only.</span></div>`;
  const rows = list.slice(0, shown).map((r) =>
    `<div class="rr"><a${r.title ? "" : ` class="none"`} href="/${r.id}">${esc(r.title || "Untitled build")}</a>` +
    `<span class="id">${r.id}${dayLabel(r.created, now) ? ` · ${dayLabel(r.created, now)}` : ""}</span></div>`).join("");
  return `<div class="recent">${rows}</div><small class="dsum">Kept in this browser only.</small>`;
}

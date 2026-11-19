/**
 * /codes (D103, D228): find, filter and sort the book code table. Pure functions here; site.ts wires them to the page, which reads
 * the same without JavaScript (a plain table sorted by code, no search field).
 */
import type { Book, BookType } from "../books.ts";

export type Col = "code" | "title" | "type" | "date";
export type Dir = "asc" | "desc";

/** Sort order of the Type column. */
export const TYPE_ORDER: readonly BookType[] = ["Core", "Supplement", "Setting", "Adventure", "Extra", "Unearthed Arcana", "Homebrew"];

/** The Type cell: `Core`, or `Core, 2014` for a book the 2024 rules replaced. */
export function typeLabel(b: Pick<Book, "type" | "y2014">): string {
  return b.y2014 ? `${b.type}, 2014` : b.type;
}

type Row = Pick<Book, "code" | "title" | "type" | "y2014"> & { date?: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The Published cell (D228): `Aug 2014` from `2014-08-19`; a year alone as it is; "" when unknown. */
export function dateLabel(date: string | undefined): string {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(date ?? "");
  if (!m) return "";
  const mo = m[2] ? MONTHS[Number(m[2]) - 1] : undefined;
  return mo ? `${mo} ${m[1]}` : m[1];
}

/** A row matches when every word of the query is in its code, title, type or publication date, ignoring case and accents. */
export function matches(b: Row, query: string): boolean {
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hay = fold(`${b.code} ${b.title} ${typeLabel(b)} ${dateLabel(b.date)}`);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

const cmp = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true });

/** Rows sorted by a column; ties fall back to the code. Type sorts in `TYPE_ORDER`, 2014 books after the rest. Date
 *  sorts oldest first; a row with no date stays last both ways. */
export function sortRows<T extends Row>(rows: readonly T[], col: Col, dir: Dir): T[] {
  const key = (r: T): [number, string] => col === "type"
    ? [TYPE_ORDER.indexOf(r.type) * 2 + (r.y2014 ? 1 : 0), ""]
    : col === "date" ? [0, r.date ?? ""] : [0, col === "code" ? r.code : r.title];
  const out = [...rows].sort((a, b) => {
    const [na, sa] = key(a), [nb, sb] = key(b);
    return (na - nb) || cmp(sa, sb) || cmp(a.code, b.code);
  });
  const sorted = dir === "asc" ? out : out.reverse();
  if (col !== "date") return sorted;
  return [...sorted.filter((r) => r.date), ...sorted.filter((r) => !r.date)];
}

/** The type filters (D228): every type, or one; Homebrew has a single row and no filter of its own. */
export const TYPE_FILTERS: readonly BookType[] = ["Core", "Supplement", "Setting", "Adventure", "Extra", "Unearthed Arcana"];

/** A row shows under the filters: its type is the one picked (or none is), and a 2014 book only when they're shown. */
export function passes(b: Row, type: BookType | null, show2014: boolean): boolean {
  return (!type || b.type === type) && (show2014 || !b.y2014);
}

/** The A–Z jump's letter for a row (D228): the first letter or digit of what the table is sorted by (code or title). */
export function letterOf(b: Row, col: Col): string {
  const c = (col === "title" ? b.title : b.code).normalize("NFD").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

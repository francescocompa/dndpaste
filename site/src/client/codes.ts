/**
 * /codes (D103): find and sort the book code table. Pure functions here; site.ts wires them to the page, which reads
 * the same without JavaScript (a plain table sorted by code, no search field).
 */
import type { Book, BookType } from "../books.ts";

export type Col = "code" | "title" | "type";
export type Dir = "asc" | "desc";

/** Sort order of the Type column. */
export const TYPE_ORDER: readonly BookType[] = ["Core", "Supplement", "Setting", "Adventure", "Extra"];

/** The Type cell: `Core`, or `Core, 2014` for a book the 2024 rules replaced. */
export function typeLabel(b: Pick<Book, "type" | "y2014">): string {
  return b.y2014 ? `${b.type}, 2014` : b.type;
}

type Row = Pick<Book, "code" | "title" | "type" | "y2014">;

/** A row matches when every word of the query is in its code, title or type, ignoring case and accents. */
export function matches(b: Row, query: string): boolean {
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hay = fold(`${b.code} ${b.title} ${typeLabel(b)}`);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

const cmp = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true });

/** Rows sorted by a column; ties fall back to the code. Type sorts in `TYPE_ORDER`, 2014 books after the rest. */
export function sortRows<T extends Row>(rows: readonly T[], col: Col, dir: Dir): T[] {
  const key = (r: T): [number, string] => col === "type"
    ? [TYPE_ORDER.indexOf(r.type) * 2 + (r.y2014 ? 1 : 0), ""]
    : [0, col === "code" ? r.code : r.title];
  const out = [...rows].sort((a, b) => {
    const [na, sa] = key(a), [nb, sb] = key(b);
    return (na - nb) || cmp(sa, sb) || cmp(a.code, b.code);
  });
  return dir === "asc" ? out : out.reverse();
}

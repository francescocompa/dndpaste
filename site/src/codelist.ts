/**
 * Every book code a name can carry, one list (D226): the books (books.ts) and the library's Unearthed Arcana codes
 * (`UA_SOURCES`), each with its title, type, edition and publication date (D228; UA dates from books.ts `UA_DATES`).
 * Sorted by code. A function, so a bundle that never lists codes leaves the list out.
 */
import { UA_SOURCES } from "../../src/sources.ts";
import { BOOKS, UA_DATES } from "./books.ts";
import type { Book } from "./books.ts";

/** A playtest code from before the 2024 rules: any but XUA2025 and later. */
const uaBefore2024 = (code: string): boolean => Number(/^XUA(\d{4})/.exec(code)?.[1] ?? 0) < 2025;

let all: readonly Book[] | null = null;
export function allCodes(): readonly Book[] {
  all ??= [
    ...BOOKS,
    ...UA_SOURCES.map((u): Book => ({ code: u.code, title: u.title, type: "Unearthed Arcana", y2014: uaBefore2024(u.code), date: UA_DATES[u.code] ?? "" })),
  ].sort((a, b) => a.code.toLowerCase().localeCompare(b.code.toLowerCase()));
  return all;
}

/**
 * The one-line summary of your own sources (D256) that pages read without opening the database: how many there are
 * and how many are on. client/sourcestore.ts writes it on every change. No imports, so site.js stays small.
 */
/** localStorage: `{ n: sources, on: sources on }`. */
export const SUMMARY_KEY = "dndpaste.sources";

/** How many sources, how many on; zero when unknown or storage is blocked. */
export function readSummary(get: () => Storage = () => localStorage): { n: number; on: number } {
  try {
    const v = JSON.parse(get().getItem(SUMMARY_KEY) ?? "null");
    if (v && typeof v.n === "number" && typeof v.on === "number") return { n: v.n, on: v.on };
  } catch { /* storage blocked or bad value */ }
  return { n: 0, on: 0 };
}

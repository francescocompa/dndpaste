/**
 * "Start a build" (D121–D125): turns an edition and the classes in the order taken into a laid-out paste. The header
 * (`Rules`, `Classes` as runs, `Scores:`), empty `Species` and `Background` blocks (2024: the background's `Scores`, `Skills`,
 * `Tools` and `Gear` lines), then each level that owes a pick,
 * with the owed keys as empty "not chosen yet" lines (D112). The text goes through `emit`, so it is already canonical:
 * runs fold to totals with a level header at each class change (D49). Shared by the form (client) and the tests.
 */
import { emit, parse } from "../../src/dndpaste.ts";
import { PRESETS } from "./presets.ts";
import type { ClassPreset, Edition } from "./presets.ts";

export type { Edition };
export interface Row { cls: string; levels: number }

export const MAX_LEVEL = 20;
/**
 * A class not in the table (homebrew, or one the SRD subset lacks): its name as typed, with an optional `|SOURCE`.
 * Letters, digits, spaces, apostrophes and hyphens only, so the name can never break the `Classes` line.
 */
export const OTHER_NAME = /^[A-Za-z][A-Za-z0-9' -]{0,39}(\|[A-Za-z0-9-]{1,12})?$/;
export const CLASS_NAMES: readonly string[] = [...new Set(PRESETS.map((p) => p.name))];
const SOURCE: Record<Edition, ClassPreset["source"]> = { "2014": "PHB", "2024": "XPHB" };

export function presetFor(cls: string, edition: Edition): ClassPreset | undefined {
  return PRESETS.find((p) => p.name === cls && p.source === SOURCE[edition]);
}

const known = (cls: string) => CLASS_NAMES.includes(cls);
const usable = (cls: string) => known(cls) || OTHER_NAME.test(cls.trim());

/**
 * Rows a build can use: a class from the table or another class's name (it sets the levels and owes nothing here),
 * whole levels from 1, the same class twice in a row merged, 20 levels at most.
 */
export function cleanRows(rows: readonly Row[]): Row[] {
  const out: Row[] = [];
  let total = 0;
  for (const r of rows) {
    const cls = r.cls.trim();
    if (!usable(cls) || !Number.isInteger(r.levels) || r.levels < 1) continue;
    const levels = Math.min(r.levels, MAX_LEVEL - total);
    if (levels < 1) break;
    total += levels;
    const last = out[out.length - 1];
    if (last && last.cls === cls) last.levels += levels;
    else out.push({ cls, levels });
  }
  return out;
}

export function totalLevels(rows: readonly Row[]): number {
  return rows.reduce((s, r) => s + (r.levels > 0 ? r.levels : 0), 0);
}

/** The laid-out paste for these rows, in canonical form; "" when no row names a class. */
export function presetText(edition: Edition, rows: readonly Row[]): string {
  const clean = cleanRows(rows);
  if (!clean.length) return "";
  const ref = (cls: string) => (known(cls) ? `${cls}|${SOURCE[edition]}` : cls);
  const classLevel = new Map<string, number>();
  const runs: string[] = [];
  const blocks: string[] = [];
  let n = 0;
  for (const r of clean) {
    const p = presetFor(r.cls, edition);
    for (let i = 0; i < r.levels; i++) {
      n++;
      const k = (classLevel.get(r.cls) ?? 0) + 1;
      classLevel.set(r.cls, k);
      const keys = p ? [...(k === 1 ? (n === 1 ? p.first : p.multi) : []), ...(p.owes[k - 1] ?? [])] : [];
      if (keys.length || n === 1) blocks.push(`L${n} ${ref(r.cls)}\n${[...new Set(keys)].map((key) => `${key}:`).join("\n")}`);
    }
    runs.push(`${ref(r.cls)} ${classLevel.get(r.cls)}`);
  }
  // A 2024 background always has the same parts: a score increase, skills, a tool and a starting-gear letter (D111).
  // The preset doesn't know which background, so it lays them all out (D126).
  const background = edition === "2024" ? "Background:\nScores:\nSkills:\nTools:\nGear:" : "Background:";
  const text = `Rules: ${edition}\nScores:\nClasses: ${runs.join(" / ")}\n\nSpecies:\n\n${background}\n\n${blocks.join("\n\n")}\n`;
  return emit(parse(text));
}

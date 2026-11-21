/**
 * "Start a build" (D121–D125): turns an edition and the classes in the order taken into a laid-out paste. The header
 * (`Rules`, `Classes` as runs, `Scores:`), empty `Species` and `Background` blocks (2024: the background's `Scores`, `Skills`,
 * `Tools` and `Gear` lines), then each level that owes a pick,
 * with the owed keys as empty "not chosen yet" lines (D112). The text goes through `emit`, so it is already canonical:
 * runs fold to totals with a level header at each class change (D49). Shared by the form (client) and the tests.
 */
import { emit, parse, resolveKey } from "../../src/dndpaste.ts";
import { PRESETS } from "./presets.ts";
import { isWholeList } from "./ghost.ts";
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

/**
 * The keys a class level owes, as empty lines lay them out: class level `k` of `cls`, at the build's level `n` (the
 * first class's level 1 owes its starting picks, a later class's its multiclass ones). Shared by the wizard and the
 * level-up (D305), so the two never disagree. [] for a class not in the table.
 */
export function owedKeys(edition: Edition, cls: string, k: number, n: number): string[] {
  const p = presetFor(cls, edition);
  if (!p) return [];
  const keys = [...(k === 1 ? (n === 1 ? p.first : p.multi) : []), ...(p.owes[k - 1] ?? [])];
  // D190: a whole-list preparer (2024 Cleric, Druid, Paladin, Ranger) gets an empty `Prepared:` line where its
  // loadout first appears or grows, with its ghost count; never a `Spells` line. 2014 counts no loadout (D129).
  if (edition === "2024" && isWholeList(p) && (p.counts[k - 1]?.Prepared ?? 0) > (k > 1 ? p.counts[k - 2]?.Prepared ?? 0 : 0)) keys.push("Prepared");
  return [...new Set(keys)];
}

/**
 * D313: how an owed key is written. `Feature` names the class level's features with a pick, their brackets open for it
 * (`Feature: Divine Order []`, as a species feature comes, D242); any other key is an empty line (`Cantrips:`).
 */
export function owedLine(p: ClassPreset | undefined, k: number, key: string): string {
  const names = key === "Feature" ? p?.features?.[k] : undefined;
  return names?.length ? `Feature: ${names.map((x) => `${x} []`).join(", ")}` : `${key}:`;
}

/** D313: a chip's word for an owed key: the features' names for `Feature` (`Divine Order`), else the key. */
export function owedLabel(p: ClassPreset | undefined, k: number, key: string): string {
  const names = key === "Feature" ? p?.features?.[k] : undefined;
  return names?.length ? names.join(", ") : key;
}

const KEY_LINE = /^([A-Z][A-Za-z ]*?(?: \([^)]*\))?):[ \t]*$/;
/**
 * D310: the next open choice from the line holding `from` down: inside an empty `[]`, or at the end of a key line with
 * no value yet (`Spells:`), whichever comes first. Null when there is none below.
 */
export function nextOpen(text: string, from: number): number | null {
  let i = text.lastIndexOf("\n", Math.max(0, from) - 1) + 1;
  for (const line of text.slice(i).split("\n")) {
    const b = /\[\s*\]/.exec(line);
    if (b) return i + b.index + 1;
    const m = KEY_LINE.exec(line);
    if (m && resolveKey(m[1]).def) return i + line.length;
    i += line.length + 1;
  }
  return null;
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
    for (let i = 0; i < r.levels; i++) {
      n++;
      const k = (classLevel.get(r.cls) ?? 0) + 1;
      classLevel.set(r.cls, k);
      const keys = owedKeys(edition, r.cls, k, n);
      if (keys.length || n === 1) blocks.push(`L${n} ${ref(r.cls)}\n${keys.map((key) => owedLine(presetFor(r.cls, edition), k, key)).join("\n")}`);
    }
    runs.push(`${ref(r.cls)} ${classLevel.get(r.cls)}`);
  }
  // A 2024 background always has the same parts: a score increase, skills, a tool and a starting-gear letter (D111).
  // The preset doesn't know which background, so it lays them all out (D126).
  const background = edition === "2024" ? "Background:\nScores:\nSkills:\nTools:\nGear:" : "Background:";
  const text = `Rules: ${edition}\nScores:\nClasses: ${runs.join(" / ")}\n\nSpecies:\n\n${background}\n\n${blocks.join("\n\n")}\n`;
  // emit drops empty brackets: a feature's (D313) come back, open for its pick.
  const open = new Set(text.split("\n").filter((x) => x.startsWith("Feature: ") && x.endsWith("[]")));
  const back = new Map([...open].map((x) => [x.replace(/ \[\]/g, ""), x]));
  return emit(parse(text)).split("\n").map((x) => back.get(x) ?? x).join("\n");
}

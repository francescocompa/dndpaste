/**
 * T8.2 level-up (D305): the next level's block, written after the text, with the empty keys that level owes (the same
 * rule as "Start a build", `owedKeys`), and `Classes:` one higher. The text is edited in place, never run through emit,
 * so what the user wrote stays as written. Shared by the form (client) and the tests.
 */
import { CLASS_NAMES, MAX_LEVEL, nextOpen, owedKeys, owedLine, presetFor } from "./preset.ts";
import type { Edition } from "./preset.ts";
import { classSequence, parse } from "../../src/dndpaste.ts";

const SOURCE: Record<Edition, string> = { "2014": "PHB", "2024": "XPHB" };
const CLASSES = /^Classes:[ \t]*(.*?)[ \t]*$/m;
const RUN = /^(.+?)\s+(\d+)$/;

export interface Run { ref: string; name: string; levels: number }
export interface LevelUp { text: string; cursor: number; level: number; ref: string }

const bare = (ref: string) => ref.replace(/\|.*$/, "").trim();
const same = (a: string, b: string) => bare(a).toLowerCase() === bare(b).toLowerCase();

/** The build's edition from `Rules:` (2024 when it has none). */
export function editionOf(text: string): Edition {
  return /^Rules:[ \t]*2014\b/m.test(text) ? "2014" : "2024";
}

/** The `Classes:` runs as written (`Wizard|XPHB 4` → ref `Wizard|XPHB`, name `Wizard`, 4); null without a readable line. */
export function classRuns(text: string): Run[] | null {
  const m = CLASSES.exec(text);
  if (!m) return null;
  if (!m[1]) return [];
  const runs: Run[] = [];
  for (const part of m[1].split("/")) {
    const r = RUN.exec(part.trim());
    if (!r) return null;
    runs.push({ ref: r[1].trim(), name: bare(r[1]), levels: Number(r[2]) });
  }
  return runs;
}

/** The level the next block takes (D316, blocks first): one past the last level header, L1 when there is none; null past
 * 20 or without a readable `Classes:`. Inside the `Classes:` total it fills a level Classes: already counts. */
export function nextLevel(text: string): number | null {
  if (!classRuns(text)) return null;
  const n = Math.max(0, ...headers(text.split("\n")).map((h) => h.n)) + 1;
  return n <= MAX_LEVEL ? n : null;
}

/** How a class is written: as `Classes:` writes it, else `Name|XPHB` / `Name|PHB` for a class the table knows. */
export function classRef(text: string, cls: string): string {
  const run = classRuns(text)?.find((r) => same(r.ref, cls));
  if (run) return run.ref;
  if (cls.includes("|")) return cls.trim();
  const known = CLASS_NAMES.find((c) => c.toLowerCase() === cls.trim().toLowerCase());
  return known ? `${known}|${SOURCE[editionOf(text)]}` : cls.trim();
}

/** The `cls` level that level `n` is: one past the levels before `n` that read as `cls` (inside the total), else one past its run. */
function classLevelAt(text: string, runs: readonly Run[], n: number, ref: string): number {
  const total = runs.reduce((a, r) => a + r.levels, 0);
  if (n <= total) return readLevels(text).slice(0, n - 1).filter((x) => x !== null && same(x, ref)).length + 1;
  return (runs.find((r) => same(r.ref, ref))?.levels ?? 0) + 1;
}

/**
 * The lens's offer (D316): the next level and up to two classes with their class level. Inside the `Classes:` total the
 * class that level reads as comes first (`L7` of Wizard 6 / Fighter 2 with blocks to L6 → Fighter), then the last
 * classes of `Classes:` (D309; round 4: Fighter stays on offer at L8 too); past the total, the last two. Null as nextLevel.
 */
export function lensOffer(text: string): { level: number; inside: boolean; classes: { ref: string; name: string; level: number }[] } | null {
  const runs = classRuns(text);
  const n = nextLevel(text);
  if (!runs?.length || n === null) return null;
  const total = runs.reduce((a, r) => a + r.levels, 0);
  const inside = n <= total;
  const here = inside ? readLevels(text)[n - 1] : null;
  const first = here ? runs.find((r) => same(r.ref, here)) : undefined;
  const others = runs.slice(-2).filter((r) => r !== first);
  const refs = (first ? [first, ...others.slice(-1)] : others).map((r) => r.ref);
  return { level: n, inside, classes: refs.map((ref) => ({ ref, name: bare(ref), level: classLevelAt(text, runs, n, ref) })) };
}

/**
 * The text with level {@link nextLevel} added for `cls`: `L<n> <ref>` and its owed keys after the last block. Past the
 * `Classes:` total, `Classes:` goes up one (a new class joins as `/ <ref> 1`); inside it (D316), `Classes:` stays as it
 * is unless the class has fewer levels there than this one makes (a class it lacks joins as `/ <ref> 1`). The cursor
 * goes to the block's first open choice (D310: `Spells:|`, or inside `Feature: Divine Order [|]`, D313), else to the
 * end of the header. Null past level 20 or without a readable `Classes:` line.
 */
export function levelUp(text: string, cls: string): LevelUp | null {
  const runs = classRuns(text);
  const n = nextLevel(text);
  if (!runs || n === null || !cls.trim()) return null;
  const ref = classRef(text, cls);
  const run = runs.find((r) => same(r.ref, ref));
  const k = classLevelAt(text, runs, n, ref);
  const next = run ? runs.map((r) => (r === run ? { ...r, levels: Math.max(r.levels, k) } : r)) : [...runs, { ref, name: bare(ref), levels: 1 }];
  const line = `Classes: ${next.map((r) => `${r.ref} ${r.levels}`).join(" / ")}`;
  const known = CLASS_NAMES.find((c) => c.toLowerCase() === bare(ref).toLowerCase());
  const keys = known ? owedKeys(editionOf(text), known, k, n) : [];
  const head = text.replace(CLASSES, line).replace(/\s+$/, "");
  const p = known ? presetFor(known, editionOf(text)) : undefined;
  const block = [`L${n} ${ref}`, ...keys.map((key) => owedLine(p, k, key))];
  const out = `${head}\n\n${block.join("\n")}\n`;
  const at = head.length + 2;
  return { text: out, cursor: nextOpen(out, at) ?? at + block[0].length, level: n, ref };
}

// ---- D314, D316: Classes: and the level headers hold the same levels twice. The lens goes by the headers (blocks first);
// the Match chip raises Classes: when the headers prove it too low. Neither edits the text without a click.

const LEVEL = /^L([1-9]\d*)\s+(.+?)\s*$/;
/** The level headers as written: line index, level, class name. */
function headers(lines: readonly string[]): { i: number; n: number; name: string; ref: string }[] {
  return lines.flatMap((x, i) => { const m = LEVEL.exec(x.trim()); return m ? [{ i, n: Number(m[1]), name: bare(m[2]), ref: m[2] }] : []; });
}
/** The class each level reads as (the reading rule, D49), 1-based by index; null where it can't tell. */
function readLevels(text: string): (string | null)[] {
  return classSequence(parse(text)).levels.map((r) => r?.name ?? null);
}
/** `Classes:` as totals, one run per class (`Wizard 6 / Fighter 2`); null for runs that repeat a class (cumulative). */
function totals(text: string): Run[] | null {
  const runs = classRuns(text);
  if (!runs || new Set(runs.map((r) => r.name.toLowerCase())).size !== runs.length) return null;
  return runs;
}
const classesLine = (runs: readonly Run[]) => `Classes: ${runs.filter((r) => r.levels > 0).map((r) => `${r.ref} ${r.levels}`).join(" / ")}`;

/**
 * The Match chip (D314 B): `Classes:` raised to fit the headers when they prove it too low (more headers of a class than its
 * levels, a header past the total, a class it lacks). It only raises, never lowers. Null when nothing needs raising.
 */
export function matchLevels(text: string): string | null {
  const runs = totals(text);
  if (!runs) return null;
  const hs = headers(text.split("\n"));
  if (!hs.length) return null;
  const next = runs.map((r) => ({ ...r }));
  for (const h of hs) if (!next.some((r) => same(r.ref, h.name))) next.push({ ref: h.ref, name: h.name, levels: 0 });
  for (const r of next) r.levels = Math.max(r.levels, hs.filter((h) => same(h.name, r.ref)).length);
  const top = hs.reduce((a, h) => (h.n > a.n ? h : a));
  const short = top.n - next.reduce((a, r) => a + r.levels, 0);
  if (short > 0) { const r = next.find((x) => same(x.ref, top.name)); if (r) r.levels += short; }
  const line = classesLine(next);
  return line === CLASSES.exec(text)?.[0].trim() ? null : text.replace(CLASSES, line);
}

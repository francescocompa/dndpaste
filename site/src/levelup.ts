/**
 * T8.2 level-up (D305): the next level's block, written after the text, with the empty keys that level owes (the same
 * rule as "Start a build", `owedKeys`), and `Classes:` one higher. The text is edited in place, never run through emit,
 * so what the user wrote stays as written. Shared by the form (client) and the tests.
 */
import { CLASS_NAMES, MAX_LEVEL, owedKeys } from "./preset.ts";
import type { Edition } from "./preset.ts";

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

/** The level the next block takes: the `Classes:` total + 1; null past 20 or without a readable `Classes:`. */
export function nextLevel(text: string): number | null {
  const runs = classRuns(text);
  if (!runs) return null;
  const n = runs.reduce((a, r) => a + r.levels, 0) + 1;
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

/**
 * The text with `cls`'s next level added: `L<n> <ref>` and its owed keys after the last block, `Classes:` one higher
 * (a new class joins as `/ <ref> 1`). The cursor sits at the end of the first owed key (`Spells:|`), else at the end
 * of the header. Null past level 20 or without a readable `Classes:` line.
 */
export function levelUp(text: string, cls: string): LevelUp | null {
  const runs = classRuns(text);
  const n = nextLevel(text);
  if (!runs || n === null || !cls.trim()) return null;
  const ref = classRef(text, cls);
  const run = runs.find((r) => same(r.ref, ref));
  const k = (run?.levels ?? 0) + 1;
  const next = run ? runs.map((r) => (r === run ? { ...r, levels: k } : r)) : [...runs, { ref, name: bare(ref), levels: 1 }];
  const line = `Classes: ${next.map((r) => `${r.ref} ${r.levels}`).join(" / ")}`;
  const known = CLASS_NAMES.find((c) => c.toLowerCase() === bare(ref).toLowerCase());
  const keys = known ? owedKeys(editionOf(text), known, k, n) : [];
  const head = text.replace(CLASSES, line).replace(/\s+$/, "");
  const block = [`L${n} ${ref}`, ...keys.map((key) => `${key}:`)];
  const out = `${head}\n\n${block.join("\n")}\n`;
  const at = head.length + 2 + block[0].length + (keys.length ? 1 + block[1].length : 0);
  return { text: out, cursor: at, level: n, ref };
}

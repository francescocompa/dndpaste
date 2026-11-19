/**
 * One-click fixes (D190's pattern, widened by D196 T12 and D192 T01): a line the editor can mend in one step gets the
 * hint underline (dashed, accent; never an error's wavy red) on its key or level header, and a button over it opens a
 * popover with one action. The reason is the popover's accessible label; the action says what it does. Display only,
 * DOM-free: `apply` returns the new text, or null when the line no longer reads as it did; the form writes it through
 * the textarea so Undo brings the old text back.
 *
 * Kinds, each one fix per line at most (the first wins, in this order):
 * - prepared: a whole-list preparer's `Spells` line → Prepared (D190, 2014 too since D212).
 * - lib: the library's own fix on a diagnostic (D203, wired by D225), only those it marks unsafe (a did-you-mean, a
 *   note, `L5 Wizard`): the safe ones (a header key out of a block, joined lines, `/`, a space, a 0.7 key) are Tidy's
 *   (review). Its label is the action and its hint the reason.
 * - move-up: a pick the written species doesn't give → above Species (D213).
 * - level-lines: a level header whose block lacks a key that level owes → those keys as empty lines (D215, T10).
 * - species-lines: a species whose block lacks a line it owes → those lines (D211, T11).
 * - family: needs the names table (/assets/names.js, D158), so `nameFixes` adds it once it has loaded: a plain
 *   `Options` line whose picks are all one family → that family's key (D214). (An other-edition fix was dropped in
 *   review: a hint on every `|PHB` in a 2024 build is too much.)
 * - A `Subclass` line under Species or Background moves into the level block where its class gains its subclass, not
 *   to the header (review: a subclass belongs where it arrives).
 *
 * The library's fixes win over the site's own fix on a line (D225).
 */
import { KEYS, applyFix, classSequence, emit, familyOf, keyGroup, parse, resolveKey } from "../../src/dndpaste.ts";
import type { Diagnostic, Paste, Ref } from "../../src/dndpaste.ts";
import { isWholeList, speciesPreset, toPrepared } from "./ghost.ts";
import type { Ghost } from "./ghost.ts";
import { PRESETS } from "./presets.ts";
import type { ClassPreset } from "./presets.ts";
import type * as N from "./names.gen.ts";

export type FixKind = "lib" | "prepared" | "move-up" | "move-level" | "level-lines" | "species-lines" | "family";

export interface Fix {
  /** 1-based line. */
  line: number;
  /** What carries the underline: the line's key, or its level header. */
  at: "key" | "level";
  kind: FixKind;
  /** The reason: the popover's accessible label (D190 review). */
  why: string;
  /** The button's words. */
  act: string;
  /** The text after the fix, or null when the line has changed since. */
  apply: (text: string) => string | null;
}

const LEVEL_RE = /^L([1-9]\d*)\s+(.+)$/i;
const EDITION_SOURCE: Record<string, ClassPreset["source"]> = { "2014": "PHB", "2024": "XPHB" };
const lc = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** The first `:` followed by a space or ending the line, as the parser reads a key line; -1 if none. */
function separator(line: string): number {
  const i = line.indexOf(":");
  if (i < 0) return -1;
  return i === line.length - 1 || line[i + 1] === " " ? i : -1;
}
const keyOf = (line: string): string | null => {
  const t = line.trim();
  const sep = separator(t);
  return sep > 0 ? t.slice(0, sep).trim() : null;
};

/** Where each line sits, as the parser reads it: the header, a Species or Background block, or a level block. */
interface Where { region: "H" | "S" | "B" | "L"; opener: number }
function regions(lines: readonly string[]): Where[] {
  const out: Where[] = [];
  let cur: Where = { region: "H", opener: -1 };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t && LEVEL_RE.test(t)) cur = { region: "L", opener: i };
    else if (t && cur.region !== "L") {
      const k = keyOf(t);
      const def = k ? resolveKey(k).def : null;
      if (def?.opensBlock) cur = { region: def.opensBlock, opener: i };
    }
    out.push(cur);
  }
  return out;
}

/** The lines of the block line `i` is in: from its opener (or the top) to the line before the next block. */
function blockRange(lines: readonly string[], i: number): [number, number] {
  const w = regions(lines);
  let a = i, b = i;
  while (a > 0 && w[a - 1].opener === w[i].opener && w[a - 1].region === w[i].region) a--;
  while (b < lines.length - 1 && w[b + 1].opener === w[i].opener && w[b + 1].region === w[i].region) b++;
  return [a, b];
}

/** Lines inserted after the last non-blank line of the block line `i` opens (or is in). */
function insertInBlock(text: string, i: number, add: readonly string[]): string {
  const lines = text.split("\n");
  let [, b] = blockRange(lines, i);
  while (b > i && !lines[b].trim()) b--;
  lines.splice(b + 1, 0, ...add);
  return lines.join("\n");
}

/**
 * The text after renaming line `line`'s key to `key` (value kept), or, when its block already has that key, its names
 * added to that line (no repeats) and the line removed (D190's Switch to Prepared, for any key). Null when the line
 * isn't a key line.
 */
export function moveTo(text: string, line: number, key: string): string | null {
  const lines = text.split("\n");
  const i = line - 1;
  const raw = lines[i] ?? "";
  const lead = /^\s*/.exec(raw)?.[0] ?? "";
  const t = raw.trim();
  const sep = separator(t);
  if (sep <= 0) return null;
  const value = t.slice(sep + 1).trim();
  const [a, b] = blockRange(lines, i);
  let j = -1;
  for (let k = a; k <= b; k++) if (k !== i && lc(keyOf(lines[k]) ?? "") === lc(key)) j = k;
  if (j < 0) {
    lines[i] = `${lead}${key}:${value ? ` ${value}` : ""}`;
    return lines.join("\n");
  }
  const names = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
  const s2 = lines[j].indexOf(":");
  const have = names(lines[j].slice(s2 + 1));
  const seen = new Set(have.map(lc));
  const add = names(value).filter((x) => !seen.has(lc(x)));
  lines[j] = `${lines[j].slice(0, s2 + 1)} ${[...have, ...add].join(", ")}`.replace(/:\s+$/, ":");
  lines.splice(i, 1);
  return lines.join("\n");
}

/** Line `line` moved to just above the first `Species:` or `Background:` line (the blank lines above it kept below). */
export function moveAbove(text: string, line: number): string | null {
  const lines = text.split("\n");
  const i = line - 1;
  const w = regions(lines);
  const first = w.findIndex((x) => x.region === "S" || x.region === "B");
  if (first < 0 || i <= first || i >= lines.length) return null;
  const [moved] = lines.splice(i, 1);
  let at = first;
  while (at > 0 && !lines[at - 1].trim()) at--;
  lines.splice(at, 0, moved.trim());
  return lines.join("\n");
}

/** The class table for a level's class (its own source, else the `Rules:` edition). */
function tableFor(ref: Ref, rules: string | null): ClassPreset | undefined {
  const src = ref.source ? ref.source.toUpperCase() : rules ? EDITION_SOURCE[rules] : undefined;
  return src ? PRESETS.find((p) => p.source === src && p.name.toLowerCase() === ref.name.toLowerCase()) : undefined;
}

/** D215 (T10): the keys a level owes, as a preset lays them out (preset.ts): the class level's owed keys, the first
 *  class's or a later class's level-1 keys, and a 2024 whole-list preparer's `Prepared` where its loadout grows. */
export function owedKeys(p: ClassPreset, n: number, k: number): string[] {
  const keys = [...(k === 1 ? (n === 1 ? p.first : p.multi) : []), ...(p.owes[k - 1] ?? [])];
  if (p.source === "XPHB" && isWholeList(p) && (p.counts[k - 1]?.Prepared ?? 0) > (k > 1 ? p.counts[k - 2]?.Prepared ?? 0 : 0)) keys.push("Prepared");
  return [...new Set(keys)];
}

/** The level header (`L3 Wizard`) of the first block where a class of the build gains its subclass; null if none. */
function subclassLevel(lines: readonly string[], paste: Paste, rules: string | null): string | null {
  const seq = classSequence(paste).levels;
  const taken = new Map<string, number>();
  const has = new Set(paste.levels.map((l) => l.n));
  for (let n = 1; n <= seq.length; n++) {
    const c = seq[n - 1];
    if (!c) continue;
    const k = (taken.get(lc(c.name)) ?? 0) + 1;
    taken.set(lc(c.name), k);
    if (!has.has(n) || !tableFor(c, rules)?.owes[k - 1]?.includes("Subclass")) continue;
    const head = lines.find((x) => LEVEL_RE.exec(x.trim())?.[1] === String(n));
    if (head) return head.trim().replace(/\|.*$/, "");
  }
  return null;
}

/** Line `line` moved to the end of the level block whose header starts with `head` (`L3 Wizard`). */
export function moveInto(text: string, line: number, head: string): string | null {
  const lines = text.split("\n");
  if (line < 1 || line > lines.length) return null;
  const [moved] = lines.splice(line - 1, 1);
  const n = /^L(\d+)/.exec(head)?.[1];
  const h = lines.findIndex((x) => LEVEL_RE.exec(x.trim())?.[1] === n);
  if (h < 0) return null;
  return insertInBlock(lines.join("\n"), h, [moved.trim()]);
}

/** The names fixes' table rows (names.gen.ts), as the form loads it. */
export type Names = typeof N;

const opener = (lines: readonly string[]): string => {
  const w = regions(lines);
  const i = w.findIndex((x) => x.region === "S" || x.region === "B");
  return i < 0 ? "Species" : w[i].region === "S" ? "Species" : "Background";
};

/** Keys a species block may hold that a species never gives as a pick (T01, D213): a line of these there was meant
 *  for the header. Skills and Feat join them when the written species asks none. */
const NOT_SPECIES = new Set(["Spells", "Prepared", "Expertise", "Options", "Masteries"]);

/** The fixes the site can offer without the names table, one per line at most. */
export function lineFixes(text: string, paste: Paste, diagnostics: readonly Diagnostic[], ghosts: readonly Ghost[]): Fix[] {
  const t = text.replace(/\r\n?/g, "\n");
  const lines = t.split("\n");
  const w = regions(lines);
  const out = new Map<number, Fix>();
  const add = (f: Fix) => { if (!out.has(f.line)) out.set(f.line, f); };
  const rv = paste.header.get("Rules");
  const rules = rv && rv.type === "enum" ? rv.value : null;

  for (const f of libraryFixes(lines, diagnostics)) add(f);

  // D190, D212: a whole-list preparer's Spells line.
  for (const g of ghosts) if (g.note) add({ line: g.line, at: "key", kind: "prepared", why: g.note, act: "Switch to Prepared", apply: (x) => toPrepared(x, g.line) });

  // D213: a Subclass under Species or Background (E005) moves to the level where its class gains it, not to the header
  // (the library's fix skips it); then a pick the written species doesn't give moves above Species.
  const top = opener(lines);
  for (const d of diagnostics) {
    const i = d.line - 1;
    if (d.code !== "E005" || !w[i] || (w[i].region !== "S" && w[i].region !== "B") || !isSubclass(lines[i])) continue;
    const to = subclassLevel(lines, paste, rules);
    if (to) add({ line: d.line, at: "key", kind: "move-level", why: `A subclass goes in the level where its class gains it: ${to}.`, act: `Move to ${to}`, apply: (x) => moveInto(x, d.line, to) });
  }
  const sp = paste.entities.find((e) => e.key === "Species");
  const sd = sp?.item ? speciesPreset(sp.item.ref, rules) : undefined;
  if (sp?.item && sd) {
    const asks = new Set(sd.lines.map(([k]) => k));
    for (let i = 0; i < lines.length; i++) {
      if (w[i].region !== "S") continue;
      const k = keyOf(lines[i]);
      const r = k ? resolveKey(k) : null;
      if (!r?.def || r.def.opensBlock || !r.def.scopes.includes("H")) continue;
      const g = keyGroup(k as string);
      if (!(NOT_SPECIES.has(g) || ((g === "Skills" || g === "Feat") && !asks.has(g)))) continue;
      add({ line: i + 1, at: "key", kind: "move-up", why: `${sd.name} gives no ${g} picks. A build-wide ${g} line goes above ${top}.`, act: `Move above ${top}`, apply: (x) => moveAbove(x, i + 1) });
    }
  }

  // D215 (T10): a level header whose block lacks a key the level owes.
  const seq = classSequence(paste).levels;
  const taken = new Map<string, number>();
  const kAt = new Map<number, { k: number; p: ClassPreset }>();
  for (let n = 1; n <= seq.length; n++) {
    const c = seq[n - 1];
    if (!c) continue;
    const k = (taken.get(lc(c.name)) ?? 0) + 1;
    taken.set(lc(c.name), k);
    const p = tableFor(c, rules);
    if (p) kAt.set(n, { k, p });
  }
  const blocks = new Map(paste.levels.map((l) => [l.n, l]));
  let last = 0;
  for (let i = 0; i < lines.length; i++) {
    const lv = LEVEL_RE.exec(lines[i].trim());
    if (!lv) continue;
    const n = Number(lv[1]);
    if (n <= last || !blocks.has(n)) continue;
    last = n;
    const at = kAt.get(n);
    if (!at) continue;
    const have = new Set([...(blocks.get(n)?.lines.keys() ?? [])].map((x) => keyGroup(x)));
    const missing = owedKeys(at.p, n, at.k).filter((x) => !have.has(keyGroup(x)));
    if (!missing.length) continue;
    add({
      line: i + 1, at: "level", kind: "level-lines", why: `L${n} ${at.p.name} owes ${missing.join(", ")}.`, act: `Add ${missing.join(", ")}`,
      apply: (x) => (LEVEL_RE.test(x.split("\n")[i]?.trim() ?? "") ? insertInBlock(x, i, missing.map((m) => `${m}:`)) : null),
    });
  }

  // D211 (T11): a species whose block lacks a line it owes.
  if (sp?.item && sd) {
    const i = lines.findIndex((x, j) => w[j].region === "S" && w[j].opener === j);
    const feats = sp.lines.get("Feature");
    const featNames = feats?.type === "items" ? feats.items.map((it) => lc(it.ref.name)) : [];
    const missing = sd.lines.filter(([k, v]) => (k === "Feature" ? !featNames.includes(lc(String(v))) : !sp.lines.has(k)));
    if (i >= 0 && missing.length) {
      const label = missing.map(([k, v]) => (k === "Feature" ? String(v) : k));
      add({
        line: i + 1, at: "key", kind: "species-lines", why: `${sd.name} asks for ${label.join(", ")}.`, act: `Add ${label.join(", ")}`,
        apply: (x) => {
          const xs = x.split("\n");
          if (resolveKey(keyOf(xs[i] ?? "") ?? "").def?.key !== "Species") return null;
          const traits = missing.filter(([k]) => k === "Feature").map(([, v]) => String(v));
          const [a, b] = blockRange(xs, i);
          const fl = traits.length ? xs.findIndex((y, j) => j > a && j <= b && resolveKey(keyOf(y) ?? "").def?.key === "Feature") : -1;
          // Review: a trait comes with its brackets, ready for its picks (`Elven Lineage [ ]`).
          const bt = traits.map((x) => `${x} [ ]`).join(", ");
          if (fl >= 0) xs[fl] = `${xs[fl].replace(/\s+$/, "")}${/:$/.test(xs[fl].trim()) ? " " : ", "}${bt}`;
          const addLines = missing.filter(([k]) => k !== "Feature" || fl < 0).map(([k]) => (k === "Feature" ? `Feature: ${bt}` : `${k}:`));
          return insertInBlock(xs.join("\n"), i, [...new Set(addLines)]);
        },
      });
    }
  }
  return [...out.values()].sort((a, b) => a.line - b.line);
}

const isSubclass = (line: string): boolean => resolveKey(keyOf(line) ?? "").def?.key === "Subclass";

/**
 * The library's unsafe fix on each diagnostic (D203), as a site Fix (D225): its label is the action, its hint (else its
 * message) the reason. `lines` is the text the diagnostics were read from: a fix applies only while every line it
 * edits still reads as it did. An E005 `Subclass` line gets none: Francesco rejected moving it above Species (D213).
 */
export function libraryFixes(lines: readonly string[], diagnostics: readonly Diagnostic[]): Fix[] {
  const out: Fix[] = [];
  for (const d of diagnostics) {
    const fix = d.fix;
    // Review (D225): a safe fix is Tidy's job, not an underline; only what Tidy won't do stays one click.
    if (!fix || fix.safe || (d.code === "E005" && isSubclass(lines[d.line - 1] ?? ""))) continue;
    const was = fix.edits.map((e) => [e.line, lines[e.line - 1]] as const);
    out.push({
      line: d.line, at: "key", kind: "lib", why: d.hint ?? d.message, act: fix.label,
      apply: (x) => {
        const xs = x.replace(/\r\n?/g, "\n").split("\n");
        return xs.length === lines.length && was.every(([l, t]) => xs[l - 1] === t) ? applyFix(xs.join("\n"), fix) : null;
      },
    });
  }
  return out;
}

const EDITION_BITS: Record<string, number> = { "2014": 1 | 4, "2024": 2 | 8 };

const FAMILIES = KEYS.filter((d) => d.family?.codes.length).map((d) => ({ key: d.key, codes: (familyOf(d.key) as { codes: readonly string[] }).codes }));
const fits = (codes: readonly string[], types: readonly string[]) => types.some((x) => codes.some((c) => x === c || x.startsWith(c + ":") || c.split("/").includes(x)));
/**
 * The highlight rows with each fix's underline (`wl`, D190 review) and `data-line` on its key or level header. `rows`
 * are highlightRows' rows, one per line.
 */
export function markFixes(rows: readonly string[], fixes: readonly Fix[]): string[] {
  const out = [...rows];
  for (const f of fixes) {
    const r = out[f.line - 1];
    if (!r) continue;
    out[f.line - 1] = f.at === "level"
      ? r.replace(`<span class="lvh">`, `<span class="lvh wl" data-line="${f.line}">`)
      : r.replace(/<span class="k((?: [\w-]+)*)">/, `<span class="k$1 wl" data-line="${f.line}">`);
  }
  return out;
}

/** The fixes that need the names table: a plain Options line of one family (D214). */
export function nameFixes(n: Names, text: string, paste: Paste, taken: ReadonlySet<number> = new Set()): Fix[] {
  const t = text.replace(/\r\n?/g, "\n");
  const lines = t.split("\n");
  const rv = paste.header.get("Rules");
  const rules = rv && rv.type === "enum" ? rv.value : null;
  const ed = rules ? EDITION_BITS[rules] : 0;
  const out: Fix[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (taken.has(i + 1)) continue;
    const s = lines[i].trim();
    const k = keyOf(s);
    if (!k || LEVEL_RE.test(s)) continue;
    const value = s.slice(separator(s) + 1);
    // A plain Options line whose picks are all one family's.
    if (lc(k) === "options") {
      const picks = value.split(",").map((x) => x.trim().replace(/\s*\[.*$/, "").replace(/\|.*$/, "").replace(/^-/, "").trim()).filter(Boolean);
      const keys = new Set<string>();
      let all = picks.length > 0;
      for (const p of picks) {
        const rows = n.OPTIONS.filter((o) => lc(o[0]) === lc(p));
        const row = rows.find((o) => o[1] & ed) ?? rows[0];
        const fam = row ? FAMILIES.filter((f) => fits(f.codes, row[5])) : [];
        if (fam.length !== 1) { all = false; break; }
        keys.add(fam[0].key);
      }
      if (all && keys.size === 1) {
        const key = [...keys][0];
        // Review: "Change to" when the block has no such line yet (a rename), "Move to" when it joins one.
        const [a, b] = blockRange(lines, i);
        const joins = lines.slice(a, b + 1).some((y, j) => a + j !== i && lc(keyOf(y) ?? "") === lc(key));
        out.push({ line: i + 1, at: "key", kind: "family", why: `These are all ${key}.`, act: `${joins ? "Move" : "Change"} to ${key}`, apply: (x) => moveTo(x, i + 1, key) });
      }
    }
  }
  return out;
}

/** One change Tidy can make (D229): its line in the badge's list, and whether it's left out this time. */
export interface TidyChange { label: string; off: boolean }
/** What Tidy will do (D229): the text after, and its changes for the badge's list (left-out ones included). */
export interface TidyPlan { text: string; changes: TidyChange[] }

/** The canonical-form step's line in the list. */
export const CANONICAL = "Rewrites the text in canonical form: key order, spelling and spacing";

/**
 * Tidy's plan (D229): the site's Subclass moves to its level block first (D213; the library would move it above
 * Species), then each of the library's safe fixes in turn, then each plain `Options` line folded into its family (when
 * the names table is loaded), then the canonical form (the library's `emit`, D203). A change whose label is in `skip`
 * is left out (review: a struck-through row in the badge's list). Null when Tidy has nothing it could change.
 */
export function tidyPlan(text: string, n: Names | null = null, skip: ReadonlySet<string> = new Set()): TidyPlan | null {
  const t0 = text.replace(/\r\n?/g, "\n");
  if (!t0.trim()) return null;
  const changes: TidyChange[] = [];
  const note = (label: string, off: boolean) => { if (!changes.some((c) => c.label === label)) changes.push({ label, off }); };
  let t = t0;
  const what = (x: string, line: number) => keyOf(x.split("\n")[line - 1] ?? "") ?? `Line ${line}`;
  for (let pass = 0; pass < 40; pass++) {
    const p = parse(t);
    const mv = lineFixes(t, p, p.diagnostics, []).find((f) => f.kind === "move-level");
    if (mv) {
      const label = `Subclass: ${mv.act}`;
      const next = skip.has(label) ? null : mv.apply(t);
      note(label, next === null);
      if (next !== null && next !== t) { t = next; continue; }
    }
    let made = false;
    for (const d of p.diagnostics) {
      if (!d.fix?.safe || !d.code.startsWith("E")) continue;
      const label = `${what(t, d.line)}: ${d.fix.label}`;
      note(label, skip.has(label));
      if (skip.has(label)) continue;
      const next = applyFix(t, d.fix);
      if (next === t) continue;
      t = next;
      made = true;
      break;
    }
    if (!made) break;
  }
  if (n) {
    for (let pass = 0; pass < 20; pass++) {
      const fold = nameFixes(n, t, parse(t)).map((f) => ({ f, label: `Options: ${f.act}` }));
      for (const x of fold) note(x.label, skip.has(x.label));
      const go = fold.find((x) => !skip.has(x.label));
      const next = go?.f.apply(t);
      if (!next || next === t) break;
      t = next;
    }
  }
  const canon = emit(parse(t));
  if (canon.trimEnd() !== t.trimEnd()) {
    note(CANONICAL, skip.has(CANONICAL));
    if (!skip.has(CANONICAL)) t = canon;
  }
  if (!changes.length) return null;
  return { text: t, changes };
}

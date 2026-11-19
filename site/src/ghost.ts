/**
 * Ghost pick counts (D129–D133): how many picks each counted line of a level block expects there, from the class
 * table the presets come from (presets.ts, committed SRD data). Display only: the editor draws them in its highlight
 * layer, never in the text, a copy or the paste, and never outside the editor (D131). Not a checker (D66): an unknown
 * class, edition or count gets no ghost, and going over is a quiet note (D132).
 *
 * Per level: the class comes from the reading rule (`classSequence`, D49), the class level from how many levels that
 * class has had so far, and each class from its own table, so a multiclass build needs no rule of its own. Gains for
 * Skills, Expertise, Cantrips, Spells and Options (a `-` drop lets one more pick in, as the checker's owed + dropped);
 * the loadout total for Masteries and Prepared (SPEC: "the default loadout from that level").
 */
import { classSequence, splitMarker } from "../../src/dndpaste.ts";
import type { Paste, Ref } from "../../src/dndpaste.ts";
import { PRESETS } from "./presets.ts";
import { esc, icon } from "./render.ts";
import type { ClassPreset } from "./presets.ts";

export interface Ghost {
  /** 1-based line of the text. */
  line: number;
  /** The level block it sits in. */
  n: number;
  /** Picks written on the line (drops not counted). */
  have: number;
  /** Picks the table expects there. */
  of: number;
}

/** The keys a ghost may sit on (D129), in their canonical spelling. */
const LOADOUT = new Set(["Masteries", "Prepared"]);
const COUNTED = new Map(["Skills", "Expertise", "Cantrips", "Spells", "Options", "Masteries", "Prepared"].map((k) => [k.toLowerCase(), k]));
const LEVEL_RE = /^L([1-9]\d*)\s+(.+)$/i;
const EDITION_SOURCE: Record<string, ClassPreset["source"]> = { "2014": "PHB", "2024": "XPHB" };

/** The table for a level's class: its own source, else the `Rules:` edition; none for a class not in the table. */
function tableFor(ref: Ref, rules: string | null): ClassPreset | undefined {
  const src = ref.source ? ref.source.toUpperCase() : rules ? EDITION_SOURCE[rules] : undefined;
  if (!src) return undefined;
  const name = ref.name.toLowerCase();
  return PRESETS.find((p) => p.source === src && p.name.toLowerCase() === name);
}

/** The first `:` followed by a space or ending the line, as the parser reads a key line; -1 if none. */
function separator(line: string): number {
  const i = line.indexOf(":");
  if (i < 0) return -1;
  return i === line.length - 1 || line[i + 1] === " " ? i : -1;
}

/** The ghost counts of a parsed paste, one per counted line that has a count to show (D131). */
export function ghostCounts(paste: Paste, text: string): Ghost[] {
  const rv = paste.header.get("Rules");
  const rules = rv && rv.type === "enum" ? rv.value : null;
  const seq = classSequence(paste).levels;
  const blocks = new Map(paste.levels.map((l) => [l.n, l]));
  // Class level and table for every character level that has a block.
  const at = new Map<number, { k: number; table: ClassPreset }>();
  const taken = new Map<string, number>();
  for (let n = 1; n <= seq.length; n++) {
    const cls = seq[n - 1];
    if (!cls) continue;
    const key = cls.name.toLowerCase();
    const k = (taken.get(key) ?? 0) + 1;
    taken.set(key, k);
    const table = tableFor(cls, rules);
    if (table && blocks.has(n)) at.set(n, { k, table });
  }

  const out: Ghost[] = [];
  const lines = text.split(/\r?\n/);
  let last = 0;
  let cur: number | null = null;
  let seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const lv = LEVEL_RE.exec(t);
    if (lv) {
      // A header the parser skipped (out of order, unreadable) leaves the lines below in the block above.
      const n = Number(lv[1]);
      if (n > last && blocks.has(n)) { last = n; cur = n; seen = new Set(); }
      continue;
    }
    if (cur === null) continue;
    const sep = separator(t);
    if (sep < 0) continue;
    const key = COUNTED.get(splitMarker(t.slice(0, sep).trim()).key.toLowerCase());
    if (!key || seen.has(key)) continue;   // a second line of a key is E003, kept out of the block
    seen.add(key);
    const here = at.get(cur);
    if (!here || !here.table.counted.includes(key)) continue;
    const { k, table } = here;
    let of = table.counts[k - 1]?.[key] ?? 0;
    if (key === "Skills" && k === 1) of += table.skills[cur === 1 ? 0 : 1];
    const v = blocks.get(cur)?.lines.get(key);
    const items = v && v.type === "items" ? v.items : [];
    const have = items.filter((it) => !it.drop).length;
    if (!LOADOUT.has(key)) of += items.length - have;
    if (of === 0 && have === 0) continue;   // owed nothing here and empty: no ghost (D131)
    out.push({ line: i + 1, n: cur, have, of });
  }
  return out;
}

/** The ghost's words: `2/3` (T3.9 review, amends D130). Over the count, the alert icon says so, not the words (D132). */
export function ghostText(g: Ghost): string {
  return `${g.have}/${g.of}`;
}

/** Characters a ghost takes on a row, near enough: its words, the tag's padding, the icon when over. */
export function ghostWidth(g: Ghost): number {
  return ghostText(g).length + 1 + (g.have > g.of ? 2 : 0);
}

/** A ghost's markup after its line: the padding spaces (mono, so they align) and the tag, a small sans chip (so it
 * never reads as text of the paste), the alert icon after the numbers when over (T3.9 review). `word`: the ghost
 * text at the cursor (D174), drawn over the padding; the chip steps right on that line when the word needs the room. */
export function ghostHtml(g: Ghost, pad: number, word = ""): string {
  const over = g.have > g.of;
  const gt = word ? `<span class="gt">${esc(word)}</span>` : "";
  const p = word ? Math.max(pad, word.length + 2) : pad;
  return `<span class="gh">${gt}<span class="gp">${" ".repeat(p)}</span><span class="gc${over ? " over" : ""}">${ghostText(g)}${over ? icon("alert") : ""}</span></span>`;
}

/**
 * D175: the count on the line being typed keeps its last value while that line doesn't read (an open comma, bracket
 * or quote leaves the parser no items: `Guidance, ` would read 0/3). `line` is the cursor's line (1-based; 0 = none),
 * `broken` whether it has an error now, `kept` what the last call returned. A line that reads, or another line, takes
 * the new count and is kept for next time.
 */
export function keepCount(ghosts: readonly Ghost[], line: number, broken: boolean, kept: Ghost | null): { ghosts: Ghost[]; kept: Ghost | null } {
  const now = ghosts.find((g) => g.line === line) ?? null;
  if (!line) return { ghosts: [...ghosts], kept: null };
  if (!broken || !kept || kept.line !== line) return { ghosts: [...ghosts], kept: broken ? null : now };
  const out = ghosts.filter((g) => g.line !== line);
  out.push(kept);
  return { ghosts: out.sort((a, b) => a.line - b.line), kept };
}

/** The ghost lane (D130): the editor keeps this many characters free at the right of every row while a ghost shows,
 * so a line that reaches the edge still has room for its ghost. Fits an over `25/22`. */
export const LANE = 8;

/**
 * Where each ghost starts, as spaces after its line's text (D130): one column per level block, two past the block's
 * longest counted line. `cols` is how many characters of text fit on an editor row (the lane not included); the
 * ghost may run into the lane. A wrapped line, or one whose aligned ghost would not fit, keeps its ghost one space
 * after its value and sits out of the block's column.
 */
export function ghostPads(lines: readonly string[], ghosts: readonly Ghost[], cols = Infinity, lane = LANE): Map<number, number> {
  const len = (g: Ghost) => (lines[g.line - 1] ?? "").length;
  const room = cols + lane;
  const col = new Map<number, number>();
  for (const g of ghosts) {
    const c = len(g) + 2;
    if (len(g) > cols || c + ghostWidth(g) > room) continue;
    col.set(g.n, Math.max(col.get(g.n) ?? 0, c));
  }
  const pads = new Map<number, number>();
  for (const g of ghosts) {
    const c = col.get(g.n);
    const fits = c !== undefined && len(g) <= cols && len(g) + 2 <= c && c + ghostWidth(g) <= room;
    pads.set(g.line, fits ? c - len(g) : 1);
  }
  return pads;
}

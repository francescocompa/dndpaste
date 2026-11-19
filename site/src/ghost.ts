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
import { classSequence, keyGroup, resolveKey } from "../../src/dndpaste.ts";
import type { Paste, Ref } from "../../src/dndpaste.ts";
import { PRESETS, SPECIES_PRESETS } from "./presets.ts";
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
  /** The group's other lines, when its count spans several (D178): `Spells (6th)` under `Spells`, `Pact Boon` with
   *  `Invocations`. The chip sits on `line`, the first; the ghost text (D174) shows on any of them while it's short. */
  also?: number[];
  /** A plain hint in place of the count (D190): a `Spells` line in a whole-list preparer's block. */
  note?: string;
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

/** A class that prepares from its whole list (D190, D23): its table counts a `Prepared` loadout and never `Spells`.
 *  2024 Cleric, Druid, Paladin and Ranger. A Wizard keeps both: `Spells` is the spellbook. D212 (T09): a 2014 class
 *  whose table counts no `Spells` and whose 2024 twin prepares from its whole list (Cleric, Druid, Paladin; a 2014
 *  Ranger knows its spells, so it counts them). */
export function isWholeList(table: ClassPreset): boolean {
  const own = (t: ClassPreset) => t.counted.includes("Prepared") && !t.counts.some((c) => c.Spells);
  if (table.source === "XPHB") return own(table);
  const twin = PRESETS.find((p) => p.source === "XPHB" && p.name === table.name);
  return Boolean(twin && own(twin)) && !table.counts.some((c) => c.Spells);
}

/** The level block's class name when it prepares from its whole list (D190), else null. */
export function wholeListClass(name: string, source: string | null, rules: string | null): string | null {
  const t = tableFor({ name, source }, rules);
  return t && isWholeList(t) ? t.name : null;
}

/** D190: the hint a whole-list preparer's `Spells` line shows instead of a count. The D152 copy pass reviews it. */
export function wholeListNote(cls: string): string {
  return `${cls} prepares from its whole list, so its spells go on Prepared.`;
}

/**
 * D190 review: the text after moving a whole-list preparer's `Spells` line (1-based `line`) to `Prepared`: the key
 * renamed in place (`Spells (3rd)` → `Prepared (3rd)`), or, when the block already has that `Prepared` line, its
 * names added there (no repeats) and the `Spells` line removed. Null when the line isn't a `Spells` line.
 */
export function toPrepared(text: string, line: number): string | null {
  const lines = text.split("\n");
  const i = line - 1;
  const m = /^(\s*)spells(\s*\([^)]*\))?\s*:(.*)$/i.exec(lines[i] ?? "");
  if (!m) return null;
  const cap = (m[2] ?? "").trim().toLowerCase();
  const key = `Prepared${cap ? ` ${cap}` : ""}`;
  // The block: from the level header above to the one below.
  let a = i, b = i;
  while (a > 0 && !LEVEL_RE.test(lines[a - 1].trim())) a--;
  while (b < lines.length - 1 && !LEVEL_RE.test(lines[b + 1].trim())) b++;
  const want = key.toLowerCase().replace(/\s+/g, " ");
  let j = -1;
  for (let k = a; k <= b; k++) {
    const sep = separator(lines[k].trim());
    if (k !== i && sep > 0 && lines[k].trim().slice(0, sep).trim().toLowerCase().replace(/\s+/g, " ") === want) j = k;
  }
  const names = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
  if (j < 0) {
    lines[i] = `${m[1]}${key}:${m[3]}`;
    return lines.join("\n");
  }
  const sep = lines[j].indexOf(":");
  const have = names(lines[j].slice(sep + 1));
  const seen = new Set(have.map((x) => x.toLowerCase()));
  const add = names(m[3]).filter((x) => !seen.has(x.toLowerCase()));
  lines[j] = `${lines[j].slice(0, sep + 1)} ${[...have, ...add].join(", ")}`.replace(/:\s+$/, ":");
  lines.splice(i, 1);
  return lines.join("\n");
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

  // Each counted line, by level block and the group it counts into (D178): a family line (`Invocations`,
  // `Options (Rune)`) counts as `Options`, a capped line (`Spells (6th)`) as `Spells`, as the checker's slots do (D185).
  const groups = new Map<string, { n: number; key: string; lines: number[]; scopes: string[] }>();
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
    const raw = t.slice(0, sep).trim();
    const key = COUNTED.get(keyGroup(raw).toLowerCase());
    const r = key ? resolveKey(raw) : null;
    if (!key || !r?.def || seen.has(r.key)) continue;   // a second line of a key is E003, kept out of the block
    seen.add(r.key);
    const id = `${cur}\u0000${key}`;
    const g = groups.get(id);
    if (g) { g.lines.push(i + 1); g.scopes.push(r.key); }
    else groups.set(id, { n: cur, key, lines: [i + 1], scopes: [r.key] });
  }

  const out: Ghost[] = [...speciesGhosts(paste, lines, rules)];
  for (const { n, key, lines: at1, scopes } of groups.values()) {
    const here = at.get(n);
    if (!here || !here.table.counted.includes(key)) continue;
    const { k, table } = here;
    if (key === "Spells" && isWholeList(table)) {
      // D190: no count to meet here; say where the picks go.
      out.push({ line: at1[0], n, have: 0, of: 0, note: wholeListNote(table.name) });
      continue;
    }
    let of = table.counts[k - 1]?.[key] ?? 0;
    if (key === "Skills" && k === 1) of += table.skills[n === 1 ? 0 : 1];
    const items = scopes.flatMap((sk) => { const v = blocks.get(n)?.lines.get(sk); return v && v.type === "items" ? v.items : []; });
    const have = items.filter((it) => !it.drop).length;
    if (!LOADOUT.has(key)) of += items.length - have;
    if (of === 0 && have === 0) continue;   // owed nothing here and empty: no ghost (D131)
    const g: Ghost = { line: at1[0], n, have, of };
    if (at1.length > 1) g.also = at1.slice(1);
    out.push(g);
  }
  out.sort((a, b) => a.line - b.line);
  return out;
}

/** D211 (T11): the species block's Skills count, from the species table (SPECIES_PRESETS); n is 0, its own column. */
function speciesGhosts(paste: Paste, lines: readonly string[], rules: string | null): Ghost[] {
  const sp = paste.entities.find((e) => e.key === "Species");
  const sd = sp?.item ? speciesPreset(sp.item.ref, rules) : undefined;
  if (!sp || !sd) return [];
  const want = new Map(sd.lines.filter(([, v]) => typeof v === "number").map(([k, v]) => [k, v as number]));
  const out: Ghost[] = [];
  for (const [key, v] of sp.lines) {
    const of = want.get(key);
    if (of === undefined || !COUNTED.has(key.toLowerCase()) || v.type !== "items") continue;
    const line = blockLine(lines, "Species", key);
    if (!line) continue;
    const have = v.items.filter((it) => !it.drop).length;
    const g: Ghost = { line, n: 0, have, of: of + v.items.length - have };
    out.push(g);
  }
  return out;
}

/** The species table row for a written species: its own source, else the `Rules:` edition's. */
export function speciesPreset(ref: Ref, rules: string | null) {
  const src = ref.source ? ref.source.toUpperCase() : rules ? EDITION_SOURCE[rules] : undefined;
  const name = ref.name.toLowerCase();
  return src ? SPECIES_PRESETS.find((p) => p.source === src && p.name.toLowerCase() === name) : undefined;
}

/** The 1-based line of `key` inside the block that `opener:` opens (a header block), else 0. */
function blockLine(lines: readonly string[], opener: string, key: string): number {
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (LEVEL_RE.test(t)) return 0;
    const sep = separator(t);
    if (sep < 0) continue;
    const k = resolveKey(t.slice(0, sep).trim());
    if (k.def?.opensBlock) { if (inside) return 0; inside = k.def.key === opener; continue; }
    if (inside && k.def && k.key === key) return i + 1;
  }
  return 0;
}

/** The ghost's words: `2/3` (T3.9 review, amends D130). Over the count, the alert icon says so, not the words (D132). */
export function ghostText(g: Ghost): string {
  // D210 (T08, review round 2): the chip stays 1/0 with its alert icon, and opens nothing.
  return g.note ?? `${g.have}/${g.of}`;
}

/** Characters a ghost takes on a row, near enough: its words, the tag's padding, the icon when over. */
export function ghostWidth(g: Ghost): number {
  if (g.note) return 0;   // no chip: the key carries the hint (D190 review)
  return ghostText(g).length + 1 + (g.have > g.of ? 2 : 0);
}

/** A ghost's markup after its line: the padding spaces (mono, so they align) and the tag, a small sans chip (so it
 * never reads as text of the paste), the alert icon after the numbers when over (T3.9 review). `word`: the ghost
 * text at the cursor (D174), drawn over the padding; the chip steps right on that line when the word needs the room. */
export function ghostHtml(g: Ghost, pad: number, word = ""): string {
  const over = !g.note && g.have > g.of;
  const gt = word ? `<span class="gt">${esc(word)}</span>` : "";
  const p = word ? Math.max(pad, word.length + 2) : pad;
  if (g.note) return "";   // D190 review: no chip; markWholeList underlines the key instead
  return `<span class="gh">${gt}<span class="gp">${" ".repeat(p)}</span><span class="gc${over ? " over" : ""}">${ghostText(g)}${over ? icon("alert") : ""}</span></span>`;
}

/** The ghost text alone (D174, D178), on a line of a counted group whose chip sits on the group's first line. */
export function ghostWordHtml(word: string): string {
  return `<span class="gh"><span class="gt">${esc(word)}</span></span>`;
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

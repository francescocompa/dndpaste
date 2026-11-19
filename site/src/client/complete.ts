/**
 * Name autocomplete (D151, D154–D159, D162–D164): what the cursor is typing, which names fit there, and the text a picked name
 * writes. Pure functions over the editor's text, so they run in node tests; form.ts draws the list and handles keys.
 *
 * It only ever suggests. A name the list doesn't know is never flagged or replaced (D151): Enter keeps its new line
 * unless an arrow picked a row (D154).
 */
import { ABILITIES, classSequence, keyDef, parse, splitMarker } from "../../../src/dndpaste.ts";
import { needsQuotes } from "../render.ts";
import { findSeparator, LEVEL_RE } from "./highlight.ts";
import type * as N from "../names.gen.ts";

/** The generated names module (/assets/names.js, D158). */
export type Names = typeof N;
export type Edition = "2014" | "2024";

/** Where the cursor is typing a name, and what kind of name fits there. */
export interface Spot {
  /** The key as the profile names it (`Spells`, `Feat`; a 0.7 alias as its 0.8 key), or `L` for a level header's class. */
  key: string;
  /** A `Feat (…)` slot marker (D110), lower case. */
  marker: string | null;
  /** The paste's `Rules:` edition, if it has one (D155). */
  rules: Edition | null;
  /** Classes whose names lead the list (D156): the level block's class, else the header's `Classes:`. */
  classes: string[];
  /** Class level at the cursor, lower-case class → level: the level block's count, else the `Classes:` line (D162). */
  levels: Map<string, number>;
  /** The text range a picked name replaces: the name only, an opening and closing quote included. */
  start: number;
  end: number;
  /** What was typed of the name, up to the cursor (quote left out). */
  typed: string;
  /** A `|SOURCE` already follows the name: a pick leaves it alone and adds none (D155). */
  hasSource: boolean;
  /** Inside `[ ]`: the item the details belong to, the group the cursor is in, and the groups before it. */
  parent: string | null;
  slot: number;
  groups: string[][];
  /** Names already on the line, lower case: not offered again (D156). */
  taken: Set<string>;
}

export interface Suggestion {
  name: string;
  /** The book `|SOURCE` a pick writes (D155), or null for a bare name. */
  source: string | null;
  /** A spell's level, as the row shows it: `3rd`, `cantrip` (D162). */
  tag?: string;
  /** Above the highest level the spot's class can pick yet: shown, ranked last, dimmed (D162). */
  dim?: boolean;
}

/** Letters before the list opens, by how many names fit the spot (D164): a short list opens on the empty spot. */
export function minTyped(pool: number): number {
  return pool <= 12 ? 0 : pool <= 40 ? 1 : 2;
}
const BOOKS: readonly [string, number, Edition][] = [["PHB", 1, "2014"], ["DMG", 4, "2014"], ["XPHB", 2, "2024"], ["XDMG", 8, "2024"]];
const ABILITY_NAMES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
const lc = (s: string) => s.toLowerCase();
const clean = (s: string) => s.trim().replace(/^-/, "").trim().replace(/^"|"$/g, "").replace(/\|.*$/, "").trim();
/** Lower case, apostrophes dropped, other punctuation as spaces: `tashas` finds `Tasha's`, `bag of tricks` finds `Bag of Tricks, Gray`. */
const norm = (s: string) => lc(s).replace(/['’]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();

/** Splits on `sep` outside quotes and brackets. */
function split(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, quoted = false, cur = "";
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === "[") depth++;
    else if (!quoted && ch === "]") depth = Math.max(0, depth - 1);
    else if (!quoted && depth === 0 && ch === sep) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** The paste's `Rules:` edition, the classes ranking first at line `at` (0-based) and their class levels there. */
function setting(text: string, lines: string[], at: number): { rules: Edition | null; classes: string[]; levels: Map<string, number> } {
  let rules: Edition | null = null;
  let header: [string, number][] = [];
  let block: [string, number] | null = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const r = /^rules:\s*(2014|2024)\s*$/i.exec(t);
    if (r) rules = r[1] as Edition;
    const c = /^classes:\s*(.*)$/i.exec(t);
    if (c) header = split(c[1], "/").map((x): [string, number] => [clean(x.replace(/\s+\d+\s*$/, "")), Number(/\s(\d+)\s*$/.exec(x)?.[1] ?? 0)]).filter((x) => x[0]);
    const lv = i <= at ? LEVEL_RE.exec(t) : null;
    if (lv) block = [clean(lv[2]), Number(lv[1])];
  }
  const levels = new Map<string, number>();
  if (block) {
    // The class level at this block: that class's levels so far, by the reading rule (D49), as the ghost counts.
    const [cls, n] = block;
    const seq = classSequence(parse(text)).levels.slice(0, n);
    const k = seq.filter((r) => r && lc(r.name) === lc(cls)).length;
    if (k) levels.set(lc(cls), k);
  } else for (const [cls, k] of header) if (k) levels.set(lc(cls), k);
  return { rules, classes: block ? [block[0]] : header.map((h) => h[0]), levels };
}

/** What the cursor at `pos` is typing, or null where no name goes (a key, a score, a source, a quantity). */
export function spotAt(text: string, pos: number): Spot | null {
  const ls = text.lastIndexOf("\n", pos - 1) + 1;
  let le = text.indexOf("\n", ls);
  if (le < 0) le = text.length;
  const line = text.slice(ls, le).replace(/\r$/, "");
  const lead = line.length - line.trimStart().length;
  const t = line.trim();
  const lines = text.split("\n");
  const at = text.slice(0, ls).split("\n").length - 1;

  let key: string;
  let marker: string | null = null;
  let vs: number;            // where the value starts, in the line
  const lv = LEVEL_RE.exec(t);
  if (lv) {
    key = "L";
    vs = lead + t.length - lv[2].length;
  } else {
    const sep = findSeparator(t);
    if (sep < 0) return null;
    const raw = splitMarker(t.slice(0, sep));
    const def = keyDef(t.slice(0, sep));
    if (!def) return null;
    key = def.key === "Fighting Style" ? "Feat" : def.key === "Equipment" || def.key === "Items" ? "Gear" : def.key;
    marker = def.key === "Fighting Style" ? "fighting style" : raw.marker ? lc(raw.marker) : null;
    if (!["items", "item", "items¹", "classes"].includes(def.type)) return null;
    vs = lead + sep + 1;
  }
  const col = pos - ls;
  if (col <= vs) return null;
  const value = line.slice(vs);
  const cur = col - vs;
  const listSep = key === "Classes" ? "/" : ",";

  // Walk the value to the cursor: item and detail starts, bracket depth, quotes, the group index.
  let depth = 0, quoted = false, item = 0, detail = 0, open = -1, slot = 0, closed = false;
  for (let i = 0; i < cur; i++) {
    const ch = value[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (ch === "[" && depth === 0) { depth = 1; open = i; slot = 0; detail = i + 1; }
    else if (ch === "]" && depth === 1) { depth = 0; closed = true; }
    else if (ch === ";" && depth === 1) { slot++; detail = i + 1; }
    else if (ch === "," && depth === 1) detail = i + 1;
    else if (ch === listSep && depth === 0) { item = i + 1; closed = false; }
  }
  if (closed) return null;
  if (depth && key === "L") return null;
  let s = depth ? detail : item;
  while (s < cur && value[s] === " ") s++;
  if (!depth && value[s] === "-") s++;
  const q = value[s] === '"';
  const nameStart = q ? s + 1 : s;
  let typed = value.slice(nameStart, cur);
  if (/["|@\[]/.test(typed)) return null;
  // An ASI's `+2 CHA` (D109): the ability after the amount.
  const plus = depth ? /^\+\d+\s+/.exec(typed) : null;
  if (plus) { typed = typed.slice(plus[0].length); s = nameStart + plus[0].length; }
  if (key === "Classes" && /\s\d/.test(typed)) return null;
  if (key === "Gear" && /\sx\d*$/.test(typed)) return null;

  // The end of the name: up to its source, details, the next item or detail, a quantity, or the closing quote.
  let e = cur;
  if (q && !plus) {
    const close = value.indexOf('"', cur);
    e = close < 0 ? value.length : close + 1;
  } else {
    const stop = depth ? /[|;,\]@"]/ : key === "Classes" ? /[|/]/ : /[|,[\]"]/;
    while (e < value.length && !stop.test(value[e])) e++;
    let body = value.slice(cur, e);
    if (key === "Classes") body = body.replace(/\s+\d+\s*$/, "");
    if (key === "Gear" && !depth) body = body.replace(/\s+x\d+\s*$/, "");
    e = cur + body.trimEnd().length;
  }
  const hasSource = value[e] === "|";

  const groups: string[][] = [];
  let parent: string | null = null;
  if (depth) {
    parent = clean(value.slice(item, open));
    const inside = value.slice(open + 1, detail);
    const gs = inside.split(";").map((g) => g.split(",").map(clean).filter(Boolean));
    groups.push(...gs.slice(0, slot));
  }
  // The line without the name being typed: what's left are the names already there.
  const rest = value.slice(0, s) + value.slice(e);
  const others = depth ? split((rest.slice(open + 1).split("]")[0] ?? "").split(";")[slot] ?? "", ",") : split(rest, listSep);
  const taken = new Set(others.map((x) => lc(clean(x.replace(/\[[^\]]*\]?/g, "").replace(/\s+x\d+\s*$/, "").replace(/^\+\d+\s+/, "")))).filter(Boolean));

  const where = setting(text, lines, at);
  return {
    key, marker, rules: where.rules, classes: where.classes, levels: where.levels,
    start: ls + vs + s, end: ls + vs + e, typed, hasSource, parent, slot, groups, taken,
  };
}

interface Cand { name: string; books: number; first: boolean; alt?: string; level?: number }

const abilities = (bits: number): Cand[] =>
  ABILITIES.flatMap((a, i) => (bits & (2 ** i) ? [{ name: a, books: 0, first: false, alt: ABILITY_NAMES[i] }] : []));
const plain = (list: readonly string[]): Cand[] => list.map((name) => ({ name, books: 0, first: false }));

/** The names that fit the spot's key and slot, each marked when it belongs to the spot's classes (D156). */
function candidates(n: Names, sp: Spot): Cand[] {
  const bitsOf = (names: string[]) => names.reduce((a, c) => { const i = n.CLASSES.findIndex((x) => lc(x) === lc(c)); return i < 0 ? a : a | 2 ** i; }, 0);
  const mine = bitsOf(sp.classes);
  const spells = (level: (l: number) => boolean, only = 0): Cand[] =>
    n.SPELLS.filter((s) => level(s[2]) && (!only || s[3] & only)).map((s) => ({ name: s[0], books: s[1], first: Boolean(s[3] & mine), level: s[2] }));
  const items = (mundane: boolean): Cand[] => n.ITEMS.filter((i) => !mundane || i[2]).map((i) => ({ name: i[0], books: i[1], first: false }));
  const tools = (): Cand[] => {
    const seen = new Set(n.TOOLS.map(lc));
    const kit = n.ITEMS.filter((i) => i[2] && /tools|supplies|kit\b|set\b|utensils/i.test(i[0]) && !seen.has(lc(i[0])));
    return [...plain(n.TOOLS), ...kit.map((i) => ({ name: i[0], books: i[1], first: false }))];
  };
  const general = (): Cand[] => [...abilities(63), ...plain(n.SKILLS), ...spells(() => true)];

  if (sp.parent !== null) {
    const p = lc(sp.parent);
    const pick = <T extends readonly [string, number, ...unknown[]]>(rows: readonly T[]): T | undefined => {
      const hits = rows.filter((r) => lc(r[0]) === p);
      const ed = BOOKS.filter((b) => b[2] === sp.rules).reduce((a, b) => a | b[1], 0);
      return hits.find((r) => r[1] & ed) ?? hits[hits.length - 1];
    };
    if (["Species", "Background", "Subclass", "Classes"].includes(sp.key)) return [];
    if (sp.key === "Feat") {
      if (p === "ability score improvement" || p === "asi") return abilities(63);
      const f = pick(n.FEATS);
      if (f) {
        const slots: (() => Cand[])[] = [];
        if (f[3]) slots.push(() => abilities(f[3]));
        const cls = slots.length;
        if (f[4].length) slots.push(() => plain(f[4]));
        const only = () => (f[4].length ? bitsOf(sp.groups[cls] ?? []) : 0);
        if (f[5]) slots.push(() => spells((l) => l === 0, only()));
        if (f[6]) slots.push(() => spells((l) => l === 1, only()));
        if (slots[sp.slot]) return slots[sp.slot]();
      }
    } else if (sp.key === "Feature") {
      if (p === "spellcasting" && sp.slot === 0) return abilities(63);
      const cf = n.CLASS_FEATURES.find((r) => lc(r[0]) === p);
      if (cf) {
        if (sp.slot === 0) return plain(cf[2]);
        // Thaumaturge, Magician: a cantrip of the feature's class in the second group.
        const grants = (sp.groups[0] ?? []).some((g) => cf[3].some((o) => lc(o) === lc(g)));
        return sp.slot === 1 && grants ? spells((l) => l === 0, 2 ** cf[1]) : [];
      }
      const l = n.LINEAGES.find((r) => lc(r[0]) === p);
      if (l) {
        const slots = l[1] ? [abilities(l[1]), plain(l[2])] : [plain(l[2])];
        if (slots[sp.slot]) return slots[sp.slot];
      }
    } else if (sp.key === "Options") {
      const o = pick(n.OPTIONS);
      if (o && o[4] && sp.slot === 0) return spells((l) => l === 0);
    }
    return general();
  }

  switch (sp.key) {
    case "Spells": case "Prepared": return spells((l) => l > 0);
    case "Cantrips": return spells((l) => l === 0);
    case "Feat": {
      const fs = sp.marker === "fighting style";
      const feats = n.FEATS.filter((f) => !sp.marker || lc(f[2]) === sp.marker || (fs && lc(f[2]).startsWith("fighting style")));
      const styles = fs ? n.OPTIONS.filter((o) => o[3]) : [];
      const all = [...feats, ...styles].map((r) => ({ name: r[0], books: r[1], first: false }));
      return all.length ? all : n.FEATS.map((f) => ({ name: f[0], books: f[1], first: false }));
    }
    case "Options": return n.OPTIONS.map((o) => ({ name: o[0], books: o[1], first: Boolean(o[2] & mine) }));
    case "Feature": return [...n.CLASS_FEATURES.map((f) => ({ name: f[0], books: 0, first: Boolean(2 ** f[1] & mine) })), ...plain(n.LINEAGES.map((l) => l[0]))];
    case "Species": return n.SPECIES.map((s) => ({ name: s[0], books: s[1], first: false }));
    case "Background": return n.BACKGROUNDS.map((s) => ({ name: s[0], books: s[1], first: false }));
    case "Subclass": return n.SUBCLASSES.map((s) => ({ name: s[0], books: s[1], first: Boolean(2 ** s[2] & mine), alt: s[3] || undefined }));
    case "Classes": case "L": return n.CLASS_ROWS.map((c) => ({ name: c[0], books: c[1], first: false }));
    case "Gear": return items(false);
    case "Masteries": return items(true);
    case "Skills": case "Expertise": return plain(n.SKILLS);
    case "Languages": return plain(n.LANGUAGES);
    case "Tools": return tools();
    default: return [];
  }
}

const SMALL = new Set(["a", "an", "and", "of", "the", "to"]);
/** How well `q` matches: 0 the name starts with it, 1 a word does, 2 it's inside (3+ letters), -1 not at all. */
function tier(name: string, q: string): number {
  const x = norm(name);
  if (x.startsWith(q)) return 0;
  // A word start, skipping the small words: `th` finds Thunderwave, not Find the Path.
  if (x.split(" ").some((w, i) => i > 0 && !SMALL.has(w) && (x.split(" ").slice(i).join(" ")).startsWith(q))) return 1;
  return q.length >= 3 && x.includes(q) ? 2 : -1;
}

/** The `|SOURCE` a pick writes (D155): none without `Rules:`, none when the name is in that edition, else its book. */
export function sourceFor(books: number, rules: Edition | null): string | null {
  if (!rules || !books) return null;
  if (BOOKS.some(([, bit, ed]) => ed === rules && books & bit)) return null;
  return BOOKS.find(([, bit]) => books & bit)?.[0] ?? null;
}

const ORD = ["cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

/** The highest spell level the spot's classes can pick at their level there (D162); null when no table says. */
export function spellCap(n: Names, sp: Spot): number | null {
  const want = sp.rules === "2014" ? 1 : sp.rules === "2024" ? 2 : 3;
  let cap: number | null = null;
  for (const [cls, k] of sp.levels) {
    for (const c of n.CASTERS) {
      if (lc(c[0]) !== cls || !(c[1] & want)) continue;
      const v = c[2][Math.min(20, k) - 1] ?? 0;
      cap = cap === null ? v : Math.max(cap, v);
    }
  }
  return cap;
}

/**
 * The suggestions for a spot, best first, at most `limit`: the spot's classes first (D156), spells above the class's
 * level last and dimmed (D162), then how well the name matches, then A–Z. One row per name. Empty under the letters
 * the spot's list size asks (D164), or when the typed name is already exactly one.
 */
export function suggest(n: Names, sp: Spot, limit = 8): Suggestion[] {
  const q = norm(sp.typed);
  const cands = candidates(n, sp).filter((c) => !sp.taken.has(lc(c.name)));
  const pool = new Set(cands.map((c) => lc(c.name))).size;
  if (q.replace(/\s/g, "").length < minTyped(pool)) return [];
  const best = new Map<string, { c: Cand; t: number }>();
  for (const c of cands) {
    const t = q ? Math.min(...[c.name, c.alt ?? ""].filter(Boolean).map((x) => tier(x, q)).map((v) => (v < 0 ? 9 : v))) : 0;
    if (t === 9) continue;
    const k = lc(c.name);
    const had = best.get(k);
    if (!had) best.set(k, { c: { ...c }, t });
    else {
      had.c.books |= c.books; had.c.first ||= c.first; had.t = Math.min(had.t, t);
      if (c.level !== undefined) had.c.level = Math.min(had.c.level ?? 9, c.level);
    }
  }
  const typed = sp.typed.trim();
  const cap = spellCap(n, sp);
  const rows = [...best.values()].map(({ c, t }) => {
    const dim = c.level !== undefined && cap !== null && c.level > cap;
    return {
      name: c.name, source: sp.hasSource ? null : sourceFor(c.books, sp.rules), level: c.level, dim,
      grade: dim ? 2 : c.first ? 0 : 1, t, exact: norm(c.name) === q,
    };
  });
  // The name is already written as it should be: nothing to suggest.
  if (rows.some((r) => r.name === typed && !r.source)) return [];
  rows.sort((a, b) => Number(b.exact) - Number(a.exact) || a.grade - b.grade || a.t - b.t ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const top = rows.slice(0, limit);
  // A cantrip says so only among other kinds of names (the general list); a list of cantrips doesn't repeat it.
  const mixed = top.some((r) => r.level !== 0);
  return top.map(({ name, source, level, dim }) => {
    const s: Suggestion = { name, source };
    if (level !== undefined && (level > 0 || mixed)) s.tag = ORD[level];
    if (dim) s.dim = true;
    return s;
  });
}

/** What goes in each `;` group of the `[ ]` the cursor is in, where the table knows (D163), the group it's in, and
 *  how many names each group takes (0: not counted). */
export function slotHint(n: Names, sp: Spot): { slots: string[]; at: number; picks: number[] } | null {
  if (sp.parent === null) return null;
  const p = lc(sp.parent);
  const pick = <T extends readonly [string, number, ...unknown[]]>(rows: readonly T[]): T | undefined => rows.find((r) => lc(r[0]) === p);
  const slots: [string, number][] = [];
  const count = (k: number, one: string, many: string): [string, number] => [k === 1 ? one : `${k} ${many}`, k];
  if (sp.key === "Feat") {
    if (p === "ability score improvement" || p === "asi") slots.push(["+2 ability, or +1 and +1", 0]);
    else {
      const f = pick(n.FEATS);
      if (f) {
        if (f[3]) slots.push(["ability", 1]);
        if (f[4].length) slots.push(["class", 1]);
        if (f[5]) slots.push(count(f[5], "cantrip", "cantrips"));
        if (f[6]) slots.push(count(f[6], "1st-level spell", "1st-level spells"));
      }
    }
  } else if (sp.key === "Feature") {
    const cf = pick(n.CLASS_FEATURES);
    const l = pick(n.LINEAGES);
    if (p === "spellcasting") slots.push(["ability", 1]);
    else if (cf) {
      slots.push(["option", 1]);
      if ((sp.groups[0] ?? []).some((g) => cf[3].some((o) => lc(o) === lc(g)))) slots.push(["cantrip", 1]);
    } else if (l) {
      const kind = /ancestry/.test(p) ? "ancestry" : /legacy/.test(p) ? "legacy" : /lineage/.test(p) ? "lineage" : "choice";
      if (l[1]) slots.push(["ability", 1]);
      slots.push([kind, 1]);
    }
  } else if (sp.key === "Options") {
    const o = pick(n.OPTIONS);
    if (o && o[4]) slots.push(count(o[4], "cantrip", "cantrips"));
  }
  return slots.length && sp.slot < slots.length ? { slots: slots.map((x) => x[0]), at: sp.slot, picks: slots.map((x) => x[1]) } : null;
}

/**
 * What a pick inside `[ ]` writes after itself (D163 review): `, ` while its group wants more names, `; ` when the
 * group is full and another follows, else nothing. Where the table doesn't count, nothing.
 */
export function afterPick(n: Names, sp: Spot, picked: string): string {
  const have = sp.taken.size + 1;
  const groups = sp.groups.slice(0, sp.slot);
  groups[sp.slot] = [...sp.taken, picked];
  const h = slotHint(n, { ...sp, groups });
  const want = h?.picks[h.at] ?? 0;
  if (!h || !want) return "";
  if (have < want) return ", ";
  return h.at < h.slots.length - 1 ? "; " : "";
}

/** The text a pick writes over the spot's range: quoted when the name needs it, then its source. */
export function written(sp: Spot, s: Suggestion): string {
  return (needsQuotes(s.name) ? `"${s.name}"` : s.name) + (s.source && !sp.hasSource ? `|${s.source}` : "");
}

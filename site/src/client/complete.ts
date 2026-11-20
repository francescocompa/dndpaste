/**
 * Name autocomplete (D151, D154–D159, D162–D164): what the cursor is typing, which names fit there, and the text a picked name
 * writes. Pure functions over the editor's text, so they run in node tests; form.ts draws the list and handles keys.
 *
 * It only ever suggests. A name the list doesn't know is never flagged or replaced (D151): Enter keeps its new line
 * unless an arrow picked a row (D154).
 */
import { ABILITIES, classSequence, familyOf, keyDef, keyGroup, levelCap, parse, splitMarker } from "../../../src/dndpaste.ts";
import { needsQuotes } from "../render.ts";
import { findSeparator, LEVEL_RE } from "./highlight.ts";
import { keyHints } from "./hints.ts";
import { MARKED_FEAT } from "../keydocs.ts";
import type * as N from "../names.gen.ts";

/** The generated names module (/assets/names.js, D158), with your own sources merged in (yours.ts `merge`): `OWN`
 *  maps each of your names, lower case, to its books (D250). */
export type Names = typeof N & { OWN?: ReadonlyMap<string, readonly string[]> };
export type Edition = "2014" | "2024";

/** Where the cursor is typing a name, and what kind of name fits there. */
export interface Spot {
  /** The key as the profile names it (`Spells`, `Feat`; a 0.7 alias as its 0.8 key), or `L` for a level header's class. */
  key: string;
  /** A `Feat (…)` slot marker (D110), lower case. */
  marker: string | null;
  /** The line's own spell level cap, `Spells (3rd)` → 3 (D184); null when it has none. */
  cap: number | null;
  /** The option family codes the line takes (`Invocations`, `Options (Invocation)`: `EI`; D186); null for any option. */
  family: readonly string[] | null;
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
  /** The parent item's `|SOURCE`, when it has one (a species' lineage list follows its book, D291). */
  parentSource?: string | null;
  slot: number;
  groups: string[][];
  /** Names already on the line, lower case: not offered again (D156). */
  taken: Set<string>;
  /** The block the line is in (D227): a Species or Background block and its name, or a level block, its class and
   *  whether the class joins there (`join`: "first" at the build's L1, "multi" at a later class's first level). */
  block?: { kind: "S" | "B" | "L"; name: string; join?: "first" | "multi" };
}

export interface Suggestion {
  name: string;
  /** The book `|SOURCE` a pick writes (D155), or null for a bare name. */
  source: string | null;
  /** A spell's level, as the row shows it: `3rd`, `cantrip` (D162). */
  tag?: string;
  /** A name from your own sources: its book, shown on the row when no `|SOURCE` is written (D250). */
  book?: string;
  /** Above the highest level the spot's class can pick yet (D162), or outside the short list the spot's species or
   *  class chooses from (D227): shown, ranked last, dimmed. */
  dim?: boolean;
}

/** D172 trial: every empty spot opens its list, whatever its size. False goes back to D164's letters by size. */
export const OPEN_EVERY_SPOT = true;

/** Letters before the list opens, by how many names fit the spot (D164): a short list opens on the empty spot. */
export function minTyped(pool: number, everySpot = OPEN_EVERY_SPOT): number {
  if (everySpot) return 0;
  return pool <= 12 ? 0 : pool <= 40 ? 1 : 2;
}
/** Book bits: the four built-in books, then "a 2014 book" and "a 2024 book" of your own sources (yours.ts, D259),
 *  whose code the row takes from `OWN`. */
const BOOKS: readonly [string, number, Edition][] = [["PHB", 1, "2014"], ["DMG", 4, "2014"], ["XPHB", 2, "2024"], ["XDMG", 8, "2024"], ["", 16, "2014"], ["", 32, "2024"]];
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
function setting(text: string, lines: string[], at: number): { rules: Edition | null; classes: string[]; levels: Map<string, number>; block: Spot["block"] } {
  let rules: Edition | null = null;
  let header: [string, number][] = [];
  let block: [string, number] | null = null;
  let opened: { kind: "S" | "B"; name: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const r = /^rules:\s*(2014|2024)\s*$/i.exec(t);
    if (r) rules = r[1] as Edition;
    const c = /^classes:\s*(.*)$/i.exec(t);
    if (c) header = split(c[1], "/").map((x): [string, number] => [clean(x.replace(/\s+\d+\s*$/, "")), Number(/\s(\d+)\s*$/.exec(x)?.[1] ?? 0)]).filter((x) => x[0]);
    const lv = i <= at ? LEVEL_RE.exec(t) : null;
    if (lv) block = [clean(lv[2]), Number(lv[1])];
    else if (i <= at && !block) {
      const sep = findSeparator(t);
      const ob = sep > 0 ? keyDef(t.slice(0, sep))?.opensBlock : undefined;
      if (ob === "S" || ob === "B") opened = { kind: ob, name: clean(t.slice(sep + 1).replace(/\s*\[.*$/, "")) }; // D292 review: `Elf [Drow; WIS]` is the Elf block
    }
  }
  const levels = new Map<string, number>();
  let where: Spot["block"];
  if (block) {
    // The class level at this block: that class's levels so far, by the reading rule (D49), as the ghost counts.
    const [cls, n] = block;
    const seq = classSequence(parse(text)).levels.slice(0, n);
    const k = seq.filter((r) => r && lc(r.name) === lc(cls)).length;
    if (k) levels.set(lc(cls), k);
    where = { kind: "L", name: cls, ...(k === 1 ? { join: n === 1 ? "first" as const : "multi" as const } : {}) };
  } else {
    for (const [cls, k] of header) if (k) levels.set(lc(cls), k);
    if (opened) where = opened;
  }
  return { rules, classes: block ? [block[0]] : header.map((h) => h[0]), levels, block: where };
}

/** The cursor at `pos` is inside an empty `[ ]` (only spaces between the brackets): a click there opens the list (D229). */
export function inEmptyBrackets(text: string, pos: number): boolean {
  const ls = text.lastIndexOf("\n", pos - 1) + 1;
  let le = text.indexOf("\n", ls);
  if (le < 0) le = text.length;
  return /\[ *$/.test(text.slice(ls, pos)) && /^ *\]/.test(text.slice(pos, le));
}

/** The range a last pick in `[ ]` replaces (D229 review): `start`–`end` widened over the spaces between it and a `[`
 *  before or a `]` after, so `[ Drow ]` becomes `[Drow]`. Spaces next to a `,` or `;` stay. */
export function bracketTrim(text: string, start: number, end: number): [number, number] {
  let a = start, b = end;
  while (a > 0 && text[a - 1] === " ") a--;
  if (text[a - 1] !== "[") a = start;
  while (text[b] === " ") b++;
  if (text[b] !== "]") b = end;
  return [a, b];
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
  let cap: number | null = null;
  let family: readonly string[] | null = null;
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
    cap = levelCap(t.slice(0, sep));
    const fam = keyGroup(t.slice(0, sep)) === "Options" ? familyOf(t.slice(0, sep)) : null;
    family = fam ? ("codes" in fam ? fam.codes : null) : null;
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
  let parentSource: string | null = null;
  if (depth) {
    parent = clean(value.slice(item, open));
    parentSource = /\|\s*([^\s|[\]]+)/.exec(value.slice(item, open))?.[1] ?? null;
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
    key, marker, cap, family, rules: where.rules, classes: where.classes, levels: where.levels,
    start: ls + vs + s, end: ls + vs + e, typed, hasSource, parent, ...(depth ? { parentSource } : {}), slot, groups, taken,
    ...(where.block ? { block: where.block } : {}),
  };
}

interface Cand { name: string; books: number; first: boolean; alt?: string; level?: number; out?: boolean }

/** The family codes an open `Options (<marker>)` names, matched to the table's family names and codes as the checker
 *  does (D185): `Options (Eldritch Invocation)` → `EI`. Empty when none fits: the line then takes any option. */
export function markerCodes(n: Names, marker: string): string[] {
  const m = lc(marker.trim());
  return Object.entries(n.FAMILIES).filter(([code, name]) => lc(code) === m || lc(name) === m || lc(name) === m + "s" ||
    lc(name).startsWith(m + " ") || lc(name).endsWith(" " + m) || lc(name).endsWith(" " + m + "s")).map(([code]) => code);
}

/**
 * The options a family line takes (D186): those of its family codes (`MV` covers `MV:B`). Under a `Rules:` edition, a
 * name that edition files under another family is left out: in a 2024 paste the pacts are invocations, so `Pact Boon:`
 * offers none of them and `Invocations:` does; in a 2014 paste, the other way round.
 */
function familyOptions(n: Names, codes: readonly string[], rules: Edition | null): Names["OPTIONS"][number][] {
  const fits = (types: readonly string[]) => types.some((t) => codes.some((c) => t === c || t.startsWith(c + ":") || c.split("/").includes(t)));
  const ed = BOOKS.filter((b) => b[2] === rules).reduce((a, b) => a | b[1], 0);
  return n.OPTIONS.filter((o) => fits(o[5]) &&
    !(ed && !(o[1] & ed) && n.OPTIONS.some((x) => x[0] === o[0] && x[1] & ed && !fits(x[5]))));
}

const abilities = (bits: number): Cand[] =>
  ABILITIES.flatMap((a, i) => (bits & (2 ** i) ? [{ name: a, books: 0, first: false, alt: ABILITY_NAMES[i] }] : []));
const plain = (list: readonly string[]): Cand[] => list.map((name) => ({ name, books: 0, first: false }));

/** The names that fit the spot's key and slot, each marked when it belongs to the spot's classes (D156). */
function candidates(n: Names, sp: Spot): Cand[] {
  const bitsOf = (names: string[]) => names.reduce((a, c) => { const i = n.CLASSES.findIndex((x) => lc(x) === lc(c)); return i < 0 ? a : a | 2 ** i; }, 0);
  const mine = bitsOf(sp.classes);
  // D243: where the line's class is clear (a level block, or the header with Classes), a name outside it is dimmed and
  // ranked last, still pickable (D199: a DM may allow it). Not in a Species or Background block: no class filter there.
  const filter = mine && sp.block?.kind !== "S" && sp.block?.kind !== "B" ? mine : 0;
  const off = (bits: number) => (filter && !(bits & filter) ? { out: true } : {});
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
    if (sp.key === "Species") {
      // D280, D291: the species' lineage first, then the ability its spellcasting takes.
      const l = lineageRow(n, sp.parent, sp.parentSource ?? null, sp.rules);
      const slots = l ? (l[3] ? [plain(l[4]), abilities(l[3])] : [plain(l[4])]) : [];
      return slots[sp.slot] ?? [];
    }
    if (["Background", "Subclass", "Classes"].includes(sp.key) || isForm(n, p)) return [];
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
      // D298: a 0.9 lineage line still reads (W006 moves it), so `Feature: Elven Lineage [` offers it the 0.9 way:
      // the ability first when the trait asks one, then the lineage.
      const lt = traitRow(n, p, sp);
      if (lt) {
        const slots = [...(lt[3] ? [() => abilities(lt[3])] : []), () => plain(lt[4])];
        return slots[sp.slot]?.() ?? [];
      }
      const f = n.SPECIES_FEATURES.find((r) => lc(r[0]) === p);
      if (f) return sp.slot === 0 ? plain(f[1]) : [];
      // D266: a feature no list knows offers nothing inside its brackets (the name itself is the thing to fix).
      if (!n.DETAILS.some((r) => lc(r[0]) === p)) return [];
    } else if (keyGroup(sp.key) === "Options") {
      const o = pick(n.OPTIONS);
      if (o && o[4] && sp.slot === 0) return spells((l) => l === 0);
    }
    return general();
  }

  if (keyGroup(sp.key) === "Options") {
    const codes = sp.family ?? (sp.marker ? markerCodes(n, sp.marker) : []);
    const rows = codes.length ? familyOptions(n, codes, sp.rules) : n.OPTIONS;
    return rows.map((o) => ({ name: o[0], books: o[1], first: Boolean(o[2] & mine), ...(codes.length ? {} : off(o[2])) }));
  }
  switch (sp.key) {
    // A spell of yours with no level (-1) goes on both kinds of line.
    case "Spells": case "Prepared": return spells((l) => l > 0 || l < 0).map((c) => (c.first ? c : { ...c, ...off(0) }));
    case "Cantrips": return spells((l) => l <= 0).map((c) => (c.first ? c : { ...c, ...off(0) }));
    case "Feat": {
      const fs = sp.marker === "fighting style";
      const feats = n.FEATS.filter((f) => !sp.marker || lc(f[2]) === sp.marker || (fs && lc(f[2]).startsWith("fighting style")));
      const styles = fs ? n.OPTIONS.filter((o) => o[3]) : [];
      const all = [...feats, ...styles].map((r) => ({ name: r[0], books: r[1], first: false }));
      return all.length ? all : n.FEATS.map((f) => ({ name: f[0], books: f[1], first: false }));
    }
    case "Feature": {
      // D243 review: a level block dims the species' features; a Species block dims every class feature.
      const kind = sp.block?.kind;
      const cls = n.CLASS_FEATURES.map((f) => ({ name: f[0], books: 0, first: Boolean(2 ** f[1] & mine), ...(kind === "S" ? { out: true } : off(2 ** f[1])) }));
      // D298: the lineage traits too (the 0.9 form still reads, with W006); the block's own species' trait first.
      const own = kind === "S" ? lc(sp.block?.name ?? "") : "";
      const traits = [...new Set(n.LINEAGES.filter((l) => l[2]).map((l) => l[2] as string))].map((t) => ({
        name: t, books: 0, first: n.LINEAGES.some((l) => l[2] === t && lc(l[0]) === own), ...(kind === "L" ? { out: true } : {}) }));
      return [...cls, ...traits, ...n.SPECIES_FEATURES.map((l) => ({ name: l[0], books: 0, first: kind === "S", ...(kind === "L" ? { out: true } : {}) }))];
    }
    case "Species": return n.SPECIES.map((s) => ({ name: s[0], books: s[1], first: false }));
    case "Background": return n.BACKGROUNDS.map((s) => ({ name: s[0], books: s[1], first: false }));
    case "Subclass":
      // D241: the line's class leads (the level block's, else the header's Classes); other classes' subclasses follow,
      // dimmed, still pickable. No class known: no dimming.
      return n.SUBCLASSES.map((s) => {
        const own = Boolean(2 ** s[2] & mine);
        return { name: s[0], books: s[1], first: own, alt: s[3] || undefined, ...(mine && !own ? { out: true } : {}) };
      });
    case "Classes": case "L": return n.CLASS_ROWS.map((c) => ({ name: c[0], books: c[1], first: false }));
    case "Gear": return items(false);
    case "Masteries": return n.MASTERY_WEAPONS.map((w) => ({ name: w[0], books: w[1], first: false })); // weapons only (D165)
    case "Skills": {
      // D227: a species' or class's short list leads; the skills it can't take are shown, last and dimmed.
      const bits = skillList(n, sp);
      return bits === null ? plain(n.SKILLS) : n.SKILLS.map((name, i) => (bits & 2 ** i ? { name, books: 0, first: true } : { name, books: 0, first: false, out: true }));
    }
    case "Expertise": return plain(n.SKILLS);
    case "Languages": return plain(n.LANGUAGES);
    case "Tools": return tools();
    default: return [];
  }
}

/**
 * The lineage row a species name takes (D280, D291): the printing its `|SOURCE` names (one of your books: your rows),
 * else the `Rules:` edition's, else the newest (a bare name reads as the newest printing, as the checker reads it).
 */
export function lineageRow(n: Names, species: string, source: string | null, rules: Edition | null): Names["LINEAGES"][number] | undefined {
  const rows = n.LINEAGES.filter((r) => lc(r[0]) === lc(species));
  if (!rows.length) return undefined;
  const code = source ? BOOKS.find((b) => b[0] && lc(b[0]) === lc(source)) : undefined;
  const want = source ? (code ? code[1] : 16 | 32) : BOOKS.filter((b) => b[2] === rules).reduce((a, b) => a | b[1], 0);
  if (want) return rows.find((r) => r[1] & want);
  return rows.find((r) => r[1] & (2 | 8 | 32)) ?? rows[rows.length - 1];
}

/** A 0.9 lineage line's row (D298): the trait named `p` (lower case), the block's own species' row first. */
function traitRow(n: Names, p: string, sp: Spot): Names["LINEAGES"][number] | undefined {
  const rows = n.LINEAGES.filter((l) => l[2] && lc(l[2]) === p);
  const own = sp.block?.kind === "S" ? lc(sp.block.name) : "";
  return rows.find((l) => lc(l[0]) === own) ?? rows[0];
}

/** The short skill list a Skills line chooses from (D227), as bits over SKILLS: its species' list in a Species block,
 *  its class's list where the build starts, the class's multiclass list where it joins later. Null: no short list. */
export function skillList(n: Names, sp: Spot): number | null {
  const b = sp.block;
  if (!b || b.kind === "B" || (b.kind === "L" && !b.join)) return null;
  const kind = b.kind === "S" ? "S" : b.join === "first" ? "C" : "M";
  const hits = n.SKILL_LISTS.filter((r) => r[0] === kind && lc(r[1]) === lc(b.name));
  const ed = BOOKS.filter((x) => x[2] === sp.rules).reduce((a, x) => a | x[1], 0);
  // Under a Rules edition, only that edition's list: a species whose edition has none (a 2014 Elf) has no short list.
  const row = ed ? hits.find((r) => r[2] & ed) : hits[hits.length - 1];
  return row ? row[3] : null;
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

/** The `|SOURCE` a pick writes (D155): none without `Rules:`, none when the name is in that edition, else its book:
 *  a built-in one, else the first of your books for it (`own`). */
export function sourceFor(books: number, rules: Edition | null, own: readonly string[] = []): string | null {
  if (!rules || !books) return null;
  if (BOOKS.some(([, bit, ed]) => ed === rules && books & bit)) return null;
  return BOOKS.find(([code, bit]) => code && books & bit)?.[0] ?? own[0] ?? null;
}

const ORD = ["cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

/** The highest spell level the spot's classes can pick at their level there (D162); null when no table says. */
export function spellCap(n: Names, sp: Spot): number | null {
  const want = sp.rules === "2014" ? 1 | 16 : sp.rules === "2024" ? 2 | 32 : 63;
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
 * the spot's list size asks (D164; none while the D172 trial is on), or when the typed name is already exactly one.
 */
export function suggest(n: Names, sp: Spot, limit = 8, everySpot = OPEN_EVERY_SPOT): Suggestion[] {
  const own = (name: string): readonly string[] => n.OWN?.get(lc(name)) ?? [];
  const q = norm(sp.typed);
  const cands = candidates(n, sp).filter((c) => !sp.taken.has(lc(c.name)));
  const pool = new Set(cands.map((c) => lc(c.name))).size;
  if (q.replace(/\s/g, "").length < minTyped(pool, everySpot)) return [];
  const best = new Map<string, { c: Cand; t: number }>();
  for (const c of cands) {
    const t = q ? Math.min(...[c.name, c.alt ?? ""].filter(Boolean).map((x) => tier(x, q)).map((v) => (v < 0 ? 9 : v))) : 0;
    if (t === 9) continue;
    const k = lc(c.name);
    const had = best.get(k);
    if (!had) best.set(k, { c: { ...c }, t });
    else {
      had.c.books |= c.books; had.c.first ||= c.first; had.c.out &&= c.out; had.t = Math.min(had.t, t);
      if (c.level !== undefined) had.c.level = Math.min(had.c.level ?? 9, c.level);
    }
  }
  const typed = sp.typed.trim();
  const cap = sp.cap ?? spellCap(n, sp);   // a capped line's own cap wins (D184)
  const rows = [...best.values()].map(({ c, t }) => {
    const other0 = Boolean(sp.rules && c.books && !BOOKS.some(([, bit, ed]) => ed === sp.rules && c.books & bit));
    const over = c.level !== undefined && cap !== null && c.level > cap;
    const dim = other0 || Boolean(c.out) || over;
    // T29 (review): a name the build's edition lacks ranks after the edition's own and is dimmed, as not available
    // by default; its `|SOURCE` (the book a pick writes, D155) says which.
    const other = other0;
    return {
      name: c.name, source: sp.hasSource ? null : sourceFor(c.books, sp.rules, own(c.name)), level: c.level, dim, other,
      grade: dim ? 2 : c.first ? 0 : 1, t, exact: norm(c.name) === q, out: Boolean(c.out), over,
    };
  });
  // The name is already written as it should be: nothing to suggest.
  if (rows.some((r) => r.name === typed && !r.source)) return [];
  // A spell above the level cap comes last (D162): it can't be picked yet. Before it, outside the spot's short list
  // (D227 skills, D241 another class's subclass, D243 another class's spell, feature or option), after the other
  // edition: the class's own subclass from the other book still comes before another class's.
  rows.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(a.over) - Number(b.over) || Number(a.out) - Number(b.out) || Number(Boolean(a.other)) - Number(Boolean(b.other)) || a.grade - b.grade || a.t - b.t ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const top = rows.slice(0, limit);
  // A cantrip says so only among other kinds of names (the general list); a list of cantrips doesn't repeat it.
  const mixed = top.some((r) => r.level !== 0);
  return top.map(({ name, source, level, dim }) => {
    const s: Suggestion = { name, source };
    if (level !== undefined && (level > 0 || (mixed && level === 0))) s.tag = ORD[level];
    // D250: a name of yours shows its book, unless the row already shows the one a pick writes.
    const books = own(name);
    if (books.length && !source) s.book = books.find((b) => BOOKS.some(([c, , ed]) => c === b && ed === sp.rules)) ?? books[0];
    if (dim) s.dim = true;
    return s;
  });
}

/** The word for a species' defining pick (D163): its trait's last word, `subrace` for a 2014 one (D291). */
export function lineageKind(trait: string): string {
  const t = lc(trait);
  return !t ? "subrace" : /ancestry$/.test(t) ? "ancestry" : /legacy$/.test(t) ? "legacy" : "lineage";
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
  } else if (sp.key === "Species") {
    // D163, D280: `Elf [` hints "lineage; ability"; a 2014 subrace says so.
    const l = lineageRow(n, sp.parent, sp.parentSource ?? null, sp.rules);
    if (l) {
      slots.push([lineageKind(l[2]), 1]);
      if (l[3]) slots.push(["ability", 1]);
    }
  } else if (sp.key === "Feature") {
    const cf = pick(n.CLASS_FEATURES);
    if (p === "spellcasting") slots.push(["ability", 1]);
    else if (cf) {
      slots.push(["option", 1]);
      if ((sp.groups[0] ?? []).some((g) => cf[3].some((o) => lc(o) === lc(g)))) slots.push(["cantrip", 1]);
    } else if (traitRow(n, p, sp)) {
      const lt = traitRow(n, p, sp)!;
      if (lt[3]) slots.push(["ability", 1]);
      slots.push([lineageKind(lt[2]), 1]);
    } else if (n.SPECIES_FEATURES.some((r) => lc(r[0]) === p)) slots.push(["choice", 1]);
  } else if (keyGroup(sp.key) === "Options") {
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

/** Keys whose items never carry details (SPEC §5.3): a pick there is never written with brackets. */
const NO_DETAILS = new Set(["Background", "Subclass", "Classes", "L"]);

/**
 * A pick that asks a detail is written with its brackets, the cursor inside (D242): a feat with an ability, version
 * or spells to pick, an option with picks, a class feature's option, a species' lineage (D280), a chosen form (D195). Which
 * printing: the `|SOURCE` the pick writes, else the `Rules:` edition, else any. Never inside brackets (details don't
 * nest), never where brackets or a source already follow the name (`rest`: the line after the spot).
 */
export function opensDetails(n: Names, sp: Spot, s: Suggestion, rest: string): boolean {
  if (sp.parent !== null || sp.hasSource || NO_DETAILS.has(sp.key) || /^\s*\[/.test(rest)) return false;
  const rows = n.DETAILS.filter((r) => lc(r[0]) === lc(s.name));
  if (!rows.length) return false;
  const want = s.source ? BOOKS.find((b) => b[0] === s.source)?.[1] ?? 0 : BOOKS.filter((b) => b[2] === sp.rules).reduce((a, b) => a | b[1], 0);
  return rows.some((r) => !r[1] || !want || Boolean(r[1] & want));
}

/** A name whose one detail is a chosen form (D195): the list has no forms to offer inside its brackets. */
const isForm = (n: Names, name: string) =>
  n.DETAILS.some((r) => lc(r[0]) === name) && (/^(find |summon )/.test(name) || /^pact of the (chain|blade)$/.test(name));

// ---- Key names (D170, D171) ----

/** A key being typed at a line's start (D170): the range a pick replaces and what was typed. */
export interface KeySpot { start: number; end: number; typed: string }

/**
 * Where the cursor is typing a key: letters (and spaces) from the line's start, no separator yet, the cursor after
 * them. Null on an empty line, on the paste's first line (its name, SPEC 2.1), a level header, or anything else.
 */
export function keySpotAt(text: string, pos: number): KeySpot | null {
  const ls = text.lastIndexOf("\n", pos - 1) + 1;
  let le = text.indexOf("\n", ls);
  if (le < 0) le = text.length;
  const line = text.slice(ls, le).replace(/\r$/, "");
  const col = pos - ls;
  if (line.slice(col).trim()) return null;
  const head = line.slice(0, col);
  const t = head.trim();
  if (!/^[A-Za-z][A-Za-z ]*$/.test(t)) return null;
  if (!text.slice(0, ls).trim()) return null;   // the first line is the build's name
  return { start: ls + head.length - head.trimStart().length, end: ls + line.length, typed: t };
}

/** The keys that fit a key spot (D170): the hint strip's keys (D83), narrowed by what was typed; none when none fits. */
export function suggestKeys(text: string, ks: KeySpot): string[] {
  const h = keyHints(text, text.slice(0, ks.start).split("\n").length - 1);
  return h.narrowed ? h.keys : [];
}

/** The text a key pick writes and where the cursor goes, from the start of the write: `Species: `, or
 *  `Feat (): ` with the cursor in the parentheses (D110). */
export function writtenKey(key: string): { text: string; cursor: number } {
  return key === MARKED_FEAT ? { text: "Feat (): ", cursor: 6 } : { text: `${key}: `, cursor: key.length + 2 };
}

// ---- Ghost text (D174) ----

/** The kind of name each counted key wants, as the ghost text says it. */
const KIND: Record<string, string> = {
  Cantrips: "cantrip", Spells: "spell", Prepared: "spell", Skills: "skill", Expertise: "skill", Options: "option", Masteries: "weapon",
  Invocations: "invocation", Metamagic: "metamagic", Maneuvers: "maneuver", Infusions: "infusion", "Arcane Shots": "arcane shot",
  Runes: "rune", Disciplines: "discipline", "Pact Boon": "pact boon",
};

/**
 * The ghost text at the cursor (D174): the kind of name a counted line still wants, when the cursor sits at an empty
 * name spot at the end of that line and its count (`short`: the lines whose chip reads under its count) is short.
 * Not inside `[ ]`. The word gets a space before it when the line doesn't end in one. A Species line whose species
 * has lineages or 2014 subraces shows `[lineage]` / `[subrace]` after the name (D291, D296; `n`, the names, says which).
 */
export function ghostWord(text: string, pos: number, short: ReadonlySet<number>, n: Names | null = null): { line: number; word: string } | null {
  const sp = spotAt(text, pos);
  if (!sp || sp.parent !== null) return null;
  let le = text.indexOf("\n", pos);
  if (le < 0) le = text.length;
  if (text.slice(pos, le).trim()) return null;
  const line = text.slice(0, pos).split("\n").length;
  // D291, D296: a species with lineages or subraces shows where they go: `Species: Elf [lineage]`, `Dwarf [subrace]`.
  if (sp.key === "Species" && n) {
    const l = sp.typed.trim() && n.SPECIES.some((r) => lc(r[0]) === lc(sp.typed.trim())) ? lineageRow(n, sp.typed.trim(), null, sp.rules) : undefined;
    return l ? { line, word: `${/\s$/.test(sp.typed) ? "" : " "}[${lineageKind(l[2])}]` } : null;
  }
  if (sp.typed.trim() || !KIND[sp.key]) return null;
  if (!short.has(line)) return null;
  const end = text.slice(0, le).replace(/\r$/, "");
  return { line, word: (/\s$/.test(end) ? "" : " ") + KIND[sp.key] };
}

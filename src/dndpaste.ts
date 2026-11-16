/**
 * dndpaste — reference parser and canonical emitter.
 * Implements SPEC.md 0.8 (core grammar §1–4, profile `dnd5e` §5); reads 0.7 keys as aliases (D113).
 * Zero dependencies; no game data; never infers; never throws on input.
 */

export const SPEC_VERSION = "0.8";
export const PASTE_MAJOR = 1;

// ─── AST ────────────────────────────────────────────────────────────────────

export interface Ref { name: string; source: string | null }
export interface Detail { ref: Ref; at: number | null }
export interface Item { ref: Ref; drop: boolean; details: Detail[][]; qty: number | null }
/** One score increase: `+2 CHA` (§5.2). */
export interface Bonus { amount: number; ability: Ability }

export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export const ABILITIES: readonly Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export type Value =
  | { type: "items"; items: Item[] }
  | { type: "enum"; value: string }
  | { type: "int"; value: number }
  /** Free single-line text, kept as written (trimmed): the `Producer` stamp (§5.2, D62). */
  | { type: "text"; value: string }
  /** As written: a class may appear more than once (runs, §5.2); `foldClasses` gives the totals. */
  | { type: "classes"; entries: ClassEntry[] }
  /**
   * The `Scores` lines of one scope (§5.2, D108). `values`: base scores in STR/DEX/CON/INT/WIS/CHA order, `null` = not
   * written (all six `null` when the scope has no base line; a base goes in the header only). `increase`: the increase
   * line (`+2 CHA`), or `null`. Both empty: a `Scores:` line with no value yet (D112).
   */
  | { type: "scores"; values: (number | null)[]; increase: Bonus[] | null }
  /** Hit-point method (§5.2, D59): `roll` is a die result, level blocks only, and implies `Rolled`. */
  | { type: "hp"; method: HpMethod; roll: number | null }
  /** A key with no value yet ("not chosen yet", D112) whose type has no empty form: `Paste`, `Rules`, `HP`. */
  | { type: "empty" };

export type HpMethod = "Fixed" | "Rolled";
export const HP_METHODS: readonly HpMethod[] = ["Fixed", "Rolled"];

export type Scope = Map<string, Value>;
/** `item` is `null` when the block-opening line has no value yet (`Species:`, D112). */
export interface EntityBlock { key: string; item: Item | null; lines: Scope }
export interface LevelBlock { n: number; class: Ref; lines: Scope }
export interface Diagnostic { code: string; line: number; message: string }
export interface Paste {
  identifier: string | null;
  header: Scope;
  entities: EntityBlock[];
  levels: LevelBlock[];
  diagnostics: Diagnostic[];
}

// ─── Profile `dnd5e` (SPEC §5.1) ────────────────────────────────────────────

/** Scope letters: H header · S species block · B background block · L level block. */
export type ScopeKind = "H" | "S" | "B" | "L";
/** `asi` is the 0.7 `ASI` key's type, kept for that alias only. */
export type ValueType = "items" | "item" | "items¹" | "enum" | "int" | "classes" | "scores" | "asi" | "hp" | "text";

export interface KeyDef {
  key: string;
  type: ValueType;
  scopes: readonly ScopeKind[];
  opensBlock?: "S" | "B";
  enumValues?: readonly string[];
  /** A 0.7 key that 0.8 reads as an alias (D113): what it is written as now. Never in `KEYS`. */
  renamed?: string;
}

/** Table order is canonical order (SPEC §5.5). SPEC 0.8 keys only; the 0.7 aliases are `LEGACY_KEYS`. */
export const KEYS: readonly KeyDef[] = [
  { key: "Paste", type: "int", scopes: ["H"] },
  { key: "Producer", type: "text", scopes: ["H"] },
  { key: "Rules", type: "enum", scopes: ["H"], enumValues: ["2014", "2024"] },
  { key: "Scores", type: "scores", scopes: ["H", "S", "B", "L"] },
  { key: "Classes", type: "classes", scopes: ["H"] },
  { key: "HP", type: "hp", scopes: ["H", "L"] },
  { key: "Species", type: "item", scopes: ["H"], opensBlock: "S" },
  { key: "Background", type: "item", scopes: ["H"], opensBlock: "B" },
  { key: "Subclass", type: "items¹", scopes: ["H", "L"] },
  { key: "Skills", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Tools", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Languages", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Expertise", type: "items", scopes: ["H", "L"] },
  { key: "Feat", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Masteries", type: "items", scopes: ["H", "L"] },
  { key: "Options", type: "items", scopes: ["H", "L"] },
  { key: "Feature", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Cantrips", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Spells", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Prepared", type: "items", scopes: ["H", "L"] },
  { key: "Gear", type: "items", scopes: ["H", "B", "L"] },
];

/** SPEC 0.7 keys, read until 1.0 with a W005 "renamed key" warning and written in their 0.8 form (D113). */
export const LEGACY_KEYS: readonly KeyDef[] = [
  { key: "ASI", type: "asi", scopes: ["H", "S", "B", "L"], renamed: "Scores: +2 CHA in a Species or Background block; Feat: Ability Score Improvement [+2 CHA] at a level" },
  { key: "Ability", type: "item", scopes: ["S", "B", "L"], renamed: "the first detail of the Feat, Feature or Options that asks it: Feature: Elven Lineage [WIS; Wood]" },
  { key: "Fighting Style", type: "items", scopes: ["H", "L"], renamed: "Feat (Fighting Style): Archery" },
  { key: "Equipment", type: "items", scopes: ["H", "B", "L"], renamed: "Gear" },
  { key: "Items", type: "items", scopes: ["H", "L"], renamed: "Gear" },
];

/** The 2024 name of a level's Ability Score Improvement as a feat (D109); the checker also accepts `ASI`. */
export const ASI_FEAT = "Ability Score Improvement";

const KEY_BY_LOWER = new Map([...KEYS, ...LEGACY_KEYS].map((k) => [k.key.toLowerCase(), k]));
const LEVEL_MIN = 1;
const LEVEL_MAX = 20;

/** A key line's key split into the key and its slot marker: `Feat (Fighting Style)` → `Feat`, `Fighting Style` (D110). */
export function splitMarker(key: string): { key: string; marker: string | null } {
  const m = /^(.*?)\s*\(([^()]*)\)$/.exec(key.trim());
  return m ? { key: m[1].trim(), marker: m[2].trim() } : { key: key.trim(), marker: null };
}
/** The key's definition, 0.8 or 0.7 alias; a `Feat (<marker>)` key gives `Feat`'s. */
export function keyDef(key: string): KeyDef | undefined {
  const hit = KEY_BY_LOWER.get(key.trim().toLowerCase());
  if (hit) return hit;
  const { key: base, marker } = splitMarker(key);
  return marker && base.toLowerCase() === "feat" ? KEY_BY_LOWER.get("feat") : undefined;
}
export function isExtensionKey(key: string): boolean {
  return /^x-[a-z0-9-]+$/i.test(key);
}
/** True for `Feat` and every `Feat (<marker>)` key of a scope. */
export function isFeatKey(key: string): boolean {
  return key === "Feat" || key.startsWith("Feat (");
}
/** True when the detail group is an ability pick: exactly one bare ability (`[INT; High]`'s `INT`, D107). */
export function isAbilitySlot(group: readonly Detail[] | undefined): boolean {
  return Boolean(group && group.length === 1 && !group[0].ref.source && ABILITIES.includes(group[0].ref.name.toUpperCase() as Ability));
}

// ─── Errors ─────────────────────────────────────────────────────────────────

const MESSAGES: Record<string, string> = {
  E001: "malformed line",
  E002: "unknown key",
  E003: "duplicate key in this scope",
  E004: "level header not strictly increasing or out of range",
  E005: "key not allowed in this scope",
  E007: "list given to a single-item key",
  E008: "drop prefix outside a level scope or on a non-list key",
  E009: "quantity on a key other than Gear",
  E010: "reserved line ---",
  E011: "malformed item",
  E012: "value does not match the key's type",
  E013: "@n stamp outside a detail",
  E014: "entity block after a level block, or repeated",
  E015: "unsupported Paste version",
  E016: "level header contradicts the Classes runs",
  W001: "extension key kept but not understood",
  W002: "parenthesised suffix looks like a detail — details go in [brackets]",
  W003: "level header's class has no levels left in Classes",
  W004: "no value yet (not chosen)",
  W005: "renamed key (SPEC 0.7)",
};

class Diag {
  list: Diagnostic[] = [];
  add(code: string, line: number, detail?: string): void {
    const base = MESSAGES[code] ?? code;
    this.list.push({ code, line, message: detail ? `${base}: ${detail}` : base });
  }
}

// ─── Tokenising values ──────────────────────────────────────────────────────

/** Split `s` on `sep` at bracket depth 0 and outside quotes. Returns null on unbalanced input. */
function splitTop(s: string, sep: string): string[] | null {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of s) {
    if (ch === '"') { quoted = !quoted; cur += ch; continue; }
    if (!quoted) {
      if (ch === "[") { depth++; if (depth > 1) return null; }
      else if (ch === "]") { depth--; if (depth < 0) return null; }
      else if (ch === sep && depth === 0) { out.push(cur); cur = ""; continue; }
    }
    cur += ch;
  }
  if (quoted || depth !== 0) return null;
  out.push(cur);
  return out;
}

/** Parse `Name[|SOURCE]` possibly quoted. Returns null when malformed. */
function parseRef(raw: string): Ref | null {
  const s = raw.trim();
  if (!s) return null;
  let name: string;
  let rest: string;
  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end < 0) return null;
    name = s.slice(1, end);
    rest = s.slice(end + 1).trim();
    if (!name) return null;
  } else {
    const bar = s.indexOf("|");
    name = (bar < 0 ? s : s.slice(0, bar)).trim();
    rest = bar < 0 ? "" : s.slice(bar).trim();
    if (!name || /[,;:\[\]"]/.test(name)) return null;
  }
  let source: string | null = null;
  if (rest) {
    if (!rest.startsWith("|")) return null;
    source = rest.slice(1).trim();
    if (!source || /[\s|,;:\[\]"]/.test(source)) return null;
  }
  return { name, source };
}

function parseDetail(raw: string): Detail | null {
  let s = raw.trim();
  let at: number | null = null;
  const m = /\s@(\d+)$/.exec(s);
  if (m) {
    at = Number(m[1]);
    if (!/^[1-9]\d*$/.test(m[1])) return null;
    s = s.slice(0, m.index).trim();
  }
  const ref = parseRef(s);
  return ref ? { ref, at } : null;
}

interface ItemResult { item?: Item; code?: string; detail?: string }

function parseItem(raw: string): ItemResult {
  let s = raw.trim();
  if (!s) return { code: "E011", detail: "empty item" };
  let drop = false;
  if (s.startsWith("-") && !/^-\d/.test(s)) { drop = true; s = s.slice(1).trim(); }
  let qty: number | null = null;
  const q = /\sx(\d+)$/.exec(s);
  if (q) {
    qty = Number(q[1]);
    if (qty < 2) return { code: "E011", detail: "quantity must be 2 or more" };
    s = s.slice(0, q.index).trim();
  }
  const details: Detail[][] = [];
  const open = s.indexOf("[");
  let head = s;
  if (open >= 0) {
    if (!s.endsWith("]")) return { code: "E011", detail: "unbalanced brackets" };
    head = s.slice(0, open).trim();
    const inner = s.slice(open + 1, -1);
    if (/[\[\]]/.test(inner)) return { code: "E011", detail: "nested brackets" };
    const groups = splitTop(inner, ";");
    if (!groups) return { code: "E011", detail: "unbalanced quotes" };
    for (const g of groups) {
      if (!g.trim()) { details.push([]); continue; }
      const parts = splitTop(g, ",");
      if (!parts) return { code: "E011", detail: "unbalanced quotes" };
      const ds: Detail[] = [];
      for (const p of parts) {
        const d = parseDetail(p);
        if (!d) return { code: "E011", detail: `bad detail "${p.trim()}"` };
        ds.push(d);
      }
      details.push(ds);
    }
    while (details.length && details[details.length - 1].length === 0) details.pop();
  }
  if (/\s@\d+$/.test(head)) return { code: "E013" };
  const ref = parseRef(head);
  if (!ref) return { code: "E011", detail: `bad name "${head}"` };
  return { item: { ref, drop, details, qty } };
}

function parseItems(raw: string, diag: Diag, line: number): Item[] | null {
  const parts = splitTop(raw, ",");
  if (!parts) { diag.add("E011", line, "unbalanced brackets or quotes"); return null; }
  const items: Item[] = [];
  for (const p of parts) {
    const r = parseItem(p);
    if (!r.item) { diag.add(r.code ?? "E011", line, r.detail); return null; }
    items.push(r.item);
  }
  return items;
}

// ─── Typed values (SPEC §5.2) ───────────────────────────────────────────────

function parseClasses(raw: string, diag: Diag, line: number): Value | null {
  const entries: ClassEntry[] = [];
  for (const part of raw.split(/\s\/\s/)) {
    const s = part.trim();
    const m = /^(.*?)(?:\s+(\d+))?$/.exec(s);
    if (!m || !m[1]) { diag.add("E012", line, `bad class entry "${s}"`); return null; }
    const ref = parseRef(m[1]);
    if (!ref) { diag.add("E012", line, `bad class entry "${s}"`); return null; }
    entries.push({ ref, levels: m[2] === undefined ? null : Number(m[2]) });
  }
  // Runs (§5.2, D49): a class written again continues to a higher class level. Its entries must each carry a
  // count, strictly increase, never be 0 (0 marks a class not yet taken), and name no conflicting sources.
  const byClass = new Map<string, ClassEntry[]>();
  for (const e of entries) { const k = e.ref.name.toLowerCase(); byClass.set(k, [...(byClass.get(k) ?? []), e]); }
  for (const runs of byClass.values()) {
    if (runs.length < 2) continue;
    const name = runs[0].ref.name;
    if (runs.some((e) => e.levels === null)) { diag.add("E012", line, `${name} is written more than once, so each entry needs a class level`); return null; }
    if (runs.some((e) => e.levels === 0)) { diag.add("E012", line, `${name} 0 marks a class not yet taken; it cannot be one of several runs`); return null; }
    if (runs.some((e, i) => i > 0 && (e.levels as number) <= (runs[i - 1].levels as number))) { diag.add("E012", line, `${name}'s entries must strictly increase (cumulative class levels)`); return null; }
    const sources = new Set(runs.flatMap((e) => (e.ref.source ? [e.ref.source.toLowerCase()] : [])));
    if (sources.size > 1) { diag.add("E012", line, `${name} is written with two different sources`); return null; }
  }
  return { type: "classes", entries };
}

// ─── Class per level (SPEC §5.2 classes, §5.4; D49) ─────────────────────────

export interface ClassEntry { ref: Ref; levels: number | null }
const classKey = (r: Ref) => r.name.toLowerCase();

/**
 * One entry per class in first-appearance order. A class written as runs (`Fighter 1 / Rogue 3 / Fighter 6`) gets
 * its last value, which is its total class level; its name is the first spelling, its source the first one given.
 */
export function foldClasses(entries: readonly ClassEntry[]): ClassEntry[] {
  const out = new Map<string, ClassEntry>();
  for (const e of entries) {
    const prev = out.get(classKey(e.ref));
    if (!prev) { out.set(classKey(e.ref), { ref: { ...e.ref }, levels: e.levels }); continue; }
    prev.levels = e.levels;
    if (!prev.ref.source && e.ref.source) prev.ref = { name: prev.ref.name, source: e.ref.source };
  }
  return [...out.values()];
}
/** The `Classes` totals of a paste: one entry per class (see `foldClasses`); empty when there is no `Classes` line. */
export function classTotals(paste: Paste): ClassEntry[] {
  const v = paste.header.get("Classes");
  return v && v.type === "classes" ? foldClasses(v.entries) : [];
}

export interface ClassSequence {
  /** Levels as played now: the sum of the class totals; null when a class has no level count. */
  played: number | null;
  /** Index n−1 is the class of character level n, for 1 … max(played, last level block); null when unknown. */
  levels: (Ref | null)[];
}
interface SequenceProblem { n: number; code: "W003" | "E016"; message: string }

/**
 * The reading rule (§5.4). Played levels (n ≤ played): when `Classes` is written as runs, the runs give each level's
 * class; otherwise a level header fixes its level's class, and an unheadered level continues the current class while
 * it has levels left, else takes the first class in `Classes` order with levels left. A class's levels left are its
 * total minus the levels it has taken minus its headers still to come, so a later header keeps its level: a
 * `Fighter 9 / Warlock 3` with headers `L2 Warlock`, `L11 Warlock`, `L12 Warlock` reads L3 as Fighter. Planned levels
 * (n > played): a header fixes the class, an unheadered level continues the previous one.
 */
function sequenceOf(paste: Paste): ClassSequence & { runs: boolean; problems: SequenceProblem[] } {
  const v = paste.header.get("Classes");
  const entries = v && v.type === "classes" ? v.entries : [];
  const totals = foldClasses(entries);
  const runs = totals.length < entries.length;
  const played = entries.every((e) => e.levels !== null) ? totals.reduce((a, t) => a + (t.levels ?? 0), 0) : null;
  const total = new Map(totals.map((t) => [classKey(t.ref), t.levels ?? 0]));
  const runSeq: Ref[] = [];
  if (runs && played !== null) {
    const reached = new Map<string, number>();
    const ref = new Map(totals.map((t) => [classKey(t.ref), t.ref]));
    for (const e of entries) {
      const k = classKey(e.ref);
      for (let i = reached.get(k) ?? 0; i < (e.levels ?? 0); i++) runSeq.push(ref.get(k) as Ref);
      reached.set(k, e.levels ?? 0);
    }
  }
  const blockAt = new Map(paste.levels.map((l) => [l.n, l]));
  const maxN = Math.max(played ?? 0, 0, ...paste.levels.map((l) => l.n));
  const used = new Map<string, number>();
  const ahead = new Map<string, number>();   // played-level headers not yet reached, per class
  for (const l of paste.levels) if (played !== null && l.n <= played) ahead.set(classKey(l.class), (ahead.get(classKey(l.class)) ?? 0) + 1);
  const left = (r: Ref) => (total.get(classKey(r)) ?? 0) - (used.get(classKey(r)) ?? 0) - (ahead.get(classKey(r)) ?? 0);
  const levels: (Ref | null)[] = [];
  const problems: SequenceProblem[] = [];
  let cur: Ref | null = null;
  for (let n = 1; n <= maxN; n++) {
    const b = blockAt.get(n);
    let cls: Ref | null;
    if (played !== null && n <= played && runs) {
      const want: Ref | null = runSeq[n - 1] ?? cur;
      cls = b ? b.class : want;
      if (b && want && classKey(b.class) !== classKey(want)) problems.push({ n, code: "E016", message: `L${n} ${b.class.name}: the Classes runs put ${want.name} at this level` });
    } else if (played !== null && n <= played) {
      if (b) {
        cls = b.class;
        ahead.set(classKey(cls), (ahead.get(classKey(cls)) ?? 1) - 1);
        if (total.has(classKey(cls)) && (total.get(classKey(cls)) ?? 0) - (used.get(classKey(cls)) ?? 0) <= 0) problems.push({ n, code: "W003", message: `L${n} ${cls.name}: Classes has no ${cls.name} level left here` });
      } else if (cur && left(cur) > 0) cls = cur;
      else cls = totals.find((t) => left(t.ref) > 0)?.ref ?? cur;
    } else cls = b ? b.class : cur;
    if (cls) used.set(classKey(cls), (used.get(classKey(cls)) ?? 0) + 1);
    levels.push(cls);
    cur = cls;
  }
  return { played, levels, runs, problems };
}
/** The class of every character level, by the reading rule (§5.4, D49). Data-free; consumers replay from this. */
export function classSequence(paste: Paste): ClassSequence {
  const { played, levels } = sequenceOf(paste);
  return { played, levels };
}

const NO_SCORES = (): (number | null)[] => [null, null, null, null, null, null];

/** `+2 CHA` or `+1 INT, +1 CON`: score increases, `,`-separated; grouping is kept (§5.2). */
function parseBonuses(raw: string, diag: Diag, line: number): Bonus[] | null {
  const bonuses: Bonus[] = [];
  for (const part of raw.split(",")) {
    const m = /^\+(\d+)\s+([A-Za-z]{3})$/.exec(part.trim());
    const ab = m ? (m[2].toUpperCase() as Ability) : null;
    if (!m || !ab || !ABILITIES.includes(ab)) { diag.add("E012", line, `bad increase "${part.trim()}": use +2 CHA or +1 INT, +1 CON`); return null; }
    bonuses.push({ amount: Number(m[1]), ability: ab });
  }
  return bonuses;
}

/**
 * `Scores` (§5.2): the `+` decides (D108). A base is six integers `8/15/13/10/14/12` in STR/DEX/CON/INT/WIS/CHA
 * order, or the named form for the known ones, `DEX 15, CON 13` or `DEX 15/CON 13` (D106). An increase is `+2 CHA`
 * or `+1 INT, +1 CON`.
 */
function parseScores(raw: string, diag: Diag, line: number): Value | null {
  if (raw.startsWith("+")) {
    const increase = parseBonuses(raw, diag, line);
    return increase ? { type: "scores", values: NO_SCORES(), increase } : null;
  }
  const parts = raw.split(/[,/]/).map((p) => p.trim());
  if (raw.includes("/") && parts.every((p) => /^\d+$/.test(p))) {
    if (parts.length !== 6) { diag.add("E012", line, "Scores needs six integers separated by / (STR/DEX/CON/INT/WIS/CHA), named scores such as DEX 15, CON 13, or an increase such as +2 CHA"); return null; }
    return { type: "scores", values: parts.map(Number), increase: null };
  }
  const values = NO_SCORES();
  for (const part of parts) {
    const m = /^([A-Za-z]{3})\s+(\d+)$/.exec(part);
    const i = m ? ABILITIES.indexOf(m[1].toUpperCase() as Ability) : -1;
    if (!m || i < 0) { diag.add("E012", line, `bad score "${part}": use six integers separated by / (STR/DEX/CON/INT/WIS/CHA), named scores such as DEX 15, CON 13, or an increase such as +2 CHA`); return null; }
    if (values[i] !== null) { diag.add("E012", line, `${ABILITIES[i]} given twice`); return null; }
    values[i] = Number(m[2]);
  }
  return { type: "scores", values, increase: null };
}

/** `Fixed` or `Rolled`; in a level block also the die result rolled there, which implies `Rolled` (§5.2, D59). */
function parseHp(raw: string, scope: ScopeKind, diag: Diag, line: number): Value | null {
  if (/^\d+$/.test(raw)) {
    if (scope !== "L") { diag.add("E012", line, "a rolled result goes in a level block; the header takes Fixed or Rolled"); return null; }
    if (!/^[1-9]\d*$/.test(raw)) { diag.add("E012", line, "a rolled result is a positive integer with no leading zeros"); return null; }
    return { type: "hp", method: "Rolled", roll: Number(raw) };
  }
  const hit = HP_METHODS.find((m) => m.toLowerCase() === raw.toLowerCase());
  if (!hit) { diag.add("E012", line, scope === "L" ? "Fixed, Rolled or a rolled result expected" : "Fixed or Rolled expected"); return null; }
  return { type: "hp", method: hit, roll: null };
}

const HINT_KEYS = ["Feat", "Options", "Feature", "Subclass", "Fighting Style"];
const QTY_KEYS = ["Gear", "Equipment", "Items"];

function parseValue(def: KeyDef, raw: string, scope: ScopeKind, diag: Diag, line: number): Value | null {
  switch (def.type) {
    case "int": {
      if (!/^\d+$/.test(raw)) { diag.add("E012", line, "integer expected"); return null; }
      return { type: "int", value: Number(raw) };
    }
    case "enum": {
      const hit = def.enumValues?.find((v) => v.toLowerCase() === raw.toLowerCase());
      if (!hit) { diag.add("E012", line, `one of ${def.enumValues?.join(", ")} expected`); return null; }
      return { type: "enum", value: hit };
    }
    case "text": return { type: "text", value: raw.trim() };
    case "classes": return parseClasses(raw, diag, line);
    case "scores": return parseScores(raw, diag, line);
    case "asi": {
      const increase = parseBonuses(raw, diag, line);
      return increase ? { type: "scores", values: NO_SCORES(), increase } : null;
    }
    case "hp": return parseHp(raw, scope, diag, line);
    case "item":
    case "items":
    case "items¹": {
      const items = parseItems(raw, diag, line);
      if (!items) return null;
      const single = def.type === "item" || (def.type === "items¹" && scope === "L");
      if (single && items.length > 1) { diag.add("E007", line); return null; }
      for (const it of items) {
        if (HINT_KEYS.includes(def.key) && !it.details.length && /\s\([^()]*\)$/.test(it.ref.name)) diag.add("W002", line, it.ref.name);
        if (it.drop && (scope !== "L" || single)) { diag.add("E008", line); return null; }
        if (it.qty !== null && !QTY_KEYS.includes(def.key)) { diag.add("E009", line); return null; }
      }
      return { type: "items", items };
    }
  }
}

/** The value of a key line with nothing after the `:` — "not chosen yet" (D112): the empty form of its type. */
function emptyValue(def: KeyDef): Value {
  switch (def.type) {
    case "item": case "items": case "items¹": return { type: "items", items: [] };
    case "classes": return { type: "classes", entries: [] };
    case "scores": case "asi": return { type: "scores", values: NO_SCORES(), increase: null };
    case "text": return { type: "text", value: "" };
    default: return { type: "empty" };
  }
}

/** A level's ASI as the feat line (D109): `Feat: Ability Score Improvement [+2 CHA]`. */
function asiFeat(bonuses: readonly Bonus[]): Item {
  const details = bonuses.length ? [bonuses.map((b) => ({ ref: { name: `+${b.amount} ${b.ability}`, source: null }, at: null }))] : [];
  return { ref: { name: ASI_FEAT, source: null }, drop: false, details, qty: null };
}

// ─── Parser ─────────────────────────────────────────────────────────────────

const LEVEL_RE = /^L([1-9]\d*)\s+(.+)$/i;

export function parse(text: string): Paste {
  const diag = new Diag();
  const paste: Paste = { identifier: null, header: new Map(), entities: [], levels: [], diagnostics: diag.list };
  const lines = text.split(/\r?\n/);

  let scope: ScopeKind = "H";
  let current: Scope = paste.header;
  let seenFirst = false;
  let lastLevel = 0;
  const opened = new Set<string>();
  const headerLine = new Map<number, number>();   // level n → its header's line number
  // One line per key per scope (E003). A line's identity is its key, a Feat's marker included; a 0.7 alias has its own,
  // so `Equipment` and `Items` both merge into `Gear`; `Scores` has one for the base and one for the increase.
  const seen = new Map<Scope, Set<string>>();
  const once = (sc: Scope, id: string, no: number, label: string): boolean => {
    let s = seen.get(sc);
    if (!s) { s = new Set(); seen.set(sc, s); }
    if (s.has(id.toLowerCase())) { diag.add("E003", no, label); return false; }
    s.add(id.toLowerCase());
    return true;
  };
  const abilityLines: { scope: Scope; no: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const no = i + 1;
    if (!line) continue;
    const first = !seenFirst;
    seenFirst = true;

    if (line === "---") { diag.add("E010", no); continue; }

    const lv = LEVEL_RE.exec(line);
    if (lv) {
      const n = Number(lv[1]);
      const ref = parseRef(lv[2]);
      if (!ref || ref.name.includes("[")) { diag.add("E001", no, "bad level header"); continue; }
      if (n < LEVEL_MIN || n > LEVEL_MAX || n <= lastLevel) { diag.add("E004", no, `L${n}`); continue; }
      lastLevel = n;
      headerLine.set(n, no);
      const block: LevelBlock = { n, class: ref, lines: new Map() };
      paste.levels.push(block);
      scope = "L";
      current = block.lines;
      continue;
    }

    const sep = findSeparator(line);
    if (sep < 0) {
      if (first) { paste.identifier = line; continue; }
      diag.add("E001", no);
      continue;
    }
    const rawKey = line.slice(0, sep).trim();
    const rawValue = line.slice(sep + 1).trim();
    if (!rawKey) { diag.add("E001", no); continue; }

    if (isExtensionKey(rawKey)) {
      diag.add("W001", no, rawKey);
      // The reserved prefix is written `X-`; the rest of the name stays as authored (§2.5, D56).
      // Keys are case-insensitive, so `X-Plan-B` and `x-plan-b` are the same key in one scope.
      const key = "X-" + rawKey.slice(2);
      if (!rawValue) diag.add("W004", no, key);
      const items = rawValue ? parseItems(rawValue, diag, no) : [];
      if (items && once(current, key, no, key)) current.set(key, { type: "items", items });
      continue;
    }

    const { key: baseKey, marker } = splitMarker(rawKey);
    const def = KEY_BY_LOWER.get(baseKey.toLowerCase());
    if (!def) { diag.add("E002", no, rawKey); continue; }
    if (marker !== null && (def.key !== "Feat" || !marker)) { diag.add("E002", no, `${rawKey}: only Feat takes a slot marker, as in Feat (Fighting Style)`); continue; }
    const label = marker ? `Feat (${marker})` : def.key;

    if (def.opensBlock) {
      if (scope === "L" || opened.has(def.key)) { diag.add("E014", no, def.key); continue; }
      let item: Item | null = null;
      if (rawValue) {
        const v = parseValue(def, rawValue, "H", diag, no);
        if (!v || v.type !== "items") continue;
        item = v.items[0];
      } else diag.add("W004", no, def.key);
      opened.add(def.key);
      const block: EntityBlock = { key: def.key, item, lines: new Map() };
      paste.entities.push(block);
      scope = def.opensBlock;
      current = block.lines;
      continue;
    }

    if (!def.scopes.includes(scope)) { diag.add("E005", no, `${def.key} in ${scopeName(scope)} scope`); continue; }
    const v = rawValue ? parseValue(def, rawValue, scope, diag, no) : emptyValue(def);
    if (!v) continue;
    if (!rawValue) diag.add("W004", no, label);

    // ── 0.7 keys (D113): read, written in their 0.8 form ──
    if (def.renamed) {
      if (!once(current, def.key, no, def.key)) continue;
      if (def.key === "ASI" && v.type === "scores") {
        if (scope === "S" || scope === "B") {
          mergeScores(current, v);
          diag.add("W005", no, `ASI is written as Scores: ${emitValue({ ...v, values: NO_SCORES() }) || "+2 CHA"} (D108)`);
        } else {
          appendItems(current, "Feat", [asiFeat(v.increase ?? [])]);
          diag.add("W005", no, `ASI is written as Feat: ${ASI_FEAT}${v.increase ? ` [${emitValue({ ...v, values: NO_SCORES() })}]` : ""} (D109)`);
        }
      } else if (def.key === "Ability") {
        current.set("Ability", v);
        abilityLines.push({ scope: current, no });
      } else if (def.key === "Fighting Style" && v.type === "items") {
        appendItems(current, featKey(current, "Fighting Style"), v.items);
        diag.add("W005", no, "Fighting Style is written as Feat (Fighting Style) (D110)");
      } else if (v.type === "items") {
        appendItems(current, "Gear", v.items);
        diag.add("W005", no, `${def.key} is written as Gear (D111)`);
      }
      continue;
    }

    if (v.type === "scores") {
      const base = v.values.some((x) => x !== null);
      if (base && scope !== "H") { diag.add("E005", no, "base Scores go in the header; an increase starts with + (+2 CHA)"); continue; }
      if (!once(current, base ? "Scores" : v.increase ? "Scores+" : "Scores:", no, "Scores")) continue;
      mergeScores(current, v);
      continue;
    }
    if (def.key === "Feat" && v.type === "items") {
      const key = marker ? featKey(current, marker) : "Feat";
      if (once(current, key, no, label)) appendItems(current, key, v.items);
      continue;
    }
    if (once(current, def.key, no, def.key)) {
      if (v.type === "items") appendItems(current, def.key, v.items);
      else current.set(def.key, v);
    }
  }

  // A 0.7 `Ability` line moves into its owner's details when the scope has exactly one owner, a single `Feature`
  // item (`Size` aside, D39); otherwise it stays as written (D107, D113). The parser has no data to do more.
  for (const a of abilityLines) {
    const v = a.scope.get("Ability");
    const ab = v && v.type === "items" ? v.items[0] : undefined;
    const f = a.scope.get("Feature");
    const owners = f && f.type === "items" ? f.items.filter((it) => !it.drop && it.ref.name.toLowerCase() !== "size") : [];
    if (ab && owners.length === 1 && !isAbilitySlot(owners[0].details[0])) {
      owners[0].details = [[{ ref: ab.ref, at: null }], ...owners[0].details];
      a.scope.delete("Ability");
      diag.add("W005", a.no, `Ability is written as the first detail of Feature: ${owners[0].ref.name} (D107)`);
    } else diag.add("W005", a.no, "Ability kept as written: write the ability as the first detail of the Feat, Feature or Options that asks it (D107)");
  }

  // Whole-document checks.
  const pv = paste.header.get("Paste");
  if (pv && pv.type === "int" && pv.value !== PASTE_MAJOR) diag.add("E015", lineOf(lines, "paste"), `Paste: ${pv.value}`);
  const cls = paste.header.get("Classes");
  if (cls && cls.type === "classes" && paste.levels.length && cls.entries.some((e) => e.levels === null)) {
    diag.add("E012", lineOf(lines, "classes"), "a class without a level count is allowed only when the paste has no level blocks");
  }
  // Level headers against Classes (§5.4, D49): a header that contradicts the runs is E016; in the totals form, a
  // header whose class has no levels left is W003 (the header still fixes its level's class).
  for (const pr of sequenceOf(paste).problems) diag.add(pr.code, headerLine.get(pr.n) ?? 0, pr.message);
  diag.list.sort((a, b) => a.line - b.line);   // stable: same-line diagnostics keep their order
  return paste;
}

/** Adds items to a key's list, creating it: the one way a list grows, so a 0.7 alias merges into its 0.8 key. */
function appendItems(scope: Scope, key: string, items: readonly Item[]): void {
  const prev = scope.get(key);
  scope.set(key, { type: "items", items: [...(prev && prev.type === "items" ? prev.items : []), ...items] });
}
/** Merges a `Scores` line into its scope's value: a base fills `values`, an increase appends to `increase`. */
function mergeScores(scope: Scope, v: Extract<Value, { type: "scores" }>): void {
  const prev = scope.get("Scores");
  if (!prev || prev.type !== "scores") { scope.set("Scores", { type: "scores", values: [...v.values], increase: v.increase ? [...v.increase] : null }); return; }
  const increase = prev.increase || v.increase ? [...(prev.increase ?? []), ...(v.increase ?? [])] : null;
  scope.set("Scores", { type: "scores", values: prev.values.map((x, i) => v.values[i] ?? x), increase });
}
/** The scope's key for a marked feat line: an existing spelling of the same marker, else `Feat (<marker>)`. */
function featKey(scope: Scope, marker: string): string {
  const want = `Feat (${marker})`;
  return [...scope.keys()].find((k) => k.toLowerCase() === want.toLowerCase()) ?? want;
}

function findSeparator(line: string): number {
  const i = line.indexOf(":");
  if (i < 0) return -1;
  if (i === line.length - 1 || line[i + 1] === " ") return i;
  return -1;
}
function scopeName(s: ScopeKind): string {
  return s === "H" ? "header" : s === "S" ? "Species" : s === "B" ? "Background" : "level";
}
function lineOf(lines: string[], keyLower: string): number {
  const i = lines.findIndex((l) => l.trim().toLowerCase().startsWith(keyLower + ":"));
  return i < 0 ? 0 : i + 1;
}

// ─── Canonical emitter (SPEC §5.5) ──────────────────────────────────────────

function fmtName(name: string): string {
  return /[,;:\[\]"]/.test(name) || name.startsWith("-") ? `"${name}"` : name;
}
function fmtRef(r: Ref): string {
  return r.source ? `${fmtName(r.name)}|${r.source}` : fmtName(r.name);
}
function fmtItem(it: Item): string {
  let s = (it.drop ? "-" : "") + fmtRef(it.ref);
  if (it.details.length) {
    const groups = it.details.map((g) => g.map((d) => fmtRef(d.ref) + (d.at !== null ? ` @${d.at}` : "")).join(", "));
    s += ` [${groups.join("; ")}]`;
  }
  if (it.qty !== null) s += ` x${it.qty}`;
  return s;
}
/**
 * One value as one line's text; empty for a value not chosen yet. A `scores` value holding both a base and an
 * increase gives the base: `scopeLines` splits it into its two lines.
 */
export function emitValue(v: Value): string {
  switch (v.type) {
    case "items": return v.items.map(fmtItem).join(", ");
    case "enum": return v.value;
    case "int": return String(v.value);
    case "text": return v.value;
    // Runs fold to totals, one entry per class in first-appearance order; the order moves to level headers (§5.5).
    case "classes": return foldClasses(v.entries).map((e) => fmtRef(e.ref) + (e.levels === null ? "" : ` ${e.levels}`)).join(" / ");
    // All six known → the six-number form; otherwise the named form, STR…CHA order (§5.5).
    case "scores":
      if (v.values.every((x) => x !== null)) return v.values.join("/");
      if (v.values.some((x) => x !== null)) return ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [`${a} ${v.values[i]}`])).join(", ");
      return (v.increase ?? []).map((b) => `+${b.amount} ${b.ability}`).join(", ");
    case "hp": return v.roll !== null ? String(v.roll) : v.method;
    case "empty": return "";
  }
}

const cmpCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cmpKey = (a: string, b: string) => cmpCode(a.toLowerCase(), b.toLowerCase()) || cmpCode(a, b);

/**
 * A scope's key lines in canonical order (§5.5), one entry per line, each with that line's value: the order of the
 * profile table; `Feat` then its marked lines by marker, ignoring case; a base `Scores` line then its increase; an
 * `Ability` line that stayed as written (D113); `X-` keys alphabetically ignoring case.
 */
export function scopeLines(scope: Scope): [string, Value][] {
  const out: [string, Value][] = [];
  for (const def of KEYS) {
    if (def.key === "Feat") {
      const v = scope.get("Feat");
      if (v) out.push(["Feat", v]);
      for (const k of [...scope.keys()].filter((x) => x.startsWith("Feat (")).sort(cmpKey)) out.push([k, scope.get(k) as Value]);
      continue;
    }
    const v = scope.get(def.key);
    if (!v) continue;
    if (v.type === "scores") {
      const base = v.values.some((x) => x !== null);
      if (base) out.push(["Scores", { type: "scores", values: v.values, increase: null }]);
      if (v.increase) out.push(["Scores", { type: "scores", values: NO_SCORES(), increase: v.increase }]);
      if (!base && !v.increase) out.push(["Scores", v]);
      continue;
    }
    out.push([def.key, v]);
  }
  for (const def of LEGACY_KEYS) { const v = scope.get(def.key); if (v) out.push([def.key, v]); }
  // Alphabetical ignoring case (code-unit order, locale-free), so an authored `X-Plan-B` sorts where `x-plan-b` would.
  for (const k of [...scope.keys()].filter((x) => x.startsWith("X-")).sort(cmpKey)) out.push([k, scope.get(k) as Value]);
  return out;
}

/** `Key: value`, or `Key:` for a value not chosen yet (D112). */
function lineOfValue(key: string, v: Value): string {
  const s = emitValue(v);
  return s ? `${key}: ${s}` : `${key}:`;
}

function emitScope(scope: Scope, out: string[]): void {
  for (const [k, v] of scopeLines(scope)) out.push(lineOfValue(k, v));
}

export function emit(paste: Paste): string {
  const out: string[] = [];
  if (paste.identifier) out.push(paste.identifier);
  emitScope(paste.header, out);
  const order = ["Species", "Background"];
  for (const key of order) {
    const e = paste.entities.find((b) => b.key === key);
    if (!e) continue;
    if (out.length) out.push("");
    out.push(e.item ? `${key}: ${fmtItem(e.item)}` : `${key}:`);
    emitScope(e.lines, out);
  }
  for (const lv of withSwitchHeaders(paste)) {
    if (out.length) out.push("");
    out.push(`L${lv.n} ${fmtRef(lv.class)}`);
    emitScope(lv.lines, out);
  }
  return out.join("\n") + (out.length ? "\n" : "");
}

/**
 * The paste's level blocks plus an empty one at each class change that has no block yet (§5.5, D49), so the order
 * `Classes` runs carried survives their folding into totals. Only a paste with a timeline gets them — one with level
 * blocks, or with runs; a flat paste stays flat (the reading rule already gives its order). Adding a header that
 * agrees with the sequence leaves the sequence unchanged, so emit stays idempotent.
 */
function withSwitchHeaders(paste: Paste): LevelBlock[] {
  const blocks = [...paste.levels].sort((a, b) => a.n - b.n);
  const seq = sequenceOf(paste);
  if (!blocks.length && !seq.runs) return blocks;
  const have = new Set(blocks.map((b) => b.n));
  for (let n = 2; n <= seq.levels.length; n++) {
    const prev = seq.levels[n - 2], cls = seq.levels[n - 1];
    if (cls && prev && classKey(cls) !== classKey(prev) && !have.has(n)) blocks.push({ n, class: cls, lines: new Map() });
  }
  return blocks.sort((a, b) => a.n - b.n);
}

/** True when the paste has no error-level diagnostics (warnings allowed). */
export function isClean(paste: Paste): boolean {
  return !paste.diagnostics.some((d) => d.code.startsWith("E"));
}

/**
 * dndpaste — reference parser and canonical emitter.
 * Implements SPEC.md 0.3 (core grammar §1–4, profile `dnd5e` §5).
 * Zero dependencies; no game data; never infers; never throws on input.
 */

export const SPEC_VERSION = "0.3";
export const PASTE_MAJOR = 1;

// ─── AST ────────────────────────────────────────────────────────────────────

export interface Ref { name: string; source: string | null }
export interface Detail { ref: Ref; at: number | null }
export interface Item { ref: Ref; drop: boolean; details: Detail[][]; qty: number | null }

export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export const ABILITIES: readonly Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export type Value =
  | { type: "items"; items: Item[] }
  | { type: "enum"; value: string }
  | { type: "int"; value: number }
  /** As written: a class may appear more than once (runs, §5.2); `foldClasses` gives the totals. */
  | { type: "classes"; entries: ClassEntry[] }
  /** Base scores in STR/DEX/CON/INT/WIS/CHA order; `null` = not written (the named partial form, §5.2). */
  | { type: "scores"; values: (number | null)[] }
  | { type: "asi"; bonuses: { amount: number; ability: Ability }[] };

export type Scope = Map<string, Value>;
export interface EntityBlock { key: string; item: Item; lines: Scope }
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
export type ValueType = "items" | "item" | "items¹" | "enum" | "int" | "classes" | "scores" | "asi";

export interface KeyDef {
  key: string;
  type: ValueType;
  scopes: readonly ScopeKind[];
  opensBlock?: "S" | "B";
  enumValues?: readonly string[];
}

/** Table order is canonical order (SPEC §5.5). */
export const KEYS: readonly KeyDef[] = [
  { key: "Paste", type: "int", scopes: ["H"] },
  { key: "Rules", type: "enum", scopes: ["H"], enumValues: ["2014", "2024"] },
  { key: "Scores", type: "scores", scopes: ["H"] },
  { key: "Classes", type: "classes", scopes: ["H"] },
  { key: "Species", type: "item", scopes: ["H"], opensBlock: "S" },
  { key: "Background", type: "item", scopes: ["H"], opensBlock: "B" },
  { key: "Subclass", type: "items¹", scopes: ["H", "L"] },
  { key: "ASI", type: "asi", scopes: ["H", "S", "B", "L"] },
  { key: "Ability", type: "item", scopes: ["S", "B", "L"] },
  { key: "Skills", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Tools", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Languages", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Expertise", type: "items", scopes: ["H", "L"] },
  { key: "Feat", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Fighting Style", type: "items", scopes: ["H", "L"] },
  { key: "Masteries", type: "items", scopes: ["H", "L"] },
  { key: "Options", type: "items", scopes: ["H", "L"] },
  { key: "Feature", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Cantrips", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Spells", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Prepared", type: "items", scopes: ["H", "L"] },
  { key: "Equipment", type: "items", scopes: ["H", "B", "L"] },
  { key: "Items", type: "items", scopes: ["H", "L"] },
];

const KEY_BY_LOWER = new Map(KEYS.map((k) => [k.key.toLowerCase(), k]));
const LEVEL_MIN = 1;
const LEVEL_MAX = 20;

export function keyDef(key: string): KeyDef | undefined {
  return KEY_BY_LOWER.get(key.toLowerCase());
}
export function isExtensionKey(key: string): boolean {
  return /^x-[a-z0-9-]+$/i.test(key);
}

// ─── Errors ─────────────────────────────────────────────────────────────────

const MESSAGES: Record<string, string> = {
  E001: "malformed line",
  E002: "unknown key",
  E003: "duplicate key in this scope",
  E004: "level header not strictly increasing or out of range",
  E005: "key not allowed in this scope",
  E006: "empty value",
  E007: "list given to a single-item key",
  E008: "drop prefix outside a level scope or on a non-list key",
  E009: "quantity on a key other than Equipment or Items",
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

/**
 * Two forms, both base scores (§5.2, D46): six integers `8/15/13/10/14/12`, or the named partial form
 * `DEX 15, CON 13` — an ability and its value, in any order, missing abilities simply absent.
 */
function parseScores(raw: string, diag: Diag, line: number): Value | null {
  if (raw.includes("/")) {
    const parts = raw.split("/").map((p) => p.trim());
    if (parts.length !== 6 || parts.some((p) => !/^\d+$/.test(p))) {
      diag.add("E012", line, "Scores needs six integers separated by /, or named scores such as DEX 15, CON 13");
      return null;
    }
    return { type: "scores", values: parts.map(Number) };
  }
  const values: (number | null)[] = [null, null, null, null, null, null];
  for (const part of raw.split(",")) {
    const m = /^([A-Za-z]{3})\s+(\d+)$/.exec(part.trim());
    const i = m ? ABILITIES.indexOf(m[1].toUpperCase() as Ability) : -1;
    if (!m || i < 0) { diag.add("E012", line, `bad score "${part.trim()}": use six integers separated by /, or named scores such as DEX 15, CON 13`); return null; }
    if (values[i] !== null) { diag.add("E012", line, `${ABILITIES[i]} given twice`); return null; }
    values[i] = Number(m[2]);
  }
  return { type: "scores", values };
}

function parseAsi(raw: string, diag: Diag, line: number): Value | null {
  const bonuses: { amount: number; ability: Ability }[] = [];
  for (const part of raw.split(",")) {
    const m = /^\+(\d+)\s+([A-Za-z]{3})$/.exec(part.trim());
    const ab = m ? (m[2].toUpperCase() as Ability) : null;
    if (!m || !ab || !ABILITIES.includes(ab)) { diag.add("E012", line, `bad ASI entry "${part.trim()}"`); return null; }
    bonuses.push({ amount: Number(m[1]), ability: ab });
  }
  return { type: "asi", bonuses };
}

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
    case "classes": return parseClasses(raw, diag, line);
    case "scores": return parseScores(raw, diag, line);
    case "asi": return parseAsi(raw, diag, line);
    case "item":
    case "items":
    case "items¹": {
      const items = parseItems(raw, diag, line);
      if (!items) return null;
      const single = def.type === "item" || (def.type === "items¹" && scope === "L");
      if (single && items.length > 1) { diag.add("E007", line); return null; }
      const hintKeys = ["Feat", "Options", "Feature", "Subclass", "Fighting Style"];
      for (const it of items) {
        if (hintKeys.includes(def.key) && !it.details.length && /\s\([^()]*\)$/.test(it.ref.name)) diag.add("W002", line, it.ref.name);
        if (it.drop && (scope !== "L" || single)) { diag.add("E008", line); return null; }
        if (it.qty !== null && def.key !== "Equipment" && def.key !== "Items") { diag.add("E009", line); return null; }
      }
      return { type: "items", items };
    }
  }
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
      if (!rawValue) { diag.add("E006", no); continue; }
      const items = parseItems(rawValue, diag, no);
      // The reserved prefix is written `X-`; the rest of the name stays as authored (§2.5, D56).
      // Keys are case-insensitive, so `X-Plan-B` and `x-plan-b` are the same key in one scope.
      const key = "X-" + rawKey.slice(2);
      if (items && [...current.keys()].some((k) => k.toLowerCase() === key.toLowerCase())) { diag.add("E003", no, key); continue; }
      if (items) setOnce(current, key, { type: "items", items }, diag, no);
      continue;
    }

    const def = keyDef(rawKey);
    if (!def) { diag.add("E002", no, rawKey); continue; }
    if (!rawValue) { diag.add("E006", no); continue; }

    if (def.opensBlock) {
      if (scope === "L" || opened.has(def.key)) { diag.add("E014", no, def.key); continue; }
      const v = parseValue(def, rawValue, "H", diag, no);
      if (!v || v.type !== "items") continue;
      opened.add(def.key);
      const block: EntityBlock = { key: def.key, item: v.items[0], lines: new Map() };
      paste.entities.push(block);
      scope = def.opensBlock;
      current = block.lines;
      continue;
    }

    if (!def.scopes.includes(scope)) { diag.add("E005", no, `${def.key} in ${scopeName(scope)} scope`); continue; }
    const v = parseValue(def, rawValue, scope, diag, no);
    if (!v) continue;
    setOnce(current, def.key, v, diag, no);
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
  return paste;
}

function findSeparator(line: string): number {
  const i = line.indexOf(":");
  if (i < 0) return -1;
  if (i === line.length - 1 || line[i + 1] === " ") return i;
  return -1;
}
function setOnce(scope: Scope, key: string, v: Value, diag: Diag, line: number): void {
  if (scope.has(key)) { diag.add("E003", line, key); return; }
  scope.set(key, v);
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
export function emitValue(v: Value): string {
  switch (v.type) {
    case "items": return v.items.map(fmtItem).join(", ");
    case "enum": return v.value;
    case "int": return String(v.value);
    // Runs fold to totals, one entry per class in first-appearance order; the order moves to level headers (§5.5).
    case "classes": return foldClasses(v.entries).map((e) => fmtRef(e.ref) + (e.levels === null ? "" : ` ${e.levels}`)).join(" / ");
    // All six known → the six-number form; otherwise the named form, STR…CHA order (§5.5).
    case "scores": return v.values.every((x) => x !== null)
      ? v.values.join("/")
      : ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [`${a} ${v.values[i]}`])).join(", ");
    case "asi": return v.bonuses.map((b) => `+${b.amount} ${b.ability}`).join(", ");
  }
}

function emitScope(scope: Scope, out: string[]): void {
  for (const def of KEYS) {
    const v = scope.get(def.key);
    if (v) out.push(`${def.key}: ${emitValue(v)}`);
  }
  // Alphabetical ignoring case (code-unit order, locale-free), so an authored `X-Plan-B` sorts where `x-plan-b` would.
  const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const ext = [...scope.keys()].filter((k) => k.startsWith("X-")).sort((a, b) => cmp(a.toLowerCase(), b.toLowerCase()) || cmp(a, b));
  for (const k of ext) out.push(`${k}: ${emitValue(scope.get(k) as Value)}`);
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
    out.push(`${key}: ${fmtItem(e.item)}`);
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

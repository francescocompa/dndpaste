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
  | { type: "classes"; entries: { ref: Ref; levels: number | null }[] }
  | { type: "scores"; values: number[] }
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
  { key: "Feature", type: "items", scopes: ["S", "B", "L"] },
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
  W001: "extension key kept but not understood",
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
  const entries: { ref: Ref; levels: number | null }[] = [];
  for (const part of raw.split(/\s\/\s/)) {
    const s = part.trim();
    const m = /^(.*?)(?:\s+(\d+))?$/.exec(s);
    if (!m || !m[1]) { diag.add("E012", line, `bad class entry "${s}"`); return null; }
    const ref = parseRef(m[1]);
    if (!ref) { diag.add("E012", line, `bad class entry "${s}"`); return null; }
    entries.push({ ref, levels: m[2] === undefined ? null : Number(m[2]) });
  }
  return { type: "classes", entries };
}

function parseScores(raw: string, diag: Diag, line: number): Value | null {
  const parts = raw.split("/").map((p) => p.trim());
  if (parts.length !== 6 || parts.some((p) => !/^\d+$/.test(p))) {
    diag.add("E012", line, "Scores needs six integers separated by /");
    return null;
  }
  return { type: "scores", values: parts.map(Number) };
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
      for (const it of items) {
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
      if (items) setOnce(current, rawKey.toLowerCase().replace(/^x-/, "X-"), { type: "items", items }, diag, no);
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
    case "classes": return v.entries.map((e) => fmtRef(e.ref) + (e.levels === null ? "" : ` ${e.levels}`)).join(" / ");
    case "scores": return v.values.join("/");
    case "asi": return v.bonuses.map((b) => `+${b.amount} ${b.ability}`).join(", ");
  }
}

function emitScope(scope: Scope, out: string[]): void {
  for (const def of KEYS) {
    const v = scope.get(def.key);
    if (v) out.push(`${def.key}: ${emitValue(v)}`);
  }
  const ext = [...scope.keys()].filter((k) => k.startsWith("X-")).sort();
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
  for (const lv of [...paste.levels].sort((a, b) => a.n - b.n)) {
    if (out.length) out.push("");
    out.push(`L${lv.n} ${fmtRef(lv.class)}`);
    emitScope(lv.lines, out);
  }
  return out.join("\n") + (out.length ? "\n" : "");
}

/** True when the paste has no error-level diagnostics (warnings allowed). */
export function isClean(paste: Paste): boolean {
  return !paste.diagnostics.some((d) => d.code.startsWith("E"));
}

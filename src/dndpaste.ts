/**
 * dndpaste — reference parser and canonical emitter.
 * Implements SPEC.md 0.11 (core grammar §1–4, profile `dnd5e` §5); reads 0.7 keys as aliases (D113) and the 0.9
 * lineage forms with a warning (D282, D283).
 * Zero dependencies; no game data; never infers; never throws on input.
 */

export const SPEC_VERSION = "0.12";
export const PASTE_MAJOR = 1;

// ─── AST ────────────────────────────────────────────────────────────────────

export interface Ref { name: string; source: string | null }
export interface Detail { ref: Ref; at: number | null }
export interface Item { ref: Ref; drop: boolean; details: Detail[][]; qty: number | null }
/** One score increase: `+2 CHA` (§5.2). */
export interface Bonus { amount: number; ability: Ability }

export type Ability = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
export const ABILITIES: readonly Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
/** How a base was made (D323, D326): the method marker's value, and what `scoreKind` reads from the numbers. */
export type ScoreKind = "standard-array" | "point-buy" | "custom";

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
   * line (`+2 CHA`), or `null`. Both empty: a `Scores:` line with no value yet (D112). `method`: the base line's
   * marker, `Scores (point buy): …` (D323), absent when none is written; it is what the paste says, never checked.
   */
  | { type: "scores"; values: (number | null)[]; increase: Bonus[] | null; method?: ScoreKind }
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
/**
 * A problem on one line (§7). `message` says what is wrong; `hint` says how to fix it in a few words ("Move above
 * Species", "Did you mean Classes?"); `fix`, when the parser can write the fix itself, is the edit to make (D203).
 */
export interface Diagnostic { code: string; line: number; message: string; hint?: string; fix?: Fix }
/**
 * A one-click fix (D203): text edits on the paste as written, all made at once by `applyFix`. Line numbers are the
 * original text's, 1-based. `safe`: Tidy may make it without asking (a move, a join, a separator); a guess such as a
 * did-you-mean is not safe.
 */
export interface Fix { label: string; safe: boolean; edits: FixEdit[] }
/** `text: null` deletes line `line`; `insert` puts `text` before line `line` (one past the last line appends); otherwise `text` replaces the line. */
export interface FixEdit { line: number; text: string | null; insert?: boolean }
/** A line that failed to parse, kept as written (D202): `scope` is where it stood: `H`, `S`, `B`, or a level block's n. */
export interface KeptLine { line: number; text: string; scope: "H" | "S" | "B" | number }
export interface Paste {
  identifier: string | null;
  header: Scope;
  entities: EntityBlock[];
  levels: LevelBlock[];
  diagnostics: Diagnostic[];
  /** Lines with an error, kept verbatim so `emit` never drops what the author wrote (D202). Absent or empty: none. */
  kept?: KeptLine[];
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
  /**
   * What the key's parentheses may hold (§2.4): `open`, any text kept as written (`Feat (Origin)`, `Options (Soul
   * Techniques)`, D110, D181); `level`, a spell level cap `1st`–`9th` (`Spells (3rd)`, D184); `method`, how a base
   * `Scores` line was made, `standard array`, `point buy` or `custom` (D323). Absent: no marker (E002).
   */
  marker?: "open" | "level" | "method";
  /**
   * An `Options` family (D180–D182): the names an `Options (<family>)` marker folds from (the key's own name and its
   * singular or plural, matched ignoring case), and the 5etools family codes its options carry (`EI`; `MV` covers
   * `MV:B`). `Masteries` has no codes: its picks are weapons.
   */
  family?: { names: readonly string[]; codes: readonly string[] };
}

/** Table order is canonical order (SPEC §5.5). SPEC 0.8 keys only; the 0.7 aliases are `LEGACY_KEYS`. */
export const KEYS: readonly KeyDef[] = [
  { key: "Paste", type: "int", scopes: ["H"] },
  { key: "Producer", type: "text", scopes: ["H"] },
  { key: "Rules", type: "enum", scopes: ["H"], enumValues: ["2014", "2024"] },
  { key: "Scores", type: "scores", scopes: ["H", "S", "B", "L"], marker: "method" },
  { key: "Classes", type: "classes", scopes: ["H"] },
  { key: "HP", type: "hp", scopes: ["H", "L"] },
  { key: "Species", type: "item", scopes: ["H"], opensBlock: "S" },
  { key: "Background", type: "item", scopes: ["H"], opensBlock: "B" },
  { key: "Subclass", type: "items¹", scopes: ["H", "L"] },
  { key: "Skills", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Tools", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Languages", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Expertise", type: "items", scopes: ["H", "L"] },
  { key: "Feat", type: "items", scopes: ["H", "S", "B", "L"], marker: "open" },
  { key: "Masteries", type: "items", scopes: ["H", "L"], family: { names: ["Masteries", "Mastery"], codes: [] } },
  { key: "Invocations", type: "items", scopes: ["H", "L"], family: { names: ["Invocations", "Invocation"], codes: ["EI"] } },
  { key: "Metamagic", type: "items", scopes: ["H", "L"], family: { names: ["Metamagic", "Metamagics"], codes: ["MM"] } },
  { key: "Maneuvers", type: "items", scopes: ["H", "L"], family: { names: ["Maneuvers", "Maneuver"], codes: ["MV"] } },
  { key: "Infusions", type: "items", scopes: ["H", "L"], family: { names: ["Infusions", "Infusion"], codes: ["AI"] } },
  { key: "Arcane Shots", type: "items", scopes: ["H", "L"], family: { names: ["Arcane Shots", "Arcane Shot"], codes: ["AS"] } },
  { key: "Runes", type: "items", scopes: ["H", "L"], family: { names: ["Runes", "Rune"], codes: ["RN"] } },
  { key: "Disciplines", type: "items", scopes: ["H", "L"], family: { names: ["Disciplines", "Discipline"], codes: ["ED"] } },
  { key: "Pact Boon", type: "items", scopes: ["H", "L"], family: { names: ["Pact Boon", "Pact Boons"], codes: ["PB"] } },
  { key: "Options", type: "items", scopes: ["H", "L"], marker: "open" },
  { key: "Feature", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Cantrips", type: "items", scopes: ["H", "S", "B", "L"] },
  { key: "Spells", type: "items", scopes: ["H", "S", "B", "L"], marker: "level" },
  { key: "Prepared", type: "items", scopes: ["H", "L"], marker: "level" },
  { key: "Gear", type: "items", scopes: ["H", "B", "L"] },
  { key: "Note", type: "text", scopes: ["H", "S", "B", "L"] },
];

/** SPEC 0.7 keys, read for as long as `Paste: 1` (D142) with a W005 "renamed key" warning and written in their 0.8 form (D113). */
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
/** `Options (<family>)` markers that fold into a family key (D181, D182): each family's names, lower case. */
const FAMILY_BY_NAME = new Map(KEYS.flatMap((k) => (k.family?.names ?? []).map((n) => [n.toLowerCase(), k] as const)));
/** The level cap ordinals, index = spell level (D184). */
const LEVEL_CAPS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
/** The method marker's words (D323), written in lower case, and the kind each one names. */
const METHOD_WORDS: readonly [string, ScoreKind][] = [["standard array", "standard-array"], ["point buy", "point-buy"], ["custom", "custom"]];
/** A method marker as written (`Point Buy`) → its kind; null when it names no method. */
function methodOf(marker: string): ScoreKind | null {
  const w = marker.trim().replace(/\s+/g, " ").toLowerCase();
  return METHOD_WORDS.find(([words]) => words === w)?.[1] ?? null;
}
/** A kind as the method marker writes it: `point-buy` → `point buy`. */
export function methodWords(kind: ScoreKind): string {
  return METHOD_WORDS.find(([, k]) => k === kind)?.[0] ?? kind;
}
const LEVEL_MIN = 1;
const LEVEL_MAX = 20;

/** A key line's key split into the key and its slot marker: `Feat (Fighting Style)` → `Feat`, `Fighting Style` (D110). */
export function splitMarker(key: string): { key: string; marker: string | null } {
  const m = /^(.*?)\s*\(([^()]*)\)$/.exec(key.trim());
  return m ? { key: m[1].trim(), marker: m[2].trim() } : { key: key.trim(), marker: null };
}
/**
 * A key as written, resolved (§2.4): its definition and the scope key its line goes under. `Feat (Origin)` → `Feat`'s,
 * under `Feat (Origin)`; `Options (Invocation)` → `Invocations` (D181); `Spells (3RD)` → `Spells`'s, under
 * `Spells (3rd)` (D184); `Scores (Point Buy)` → `Scores`'s, under `Scores`, the marker `point buy` (D323). Null for an
 * unknown key or a marker the key doesn't take, with the reason.
 */
export function resolveKey(key: string): { def: KeyDef; key: string; marker: string | null } | { def: null; reason: string } {
  const hit = KEY_BY_LOWER.get(key.trim().toLowerCase());
  if (hit) return { def: hit, key: hit.key, marker: null };
  const { key: base, marker } = splitMarker(key);
  const def = KEY_BY_LOWER.get(base.toLowerCase());
  if (!def || marker === null) return { def: null, reason: key.trim() };
  if (!marker) return { def: null, reason: `${key.trim()}: the parentheses are empty` };
  if (def.marker === "open") {
    const fam = def.key === "Options" ? FAMILY_BY_NAME.get(marker.toLowerCase()) : undefined;
    return fam ? { def: fam, key: fam.key, marker: null } : { def, key: `${def.key} (${marker})`, marker };
  }
  if (def.marker === "level") {
    const n = LEVEL_CAPS.indexOf(marker.toLowerCase());
    return n > 0 ? { def, key: `${def.key} (${LEVEL_CAPS[n]})`, marker: LEVEL_CAPS[n] }
      : { def: null, reason: `${key.trim()}: a level cap is 1st to 9th, as in ${def.key} (3rd)` };
  }
  if (def.marker === "method") {
    const kind = methodOf(marker);
    return kind ? { def, key: def.key, marker: methodWords(kind) }
      : { def: null, reason: `${key.trim()}: the method is standard array, point buy or custom, as in Scores (point buy)` };
  }
  return { def: null, reason: `${key.trim()}: only Feat and Options take a marker, Spells and Prepared a level cap, and Scores a method` };
}
/** The key's definition, 0.8 or 0.7 alias; a marked key gives its key's (`Feat (Origin)` → `Feat`), a folded family marker the family's. */
export function keyDef(key: string): KeyDef | undefined {
  return resolveKey(key).def ?? undefined;
}
/**
 * The key a scope key reads as for slots and lists: `Options` for `Options`, `Options (<marker>)` and the option
 * family keys (`Invocations`, D180); `Spells` or `Prepared` for a capped line (D184); `Feat` for a marked feat (D110);
 * any other key itself. `Masteries` stays `Masteries` (its picks are weapons).
 */
export function keyGroup(key: string): string {
  const def = keyDef(key);
  if (!def) return key;
  if (def.family?.codes.length) return "Options";
  return def.key;
}
/** A scope key's spell level cap (D184): `Spells (3rd)` → 3; null when it has none. */
export function levelCap(key: string): number | null {
  const { key: base, marker } = splitMarker(key);
  const def = KEY_BY_LOWER.get(base.toLowerCase());
  if (def?.marker !== "level" || !marker) return null;
  const n = LEVEL_CAPS.indexOf(marker.toLowerCase());
  return n > 0 ? n : null;
}
/** A scope key's option family (D180, D181): the family key's 5etools codes, or the open marker as written; null for plain `Options` and other keys. */
export function familyOf(key: string): { codes: readonly string[] } | { marker: string } | null {
  const r = resolveKey(key);
  if (!r.def) return null;
  if (r.def.family?.codes.length) return { codes: r.def.family.codes };
  return r.def.key === "Options" && r.marker ? { marker: r.marker } : null;
}
export function isExtensionKey(key: string): boolean {
  return /^x-[a-z0-9-]+$/i.test(key);
}
/** True for `Feat` and every `Feat (<marker>)` key of a scope. */
export function isFeatKey(key: string): boolean {
  return key === "Feat" || key.startsWith("Feat (");
}
/**
 * The ability a detail group picks: exactly one bare ability (`[INT; High]`'s `INT`, D107), or `+1` and an ability, the
 * same pick on a 2024 half feat (`[+1 CHA]`, D206). Null for anything else.
 */
export function abilityOf(group: readonly Detail[] | undefined): Ability | null {
  if (!group || group.length !== 1 || group[0].ref.source) return null;
  const name = group[0].ref.name.replace(/^\+1\s+/, "").toUpperCase() as Ability;
  return ABILITIES.includes(name) ? name : null;
}
/** A lineage as the editor writes it (D280): the option's last word goes when it repeats the species or the trait (`High Elf` → `High`, `Fire Giant` → `Fire`). */
export function shortLineage(option: string, species: string, trait: string | null): string {
  const words = option.split(" ");
  const last = words[words.length - 1].toLowerCase();
  return words.length > 1 && (last === species.toLowerCase() || (trait && last === trait.split(" ")[0].toLowerCase())) ? words.slice(0, -1).join(" ") : option;
}
/** The standard array (D326): numbers only, no rules text. */
export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];
/** Point-buy cost of each base score 8–15 (D326): numbers only. */
export const POINT_BUY_COST: Readonly<Record<number, number>> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
/** The point-buy budget (D326). */
export const POINT_BUY_BUDGET = 27;
/**
 * What the base scores are, read from the numbers alone (D326, D324): `standard-array` when they are the standard
 * array, `point-buy` when each is 8–15 within the 27-point budget, else `custom`; the narrower kind wins, since the
 * standard array also costs 27. `left`: the point-buy points left of 27, null when the numbers are not point-buy
 * legal. `values` is a base in STR…CHA order, `null` = unknown (a `scores` value's `values`); a partial base is read on
 * its known numbers (`DEX 15/CON 14` is a standard array so far, 11 points left), and no known number is `custom`.
 * A hint, never a check (D66): the method marker, when written, is what the paste says.
 */
export function scoreKind(values: readonly (number | null)[]): { kind: ScoreKind; left: number | null } {
  const known = values.slice(0, 6).filter((x): x is number => x !== null);
  if (!known.length) return { kind: "custom", left: null };
  const cost = known.reduce<number | null>((sum, x) => (sum === null || POINT_BUY_COST[x] === undefined ? null : sum + POINT_BUY_COST[x]), 0);
  const left = cost !== null && cost <= POINT_BUY_BUDGET ? POINT_BUY_BUDGET - cost : null;
  const rest = [...STANDARD_ARRAY];
  const array = known.every((x) => { const i = rest.indexOf(x); if (i < 0) return false; rest.splice(i, 1); return true; });
  return { kind: array ? "standard-array" : left !== null ? "point-buy" : "custom", left };
}
/** True when the detail group is an ability pick (see `abilityOf`). */
export function isAbilitySlot(group: readonly Detail[] | undefined): boolean {
  return abilityOf(group) !== null;
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
  W006: "the lineage pick goes on the Species line (SPEC 0.10)",
  W007: "the species variant goes in [brackets] (SPEC 0.10)",
  W008: "Masteries add up (SPEC 0.12): a mastery left out of a later line is still held",
};

/** How to fix each code, in as few words as it takes (D192). A line may get a more precise hint or a fix. */
const HINTS: Record<string, string> = {
  E001: "Write Key: value",
  E002: "Use a key from the key list; free text goes in Note",
  E003: "Keep one line for this key",
  E004: "Number levels upward, L1 to L20",
  E005: "Move it to a block that takes this key",
  E007: "Give one name",
  E008: "Drops go in a level block, on a list key",
  E009: "Quantities go on Gear only",
  E010: "Remove the line",
  E011: "Check the brackets and quotes",
  E013: "Put @n on a detail in brackets",
  E014: "Species and Background go once each, above the first level",
  E015: "Write Paste: 1",
  E016: "Make the header agree with Classes",
  W001: "Free text goes in Note",
  W002: "Put details in [brackets]",
  W005: "Tidy writes the new key",
  W006: "Tidy moves it onto the Species line",
  W007: "Tidy writes it in brackets",
  W008: "Drop it with -Name, or list only the new masteries",
};

class Diag {
  list: Diagnostic[] = [];
  add(code: string, line: number, detail?: string, more: { hint?: string; fix?: Fix } = {}): Diagnostic {
    const base = MESSAGES[code] ?? code;
    const d: Diagnostic = { code, line, message: detail ? `${base}: ${detail}` : base };
    const hint = more.hint ?? HINTS[code];
    if (hint) d.hint = hint;
    if (more.fix) d.fix = more.fix;
    this.list.push(d);
    return d;
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
 * `Scores` (§5.2): the `+` decides (D108). A base is named, `STR 8/DEX 15/…` or for the known ones only `DEX 15/CON 13`
 * or `DEX 15, CON 13` (D106, D320), or six integers `8/15/13/10/14/12` in STR/DEX/CON/INT/WIS/CHA order. An increase
 * is `+2 CHA` or `+1 INT, +1 CON`.
 */
function parseScores(raw: string, diag: Diag, line: number): Value | null {
  if (raw.startsWith("+")) {
    const increase = parseBonuses(raw, diag, line);
    return increase ? { type: "scores", values: NO_SCORES(), increase } : null;
  }
  const parts = raw.split(/[,/]/).map((p) => p.trim());
  if (raw.includes("/") && parts.every((p) => /^\d+$/.test(p))) {
    if (parts.length !== 6) { diag.add("E012", line, "Scores needs named scores such as STR 8/DEX 14, six integers separated by / (STR/DEX/CON/INT/WIS/CHA), or an increase such as +2 CHA"); return null; }
    return { type: "scores", values: parts.map(Number), increase: null };
  }
  const values = NO_SCORES();
  for (const part of parts) {
    const m = /^([A-Za-z]{3})\s+(\d+)$/.exec(part);
    const i = m ? ABILITIES.indexOf(m[1].toUpperCase() as Ability) : -1;
    if (!m || i < 0) { diag.add("E012", line, `bad score "${part}": use named scores such as STR 8/DEX 14, six integers separated by / (STR/DEX/CON/INT/WIS/CHA), or an increase such as +2 CHA`); return null; }
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

/** `Name [details]|SOURCE`: a source written after the brackets (D286); `$1` the brackets, `$2` the source. */
const SOURCE_AFTER_BRACKETS = /(\s*\[[^\[\]]*\])\|([^\s|,;:\[\]"]+)/g;

const HINT_KEYS = ["Feat", "Options", "Feature", "Subclass", "Fighting Style", ...KEYS.filter((k) => k.family?.codes.length).map((k) => k.key)];
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
  const kept: KeptLine[] = [];
  const paste: Paste = { identifier: null, header: new Map(), entities: [], levels: [], diagnostics: diag.list, kept };
  const lines = text.split(/\r?\n/);

  let scope: ScopeKind = "H";
  let current: Scope = paste.header;
  let where: KeptLine["scope"] = "H";
  let seenFirst = false;
  let lastLevel = 0;
  const opened = new Set<string>();
  const headerLine = new Map<number, number>();   // level n → its header's line number
  // The first block-opening line: where a header key written under a block moves to (D192).
  let firstBlock: { line: number; label: string } | null = null;
  // One line per key per scope (E003). A line's identity is its key, a Feat's marker included; a 0.7 alias has its own,
  // so `Equipment` and `Items` both merge into `Gear`; `Scores` has one for the base and one for the increase.
  // Each identity remembers its first line, which a duplicate joins (D192).
  const seen = new Map<Scope, Map<string, number>>();
  const once = (sc: Scope, id: string, no: number, label: string, join?: (first: number) => Fix | undefined): boolean => {
    let s = seen.get(sc);
    if (!s) { s = new Map(); seen.set(sc, s); }
    const first = s.get(id.toLowerCase());
    if (first !== undefined) {
      const fix = join?.(first);
      diag.add("E003", no, label, fix ? { hint: fix.label, fix } : {});
      return false;
    }
    s.set(id.toLowerCase(), no);
    return true;
  };
  const abilityLines: { scope: Scope; no: number }[] = [];
  let speciesAt = 0;   // the Species line's number, for the lineage fixes (D283)

  /** One line; the caller keeps it verbatim when it adds an error (D202). */
  const handle = (line: string, no: number, first: boolean): void => {
    if (line === "---") { diag.add("E010", no); return; }
    if (line.startsWith("#") && !(first && findSeparator(line) < 0)) {
      const note = line.replace(/^#+\s*/, "");
      diag.add("E001", no, "a comment", { hint: "Write it as Note: …", fix: { label: "Make it a note", safe: false, edits: [{ line: no, text: note ? `Note: ${note}` : null }] } });
      return;
    }

    const lv = LEVEL_RE.exec(line);
    if (lv) {
      const n = Number(lv[1]);
      const ref = parseRef(lv[2]);
      if (!ref || ref.name.includes("[")) { diag.add("E001", no, "bad level header", { hint: "Write L5 Wizard" }); return; }
      if (n < LEVEL_MIN || n > LEVEL_MAX || n <= lastLevel) { diag.add("E004", no, `L${n}`); return; }
      lastLevel = n;
      headerLine.set(n, no);
      firstBlock ??= { line: no, label: "Move to the header" };
      const block: LevelBlock = { n, class: ref, lines: new Map() };
      paste.levels.push(block);
      scope = "L";
      current = block.lines;
      where = n;
      return;
    }

    const sep = findSeparator(line);
    if (sep < 0) {
      if (first) { paste.identifier = line; return; }
      malformed(line, no);
      return;
    }
    const rawKey = line.slice(0, sep).trim();
    const rawValue = line.slice(sep + 1).trim();
    if (!rawKey) { diag.add("E001", no); return; }

    if (isExtensionKey(rawKey)) {
      diag.add("W001", no, rawKey);
      // The reserved prefix is written `X-`; the rest of the name stays as authored (§2.5, D56).
      // Keys are case-insensitive, so `X-Plan-B` and `x-plan-b` are the same key in one scope.
      const key = "X-" + rawKey.slice(2);
      if (!rawValue) diag.add("W004", no, key);
      const items = rawValue ? parseItems(rawValue, diag, no) : [];
      if (items && once(current, key, no, key, (f) => joinFix(lines, f, no, rawValue, (v) => Boolean(parseItems(v, new Diag(), 0))))) current.set(key, { type: "items", items });
      return;
    }

    const rk = resolveKey(rawKey);
    if (!rk.def) {
      const near = rk.reason === rawKey ? suggestKey(rawKey, rawValue) : null;
      diag.add("E002", no, rk.reason, near ? { hint: near.hint, fix: { label: near.hint, safe: false, edits: [{ line: no, text: near.line }] } } : {});
      return;
    }
    const { def, marker } = rk;
    const label = rk.key;

    if (def.opensBlock) {
      if (scope === "L" || opened.has(def.key)) { diag.add("E014", no, def.key); return; }
      let item: Item | null = null;
      if (rawValue) {
        const v = parseValue(def, rawValue, "H", diag, no);
        if (!v || v.type !== "items") {
          const last = diag.list[diag.list.length - 1];
          const swapped = rawValue.replace(SOURCE_AFTER_BRACKETS, "|$2$1");
          if (swapped !== rawValue && last?.line === no && parseValue(def, swapped, "H", new Diag(), 0)) {
            last.message = `${MESSAGES.E011}: the source goes after the name, before the brackets`;
        last.hint = "Put the source after the name";
            last.fix = { label: "Put the source after the name", safe: true, edits: [{ line: no, text: `${rawKey}: ${swapped}` }] };
          }
          return;
        }
        item = v.items[0];
        // A 0.9 species variant in parentheses, the data's own name (`Elf (Wood)|PHB`), reads as `Elf|PHB [Wood]` (D282).
        const pv = def.key === "Species" && !item.details.length ? /^(.+?)\s+\(([^()]+)\)$/.exec(item.ref.name) : null;
        if (pv && !/[,;:\[\]"]/.test(pv[2]) && !/[,;:\[\]"]/.test(pv[1])) {
          item = { ...item, ref: { name: pv[1].trim(), source: item.ref.source }, details: [[{ ref: { name: pv[2].trim(), source: null }, at: null }]] };
          const text = `Species: ${fmtItem(item)}`;
          diag.add("W007", no, `${pv[0]} is written ${fmtItem(item)} (D282)`, renameFix(no, text));
        }
        if (def.key === "Species") speciesAt = no;
      } else diag.add("W004", no, def.key);
      opened.add(def.key);
      firstBlock ??= { line: no, label: `Move above ${def.key}` };
      const block: EntityBlock = { key: def.key, item, lines: new Map() };
      paste.entities.push(block);
      scope = def.opensBlock;
      current = block.lines;
      where = def.opensBlock;
      return;
    }

    // A header key written under a block moves above the first block (D192): the one-click fix and Tidy's move.
    const move = (): { hint?: string; fix?: Fix } => (firstBlock && def.scopes.includes("H")
      ? { hint: firstBlock.label, fix: { label: firstBlock.label, safe: true, edits: [{ line: no, text: null }, { line: firstBlock.line, text: line, insert: true }] } }
      : {});
    if (!def.scopes.includes(scope)) { diag.add("E005", no, `${def.key} in ${scopeName(scope)} scope`, move()); return; }
    // A method marker (D323) marks a base, and a base goes in the header (on an increase it is E012 below, fixed in place).
    if (def.marker === "method" && marker !== null && scope !== "H" && !rawValue.startsWith("+")) { diag.add("E005", no, "a method marker goes on the base Scores line, in the header", move()); return; }
    const v = rawValue ? parseValue(def, rawValue, scope, diag, no) : emptyValue(def);
    if (!v) {
      // `Classes: Sorcerer 5, Warlock 5`: the 0.4 comma form (D192). Classes are separated with ` / `.
      const last = diag.list[diag.list.length - 1];
      // `Elf [Wood]|PHB`: the source goes after the name, before the brackets (D286).
      const swapped = rawValue.replace(SOURCE_AFTER_BRACKETS, "|$2$1");
      if (swapped !== rawValue && last?.line === no && parseValue(def, swapped, scope, new Diag(), 0)) {
        last.message = `${MESSAGES.E011}: the source goes after the name, before the brackets`;
        last.hint = "Put the source after the name";
        last.fix = { label: "Put the source after the name", safe: true, edits: [{ line: no, text: `${rawKey}: ${swapped}` }] };
      }
      const slash = rawValue.split(",").map((x) => x.trim()).join(" / ");
      if (def.type === "classes" && rawValue.includes(",") && last?.line === no && parseClasses(slash, new Diag(), 0)) {
        last.hint = "Use / between classes";
        last.fix = { label: "Use / between classes", safe: true, edits: [{ line: no, text: `${rawKey}: ${slash}` }] };
      }
      return;
    }
    if (!rawValue) diag.add("W004", no, label);
    const join = (f: number) => joinFix(lines, f, no, rawValue, (x) => Boolean(parseValue(def, x, scope, new Diag(), 0)), def.type === "classes" ? " / " : def.key === "Note" ? "; " : ", ");

    // ── 0.7 keys (D113): read, written in their 0.8 form ──
    if (def.renamed) {
      if (!once(current, def.key, no, def.key, join)) return;
      if (def.key === "ASI" && v.type === "scores") {
        const inc = emitValue({ ...v, values: NO_SCORES() });
        if (scope === "S" || scope === "B") {
          mergeScores(current, v);
          diag.add("W005", no, `ASI is written as Scores: ${inc || "+2 CHA"} (D108)`, inc ? renameFix(no, `Scores: ${inc}`) : {});
        } else {
          appendItems(current, "Feat", [asiFeat(v.increase ?? [])]);
          const feat = `Feat: ${ASI_FEAT}${v.increase ? ` [${inc}]` : ""}`;
          diag.add("W005", no, `ASI is written as ${feat} (D109)`, renameFix(no, feat));
        }
      } else if (def.key === "Ability") {
        current.set("Ability", v);
        abilityLines.push({ scope: current, no });
      } else if (def.key === "Fighting Style" && v.type === "items") {
        appendItems(current, markedKey(current, "Feat", "Fighting Style"), v.items);
        diag.add("W005", no, "Fighting Style is written as Feat (Fighting Style) (D110)", renameFix(no, `Feat (Fighting Style): ${rawValue}`));
      } else if (v.type === "items") {
        appendItems(current, "Gear", v.items);
        diag.add("W005", no, `${def.key} is written as Gear (D111)`, renameFix(no, `Gear: ${rawValue}`));
      }
      return;
    }

    if (v.type === "scores") {
      const base = v.values.some((x) => x !== null);
      // The method marker (D323) goes on a base line, or on an empty one waiting for its numbers.
      if (marker !== null && v.increase) { diag.add("E012", no, `the method goes on the base Scores line, not on an increase: write Scores: ${rawValue}`, { hint: "Drop the method", fix: { label: "Drop the method", safe: true, edits: [{ line: no, text: `Scores: ${rawValue}` }] } }); return; }
      if (base && scope !== "H") { diag.add("E005", no, "base Scores go in the header; an increase starts with + (+2 CHA)", move()); return; }
      if (!once(current, base ? "Scores" : v.increase ? "Scores+" : "Scores:", no, "Scores", join)) return;
      const kind = marker !== null ? methodOf(marker) : null;
      mergeScores(current, kind ? { ...v, method: kind } : v);
      return;
    }
    if (marker !== null && v.type === "items") {
      const key = markedKey(current, def.key, marker);
      if (once(current, key, no, label, join)) appendItems(current, key, v.items);
      return;
    }
    if (once(current, def.key, no, def.key, join)) {
      if (v.type === "items") appendItems(current, def.key, v.items);
      else current.set(def.key, v);
    }
  };

  /** A line with no `Key: ` (E001), with the likeliest fix (D192). */
  const malformed = (line: string, no: number): void => {
    const lvl = /^(?:level|lvl|lv)\.?\s*(\d+)\s+(.+)$/i.exec(line);
    if (lvl) { const t = `L${Number(lvl[1])} ${lvl[2].trim()}`; diag.add("E001", no, undefined, { hint: `Write ${t}`, fix: { label: `Write ${t}`, safe: false, edits: [{ line: no, text: t }] } }); return; }
    const tight = /^([^:]+):(\S.*)$/.exec(line);
    if (tight && (resolveKey(tight[1]).def || isExtensionKey(tight[1].trim()))) {
      diag.add("E001", no, undefined, { hint: "Add a space after the colon", fix: { label: "Add a space after the colon", safe: true, edits: [{ line: no, text: `${tight[1].trim()}: ${tight[2].trim()}` }] } });
      return;
    }
    diag.add("E001", no, undefined, { hint: "Write Key: value", fix: { label: "Make it a note", safe: false, edits: [{ line: no, text: `Note: ${line}` }] } });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const no = i + 1;
    if (!line) continue;
    const first = !seenFirst;
    seenFirst = true;
    const before = diag.list.length;
    handle(line, no, first);
    if (diag.list.slice(before).some((d) => d.code.startsWith("E"))) kept.push({ line: no, text: line, scope: where });
  }

  // A 0.9 defining-pick `Feature` line in the Species block moves onto the Species line (D280, D283): the lineage
  // first, then the ability, `Feature: Elven Lineage [WIS; Wood]` → `Species: Elf [Wood; WIS]`. Data-free: a Species
  // block feature whose name ends in Lineage, Legacy or Ancestry is the defining pick (SPEC §5.6).
  const sp = paste.entities.find((e) => e.key === "Species");
  if (sp?.item && !sp.item.details.length) {
    const fv = sp.lines.get("Feature");
    const fs = fv && fv.type === "items" ? fv.items : [];
    const lineage = fs.find((it) => !it.drop && it.details.length && DEFINING_PICK.test(it.ref.name));
    if (lineage) {
      const ability = isAbilitySlot(lineage.details[0]) ? lineage.details[0] : isAbilitySlot(lineage.details[1]) ? lineage.details[1] : null;
      const pick = lineage.details.find((g) => g !== ability) ?? [];
      sp.item = { ...sp.item, details: ability ? [pick, ability] : [pick] };
      const rest = fs.filter((it) => it !== lineage);
      if (rest.length) sp.lines.set("Feature", { type: "items", items: rest }); else sp.lines.delete("Feature");
      const at = seen.get(sp.lines)?.get("feature") ?? 0;
      const edits: FixEdit[] = [{ line: speciesAt, text: `Species: ${fmtItem(sp.item)}` }, { line: at, text: rest.length ? `Feature: ${rest.map(fmtItem).join(", ")}` : null }];
      const fix: Fix = { label: "Move it onto the Species line", safe: true, edits };
      diag.add("W006", at, `Feature: ${lineage.ref.name} is written Species: ${fmtItem(sp.item)} (D283)`, { hint: fix.label, fix });
    }
  }
  // An `Ability` line in the Species block is the lineage's ability when the Species line names a lineage and no
  // ability (D281): `Species: Elf [Drow]` with `Ability: WIS` reads as `Elf [Drow; WIS]`, with no warning.
  for (const a of abilityLines) {
    if (!sp?.item || a.scope !== sp.lines) continue;
    const v = a.scope.get("Ability");
    const ab = v && v.type === "items" ? v.items[0] : undefined;
    const d = sp.item.details;
    if (!ab || d.length !== 1 || !d[0].length || isAbilitySlot(d[0])) continue;
    sp.item = { ...sp.item, details: [d[0], [{ ref: ab.ref, at: null }]] };
    a.scope.delete("Ability");
    a.no = 0;
  }

  // A 0.7 `Ability` line moves into its owner's details when the scope has exactly one owner, a single `Feature`
  // item (`Size` aside, D39); otherwise it stays as written (D107, D113). The parser has no data to do more.
  for (const a of abilityLines) {
    if (!a.no) continue;
    const v = a.scope.get("Ability");
    const ab = v && v.type === "items" ? v.items[0] : undefined;
    const f = a.scope.get("Feature");
    const owners = f && f.type === "items" ? f.items.filter((it) => !it.drop && it.ref.name.toLowerCase() !== "size") : [];
    if (ab && owners.length === 1 && !isAbilitySlot(owners[0].details[0])) {
      owners[0].details = [[{ ref: ab.ref, at: null }], ...owners[0].details];
      a.scope.delete("Ability");
      diag.add("W005", a.no, `Ability is written as the first detail of Feature: ${owners[0].ref.name} (D107)`);
    } else diag.add("W005", a.no, "Ability kept as written: write the ability as the first detail of the Feat, Feature or Options that asks it (D107)", { hint: "Move the ability into the brackets of what asks it" });
  }

  // Masteries add up (D337, SPEC 0.12): a later line that repeats held names and leaves one out is the 0.11 snapshot
  // shape, which meant a swap. It reads as adding (the left-out name stays); the warning offers the drop (D342).
  for (const step of masteryWalk(paste)) {
    if (!step.repeated.length || !step.leftOut.length) continue;
    const at = seen.get(step.level.lines)?.get("masteries") ?? headerLine.get(step.level.n) ?? 0;
    const names = step.leftOut.map((it) => it.ref.name);
    const label = `Drop ${names.join(" and ")}`;
    const mv = step.level.lines.get("Masteries");
    const drops = mv && mv.type === "items" ? mv.items.filter((it) => it.drop) : [];
    // The fix writes the line as 0.12 reads the author's intent: the new names, then each drop (D342).
    const value = [...step.added, ...drops, ...step.leftOut.map((it) => ({ ...it, drop: true, qty: null }))];
    diag.add("W008", at, `${names.join(", ")}, at L${step.level.n} (D337)`, { hint: `Write ${names.map((n) => `-${n}`).join(", ")} to drop ${names.length > 1 ? "them" : "it"}`, fix: { label, safe: false, edits: [{ line: at, text: `Masteries: ${value.map(fmtItem).join(", ")}` }] } });
  }

  // Whole-document checks.
  const pv = paste.header.get("Paste");
  if (pv && pv.type === "int" && pv.value !== PASTE_MAJOR) diag.add("E015", lineOf(lines, "paste"), `Paste: ${pv.value}`);
  const cls = paste.header.get("Classes");
  if (cls && cls.type === "classes" && paste.levels.length && cls.entries.some((e) => e.levels === null)) {
    diag.add("E012", lineOf(lines, "classes"), "a class without a level count is allowed only when the paste has no level blocks", { hint: "Give each class its levels: Wizard 5" });
  }
  // Level headers against Classes (§5.4, D49): a header that contradicts the runs is E016; in the totals form, a
  // header whose class has no levels left is W003 (the header still fixes its level's class).
  for (const pr of sequenceOf(paste).problems) diag.add(pr.code, headerLine.get(pr.n) ?? 0, pr.message, pr.code === "W003" ? { hint: "Raise its levels in Classes" } : {});
  diag.list.sort((a, b) => a.line - b.line);   // stable: same-line diagnostics keep their order
  return paste;
}

/** A Species block feature that splits the species into lineages (D280): Elven Lineage, Fiendish Legacy, Draconic Ancestry. */
const DEFINING_PICK = /\s(lineage|legacy|ancestry)$/i;

/** A W005 line's one-click rewrite in its new form (D113). Tidy needs none: `emit` writes the new form. */
function renameFix(no: number, text: string): { hint: string; fix: Fix } {
  return { hint: `Write ${text}`, fix: { label: "Use the new key", safe: true, edits: [{ line: no, text }] } };
}

/**
 * A duplicate line joined onto the first line of its key (E003, D192): the first line gets this one's value after
 * `sep`, this one goes. Offered only when the joined value parses (`ok`); an empty duplicate just goes.
 */
function joinFix(lines: readonly string[], first: number, no: number, value: string, ok: (joined: string) => boolean, sep = ", "): Fix | undefined {
  if (!value) return { label: "Remove the empty line", safe: true, edits: [{ line: no, text: null }] };
  const head = lines[first - 1].trim();
  const at = findSeparator(head);
  if (at < 0) return undefined;
  const prev = head.slice(at + 1).trim();
  const joined = prev ? `${prev}${sep}${value}` : value;
  if (!ok(joined)) return undefined;
  const label = sep === ", " ? "Join with commas" : sep === " / " ? "Join with /" : "Join the lines";
  return { label, safe: true, edits: [{ line: first, text: `${head.slice(0, at).trim()}: ${joined}` }, { line: no, text: null }] };
}

/** Common words for keys (D192): sheet habits and other tools' names. Lower case → the key. */
const KEY_WORDS: Record<string, string> = {
  race: "Species", subrace: "Species", ancestry: "Species", class: "Classes",
  feats: "Feat", spell: "Spells", "spells known": "Spells", "prepared spells": "Prepared", "known spells": "Spells",
  equipment: "Gear", inventory: "Gear", items: "Gear", proficiencies: "Skills", subclasses: "Subclass", archetype: "Subclass",
  notes: "Note", comment: "Note", comments: "Note", plan: "Note", plans: "Note", stats: "Scores", "ability scores": "Scores",
  abilities: "Scores", attributes: "Scores", "hit points": "HP", edition: "Rules", "fighting styles": "Feat (Fighting Style)",
};

/** The key an unknown key most likely means (D192): a common word, an ability (`INT: 17`), or a near spelling. */
function suggestKey(raw: string, value: string): { hint: string; line: string } | null {
  const { key: base, marker } = splitMarker(raw);
  const word = base.toLowerCase();
  const ab = ABILITIES.find((a) => a.toLowerCase() === word || ABILITY_NAMES[a] === word);
  if (ab && /^\d+$/.test(value)) return { hint: `Write Scores: ${ab} ${value}`, line: `Scores: ${ab} ${value}` };
  let key: string | undefined = KEY_WORDS[word];
  if (!key) {
    const near = KEYS.map((k) => ({ k: k.key, d: editDistance(word, k.key.toLowerCase()) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= Math.max(1, Math.min(2, Math.floor(word.length / 3)))) key = near.k;
  }
  if (!key) return null;
  if (marker !== null && !key.includes("(")) key = `${key} (${marker})`;
  return { hint: `Did you mean ${key}?`, line: value ? `${key}: ${value}` : `${key}:` };
}
const ABILITY_NAMES: Record<Ability, string> = { STR: "strength", DEX: "dexterity", CON: "constitution", INT: "intelligence", WIS: "wisdom", CHA: "charisma" };
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return row[b.length];
}

/** Adds items to a key's list, creating it: the one way a list grows, so a 0.7 alias merges into its 0.8 key. */
function appendItems(scope: Scope, key: string, items: readonly Item[]): void {
  const prev = scope.get(key);
  scope.set(key, { type: "items", items: [...(prev && prev.type === "items" ? prev.items : []), ...items] });
}
/** Merges a `Scores` line into its scope's value: a base fills `values`, an increase appends to `increase`. */
function mergeScores(scope: Scope, v: Extract<Value, { type: "scores" }>): void {
  const prev = scope.get("Scores");
  const p = prev?.type === "scores" ? prev : null;
  const increase = p?.increase || v.increase ? [...(p?.increase ?? []), ...(v.increase ?? [])] : null;
  const method = v.method ?? p?.method;
  scope.set("Scores", { type: "scores", values: p ? p.values.map((x, i) => v.values[i] ?? x) : [...v.values], increase, ...(method ? { method } : {}) });
}
/** The scope's key for a marked line: an existing spelling of the same marker, else `<Key> (<marker>)`. */
function markedKey(scope: Scope, key: string, marker: string): string {
  const want = `${key} (${marker})`;
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
    // A base is named, `/`-separated, STR…CHA order, full or partial (§5.5, D320); an increase keeps its commas.
    case "scores":
      if (v.values.some((x) => x !== null)) return ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [`${a} ${v.values[i]}`])).join("/");
      return (v.increase ?? []).map((b) => `+${b.amount} ${b.ability}`).join(", ");
    case "hp": return v.roll !== null ? String(v.roll) : v.method;
    case "empty": return "";
  }
}

const cmpCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cmpKey = (a: string, b: string) => cmpCode(a.toLowerCase(), b.toLowerCase()) || cmpCode(a, b);

/**
 * A scope's key lines in canonical order (§5.5), one entry per line, each with that line's value: the order of the
 * profile table; a key that takes a marker then its marked lines by marker, ignoring case (`Feat (Origin)`,
 * `Options (Soul Techniques)`, `Spells (3rd)` by level); a base `Scores` line then its increase; an
 * `Ability` line that stayed as written (D113); `X-` keys alphabetically ignoring case.
 */
export function scopeLines(scope: Scope): [string, Value][] {
  const out: [string, Value][] = [];
  for (const def of KEYS) {
    if (def.type === "scores") {
      const v = scope.get(def.key);
      if (v?.type !== "scores") continue;
      const base = v.values.some((x) => x !== null);
      const method = v.method ? { method: v.method } : {};
      // The base line carries the marker (D323); a marker with no numbers yet keeps its empty line.
      if (base || v.method || !v.increase) out.push(["Scores", { type: "scores", values: v.values, increase: null, ...method }]);
      if (v.increase) out.push(["Scores", { type: "scores", values: NO_SCORES(), increase: v.increase }]);
      continue;
    }
    if (def.marker) {
      const v = scope.get(def.key);
      if (v) out.push([def.key, v]);
      for (const k of [...scope.keys()].filter((x) => x.startsWith(`${def.key} (`)).sort(cmpKey)) out.push([k, scope.get(k) as Value]);
      continue;
    }
    const v = scope.get(def.key);
    if (!v) continue;
    out.push([def.key, v]);
  }
  for (const def of LEGACY_KEYS) { const v = scope.get(def.key); if (v) out.push([def.key, v]); }
  // Alphabetical ignoring case (code-unit order, locale-free), so an authored `X-Plan-B` sorts where `x-plan-b` would.
  for (const k of [...scope.keys()].filter((x) => x.startsWith("X-")).sort(cmpKey)) out.push([k, scope.get(k) as Value]);
  return out;
}

/** `Key: value`, or `Key:` for a value not chosen yet (D112); a base `Scores` line with its method, `Scores (point buy): …` (D323). */
export function lineOfValue(key: string, v: Value): string {
  const s = emitValue(v);
  const k = v.type === "scores" && v.method ? `${key} (${methodWords(v.method)})` : key;
  return s ? `${k}: ${s}` : `${k}:`;
}

function emitScope(scope: Scope, out: string[]): void {
  for (const [k, v] of scopeLines(scope)) out.push(lineOfValue(k, v));
}

/**
 * Canonical text (§5.5). A line that failed to parse is never dropped (D202): it is written as authored at the end of
 * the block it stood in, so `emit` of a paste with errors loses nothing and its errors read again the same way.
 */
export function emit(paste: Paste): string {
  const out: string[] = [];
  const kept = (scope: KeptLine["scope"]) => { for (const k of paste.kept ?? []) if (k.scope === scope) out.push(k.text); };
  if (paste.identifier) out.push(paste.identifier);
  emitScope(paste.header, out);
  kept("H");
  const order = ["Species", "Background"];
  for (const key of order) {
    const e = paste.entities.find((b) => b.key === key);
    if (!e) continue;
    if (out.length) out.push("");
    out.push(e.item ? `${key}: ${fmtItem(e.item)}` : `${key}:`);
    emitScope(e.lines, out);
    kept(key === "Species" ? "S" : "B");
  }
  for (const lv of withSwitchHeaders(paste)) {
    if (out.length) out.push("");
    out.push(`L${lv.n} ${fmtRef(lv.class)}`);
    emitScope(lv.lines, out);
    kept(lv.n);
  }
  return out.join("\n") + (out.length ? "\n" : "");
}

// ─── Fixes and Tidy (D203) ──────────────────────────────────────────────────

/** The text with one fix made (D203). Line numbers in the fix are the text's as given. */
export function applyFix(text: string, fix: Fix): string {
  return applyFixes(text, [fix]).text;
}
/** Makes as many of the fixes as don't touch the same line; the rest wait for the next pass. */
function applyFixes(text: string, fixes: readonly Fix[]): { text: string; made: number } {
  const lines = text.split(/\r?\n/);
  const touched = new Set<number>();
  const change = new Map<number, string | null>();
  const inserts = new Map<number, string[]>();
  let made = 0;
  for (const f of fixes) {
    const own = f.edits.filter((e) => !e.insert).map((e) => e.line);
    if (own.some((l) => touched.has(l) || l < 1 || l > lines.length)) continue;
    for (const e of f.edits) {
      if (e.insert) { if (e.text !== null) inserts.set(e.line, [...(inserts.get(e.line) ?? []), e.text]); }
      else { change.set(e.line, e.text); touched.add(e.line); }
    }
    made++;
  }
  const out: string[] = [];
  for (let i = 1; i <= lines.length + 1; i++) {
    out.push(...(inserts.get(i) ?? []));
    if (i > lines.length) break;
    if (!change.has(i)) out.push(lines[i - 1]);
    else { const t = change.get(i); if (t !== null && t !== undefined) out.push(t); }
  }
  return { text: out.join("\n"), made };
}

/** The family key an option family code or name stands for (D180): `EI` or `Invocation` → `Invocations`; null for none. */
export function familyKey(codeOrName: string): string | null {
  const x = codeOrName.trim().toLowerCase();
  const hit = KEYS.find((k) => k.family && (k.key.toLowerCase() === x || k.family.names.some((n) => n.toLowerCase() === x) || k.family.codes.some((c) => c.toLowerCase() === x || x.startsWith(c.toLowerCase() + ":"))));
  return hit?.key ?? null;
}

/**
 * Folds each plain `Options` line into its family key when every pick on it belongs to that one family (D195 T33):
 * `Options: Pact of the Chain` → `Invocations: Pact of the Chain`. `family` names a pick's family (a key, a family name
 * or a code), or null when it doesn't know; the library has no data, so the caller brings it (the checker's
 * `normalise` uses the slot table). Changes the paste in place; returns how many lines it folded.
 */
export function foldOptions(paste: Paste, family: (ref: Ref) => string | null): number {
  let folded = 0;
  for (const scope of [paste.header, ...paste.levels.map((l) => l.lines)]) {
    const v = scope.get("Options");
    if (!v || v.type !== "items" || !v.items.length) continue;
    const keys = new Set(v.items.map((it) => { const f = family(it.ref); return f ? familyKey(f) : null; }));
    const [key] = keys;
    if (keys.size !== 1 || !key) continue;
    appendItems(scope, key, v.items);
    scope.delete("Options");
    folded++;
  }
  return folded;
}

/** One level block's `Masteries` line read additively (D337): what it adds, what it repeats, what it leaves out. */
export interface MasteryStep {
  level: LevelBlock;
  /** Names new to the build on this line, in written order. */
  added: Item[];
  /** Names the build already held, written again (ignored by the reading). */
  repeated: Item[];
  /** Held names this line neither repeats nor drops; non-empty with `repeated` is the 0.11 snapshot shape (W008). */
  leftOut: Item[];
  /** The masteries held after this line. */
  held: Item[];
}
const nameKey = (it: Item) => it.ref.name.toLowerCase();
/**
 * The level blocks' `Masteries` lines in level order, read additively (D337, SPEC 0.12 §5.4): a name adds, `-Name`
 * drops a held one, a name already held is ignored. The header's unplaced line is not part of the walk. Data-free.
 */
export function masteryWalk(paste: Paste): MasteryStep[] {
  const held = new Map<string, Item>();
  const out: MasteryStep[] = [];
  for (const level of [...paste.levels].sort((a, b) => a.n - b.n)) {
    const v = level.lines.get("Masteries");
    if (!v || v.type !== "items" || !v.items.length) continue;
    const before = new Set(held.keys());
    const added: Item[] = [], repeated: Item[] = [];
    const named = new Set<string>();
    for (const it of v.items) {
      const k = nameKey(it);
      named.add(k);
      if (it.drop) { held.delete(k); continue; }
      if (held.has(k)) { repeated.push(it); continue; }
      held.set(k, it);
      added.push(it);
    }
    const leftOut = [...before].filter((k) => !named.has(k) && held.has(k)).map((k) => held.get(k) as Item);
    out.push({ level, added, repeated, leftOut, held: [...held.values()] });
  }
  return out;
}
/**
 * Rewrites each 0.11 snapshot `Masteries` line as an additive one (D337): the names the build already held go, and a
 * line left with nothing goes. A line that leaves a held name out (W008) stays as written, so its warning stays until
 * the author answers it (D342). Changes the paste in place; returns how many lines it rewrote. Tidy and the checker's
 * `normalise` call it.
 */
export function foldMasteries(paste: Paste): number {
  let folded = 0;
  for (const step of masteryWalk(paste)) {
    if (!step.repeated.length || step.leftOut.length) continue;
    const v = step.level.lines.get("Masteries");
    if (!v || v.type !== "items") continue;
    const kept = v.items.filter((it) => !step.repeated.includes(it));
    if (kept.length) step.level.lines.set("Masteries", { type: "items", items: kept }); else step.level.lines.delete("Masteries");
    folded++;
  }
  return folded;
}
/** What a build has ready at a level (§5.4): its weapon masteries, and its default prepared spells. */
export interface Loadout {
  /** The masteries held at the level: the header's unplaced line, then each level line up to it, additively (D337). */
  masteries: Item[];
  /** The `Prepared` snapshot in force: the last level block up to the level with a `Prepared` line (capped lines
   *  included), else the header's. */
  prepared: Item[];
}
/**
 * The loadout at character level `level` (D343), data-free: what a viewer shows for a level, without walking the
 * blocks itself. A level past the last block reads as the last block's loadout; a flat paste reads as its header.
 */
export function loadoutAt(paste: Paste, level: number): Loadout {
  const listOf = (scope: Scope, group: string) => scopeLines(scope).filter(([k]) => keyGroup(k) === group).flatMap(([, v]) => (v.type === "items" ? v.items : []));
  const masteries = new Map<string, Item>();
  for (const it of listOf(paste.header, "Masteries")) if (!it.drop) masteries.set(nameKey(it), it);
  const steps = masteryWalk(paste).filter((s) => s.level.n <= level);
  const last = steps[steps.length - 1];
  if (last) {
    // The walk's held set starts empty; header names it never dropped stay.
    const dropped = new Set(steps.flatMap((s) => { const v = s.level.lines.get("Masteries"); return v?.type === "items" ? v.items.filter((it) => it.drop).map(nameKey) : []; }));
    for (const k of dropped) masteries.delete(k);
    for (const it of last.held) if (!masteries.has(nameKey(it))) masteries.set(nameKey(it), it);
  }
  const blocks = [...paste.levels].filter((l) => l.n <= level).sort((a, b) => b.n - a.n);
  const withPrepared = blocks.find((l) => listOf(l.lines, "Prepared").length);
  const prepared = listOf(withPrepared?.lines ?? paste.header, "Prepared").filter((it) => !it.drop);
  return { masteries: [...masteries.values()], prepared };
}

export interface TidyOptions {
  /** A pick's option family, for folding a plain `Options` line into its family key (see `foldOptions`). */
  optionFamily?: (ref: Ref) => string | null;
  /**
   * The Species line with a lineage written before the name moved into its brackets (`Wood Elf` → `Elf [Wood]`, D287),
   * or null. The library has no species list, so the caller brings it (the checker's `speciesLineage` with its table).
   */
  species?: (item: Item, rules: string | null) => Item | null;
}
/**
 * The editor's Tidy (D203): makes every safe fix (a header key moved out of a block, duplicate lines joined, `/`
 * between classes, a space after a colon), rewrites 0.11 snapshot `Masteries` lines as additive ones (D337), folds
 * `Options` lines when it knows their family, then writes the canonical form. It never refuses: a line it can't fix stays as written (D202).
 */
export function tidy(text: string, opts: TidyOptions = {}): string {
  let t = text.replace(/\r\n?/g, "\n");
  for (let pass = 0; pass < 20; pass++) {
    const fixes = parse(t).diagnostics.flatMap((d) => (d.fix?.safe && d.code.startsWith("E") ? [d.fix] : []));
    if (!fixes.length) break;
    const r = applyFixes(t, fixes);
    if (!r.made) break;
    t = r.text;
  }
  const p = parse(t);
  foldMasteries(p);
  if (opts.optionFamily) foldOptions(p, opts.optionFamily);
  const sp = p.entities.find((e) => e.key === "Species");
  const rv = p.header.get("Rules");
  const moved = sp?.item && opts.species ? opts.species(sp.item, rv && rv.type === "enum" ? rv.value : null) : null;
  if (sp && moved) sp.item = moved;
  return emit(p);
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

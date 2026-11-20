/**
 * dndpaste checker — data-driven (SPEC §6, D11, D30, D34).
 * Input: a parsed Paste + a slot table (scripts/extract-slots.mjs) + the hand-kept supplement.
 * Output: findings. Never edits the paste; `normalise` returns a new one.
 * Every finding is a warning or an info — extras are accepted (D34).
 */
import type { Paste, Item, Ref, Scope, Value, LevelBlock, Bonus, Detail } from "./dndpaste.js";
// The one runtime import: the reading rule and the key helpers live in the data-free library (the UMD build inlines
// both modules).
import { classSequence, classTotals, isFeatKey, isAbilitySlot, abilityOf, splitMarker, keyGroup, levelCap, familyOf, familyKey, foldOptions, ASI_FEAT, KEYS, shortLineage } from "./dndpaste.js";
import { UA_SOURCES } from "./sources.js";

// ─── Slot table types (loose on purpose: the extract may grow fields) ────────

interface ChooseSpec { fixed: string[]; choose: { count: number; from: string[] | null } | null; any: number }
interface Progression { name: string; progression: number[] }
interface FeatureSlot { level: number; options: string[] }
export interface ClassSlots {
  name: string; source: string; edition: string | null; subclassLevel: number | null; asiLevels: number[]; expertiseLevels: number[];
  features: Record<string, FeatureSlot>; optionalClassFeatures?: Record<string, { level: number; source: string }>; options: Record<string, Progression>; featProgression: Record<string, Progression>;
  hd?: number | null; masteries: number[] | null; hasMastery?: boolean; skills: ChooseSpec | null; multiclassSkills: ChooseSpec | null; equipmentOptions: string[]; equipmentGroups?: Record<string, string[]>[];
  casting: { ability: string; progression: string | null; preparedChange: string | null; cantrips: number[] | null; prepared: number[] | null; known: number[] | null } | null;
}
export interface SubclassSlots {
  name: string; shortName: string; className: string; classSource: string; source: string; edition: string | null;
  features: Record<string, FeatureSlot>; options: Record<string, Progression>; grantedSpells: string[];
  casting: { ability: string; cantrips: number[] | null; prepared: number[] | null; known: number[] | null } | null;
}
export interface SpeciesSlots {
  name: string; source: string; edition: string | null; size: string[] | null; skills: ChooseSpec | null; tools: ChooseSpec | null; languages: ChooseSpec | null;
  ability: unknown; feats: { category?: string[]; count?: number; fixed?: string[] }[]; versions: string[]; spellAbility: string[] | null; cantripChoose: number; grantedSpells: string[];
}
export interface BackgroundSlots {
  name: string; source: string; edition: string | null; ability: { choose: { from: string[]; weights?: number[] } | null } | null;
  skills: ChooseSpec | null; tools: ChooseSpec | null; languages: ChooseSpec | null; feats: string[]; equipmentOptions: string[]; equipmentGroups?: Record<string, string[]>[];
}
export interface FeatSlots { name: string; source: string; edition?: string | null; category: string | null; repeatable: boolean; abilityChoose: string[] | null; versions: string[]; cantripChoose: number; spellChoose: number; grantedSpells: string[]; prereqLevel: number | null }
/** `feats`: feats the option itself grants (5etools featProgression), e.g. Lessons of the First Ones → one Origin feat (D50, D51). */
export interface OptionalFeatureSlots { name: string; source: string; types: string[]; prereqLevel: number | null; feats?: { category: string[]; count: number }[]; grantedSpells?: string[] }
export interface Slots {
  /**
   * `sources`: every book code the full table cites (D205), so a subset table still knows a book it lacks.
   * `sourceDates`: each cited book's release date (`YYYY-MM-DD`, D221), so a bare name resolves to the newest printing.
   * `settingSources`: the setting books and adventures among them, whose printing loses to a core book's (D221).
   */
  meta?: { sources?: string[]; sourceDates?: Record<string, string>; settingSources?: string[] };
  classes: Record<string, ClassSlots>; subclasses: Record<string, SubclassSlots>; species: Record<string, SpeciesSlots>;
  backgrounds: Record<string, BackgroundSlots>; feats: Record<string, FeatSlots>; optionalFeatures: Record<string, OptionalFeatureSlots>;
  families: Record<string, string>; spells: Record<string, { name: string; source: string; level: number; classes?: string[]; subclasses?: string[] }>; items: Record<string, ItemSlots>;
  magicVariants?: Record<string, MagicVariantSlots>;
  /** 5etools feat category codes → names (`FS` → `Fighting Style`), for `Feat (<marker>)` (D110). */
  featCategories?: Record<string, string>;
}
/** `base`/`props`: a base item (items-base) and the type codes and flags magic variants match on (D55). */
export interface ItemSlots { name: string; source: string; rarity: string; edition?: string | null; base?: boolean; props?: Record<string, unknown> }
/** A generic magic variant: its naming affixes and the base items it applies to, as 5etools matchers (D55). */
export interface MagicVariantSlots {
  name: string; source: string; edition?: string | null; prefix?: string; suffix?: string; remove?: string;
  requires?: Record<string, unknown>[]; excludes?: Record<string, unknown>;
}
export interface Supplement {
  expertiseCount?: number;
  spellbook?: Record<string, { first: number; perLevel: number }>;
  lineageTrait?: Record<string, string | null>;
  /** A species whose lineage asks a spellcasting ability the data doesn't model (D35): `Gnome|XPHB` → int, wis, cha. */
  lineageAbility?: Record<string, string[]>;
  speciesFeatures?: Record<string, Record<string, string[]>>;
  optionPicks?: Record<string, number>;
  classFeaturePicks?: Record<string, Record<string, { levels: number[]; key: string; count: number }>>;
}

export type FindingKind = "missing" | "misplaced" | "unresolved" | "redundant" | "unplaced" | "extra";
/** One code per finding kind (D204), for tools that filter or count findings. */
export const FINDING_CODES: Readonly<Record<FindingKind, string>> = {
  missing: "C001", misplaced: "C002", unresolved: "C003", redundant: "C004", unplaced: "C005", extra: "C006",
};
/**
 * One checker finding. `where` is `header`, `Species`, `Background`, `L<n>` or a class name; `at`, on a pick still
 * owed, names the line to add it to: the key and the level block (`null`: the header, for a paste with no level
 * blocks), so an editor can offer the line (D192, D203).
 */
export interface Finding {
  kind: FindingKind; code: string; severity: "warning" | "info"; where: string; key?: string; ref?: string; message: string;
  at?: { key: string; level: number | null };
}

// ─── Resolution ─────────────────────────────────────────────────────────────

const lc = (s: string) => s.toLowerCase();
const looseEq = (a: string, b: string) => { const x = lc(a), y = lc(b); return x === y || x.startsWith(y + " ") || x.endsWith(" " + y) || y.startsWith(x + " ") || y.endsWith(" " + x); };
const refStr = (r: Ref) => (r.source ? `${r.name}|${r.source}` : r.name);
// D40: a generic magic-variant bonus prefix ("+1 Longsword") is not part of the entity name.
const stripPlus = (name: string): string | null => { const m = /^\+\d+\s+(.+)$/.exec(name); return m ? m[1] : null; };

/** True for an Unearthed Arcana code: one of `UA_SOURCES`, or any code with the `UA` or `XUA` prefix (D221). */
const uaCodes = new Set(UA_SOURCES.map((u) => lc(u.code)));
export const isUaSource = (code: string): boolean => uaCodes.has(lc(code)) || /^X?UA[A-Z0-9]/.test(code);

class Index<T extends { name: string; source: string; edition?: string | null; core?: boolean }> {
  private byName = new Map<string, T[]>();
  private all: T[] = [];
  private setting: Set<string>;
  /** `meta`: release dates and setting books (D221), so a bare name picks the newest printing. */
  constructor(table: Record<string, T>, alias?: (t: T) => (string | undefined)[], private meta: Slots["meta"] = {}) {
    this.setting = new Set(meta?.settingSources ?? []);
    for (const t of Object.values(table)) {
      this.all.push(t);
      this.push(lc(t.name), t);
      for (const a of alias?.(t) ?? []) if (a && lc(a) !== lc(t.name)) this.push(lc(a), t);
    }
  }
  private push(k: string, t: T) { const l = this.byName.get(k); if (l) { if (!l.includes(t)) l.push(t); } else this.byName.set(k, [t]); }
  /**
   * Several printings of one name (D8, D221): a published printing before Unearthed Arcana, then the paste's edition,
   * then a setting book's or adventure's printing loses to a core book's of the same edition, then the newest. A table
   * with no release dates falls back to the core books. Still several: ambiguous.
   */
  private narrow(c: T[], ref: Ref, rules: string | null): T[] {
    if (c.length > 1 && !ref.source) { const p = c.filter((t) => !isUaSource(t.source)); if (p.length) c = p; }
    if (c.length > 1 && rules) { const e = c.filter((t) => t.edition === rules); if (e.length) c = e; }
    if (c.length > 1) { const core = new Set(c.filter((t) => t.core).map((t) => t.edition)); c = c.filter((t) => !(this.setting.has(t.source) && core.has(t.edition))); }
    if (c.length > 1) c = dedupeByName(c);
    if (c.length > 1) {
      const date = (t: T) => this.meta?.sourceDates?.[t.source] ?? "";
      const best = c.reduce((m, t) => (date(t) > m ? date(t) : m), "");
      if (best) c = c.filter((t) => date(t) === best);
      else { const k = c.filter((t) => t.core); if (k.length) c = k; }
    }
    return c;
  }
  /** Every printing of one name, as the table holds them. */
  printings(name: string): readonly T[] { return this.byName.get(lc(name)) ?? []; }
  resolve(ref: Ref, rules: string | null, extra?: (t: T) => boolean, alias = true): { hit: T | null; status: "ok" | "none" | "ambiguous" | "alias" } {
    let c = this.byName.get(lc(ref.name)) ?? [];
    if (extra) c = c.filter(extra);
    if (ref.source) c = c.filter((t) => lc(t.source) === lc(ref.source as string));
    if (c.length) { c = this.narrow(c, ref, rules); return { hit: c[0], status: c.length === 1 ? "ok" : "ambiguous" }; }
    // ── D43: name-alias contains fallback — a ref of 4+ chars with no direct match against
    // exactly one entity of the same kind whose name contains it, case-insensitively. ────────
    if (alias && ref.name.length >= 4) {
      let a = this.all.filter((t) => lc(t.name).includes(lc(ref.name)));
      if (extra) a = a.filter(extra);
      if (ref.source) a = a.filter((t) => lc(t.source) === lc(ref.source as string));
      a = this.narrow(a, ref, rules);
      if (a.length === 1) return { hit: a[0], status: "alias" };
    }
    return { hit: null, status: "none" };
  }
}
function dedupeByName<T extends { name: string; source: string }>(c: T[]): T[] {
  const seen = new Set<string>(); const out: T[] = [];
  for (const t of c) { const k = `${lc(t.name)}|${lc(t.source)}`; if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

// ─── Checker ────────────────────────────────────────────────────────────────

function buildIndexes(slots: Slots) {
  const d = slots.meta ?? {};
  return {
    classes: new Index(slots.classes, undefined, d),
    // A subclass also answers to its short name and to "<short name> <class>" (`Diviner Wizard`, D220).
    subclasses: new Index(slots.subclasses, (s) => [s.shortName, `${s.shortName} ${s.className}`], d),
    species: new Index(slots.species, undefined, d),
    backgrounds: new Index(slots.backgrounds, undefined, d),
    feats: new Index(slots.feats, undefined, d),
    options: new Index(slots.optionalFeatures, undefined, d),
    spells: new Index(slots.spells, undefined, d),
    items: new Index(slots.items, undefined, d),
    variants: new Index(slots.magicVariants ?? {}, (v) => [v.name.replace(/ \(\*\)$/, "")], d),
  };
}
type Indexes = ReturnType<typeof buildIndexes>;

/** The Species line's picks (D280, D281): `Elf [Drow; WIS]` → the lineage `Drow` and the ability group `[WIS]`. */
export function speciesPicks(it: Item): { lineage: Detail | null; ability: Detail[] | null } {
  const ability = it.details.find((g) => isAbilitySlot(g)) ?? null;
  const lineage = it.details.find((g) => g !== ability && g.length)?.[0] ?? null;
  return { lineage, ability };
}
/** A species' defining pick (D280, D35): the trait's name and its options, from the data's versions or the supplement. */
function lineageOf(sd: SpeciesSlots, supplement: Supplement): { trait: string | null; options: string[] } {
  const uid = `${sd.name}|${sd.source}`;
  const trait = supplement.lineageTrait?.[uid] !== undefined ? supplement.lineageTrait[uid] : sd.versions.length ? `${sd.name} Lineage` : null;
  const options = sd.versions.length ? sd.versions : trait ? supplement.speciesFeatures?.[uid]?.[trait] ?? [] : [];
  return { trait, options };
}
/**
 * The species entry a Species line means (D282): `Elf [Drow]` is the elf with the Drow lineage when the resolved elf
 * offers it; otherwise `Elf|PHB [Wood]` is the data's 2014 subrace `Elf (Wood)|PHB`. `subrace`: the lineage named the entry.
 */
function speciesRef(index: Indexes["species"], supplement: Supplement, it: Item, rules: string | null): { ref: Ref; subrace: boolean } {
  const { lineage } = speciesPicks(it);
  if (!lineage) return { ref: it.ref, subrace: false };
  const base = index.resolve(it.ref, rules).hit;
  const offers = (t: SpeciesSlots) => lineageOf(t, supplement).options.some((v) => looseEq(v, lineage.ref.name));
  if (base && offers(base)) return { ref: it.ref, subrace: false };
  // A bare name whose newest printing lacks the lineage: the one printing that offers it (`Elf [Lorwyn]` → `Elf|LFL`).
  const other = it.ref.source ? [] : index.printings(it.ref.name).filter(offers);
  if (other.length === 1) return { ref: { name: it.ref.name, source: other[0].source }, subrace: false };
  const sub = { name: `${it.ref.name} (${lineage.ref.name})`, source: it.ref.source };
  return index.resolve(sub, rules).hit ? { ref: sub, subrace: true } : { ref: it.ref, subrace: false };
}
/**
 * A lineage written before the species' name (D287): `Wood Elf` → `Elf [Wood]`, `Black Dragonborn` → `Dragonborn [Black]`,
 * `Hill Dwarf` → `Dwarf [Hill]`. Only when the whole name is no species and the rest is one that offers that lineage (or
 * prints it as a 2014 subrace). Null for anything else. Needs data, so it is the checker's and Tidy's with data, never the parser's.
 */
function lineageFirst(index: Indexes["species"], supplement: Supplement, it: Item, rules: string | null): Item | null {
  if (speciesPicks(it).lineage || index.resolve(it.ref, rules, undefined, false).hit) return null;
  const words = it.ref.name.split(" ");
  for (let i = 1; i < words.length; i++) {
    const ref = { name: words.slice(i).join(" "), source: it.ref.source };
    const lin = words.slice(0, i).join(" ");
    const hit = index.resolve(ref, rules, undefined, false).hit;
    if (!hit) continue;
    const offers = lineageOf(hit, supplement).options.some((v) => looseEq(v, lin)) || index.resolve({ name: `${ref.name} (${lin})`, source: ref.source }, rules, undefined, false).hit;
    if (offers) return { ...it, ref, details: [[{ ref: { name: lin, source: null }, at: null }], ...it.details] };
  }
  return null;
}
/** The Species line with a lineage written first moved into its brackets (D287); null when there is none to move. For Tidy's `species` option. */
export function speciesLineage(item: Item, slots: Slots, supplement: Supplement = {}, rules: string | null = null): Item | null {
  return lineageFirst(buildIndexes(slots).species, supplement, item, rules);
}
/** The paste with its Species line's lineage moved into the brackets (D287), or the paste itself. */
function withLineage(paste: Paste, index: Indexes["species"], supplement: Supplement, rules: string | null): { paste: Paste; from: Item | null; to: Item | null } {
  const e = paste.entities.find((b) => b.key === "Species");
  const to = e?.item ? lineageFirst(index, supplement, e.item, rules) : null;
  if (!e?.item || !to) return { paste, from: null, to: null };
  return { paste: { ...paste, entities: paste.entities.map((b) => (b === e ? { ...b, item: to } : b)) }, from: e.item, to };
}

/** A lineage as the editor writes it (D289); in the data-free library, so the site's editor has it without the checker. */
export { shortLineage } from "./dndpaste.js";

function items(scope: Scope, key: string): Item[] {
  const v = scope.get(key);
  return v && v.type === "items" ? v.items : [];
}
/** True when the key has a line with a value: an empty value is "not chosen yet" and reads as absent (D112). */
function has(scope: Scope, key: string): boolean {
  const v = scope.get(key);
  if (!v || v.type === "empty") return false;
  if (v.type === "items") return v.items.length > 0;
  if (v.type === "scores") return Boolean(v.increase?.length) || v.values.some((x) => x !== null);
  return true;
}
/** Every feat of a scope with its line's slot marker: `Feat` and each `Feat (<marker>)` line (D110). */
function featItems(scope: Scope): { item: Item; marker: string | null }[] {
  return [...scope.keys()].filter(isFeatKey).flatMap((k) => items(scope, k).map((item) => ({ item, marker: splitMarker(k).marker })));
}
/** The scope's score increase (`Scores: +2 CHA`, D108), or null. */
function increaseOf(scope: Scope): Bonus[] | null {
  const v = scope.get("Scores");
  return v && v.type === "scores" && v.increase?.length ? v.increase : null;
}
/** An item's picks after its ability slot, when it has one (D107): `Elven Lineage [INT; High]` → `[High]`. */
function picks(it: Item): Detail[][] {
  return isAbilitySlot(it.details[0]) ? it.details.slice(1) : it.details;
}
/** A level's ASI as a feat line (D109): its full name or the short `ASI`. */
const isAsiFeat = (it: Item): boolean => lc(it.ref.name) === lc(ASI_FEAT) || lc(it.ref.name) === "asi";
/** `+2 CHA` details as bonuses; null when one is not of that shape. */
function bonusesOf(group: readonly Detail[]): Bonus[] | null {
  const out: Bonus[] = [];
  for (const d of group) {
    const m = /^\+(\d+)\s+(STR|DEX|CON|INT|WIS|CHA)$/i.exec(d.ref.name);
    if (!m || d.ref.source) return null;
    out.push({ amount: Number(m[1]), ability: m[2].toUpperCase() as Bonus["ability"] });
  }
  return out;
}

// ─── Feat categories (D110) ─────────────────────────────────────────────────
// 5etools' own names for its feat category codes. The extract reads them from the mirror; a table without them
// falls back to this list. Names only.
const FEAT_CATEGORIES: Record<string, string> = {
  D: "Dragonmark", DG: "Dark Gift", G: "General", O: "Origin", FS: "Fighting Style",
  "FS:P": "Fighting Style Replacement (Paladin)", "FS:R": "Fighting Style Replacement (Ranger)", EB: "Epic Boon",
};
function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return row[b.length];
}
function adds(scope: Scope, key: string): Item[] { return items(scope, key).filter((i) => !i.drop); }
function drops(scope: Scope, key: string): Item[] { return items(scope, key).filter((i) => i.drop); }
function delta(p: number[] | null | undefined, k: number): number {
  if (!p || k < 1 || k > p.length) return 0;
  return p[k - 1] - (k >= 2 ? p[k - 2] : 0);
}

/**
 * The paste as the slot ledger reads it (D180–D185): every option line (`Invocations`, `Options (<marker>)`) as
 * `Options`, every capped spell line (`Spells (3rd)`) as its key. The same Item objects, so identity checks hold.
 */
function slotView(paste: Paste): Paste {
  const fold = (scope: Scope): Scope => {
    const out: Scope = new Map();
    for (const [k, v] of scope) {
      if (v.type !== "items") { out.set(k, v); continue; }
      const g = isFeatKey(k) ? k : keyGroup(k);
      out.set(g, { type: "items", items: [...items(out, g), ...v.items] });
    }
    return out;
  };
  return { ...paste, header: fold(paste.header), entities: paste.entities.map((e) => ({ ...e, lines: fold(e.lines) })), levels: paste.levels.map((l) => ({ ...l, lines: fold(l.lines) })) };
}

export function check(input: Paste, slots: Slots, supplement: Supplement = {}): Finding[] {
  let paste = slotView(input);
  const F: Finding[] = [];
  const add = (kind: FindingKind, severity: "warning" | "info", where: string, message: string, key?: string, ref?: string, at?: Finding["at"]) => F.push({ kind, code: FINDING_CODES[kind], severity, where, key, ref, message, ...(at ? { at } : {}) });
  const rulesV = paste.header.get("Rules");
  const rules = rulesV && rulesV.type === "enum" ? rulesV.value : null;

  const ix = buildIndexes(slots);
  // `Wood Elf` reads as `Elf [Wood]` (D287): the rest of the check sees the bracket form.
  const wl = withLineage(paste, ix.species, supplement, rules);
  paste = wl.paste;
  if (wl.from && wl.to) add("unresolved", "info", "Species", `"${wl.from.ref.name}" reads as ${wl.to.ref.name} [${wl.to.details[0][0].ref.name}]; Tidy writes it that way`, "Species", wl.from.ref.name);
  // ── Source codes (D205): a code the table's entities carry resolves as usual. A homebrew (`HB`), Unearthed Arcana
  // or unknown code is accepted at info, so any element can be homebrew without breaking the build (D194); a book
  // the table lacks (the SRD subset) resolves as usual. ──
  const dataSources = new Set<string>();
  for (const t of [slots.classes, slots.subclasses, slots.species, slots.backgrounds, slots.feats, slots.optionalFeatures, slots.spells, slots.items, slots.magicVariants ?? {}]) for (const e of Object.values(t)) dataSources.add(lc(e.source));
  const bookSources = new Set([...(slots.meta?.sources ?? []).map(lc), ...dataSources]);
  const uaTitle = new Map(UA_SOURCES.map((u) => [lc(u.code), u.title]));
  /** The key a message names, unless the place already says it (`Species`, D192 T21). */
  const lead = (where: string, key: string) => (where === key ? "" : key === "L" ? "class " : `${key}: `);
  /** True when the ref's code is one the data lacks: the ref is accepted with an info and not resolved. */
  const outsideData = (ref: Ref, where: string, key: string): boolean => {
    if (!ref.source || dataSources.has(lc(ref.source))) return false;
    const src = lc(ref.source), r = refStr(ref), at = lead(where, key);
    if (src === "hb") add("unresolved", "info", where, `${at}"${r}" is homebrew — accepted`, key, r);
    else if (uaTitle.has(src)) add("unresolved", "info", where, `${at}"${r}" is from ${uaTitle.get(src)}, not in the loaded data — accepted`, key, r);
    else if (bookSources.has(src)) return false;
    else add("unresolved", "info", where, `${at}"${r}": ${ref.source} is not a known book code — accepted (homebrew can use |HB)`, key, r);
    return true;
  };
  const resolveRef = <T extends { name: string; source: string; edition?: string | null; core?: boolean }>(index: Index<T>, ref: Ref, where: string, key: string, sev: "warning" | "info" = "warning", extra?: (t: T) => boolean): T | null => {
    if (outsideData(ref, where, key)) return null;
    let r = index.resolve(ref, rules, extra);
    // Generic magic variants ("+1 Longsword") are not 5etools entities: strip the bonus and resolve the base item (D40).
    const base = stripPlus(ref.name);
    if (r.status === "none" && base && key === "Gear") r = index.resolve({ name: base, source: ref.source }, rules, extra);
    const at = lead(where, key);
    if (r.status === "none") add("unresolved", sev, where, `${at}"${refStr(ref)}" matches nothing in the loaded data`, key, refStr(ref));
    else if (r.status === "ambiguous") add("unresolved", "info", where, `${at}"${refStr(ref)}" matches several sources; add |SOURCE`, key, refStr(ref));
    else if (r.status === "alias" && r.hit) {
      const full = refStr({ name: r.hit.name, source: r.hit.source });
      const editionNote = rules && r.hit.edition && r.hit.edition !== rules ? ` (${r.hit.edition} edition; paste is ${rules})` : "";
      add("unresolved", "info", where, `${at}"${refStr(ref)}" resolved as ${full}${editionNote}`, key, refStr(ref));
    }
    // A bare name that only Unearthed Arcana prints (D221): playtest material always carries its code.
    if (r.hit && !ref.source && isUaSource(r.hit.source)) add("unresolved", "warning", where, `${at}"${ref.name}" is Unearthed Arcana; write it as ${ref.name}|${r.hit.source}`, key, refStr(ref));
    return r.hit;
  };
  const uidOf = (t: { name: string; source: string }) => `${t.name}|${t.source}`;

  // ── Origin languages (D272): under 2024 rules a character knows Common and two standard languages from its
  // origin, which no species, background or class data grants. They are written in the Background or Species
  // block, the header or the L1 block: Common is always free, and two more fill the origin before any is an extra.
  // A species or background that grants languages of its own (a 2014 book under 2024 rules) fills those first. ──
  const originLangs = new Set<Item>();
  if (rules !== "2014") {
    let left = 2;
    const own = (spec: ChooseSpec | null | undefined) => (spec?.choose?.count ?? 0) + (spec?.any ?? 0);
    const take = (list: Item[], keep = 0) => {
      for (const it of list) {
        if (lc(it.ref.name) === "common") originLangs.add(it);
        else if (keep > 0) keep--;
        else if (left > 0) { left--; originLangs.add(it); }
      }
    };
    const bgE = paste.entities.find((e) => e.key === "Background"), spE = paste.entities.find((e) => e.key === "Species");
    const bgD = bgE?.item ? ix.backgrounds.resolve(bgE.item.ref, rules).hit : null;
    const spD = spE?.item ? ix.species.resolve(speciesRef(ix.species, supplement, spE.item, rules).ref, rules).hit : null;
    if (bgE) take(adds(bgE.lines, "Languages").filter((it) => !bgD?.languages?.fixed.some((f) => lc(f) === lc(it.ref.name))), own(bgD?.languages));
    if (spE) take(adds(spE.lines, "Languages"), own(spD?.languages));
    take(adds(paste.header, "Languages"));
    const l1 = paste.levels.find((lv) => lv.n === 1);
    if (l1) take(adds(l1.lines, "Languages"));
  }
  /** The Languages a scope writes beyond the origin ones (D272). */
  const langAdds = (scope: Scope) => adds(scope, "Languages").filter((it) => !originLangs.has(it));

  // ── Slot markers (D110): a marker names a feat category by name or code; a fighting style's slot also takes a
  // 5etools "Fighting Style Replacement" feat. Open list: an unknown marker is accepted, a near miss gets a hint. ──
  const categories: Record<string, string> = { ...FEAT_CATEGORIES, ...(slots.featCategories ?? {}) };
  for (const f of Object.values(slots.feats)) if (f.category && !categories[f.category]) categories[f.category] = f.category;
  const markerCats = (marker: string): string[] => Object.entries(categories)
    .filter(([code, name]) => lc(code) === lc(marker) || lc(name) === lc(marker) || lc(name).startsWith(lc(marker) + " ")).map(([code]) => code);
  const isFsCat = (c: string | null | undefined): boolean => Boolean(c && c.toUpperCase().startsWith("FS"));
  /** A feat that fills a fighting-style slot: its marker says so, or, unmarked, the data does. */
  const fsFeat = (it: Item, marker: string | null): boolean => (marker ? markerCats(marker).some(isFsCat) : isFsCat(ix.feats.resolve(it.ref, rules).hit?.category));

  // ── Gear: exact name, then a generic magic variant (D55), then the D43 alias and D40 `+N` fallbacks ──
  const baseItems = Object.values(slots.items).filter((i) => i.base);
  const variantList = Object.values(slots.magicVariants ?? {});
  const vName = (v: MagicVariantSlots) => v.name.replace(/ \(\*\)$/, "");
  const fits = (b: ItemSlots, v: MagicVariantSlots): boolean => {
    const props: Record<string, unknown> = { ...(b.props ?? {}), name: b.name, source: b.source };
    const eq = (a: unknown, x: unknown) => (typeof a === "string" && typeof x === "string" ? lc(a) === lc(x) : a === x);
    const has = (k: string, x: unknown) => { const h = props[k]; return Array.isArray(h) ? h.some((y) => eq(y, x)) : eq(h, x); };
    const req = v.requires ?? [];
    if (req.length && !req.some((r) => Object.entries(r).every(([k, x]) => has(k, x)))) return false;
    return !Object.entries(v.excludes ?? {}).some(([k, x]) => (Array.isArray(x) ? x : [x]).some((y) => has(k, y)));
  };
  /** True when the ref is a generic variant, by its own name or as affix + base item — resolved or reported. */
  const variantItem = (ref: Ref, where: string, key: string): boolean => {
    if (ix.variants.resolve(ref, rules, undefined, false).status !== "none") return true;   // "Vicious Weapon", "+2 Armor"
    const name = lc(ref.name);
    const pairs: { v: MagicVariantSlots; b: ItemSlots; ok: boolean }[] = [];
    for (const v of variantList) {
      let stem = name;
      if (v.prefix) { if (!stem.startsWith(lc(v.prefix))) continue; stem = stem.slice(v.prefix.length); }
      if (v.suffix) { if (!stem.endsWith(lc(v.suffix))) continue; stem = stem.slice(0, stem.length - v.suffix.length); }
      const stems = v.remove ? [stem, stem + lc(v.remove)] : [stem];
      for (const b of baseItems) {
        if (!stems.includes(lc(b.name))) continue;
        if (ref.source && lc(ref.source) !== lc(v.source) && lc(ref.source) !== lc(b.source)) continue;
        pairs.push({ v, b, ok: fits(b, v) });
      }
    }
    if (!pairs.length) return false;
    const ok = pairs.filter((p) => p.ok);
    if (ok.some((p) => !rules || !p.v.edition || p.v.edition === rules)) return true;
    const r = refStr(ref);
    if (ok.length) { const p = ok[0]; add("unresolved", "info", where, `${key}: "${r}" resolved as ${vName(p.v)}|${p.v.source} on ${p.b.name}|${p.b.source} (${p.v.edition} edition; paste is ${rules})`, key, r); return true; }
    const p = pairs.find((x) => !rules || x.v.edition === rules) ?? pairs[0];
    add("unresolved", "info", where, `${key}: "${r}": ${vName(p.v)}|${p.v.source} does not apply to ${p.b.name}`, key, r);
    return true;
  };
  const resolveItem = (ref: Ref, where: string, key: "Gear") => {
    if (outsideData(ref, where, key)) return;
    const exact = ix.items.resolve(ref, rules, undefined, false);
    if (exact.status === "ok") return;
    if (exact.status === "ambiguous") { add("unresolved", "info", where, `${key}: "${refStr(ref)}" matches several sources; add |SOURCE`, key, refStr(ref)); return; }
    if (variantItem(ref, where, key)) return;
    resolveRef(ix.items, ref, where, key, "info");
  };

  // ── Classes and timeline ──────────────────────────────────────────────────
  // The class of each level comes from the library's reading rule (§5.4, D49); a header whose class has no levels
  // left is the parser's W003, so it is not repeated here.
  const classEntries = classTotals(paste);
  const classData = new Map<string, ClassSlots | null>();   // lc(name) → data
  for (const e of classEntries) classData.set(lc(e.ref.name), resolveRef(ix.classes, e.ref, "Classes", "Classes"));
  for (const lv of paste.levels) if (!classData.has(lc(lv.class.name))) {
    classData.set(lc(lv.class.name), resolveRef(ix.classes, lv.class, `L${lv.n}`, "L"));
    if (classEntries.length) add("misplaced", "warning", `L${lv.n}`, `class "${lv.class.name}" is not listed in Classes`, "L", lv.class.name);
  }
  checkDanglingClassZero();
  const seq = classSequence(paste);
  const played = seq.played;
  const classAt: string[] = seq.levels.map((r) => (r ? lc(r.name) : ""));   // index n-1 → lc class name
  const classLevelAt = (n: number, cls: string) => classAt.slice(0, n).filter((c) => c === cls).length;

  // ── Hit points (D59): optional and never owed. Level 1 takes the die's maximum, so a level-1 line is misplaced;
  // a roll must fit the level's class die; a level line that repeats the header's method is redundant. ──
  const hpV = paste.header.get("HP");
  const hpMethod = hpV && hpV.type === "hp" ? hpV.method : null;
  for (const lv of paste.levels) {
    const v = lv.lines.get("HP"); if (!v || v.type !== "hp") continue;
    const where = `L${lv.n}`;
    if (lv.n === 1) { add("misplaced", "warning", where, "level 1 takes the hit die's maximum; HP applies from level 2", "HP"); continue; }
    if (v.roll === null) { if (v.method === hpMethod) add("redundant", "info", where, `HP: ${v.method} repeats the header`, "HP"); continue; }
    const cd = classData.get(classAt[lv.n - 1] ?? lc(lv.class.name));
    if (cd?.hd && v.roll > cd.hd) add("misplaced", "warning", where, `HP: ${v.roll} is more than ${cd.name}'s d${cd.hd} can roll`, "HP");
  }

  // ── Owed-slot ledger per class ────────────────────────────────────────────
  type Ledger = Map<string, { owed: number; owedPlayed: number; picked: number; dropped: number; where: string[] }>;
  const perClass = new Map<string, Ledger>();
  const ledger = (cls: string): Ledger => { let l = perClass.get(cls); if (!l) { l = new Map(); perClass.set(cls, l); } return l; };
  const slot = (cls: string, key: string): NonNullable<ReturnType<Ledger["get"]>> => { const l = ledger(cls); let s = l.get(key); if (!s) { s = { owed: 0, owedPlayed: 0, picked: 0, dropped: 0, where: [] }; l.set(key, s); } return s; };
  const featureNames = new Map<string, Map<string, { level: number; options: string[] }>>();  // cls → feature → slot
  const featureLabel = new Map<string, string>();   // lc feature name → as printed
  const expertiseCount = supplement.expertiseCount ?? 2;

  // Subclass per class (placed or unplaced).
  const subclassOf = new Map<string, SubclassSlots | null>();
  const subclassFrom = new Map<string, number>();   // cls → character level the subclass is chosen at (placed only)
  const subclassLines: { item: Item; where: string; cls: string | null; n: number | null }[] = [];
  for (const it of adds(paste.header, "Subclass")) subclassLines.push({ item: it, where: "header", cls: null, n: null });
  for (const lv of paste.levels) for (const it of adds(lv.lines, "Subclass")) subclassLines.push({ item: it, where: `L${lv.n}`, cls: lc(lv.class.name), n: lv.n });
  // A written subclass that resolves to nothing (homebrew, a typo) still counts as picked (D192 T07): the
  // unresolved finding already names it, and "owes a Subclass" would be false.
  const looseSubclasses: Item[] = [];
  const headerSubclassOf = new Map<Item, string>();   // a header Subclass line → the class it resolved to
  /** The character level where the class reaches class level `k`, or null when the timeline never gets there. */
  const levelOfClassLevel = (cls: string, k: number): number | null => { for (let n = 1; n <= classAt.length; n++) if (classAt[n - 1] === cls && classLevelAt(n, cls) === k) return n; return null; };
  for (const s of subclassLines) {
    const cand = s.cls ? [s.cls] : [...classData.keys()];
    const inClass = (t: SubclassSlots) => cand.includes(lc(t.className));
    // A level block of another class (D220): resolve against every class of the build, then report where it goes.
    const other = s.cls && ix.subclasses.resolve(s.item.ref, rules, inClass).status === "none" ? ix.subclasses.resolve(s.item.ref, rules, (t) => classData.has(lc(t.className))).hit : null;
    const hit = other ?? resolveRef(ix.subclasses, s.item.ref, s.where, "Subclass", "warning", inClass);
    if (!hit) {
      if (s.cls) { const sl = slot(s.cls, "Subclass"); sl.picked++; sl.where.push(s.where); } else looseSubclasses.push(s.item);
      continue;
    }
    const cls = lc(hit.className);
    if (s.n === null) headerSubclassOf.set(s.item, cls);
    if (subclassOf.get(cls)) add("extra", "info", s.where, `second subclass "${hit.name}" for ${hit.className} — accepted as an extra`, "Subclass", hit.name);
    subclassOf.set(cls, hit);
    const cd = classData.get(cls);
    // Placement (D220): a level block holds the subclass only where the class gains it; the header holds it unplaced.
    // A wrong block gets the block to move it to, as `at`; a class not there yet takes it in the header, as a plan.
    const k = s.n !== null ? classLevelAt(s.n, cls) : null;
    const misplaced = s.n !== null && Boolean(cd?.subclassLevel) && (Boolean(other) || k !== cd?.subclassLevel);
    const n = misplaced && cd?.subclassLevel ? levelOfClassLevel(cls, cd.subclassLevel) : null;
    if (s.n !== null && !(misplaced && n === null)) { const sl = slot(cls, "Subclass"); sl.picked++; sl.where.push(s.where); }
    if (misplaced && cd?.subclassLevel) {
      const why = other ? `${hit.name} is a ${cd.name} subclass` : `${cd.name} gets its subclass at class level ${cd.subclassLevel}, not ${k}`;
      add("misplaced", "warning", s.where, n !== null ? `${why}; move it to L${n} ${cd.name}` : `${why}; move it to the header until then`, "Subclass", hit.name, { key: "Subclass", level: n });
      if (n !== null) subclassFrom.set(cls, n);
    } else if (s.n !== null) subclassFrom.set(cls, s.n);
    if (s.n === null && classEntries.length > 1 && !s.item.ref.source) add("unplaced", "info", s.where, `"${hit.name}" assigned to ${hit.className}`, "Subclass", hit.name);
  }


  const uptoN = Math.max(played ?? 0, ...paste.levels.map((l) => l.n));
  const owedAt = new Map<string, number[]>();   // cls|key → levels where the slot is owed, ascending
  const owe = (cls: string, key: string, n: number, count: number) => {
    const s = slot(cls, key); s.owed += count; if (played === null || n <= played) s.owedPlayed += count;
    if (count > 0) owedAt.set(`${cls}|${key}`, [...(owedAt.get(`${cls}|${key}`) ?? []), n]);
  };
  for (let n = 1; n <= uptoN; n++) {
    const cls = classAt[n - 1]; if (!cls) continue;
    const cd = classData.get(cls); if (!cd) continue;
    const k = classLevelAt(n, cls);
    const sc = subclassOf.get(cls) ?? null;
    if (k === 1) {
      const sk = n === 1 ? cd.skills : cd.multiclassSkills;
      const cnt = (sk?.choose?.count ?? 0) + (sk?.any ?? 0);
      if (cnt) owe(cls, "Skills", n, cnt);
      if (n === 1 && cd.equipmentOptions.length && rules !== "2014") owe(cls, "Gear", n, 0); // default A is silent
      if ((cd.masteries && cd.masteries[0]) || cd.hasMastery) owe(cls, "Masteries", n, 1);
    }
    if (cd.subclassLevel === k) owe(cls, "Subclass", n, 1);
    if (cd.asiLevels.includes(k)) owe(cls, "ASI/Feat", n, 1);
    if (cd.expertiseLevels.includes(k)) owe(cls, "Expertise", n, expertiseCount);
    for (const [cat, p] of Object.entries(cd.featProgression)) {
      const d = delta(p.progression, k);
      if (!d) continue;
      if (cat === "FS") owe(cls, "Fighting Style", n, d); else owe(cls, "ASI/Feat", n, d);
    }
    for (const [fam, p] of [...Object.entries(cd.options), ...Object.entries(sc?.options ?? {})]) {
      const d = delta(p.progression, k);
      if (d) owe(cls, fam.startsWith("FS") ? "Fighting Style" : `Options:${fam}`, n, d);
    }
    const cast = cd.casting;
    const scast = sc?.casting;
    const cantrips = delta(cast?.cantrips, k) + delta(scast?.cantrips, k);
    if (cantrips) owe(cls, "Cantrips", n, cantrips);
    const sb = supplement.spellbook?.[uidOf(cd)];
    if (sb) owe(cls, "Spells", n, k === 1 ? sb.first : sb.perLevel);
    else if (cast?.preparedChange === "level") owe(cls, "Spells", n, delta(cast.prepared, k));
    else if (cast?.known) owe(cls, "Spells", n, delta(cast.known, k));
    if (scast) owe(cls, "Spells", n, delta(scast.known, k) + (delta(scast.prepared, k) > 0 && !scast.known ? delta(scast.prepared, k) : 0));
    for (const [name, fs] of [...Object.entries(cd.features), ...Object.entries(sc?.features ?? {})]) {
      if (fs.level !== k) continue;
      slot(cls, `Feature:${lc(name)}`).owed += 1;
      featureLabel.set(lc(name), name);
      let m = featureNames.get(cls); if (!m) { m = new Map(); featureNames.set(cls, m); } m.set(lc(name), fs);
    }
    for (const [name, fp] of Object.entries(supplement.classFeaturePicks?.[uidOf(cd)] ?? {})) {
      if (fp.levels.includes(k)) owe(cls, fp.key, n, fp.count);
      void name;
    }
  }

  // ── Granted spells (D193, D201) ───────────────────────────────────────────
  // A spell the build gets without choosing it: the subclass's always-prepared list, the species' spells, a fixed
  // spell of a feat it took. Not written by default; written, it highlights the level it arrives. Never counted
  // as a pick, never misplaced, never "beyond what the rules grant".
  const spName = (() => { const e = paste.entities.find((b) => b.key === "Species"); return e?.item ? ix.species.resolve(speciesRef(ix.species, supplement, e.item, rules).ref, rules).hit : null; })();
  const featGranted = new Set<string>();
  for (const sc of [paste.header, ...paste.entities.map((e) => e.lines), ...paste.levels.map((l) => l.lines)]) for (const { item } of featItems(sc)) {
    if (!item.drop) for (const g of ix.feats.resolve(item.ref, rules).hit?.grantedSpells ?? []) featGranted.add(lc(g));
  }
  for (const sc of [paste.header, ...paste.levels.map((l) => l.lines)]) for (const it of adds(sc, "Options")) {
    for (const g of ix.options.resolve(it.ref, rules).hit?.grantedSpells ?? []) featGranted.add(lc(g));
  }
  const grantedSpell = (name: string, cls: string | null, n: number | null): boolean => {
    const x = lc(name);
    if (featGranted.has(x) || spName?.grantedSpells.some((g) => lc(g) === x)) return true;
    const subs = cls ? [cls] : [...subclassOf.keys()];
    return subs.some((c) => {
      const sc = subclassOf.get(c);
      const from = subclassFrom.get(c);
      return Boolean(sc && (n === null || from === undefined || from <= n) && sc.grantedSpells.some((g) => lc(g) === x));
    });
  };
  const SPELL_KEYS = ["Cantrips", "Spells", "Prepared"];
  // An option on a family key that resolves to nothing (homebrew, Unearthed Arcana) still fills that family's slot.
  const famOfItem = new Map<Item, string>();
  for (const sc of [input.header, ...input.levels.map((l) => l.lines)]) for (const [k, v] of sc) {
    const f = familyOf(k);
    if (f && "codes" in f && v.type === "items") for (const it of v.items) famOfItem.set(it, f.codes[0]);
  }

  // ── Placed picks ──────────────────────────────────────────────────────────
  const countInto = (cls: string, key: string, scope: Scope, where: string, n: number | null = null) => {
    const a = (key === "Languages" ? langAdds(scope) : adds(scope, key)).filter((it) => !SPELL_KEYS.includes(key) || !grantedSpell(it.ref.name, cls, n)).length, d = drops(scope, key).length;
    if (!a && !d) return;
    const s = slot(cls, key); s.picked += a; s.dropped += d; s.where.push(where);
  };
  // A feat an option grants (Lessons of the First Ones → an Origin feat) is not an ASI-slot feat (D50).
  const granted = new Set<Item>();
  // A level's ASI is a feat line (D109), so it counts here like any feat; a fighting-style feat fills its own slot (D110).
  const featOrAsi = (scope: Scope) => featItems(scope).filter(({ item, marker }) => !item.drop && !granted.has(item) && !fsFeat(item, marker)).length;
  const countStyles = (cls: string, scope: Scope, where: string) => {
    const fs = featItems(scope).filter(({ item, marker }) => !granted.has(item) && fsFeat(item, marker));
    if (!fs.length) return;
    const s = slot(cls, "Fighting Style");
    for (const { item } of fs) if (item.drop) s.dropped++; else s.picked++;
    s.where.push(where);
  };
  optionFeats(paste.header, "header");
  for (const lv of paste.levels) optionFeats(lv.lines, `L${lv.n}`);

  for (const lv of paste.levels) {
    const cls = lc(lv.class.name); const where = `L${lv.n}`;
    const cd = classData.get(cls);
    const beyond = played !== null && lv.n > played;
    const fullList = Boolean(cd?.casting && cd.casting.preparedChange === "restLong" && !supplement.spellbook?.[uidOf(cd)]);
    const knownCaster = Boolean(cd?.casting?.known && !supplement.spellbook?.[uidOf(cd)]);
    for (const key of ["Skills", "Tools", "Languages", "Expertise", "Cantrips"]) countInto(cls, key, lv.lines, where, lv.n);
    countStyles(cls, lv.lines, where);
    if (has(lv.lines, "Spells") && fullList) add("redundant", "info", where, `${cd?.name} prepares from its whole list; write the default loadout as Prepared, not Spells`, "Spells");
    else countInto(cls, "Spells", lv.lines, where, lv.n);
    if (has(lv.lines, "Prepared") && knownCaster) add("redundant", "info", where, `${cd?.name} knows a fixed list of spells and does not prepare; drop Prepared`, "Prepared");
    if (has(lv.lines, "Masteries")) { const s = slot(cls, "Masteries"); s.picked = Math.max(s.picked, 1); s.where.push(where); }
    if (featOrAsi(lv.lines)) { const s = slot(cls, "ASI/Feat"); s.picked += featOrAsi(lv.lines); s.where.push(where); }
    for (const it of items(lv.lines, "Options")) {
      const ocf = Object.entries(cd?.optionalClassFeatures ?? {}).find(([n]) => lc(n) === lc(it.ref.name));
      if (ocf) { add("redundant", "info", where, `"${ocf[0]}" is an optional class feature (${ocf[1].source}); write it as Feature, not Options`, "Options", ocf[0]); continue; }
      const of = resolveRef(ix.options, it.ref, where, "Options");
      const fam = of ? of.types.join("/") : famOfItem.get(it) ?? "?";
      const s = slot(cls, fam.startsWith("FS") ? "Fighting Style" : `Options:${fam}`); if (it.drop) s.dropped++; else s.picked++; s.where.push(where);
      if (of?.prereqLevel && classLevelAt(lv.n, cls) < of.prereqLevel && !beyond) add("misplaced", "warning", where, `"${of.name}" needs class level ${of.prereqLevel}`, "Options", of.name);
      const pickCount = supplement.optionPicks?.[uidOf(of ?? { name: it.ref.name, source: "" })] ?? 0;
      if (of && pickCount && !it.drop && (picks(it)[0]?.length ?? 0) < pickCount) add("missing", "info", where, `"${of.name}" asks for ${pickCount} pick(s) in brackets`, "Options", of.name);
    }
    for (const it of adds(lv.lines, "Feature")) {
      const ocf = Object.entries(cd?.optionalClassFeatures ?? {}).find(([n]) => lc(n) === lc(it.ref.name));
      if (ocf) { if (ocf[1].level > classLevelAt(lv.n, cls) && !beyond) add("misplaced", "warning", where, `"${ocf[0]}" is available from class level ${ocf[1].level}`, "Feature", ocf[0]); continue; }
      const fs = featureNames.get(cls)?.get(lc(it.ref.name));
      const any = cd ? Object.entries(cd.features).find(([n]) => lc(n) === lc(it.ref.name)) : undefined;
      // A bare feature the data knows no pick for is a highlight: the build names a feature it gets at this level (D201).
      if (!fs && !any) { if (it.details.length) add("extra", "info", where, `Feature "${it.ref.name}" is not a pick the data knows for ${cd?.name ?? cls} — accepted`, "Feature", it.ref.name); continue; }
      const s = slot(cls, `Feature:${lc(it.ref.name)}`);
      s.picked++; s.where.push(where);
      if (!fs && any) add("misplaced", "warning", where, `"${it.ref.name}" is chosen at class level ${any[1].level}`, "Feature", it.ref.name);
      const p0 = picks(it)[0];
      if (fs && fs.options.length && p0?.length && !p0.some((d) => fs.options.some((o) => lc(o) === lc(d.ref.name)))) add("unresolved", "info", where, `"${it.ref.name}" pick "${p0[0].ref.name}" is not one of: ${fs.options.join(", ")}`, "Feature", it.ref.name);
    }
    for (const { item, marker } of featItems(lv.lines)) if (!item.drop) checkFeat(item, marker, where, "L", lv.n, beyond);
    for (const it of adds(lv.lines, "Spells")) checkSpell(it, where, "Spells", cls, lv.n);
    for (const it of adds(lv.lines, "Cantrips")) checkSpell(it, where, "Cantrips", cls, lv.n);
    for (const it of adds(lv.lines, "Prepared")) checkSpell(it, where, "Prepared", cls, lv.n);
    if (has(lv.lines, "Prepared") && cd?.casting?.preparedChange === "level" && !supplement.spellbook?.[uidOf(cd)]) add("redundant", "info", where, `${cd.name} picks its prepared spells on level-up; write them as Spells`, "Prepared");
    // Gear (D111): placement decides. In the first level block it is the class's starting pick, where an option
    // letter may stand; anywhere else it is gear gained in play, never owed, and a letter is out of place.
    for (const it of adds(lv.lines, "Gear")) {
      if (!/^[A-Z]$/.test(it.ref.name)) { resolveItem(it.ref, where, "Gear"); continue; }
      if (lv.n !== 1) { add("misplaced", "info", where, `Gear: option letter ${it.ref.name} goes in the background or the first level block`, "Gear", it.ref.name); continue; }
      if (cd && !cd.equipmentOptions.includes(it.ref.name.toUpperCase())) add("unresolved", "info", where, `${cd.name} has no starting-equipment option ${it.ref.name}`, "Gear", it.ref.name);
      if (rules === "2014") add("unresolved", "info", where, `starting-equipment letters exist only under 2024 rules`, "Gear", it.ref.name);
    }
  }

  // ── Unplaced header picks: distribute to classes that still owe (D28) ─────
  const classNames = [...classData.keys()];
  const distribute = (key: string, ledgerKey: (it: Item) => string, list: Item[]) => {
    for (const it of list) {
      const lk = ledgerKey(it);
      const owing = classNames.filter((c) => { const s = ledger(c).get(lk); return s && s.owed > s.picked; });
      const target = owing[0] ?? classNames.find((c) => ledger(c).has(lk)) ?? classNames[0];
      if (!target) { add("extra", "info", "header", `${key} "${it.ref.name}" with no class to own it — accepted`, key, it.ref.name); continue; }
      if (owing.length > 1) add("unplaced", "info", "header", `${key} "${it.ref.name}" could belong to ${owing.map((c) => classData.get(c)?.name ?? c).join(" or ")}; assigned to ${classData.get(target)?.name ?? target}`, key, it.ref.name);
      const s = slot(target, lk); s.picked++; s.where.push("header");
    }
  };
  // `Prepared` is a loadout, not a pick (D193): it fills no slot, so a header Prepared line is never "beyond" anything.
  for (const key of ["Skills", "Tools", "Languages", "Expertise", "Cantrips", "Spells"]) distribute(key, () => key, (key === "Languages" ? langAdds(paste.header) : adds(paste.header, key)).filter((it) => !SPELL_KEYS.includes(key) || !grantedSpell(it.ref.name, null, null)));
  const headerFeats = featItems(paste.header).filter(({ item }) => !item.drop && !granted.has(item));
  distribute("Feat", () => "Fighting Style", headerFeats.filter(({ item, marker }) => fsFeat(item, marker)).map(({ item }) => item));
  if (has(paste.header, "Masteries")) distribute("Masteries", () => "Masteries", [{ ref: { name: "Masteries", source: null }, drop: false, details: [], qty: null }]);
  distribute("Feat", () => "ASI/Feat", headerFeats.filter(({ item, marker }) => !fsFeat(item, marker)).map(({ item }) => item));
  distribute("Options", (it) => { const of = resolveRef(ix.options, it.ref, "header", "Options"); return `Options:${of ? of.types.join("/") : famOfItem.get(it) ?? "?"}`; }, adds(paste.header, "Options"));
  for (const it of adds(paste.header, "Feature")) {
    const owner = classNames.find((c) => Object.keys(classData.get(c)?.features ?? {}).some((n) => lc(n) === lc(it.ref.name)));
    if (owner) { const s = slot(owner, `Feature:${lc(it.ref.name)}`); s.picked++; s.where.push("header"); continue; }
    // Bare: a highlight (D201). With picks: a species, subclass or homebrew feature the data doesn't model.
    if (it.details.length) add("unplaced", "info", "header", `Feature "${it.ref.name}" has no class that asks for it; a species, subclass or homebrew pick — accepted`, "Feature", it.ref.name);
  }
  for (const { item, marker } of headerFeats) checkFeat(item, marker, "header", "H", null, false);
  for (const it of adds(paste.header, "Spells")) checkSpell(it, "header", "Spells", null);
  for (const it of adds(paste.header, "Cantrips")) checkSpell(it, "header", "Cantrips", null);
  for (const it of adds(paste.header, "Gear")) {
    if (/^[A-Z]$/.test(it.ref.name)) add("misplaced", "info", "header", `Gear: option letter ${it.ref.name} goes in the background or the first level block`, "Gear", it.ref.name);
    else resolveItem(it.ref, "header", "Gear");
  }
  for (let i = 0; i < looseSubclasses.length; i++) {
    const target = classNames.find((c) => { const s = ledger(c).get("Subclass"); return s && s.owed > s.picked; });
    if (target) { const sl = slot(target, "Subclass"); sl.picked++; sl.where.push("header"); }
  }
  for (const s of subclassLines) if (s.n === null) { const cls = headerSubclassOf.get(s.item); const sl = cls ? slot(cls, "Subclass") : null; if (sl && sl.picked < sl.owed) { sl.picked++; sl.where.push("header"); } }   // a header subclass ahead of its level is a plan, not an extra (D220)

  // ── Ledger → findings ─────────────────────────────────────────────────────
  // A pick still owed names the line to add (D192 T07): "Cleric: 2 of 4 Cantrips written; add 2 at L1 Cleric".
  const lineKey = (key: string): string => {
    if (key.startsWith("Options:")) return familyKey(key.slice(8)) ?? "Options";
    if (key.startsWith("Feature:")) return "Feature";
    return key === "ASI/Feat" ? "Feat" : key === "Fighting Style" ? "Feat (Fighting Style)" : key;
  };
  for (const [cls, l] of perClass) {
    const cname = classData.get(cls)?.name ?? cls;
    for (const [key, s] of l) {
      if (key === "Options:?") continue;   // an option that resolves to nothing: its unresolved finding says so
      const label = key.startsWith("Options:") ? `${slots.families[key.slice(8)] ?? key.slice(8)}` : key.startsWith("Feature:") ? `Feature "${featureLabel.get(key.slice(8)) ?? key.slice(8)}"` : key === "ASI/Feat" ? "Feat" : key;
      const allowed = s.owed + s.dropped;
      if (s.picked < s.owedPlayed) {
        const lk = lineKey(key);
        const levels = (owedAt.get(`${cls}|${key}`) ?? []).filter((n) => played === null || n <= played);
        const block = (n: number) => paste.levels.find((lv) => lv.n === n);
        const n = paste.levels.length ? levels.find((x) => !block(x) || ![...(block(x)?.lines.keys() ?? [])].some((k) => k === lk || (!isFeatKey(k) && keyGroup(k) === keyGroup(lk)))) ?? levels[0] : undefined;
        const short = s.owedPlayed - s.picked;
        const where = n !== undefined ? `add ${short} at L${n} ${cname}` : `add ${short} to the ${lk} line`;
        add("missing", "warning", cname, `${cname}: ${s.picked} of ${s.owedPlayed} ${label} written; ${where}`, key, undefined, { key: lk, level: n ?? null });
      }
      if (s.picked > allowed) add("extra", "info", s.where.join(", ") || cname, allowed ? `${cname}: ${s.picked} of ${allowed} ${label} written, ${s.picked - allowed} more than the rules grant — accepted` : `${cname}: ${s.picked} ${label} written where the rules grant none — accepted`, key);
    }
  }

  // ── Species block ─────────────────────────────────────────────────────────
  const sp = paste.entities.find((e) => e.key === "Species");
  if (sp?.item) {
    const where = "Species";
    const sr = speciesRef(ix.species, supplement, sp.item, rules);
    const { lineage, ability } = speciesPicks(sp.item);
    const sd = resolveRef(ix.species, sr.ref, where, "Species");
    if (sd) {
      const owe = (key: string, n: number, sev: "warning" | "info" = "warning", what = key, got = adds(sp.lines, key).length, extra = true) => {
        if (got < n) add("missing", sev, where, `${sd.name} asks for ${n - got} more ${what} pick(s)`, key);
        if (got > n && extra) add("extra", "info", where, `${sd.name}: ${got - n} ${what} pick(s) beyond what the species grants — accepted`, key);
      };
      owe("Skills", (sd.skills?.choose?.count ?? 0) + (sd.skills?.any ?? 0));
      owe("Tools", (sd.tools?.choose?.count ?? 0) + (sd.tools?.any ?? 0));
      owe("Languages", (sd.languages?.choose?.count ?? 0) + (sd.languages?.any ?? 0), "warning", "Languages", langAdds(sp.lines).length);
      owe("Feat", sd.feats.reduce((a, f) => a + (f.count ?? 0), 0), "warning", "Feat", featItems(sp.lines).filter(({ item }) => !item.drop).length);
      // The casting-ability pick is the first detail of the line that asks it (D107), or a 0.7 `Ability` line that stayed.
      const spellAbility = sd.spellAbility ?? supplement.lineageAbility?.[uidOf(sd)] ?? null;
      if (ability && !spellAbility) add("extra", "info", where, `${sd.name} asks for no ability; "${ability[0].ref.name}" — accepted`, "Species", ability[0].ref.name);
      else if (ability && spellAbility && !spellAbility.some((a) => lc(a) === lc(abilityOf(ability) ?? ""))) add("unresolved", "info", where, `${sd.name}'s spellcasting ability is one of ${spellAbility.map((a) => a.toUpperCase()).join(", ")}`, "Species", ability[0].ref.name);
      const abilityPicked = Boolean(ability) || has(sp.lines, "Ability") || [...adds(sp.lines, "Feature"), ...featItems(sp.lines).map(({ item }) => item)].some((x) => isAbilitySlot(x.details[0]));
      if (spellAbility && !abilityPicked) add("missing", "info", where, `${sd.name} asks for a spellcasting ability: ${sd.name} [${lineage ? `${lineage.ref.name}; ` : ""}${spellAbility.map((a) => a.toUpperCase()).join(" | ")}]`, "Species");
      if (sd.cantripChoose) owe("Cantrips", sd.cantripChoose, "info", "Cantrips", adds(sp.lines, "Cantrips").filter((it) => !sd.grantedSpells.some((g) => lc(g) === lc(it.ref.name))).length);
      if (sd.ability && rules !== "2024") owe("Scores", 1, "info", "ability-bonus", increaseOf(sp.lines) ? 1 : 0, false);
      const { trait, options } = sr.subrace ? { trait: null, options: [] } : lineageOf(sd, supplement);
      const shortOpts = options.map((o) => shortLineage(o, sd.name, trait));
      const feats = adds(sp.lines, "Feature");
      const extraFeatures = new Set(Object.keys(supplement.speciesFeatures?.[uidOf(sd)] ?? {}).map(lc));
      // The defining pick is the Species line's first group (D280); a Feature line naming the trait still counts
      // (a paste the parser could not move, D283).
      if (trait) {
        const f = lineage ? null : feats.find((x) => lc(x.ref.name) === lc(trait)) ?? feats.find((x) => picks(x)[0]?.length && options.some((v) => looseEq(v, picks(x)[0][0].ref.name)));
        if (f) extraFeatures.add(lc(f.ref.name));
        const pick = lineage ?? (f ? picks(f)[0]?.[0] : undefined);
        if (!lineage && !f) add("missing", "warning", where, `${sd.name} asks for a lineage (${trait}): ${sd.name} [${shortOpts.join(" | ")}]`, "Species", trait);
        else if (pick && options.length && !options.some((v) => looseEq(v, pick.ref.name))) add("unresolved", "info", where, `"${trait}" pick "${pick.ref.name}" is not one of: ${shortOpts.join(", ")}`, "Species", trait);
        extraFeatures.add(lc(trait));
      } else if (lineage && !sr.subrace) add("extra", "info", where, `${sd.name} has no lineage the data knows; "${lineage.ref.name}" — accepted`, "Species", lineage.ref.name);
      // Size: Medium is the silent default (D39); only an invalid explicit pick is reported.
      const sizeLine = feats.find((x) => lc(x.ref.name) === "size");
      if (sizeLine && sd.size && sizeLine.details[0]?.length && !sd.size.some((s) => lc(s) === lc(sizeLine.details[0][0].ref.name[0]))) add("unresolved", "info", where, `${sd.name} size must be one of ${sd.size.join("/")}`, "Feature", "Size");
      extraFeatures.add("size");
      for (const f of feats) if (!extraFeatures.has(lc(f.ref.name)) && f.details.length) add("extra", "info", where, `Feature "${f.ref.name}" is not a pick the data knows for ${sd.name} — accepted`, "Feature", f.ref.name);
      for (const { item, marker } of featItems(sp.lines)) if (!item.drop) checkFeat(item, marker, where, "S", null, false);
    }
  }

  // ── Background block ──────────────────────────────────────────────────────
  const bg = paste.entities.find((e) => e.key === "Background");
  if (bg?.item) {
    const where = "Background";
    const custom = lc(bg.item.ref.name) === "custom";
    const bd = custom ? null : resolveRef(ix.backgrounds, bg.item.ref, where, "Background", "info");
    if (bd) {
      const inc = increaseOf(bg.lines);
      if (bd.ability?.choose) {
        if (!inc) add("missing", "warning", where, `${bd.name} asks for ability bonuses (Scores: +2/+1 or +1/+1/+1 from ${bd.ability.choose.from.map((a) => a.toUpperCase()).join(", ")})`, "Scores");
        else {
          const total = inc.reduce((a, b) => a + b.amount, 0);
          const from = bd.ability.choose.from.map((a) => a.toUpperCase());
          if (total !== 3 || inc.some((b) => !from.includes(b.ability))) add("unresolved", "info", where, `${bd.name} bonuses should total +3 from ${from.join(", ")}`, "Scores");
        }
      }
      for (const key of ["Skills", "Tools", "Languages"] as const) {
        const spec = key === "Skills" ? bd.skills : key === "Tools" ? bd.tools : bd.languages;
        const owed = (spec?.choose?.count ?? 0) + (spec?.any ?? 0);
        for (const it of adds(bg.lines, key)) if (spec?.fixed.some((f) => lc(f) === lc(it.ref.name))) add("redundant", "info", where, `${key} "${it.ref.name}" is granted by ${bd.name}, not chosen`, key, it.ref.name);
        const got = (key === "Languages" ? langAdds(bg.lines) : adds(bg.lines, key)).filter((it) => !spec?.fixed.some((f) => lc(f) === lc(it.ref.name))).length;
        if (got < owed) add("missing", "warning", where, `${bd.name} asks for ${owed - got} more ${key} pick(s)`, key);
        if (got > owed) add("extra", "info", where, `${bd.name}: ${got - owed} ${key} pick(s) beyond what it grants — accepted`, key);
      }
      for (const { item: it, marker } of featItems(bg.lines)) {
        if (it.drop) continue;
        checkMarker(marker, where);
        if (bd.feats.some((f) => lc(f).split(";")[0].trim() === lc(it.ref.name))) add("redundant", "info", where, `Feat "${it.ref.name}" is granted by ${bd.name}, not chosen`, "Feat", it.ref.name);
        else add("extra", "info", where, `Feat "${it.ref.name}" is not granted by ${bd.name} — accepted`, "Feat", it.ref.name);
      }
      const letter = adds(bg.lines, "Gear").find((i) => /^[A-Z]$/.test(i.ref.name));
      if (letter && !bd.equipmentOptions.includes(letter.ref.name.toUpperCase())) add("unresolved", "info", where, `${bd.name} has no starting-equipment option ${letter.ref.name}`, "Gear", letter.ref.name);
    } else {
      // custom or homebrew: fully specified by the block; only resolve feats.
      for (const { item, marker } of featItems(bg.lines)) if (!item.drop) checkFeat(item, marker, where, "B", null, false);
      if (custom && rules !== "2014" && !increaseOf(bg.lines)) add("missing", "warning", where, "a custom background states its ability bonuses (Scores: +2 WIS, +1 DEX)", "Scores");
    }
  }

  // T2.2 — 2014 starting-equipment picks (see dedicated section near end of file).
  checkStartingEquipment2014(paste, ix, rules, add);

  // T2.4 — ability-score arithmetic findings (cap-20, illegal ability picks).
  F.push(...finalScoresWith(paste, ix, supplement).findings);

  checkLines();
  checkGearRepeats();

  const seen = new Set<string>();
  return F.filter((f) => { const k = `${f.kind}|${f.where}|${f.message}`; if (seen.has(k)) return false; seen.add(k); return true; });

  // ── D185: each line against its own family and level cap ──────────────────
  // An option on a family line (`Invocations`, `Options (<marker>)`) must be of that family; an open marker is
  // matched to the table's family names and codes like a D110 feat category. A spell on a capped line must be at or
  // below the cap. The cap is never judged against the class (D162 is the editor's hint).
  function checkLines() {
    const families: Record<string, string> = { ...slots.families };
    const scopes: [string, Scope][] = [["header", input.header], ...input.entities.map((e) => [e.key, e.lines] as [string, Scope]), ...input.levels.map((l) => [`L${l.n}`, l.lines] as [string, Scope])];
    const famCodes = (marker: string): string[] => {
      const m = lc(marker);
      return Object.entries(families).filter(([code, name]) => lc(code) === m || lc(name) === m || lc(name) === m + "s" || lc(name).startsWith(m + " ") || lc(name).endsWith(" " + m) || lc(name).endsWith(" " + m + "s")).map(([code]) => code);
    };
    for (const [where, scope] of scopes) for (const [key, v] of scope) {
      if (v.type !== "items") continue;
      const fam = familyOf(key);
      if (fam) {
        let codes: readonly string[];
        if ("codes" in fam) codes = fam.codes;
        else {
          codes = famCodes(fam.marker);
          if (!codes.length) {
            const near = [...new Set([...Object.values(families), ...KEYS.filter((k) => k.family).map((k) => k.key)])].map((n) => ({ n, d: levenshtein(lc(fam.marker), lc(n)) })).sort((a, b) => a.d - b.d)[0];
            if (near && near.d <= Math.max(2, Math.floor(fam.marker.length / 4))) add("unresolved", "warning", where, `${key}: no option family has that name; did you mean "${near.n}"?`, key, fam.marker);
            else add("unresolved", "info", where, `${key}: not an option family in the loaded data — accepted`, key, fam.marker);
            continue;
          }
        }
        const fit = (t: string) => codes.some((c) => t === c || t.startsWith(c + ":") || c.split("/").includes(t));
        for (const it of v.items) {
          if (it.drop) continue;
          const of = ix.options.resolve(it.ref, rules).hit;
          if (of && of.types.length && !of.types.some(fit)) add("misplaced", "warning", where, `"${of.name}" is ${of.types.map((t) => families[t] ?? t).join("/")}, not ${key}`, key, of.name);
        }
      }
      const cap = levelCap(key);
      if (cap !== null) for (const it of v.items) {
        if (it.drop) continue;
        const sd = ix.spells.resolve(it.ref, rules).hit;
        if (sd && sd.level > cap) add("misplaced", "warning", where, `"${sd.name}" is level ${sd.level}, above this line's cap (${key})`, key, sd.name);
      }
    }
  }

  // ── D195 T31: a name written twice on one Gear line is one item with a quantity ──────────────────────
  function checkGearRepeats() {
    const scopes: [string, Scope][] = [["header", input.header], ...input.entities.map((e) => [e.key, e.lines] as [string, Scope]), ...input.levels.map((l) => [`L${l.n}`, l.lines] as [string, Scope])];
    for (const [where, scope] of scopes) {
      const count = new Map<string, { name: string; lines: number; qty: number }>();
      for (const it of adds(scope, "Gear")) {
        if (it.details.length || /^[A-Z]$/.test(it.ref.name)) continue;
        const k = lc(refStr(it.ref));
        const c = count.get(k) ?? { name: refStr(it.ref), lines: 0, qty: 0 };
        c.lines++; c.qty += it.qty ?? 1; count.set(k, c);
      }
      for (const c of count.values()) if (c.lines > 1) add("redundant", "info", where, `Gear: "${c.name}" is written ${c.lines} times; write ${c.name} x${c.qty}`, "Gear", c.name);
    }
  }

  // ── D42: dangling `Class 0` ────────────────────────────────────────────────
  // A `Classes` entry with level 0 and no level block for that class declares nothing yet — it
  // stays legal (planned multiclass slot) and normalise must not touch it; just flag it at info.
  function checkDanglingClassZero() {
    for (const e of classEntries) {
      if (e.levels !== 0) continue;
      if (paste.levels.some((lv) => lc(lv.class.name) === lc(e.ref.name))) continue;
      add("unplaced", "info", "header", `${e.ref.name} 0 declares nothing`, "Classes", e.ref.name);
    }
  }

  // ── F5 (D50): feats an optional feature grants ────────────────────────────
  // The option names its feat pick in its details, as any option pick (§5.3): `Lessons of the First Ones [Alert]`.
  // Details cannot nest (E011), so a feat with picks of its own also gets a standalone Feat line in the same scope,
  // which carries those picks: `Feat: Magic Initiate [CHA; Wizard; …]`. A bare option claims the first Feat line in
  // its scope whose category it grants. Claimed Feat lines are neither ASI-slot feats nor extras.
  function optionFeats(scope: Scope, where: string) {
    const feats = featItems(scope).map(({ item }) => item).filter((it) => !it.drop);
    const free = () => feats.filter((f) => !granted.has(f));
    const featOf = (name: string) => ix.feats.resolve({ name, source: null }, rules).hit;
    for (const it of adds(scope, "Options")) {
      const of = ix.options.resolve(it.ref, rules).hit;
      for (const g of of?.feats ?? []) {
        const cats = g.category.map((c) => c.toUpperCase());
        const kind = cats.map((c) => (c === "O" ? "Origin" : c === "G" ? "General" : c)).join("/");
        const a = /^[AEIOU]/i.test(kind) ? "an" : "a";
        const named = (picks(it)[0] ?? []).slice(0, g.count);
        for (const d of named) {
          const carrier = free().find((f) => lc(f.ref.name) === lc(d.ref.name));
          if (carrier) granted.add(carrier);
          const fd = carrier ? ix.feats.resolve(carrier.ref, rules).hit : featOf(d.ref.name);
          if (!fd) { if (!carrier) add("unresolved", "info", where, `"${of?.name}" pick "${d.ref.name}" matches no feat in the loaded data`, "Options", of?.name); continue; }
          if (fd.category && !cats.includes(fd.category.toUpperCase())) add("misplaced", "warning", where, `"${of?.name}" grants ${a} ${kind} feat; "${fd.name}" is not one`, "Options", of?.name);
          const asksPicks = Boolean(fd.abilityChoose?.length || fd.versions.length || fd.cantripChoose || fd.spellChoose);
          if (asksPicks && !carrier) add("missing", "info", where, `"${fd.name}" has picks of its own: write them on a Feat line in the same block`, "Feat", fd.name);
        }
        for (let i = named.length; i < g.count; i++) {
          const carrier = free().find((f) => { const fd = ix.feats.resolve(f.ref, rules).hit; return Boolean(fd?.category && cats.includes(fd.category.toUpperCase())); });
          if (carrier) granted.add(carrier);
          else add("missing", "info", where, `"${of?.name}" grants ${a} ${kind} feat: name it in brackets, or on a Feat line in the same block`, "Options", of?.name);
        }
      }
    }
  }

  // ── shared checks ─────────────────────────────────────────────────────────
  /** A slot marker's categories (D110); an unknown one is reported, with the nearest category name on a near miss. */
  function checkMarker(marker: string | null, where: string): string[] | null {
    if (marker === null) return null;
    const cats = markerCats(marker);
    if (cats.length) return cats;
    const near = [...new Set(Object.values(categories))].map((n) => ({ n, d: levenshtein(lc(marker), lc(n)) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= Math.max(2, Math.floor(marker.length / 4))) add("unresolved", "warning", where, `Feat (${marker}): no feat category has that name; did you mean "${near.n}"?`, `Feat (${marker})`, marker);
    else add("unresolved", "info", where, `Feat (${marker}): not a feat category in the loaded data — accepted`, `Feat (${marker})`, marker);
    return [];
  }
  /** A level's ASI as a feat (D109): `[+2 CHA]` or `[+1 INT, +1 CON]`, read as the 2014 class ASI too. */
  function checkAsiFeat(it: Item, where: string) {
    const g = it.details[0];
    if (!g?.length) { add("missing", "info", where, `${ASI_FEAT} asks for its increases in brackets: [+2 CHA] or [+1 INT, +1 CON]`, "Feat", ASI_FEAT); return; }
    const b = bonusesOf(g);
    if (!b || it.details.length > 1 || b.length > 2 || b.reduce((a, x) => a + x.amount, 0) !== 2) add("unresolved", "info", where, `${ASI_FEAT} takes +2 to one ability or +1 to two: [+2 CHA] or [+1 INT, +1 CON]`, "Feat", ASI_FEAT);
  }
  function checkFeat(it: Item, marker: string | null, where: string, scope: "H" | "S" | "B" | "L", n: number | null, beyond: boolean) {
    const cats = checkMarker(marker, where);
    if (isAsiFeat(it)) { checkAsiFeat(it, where); return; }
    // A 2014 fighting style is an optional feature, not a feat: a fighting-style slot takes either.
    if (cats?.some(isFsCat) && ix.feats.resolve(it.ref, rules).status === "none" && ix.options.resolve(it.ref, rules, (o) => o.types.some((t) => t.startsWith("FS"))).hit) return;
    const fd = resolveRef(ix.feats, it.ref, where, "Feat");
    if (!fd) return;
    if (cats?.length && fd.category && !cats.includes(fd.category)) add("misplaced", "warning", where, `"${fd.name}" is a feat of category ${categories[fd.category] ?? fd.category}; this line's slot is ${marker}`, "Feat", fd.name);
    const slot0 = it.details[0] ?? [];
    const ab = abilityOf(slot0) ?? slot0[0]?.ref.name ?? "";
    if (fd.abilityChoose && !slot0.length) add("missing", "info", where, `"${fd.name}" asks for an ability pick in its first bracket slot`, "Feat", fd.name);
    if (fd.abilityChoose && slot0.length && !fd.abilityChoose.some((a) => lc(a) === lc(ab))) add("unresolved", "info", where, `"${fd.name}" ability must be one of ${fd.abilityChoose.map((a) => a.toUpperCase()).join(", ")}`, "Feat", fd.name);
    // `[+1 CHA]` reads as `[CHA]` on a 2024 half feat (D206); an origin or fighting-style feat's slot raises no score.
    else if (fd.abilityChoose && /^\+1\s/.test(slot0[0]?.ref.name ?? "") && (fd.edition !== "2024" || !halfFeat(fd))) add("unresolved", "info", where, `"${fd.name}": write [${ab}]; [+1 ${ab}] is for 2024 half feats`, "Feat", fd.name);
    // The ability slot exists only when the feat asks one (D107); a 0.7 paste may still lead with an empty slot.
    const lead = fd.abilityChoose ? 1 : it.details.length > 1 && !it.details[0].length ? 1 : 0;
    if (fd.versions.length && !(it.details[lead]?.length)) add("missing", "info", where, `"${fd.name}" asks for a version in brackets${lead ? ", after its ability" : ""}: ${fd.versions.join(", ")}`, "Feat", fd.name);
    // An Origin feat at an ASI level is legal: the 2024 Ability Score Improvement feature grants "another feat of your
    // choice for which you qualify", and Origin feats have no prerequisite (D54). The reverse stays a warning.
    if (fd.category === "G" && (scope === "S" || scope === "B")) add("misplaced", "warning", where, `"${fd.name}" is a General feat; a species or background grants an Origin feat`, "Feat", fd.name);
    if (fd.prereqLevel && n !== null && n < fd.prereqLevel && !beyond) add("misplaced", "warning", where, `"${fd.name}" needs character level ${fd.prereqLevel}`, "Feat", fd.name);
  }
  /** A 2024 feat whose ability slot raises that score: not an origin or fighting-style feat (D206). */
  function halfFeat(fd: FeatSlots): boolean {
    return Boolean(fd.abilityChoose) && fd.category !== "O" && !isFsCat(fd.category);
  }
  function checkSpell(it: Item, where: string, key: string, cls: string | null, n: number | null = null) {
    const sd = resolveRef(ix.spells, it.ref, where, key);
    if (grantedSpell(it.ref.name, cls, n)) return;   // a highlight (D201)
    const from = cls ? subclassFrom.get(cls) : undefined;
    if (n !== null && from !== undefined && n < from) return;
    const sc = cls ? subclassOf.get(cls) : null;
    if (cls && sd) checkSpellList(sd, it.ref.name, cls, sc ?? null, where, key);
  }

  // ─── T2.1: spell-list legality ──────────────────────────────────────────────
  // A resolved Cantrips/Spells/Prepared pick must be on its level block's class list, on the
  // chosen subclass's granted/expanded list, or granted by a feat picked anywhere in the build
  // (Magic Initiate and friends). Header-scope spell lines are unplaced (no class to check
  // against) and never reach here — checkSpell only forwards a non-null cls.
  function spellGrantedByFeat(name: string): boolean {
    const n = lc(name);
    const scan = (scope: Scope) => adds(scope, "Feat").some((f) => {
      const fd = ix.feats.resolve(f.ref, rules).hit;
      return fd ? fd.grantedSpells.some((g) => lc(g) === n) : false;
    });
    if (scan(paste.header)) return true;
    for (const e of paste.entities) if (scan(e.lines)) return true;
    return paste.levels.some((lv) => scan(lv.lines));
  }
  function checkSpellList(sd: { name: string; classes?: string[]; subclasses?: string[] }, name: string, cls: string, sc: SubclassSlots | null, where: string, key: string) {
    const className = classData.get(cls)?.name ?? cls;
    if (!sd.classes?.length) return; // older or partial tables carry no list: never guess
    if ((sd.classes ?? []).some((c) => lc(c) === lc(className))) return;
    if (sc && (sd.subclasses ?? []).some((s) => { const [sub, of] = s.split("|"); return lc(of ?? "") === lc(className) && (lc(sub) === lc(sc.name) || lc(sub) === lc(sc.shortName)); })) return;
    if (spellGrantedByFeat(name)) return;
    add("misplaced", "warning", where, `"${name}" is not on ${className}'s spell list`, key, name);
  }
}

// ─── normalise: data-aware fold, returns a new Paste ────────────────────────

export function normalise(paste: Paste, slots: Slots, supplement: Supplement = {}): Paste {
  const findings = check(paste, slots, supplement);
  const out: Paste = {
    identifier: paste.identifier,
    header: new Map(paste.header),
    entities: paste.entities.map((e) => ({ ...e, lines: new Map(e.lines) })),
    levels: paste.levels.map((l) => ({ ...l, lines: new Map(l.lines) })),
    diagnostics: [...paste.diagnostics],
  };
  // A repeated Gear name becomes one item with a quantity (D195 T31); the generic fold below would drop both.
  for (const scope of [out.header, ...out.entities.map((e) => e.lines), ...out.levels.map((l) => l.lines)]) {
    const v = scope.get("Gear");
    if (!v || v.type !== "items") continue;
    const merged: Item[] = [];
    for (const it of v.items) {
      const same = !it.drop && !it.details.length ? merged.find((m) => !m.drop && !m.details.length && lc(refStr(m.ref)) === lc(refStr(it.ref))) : undefined;
      if (same) same.qty = (same.qty ?? 1) + (it.qty ?? 1); else merged.push({ ...it });
    }
    if (merged.length !== v.items.length) scope.set("Gear", { type: "items", items: merged });
  }
  // A plain Options line whose picks are all of one family goes on that family's key (D195 T33).
  const ix = buildIndexes(slots);
  const rv = paste.header.get("Rules");
  const rules = rv && rv.type === "enum" ? rv.value : null;
  foldOptions(out, (ref) => ix.options.resolve(ref, rules).hit?.types[0] ?? null);
  out.entities = withLineage(out, ix.species, supplement, rules).paste.entities;
  const redundant = findings.filter((f) => f.kind === "redundant" && f.key !== "Gear");
  const scopeFor = (where: string): Scope | null => {
    if (where === "header") return out.header;
    if (where === "Species" || where === "Background") return out.entities.find((e) => e.key === where)?.lines ?? null;
    const m = /^L(\d+)$/.exec(where);
    return m ? out.levels.find((l) => l.n === Number(m[1]))?.lines ?? null : null;
  };
  for (const f of redundant) {
    const scope = scopeFor(f.where); if (!scope || !f.key) continue;
    // A finding names its key group (D180, D184): `Options` covers the family lines, `Spells` its capped lines.
    const keys = [...scope.keys()].filter((k) => k === f.key || (!isFeatKey(k) && keyGroup(k) === f.key));
    if ((f.key === "Prepared" || f.key === "HP") && !f.ref) { for (const k of keys) scope.delete(k); continue; }
    for (const k of keys) {
      const v = scope.get(k);
      if (!v || v.type !== "items" || !f.ref) continue;
      const kept = v.items.filter((i) => lc(i.ref.name) !== lc(f.ref as string));
      if (kept.length) scope.set(k, { type: "items", items: kept } as Value); else scope.delete(k);
    }
  }
  return out;
}

// ─── T2.2: 2014 starting-equipment picks (self-contained; one call site in check()) ──
// 2024 lets a paste name a lettered `Gear: A`/`B`/`C` option (handled above, alongside the
// letter-validity check). 2014 classes and backgrounds instead offer "(a) X or (b) Y" choices —
// the paste names the chosen item(s) directly (SPEC §5.1 `Gear`). `equipmentGroups`
// (scripts/extract-slots.mjs) holds each such choice as { letter → item-name-ref[] }; a group is
// satisfied when any item on the Gear line names one of its options. Items the rules don't
// owe are never flagged (D33/D34), so unmatched Gear lines are left alone — only an unmet
// group produces a finding, at the same severity the 2024 letter check uses (info).
function chosenEquipmentNames(scope: Scope): Set<string> {
  const out = new Set<string>();
  for (const it of adds(scope, "Gear")) {
    out.add(lc(stripPlus(it.ref.name) ?? it.ref.name));
  }
  return out;
}
function checkStartingEquipment2014(
  paste: Paste,
  ix: Pick<Indexes, "classes" | "backgrounds">,
  rules: string | null,
  add: (kind: FindingKind, severity: "warning" | "info", where: string, message: string, key?: string, ref?: string) => void,
): void {
  if (rules !== "2014") return;
  const reportGroups = (where: string, scope: Scope, ownerName: string, groups: Record<string, string[]>[]) => {
    const have = chosenEquipmentNames(scope);
    groups.forEach((group, i) => {
      const met = Object.values(group).some((names) => names.some((n) => have.has(lc(n.split("|")[0]))));
      if (met) return;
      const options = Object.entries(group).filter(([, names]) => names.length).map(([letter, names]) => `(${letter}) ${names.map((n) => n.split("|")[0]).join(" and ")}`);
      add("missing", "info", where, `${ownerName} starting equipment: no item chosen for pick ${i + 1}${options.length ? ` — ${options.join(" or ")}` : ""}`, "Gear");
    });
  };
  const l1 = paste.levels.find((lv) => lv.n === 1);
  if (l1) {
    const cd = ix.classes.resolve(l1.class, rules).hit;
    if (cd?.equipmentGroups?.length) reportGroups("L1", l1.lines, cd.name, cd.equipmentGroups);
  }
  const bg = paste.entities.find((e) => e.key === "Background");
  if (bg?.item && lc(bg.item.ref.name) !== "custom") {
    const bd = ix.backgrounds.resolve(bg.item.ref, rules).hit;
    if (bd?.equipmentGroups?.length) reportGroups("Background", bg.lines, bd.name, bd.equipmentGroups);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// T2.4 — ability-score arithmetic (finalScores)
// Pure: Scores → species fixed increments + species/background increases
// (SPEC §5.1 Scores, D108; D36 "only played levels count") + every level increase and ASI feat (D109) +
// feat ability picks (half-feats, Feat's abilityChoose §5.3). Never edits the
// paste. A pick already reported "missing" elsewhere is not re-flagged here.
// ═══════════════════════════════════════════════════════════════════════════

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
const ABILITY_KEYS: readonly AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
interface AbilityGrant { fixed?: Record<string, number>; choose?: { from: string[]; count?: number; amount?: number; weights?: number[] } | null }

/**
 * Final scores after every increase the paste records. An ability the `Scores` line leaves out (the named partial
 * form, D46) is `null`: unknown, never assumed 10, and its increases are not cap-checked.
 */
export function finalScores(paste: Paste, slots: Slots, supplement: Supplement = {}): { scores: Record<AbilityKey, number | null> | null; findings: Finding[] } {
  return finalScoresWith(paste, buildIndexes(slots), supplement);
}
function finalScoresWith(paste: Paste, ix: Pick<Indexes, "species" | "feats">, supplement: Supplement): { scores: Record<AbilityKey, number | null> | null; findings: Finding[] } {
  const F: Finding[] = [];
  const add = (kind: FindingKind, severity: "warning" | "info", where: string, message: string, key?: string, ref?: string) => F.push({ kind, code: FINDING_CODES[kind], severity, where, key, ref, message });

  const scoresV = paste.header.get("Scores");
  if (!scoresV || scoresV.type !== "scores") return { scores: null, findings: [] };
  const v = scoresV.values;
  const scores: Record<AbilityKey, number | null> = { str: v[0], dex: v[1], con: v[2], int: v[3], wis: v[4], cha: v[5] };

  const rulesV = paste.header.get("Rules");
  const rules = rulesV && rulesV.type === "enum" ? rulesV.value : null;
  void supplement; // reserved: no supplement data feeds ability arithmetic today

  // "As played now" (D36): the sum of the class totals (runs fold to their last value, D49); null when a class has
  // no level count, which means no level blocks exist at all.
  const played = classSequence(paste).played;
  const isPlayed = (n: number) => played === null || n <= played;

  // ASIs and half-feats stop at 20; an Epic Boon (category EB) raises a score to 30. A bump that
  // overshoots its cap is warned and capped, never lowering a score a boon already took past 20.
  const bump = (ability: string, amount: number, where: string, cap = 20, findingKey = "Scores") => {
    const key = ability.toLowerCase() as AbilityKey;
    if (!ABILITY_KEYS.includes(key)) return;
    const cur = scores[key];
    if (cur === null) return; // unknown base: the final stays unknown
    const next = cur + amount;
    if (next > cap) add("misplaced", "warning", where, `${key.toUpperCase()} would rise to ${next}, past the ${cap} cap (+${amount})`, findingKey, key.toUpperCase());
    scores[key] = Math.max(cur, Math.min(cap, next));
  };
  const applyIncrease = (bonuses: Bonus[] | null, where: string) => {
    for (const b of bonuses ?? []) bump(b.ability, b.amount, where);
  };
  const applyFeatPicks = (scope: Scope, where: string) => {
    for (const { item: it } of featItems(scope)) {
      if (it.drop) continue;
      // A level's ASI as a feat (D109): its bracket holds the increases themselves.
      if (isAsiFeat(it)) { for (const b of bonusesOf(it.details[0] ?? []) ?? []) bump(b.ability, b.amount, where, 20, "Feat"); continue; }
      const r = ix.feats.resolve(it.ref, rules);
      // Origin feats (Magic Initiate, …) reuse the same bracket slot for a casting-ability pick, not a
      // score bonus (SPEC §5.3): only a non-Origin feat's ability pick raises the score.
      if ((r.status !== "ok" && r.status !== "alias") || !r.hit?.abilityChoose || r.hit.category === "O") continue;
      const pick = it.details[0]?.[0];
      if (!pick) continue; // absent-when-owed is already reported as "missing" by check()
      const ability = abilityOf([pick]) ?? pick.ref.name;   // `[+1 CHA]` is `[CHA]` on a 2024 half feat (D206)
      if (!r.hit.abilityChoose.some((a) => a.toLowerCase() === ability.toLowerCase())) { add("unresolved", "warning", where, `"${r.hit.name}" ability pick "${ability}" is not one of: ${r.hit.abilityChoose.map((a) => a.toUpperCase()).join(", ")}`, "Feat", r.hit.name); continue; }
      bump(ability, 1, where, r.hit.category === "EB" ? 30 : 20, "Feat");
    }
  };

  // Species: fixed increments (automatic — never written, rule 0.1) + its own increase line (a 2014 choice among options).
  const sp = paste.entities.find((e) => e.key === "Species");
  if (sp) {
    const hit = sp.item ? ix.species.resolve(speciesRef(ix.species, supplement, sp.item, rules).ref, rules).hit as ({ ability?: AbilityGrant | null } & { name: string }) | null : null;
    if (hit?.ability?.fixed) for (const [ability, amount] of Object.entries(hit.ability.fixed)) bump(ability, amount, "Species");
    applyIncrease(increaseOf(sp.lines), "Species");
    applyFeatPicks(sp.lines, "Species");
  }

  // Background: the 2024 pick among the background's three abilities (+2/+1 or +1/+1/+1) — read the written line.
  const bg = paste.entities.find((e) => e.key === "Background");
  if (bg) {
    applyIncrease(increaseOf(bg.lines), "Background");
    applyFeatPicks(bg.lines, "Background");
  }

  // Every increase and feat ability pick at a level, played levels only (D36); then the unplaced ones in the header.
  for (const lv of paste.levels) {
    if (!isPlayed(lv.n)) continue;
    const where = `L${lv.n}`;
    applyIncrease(increaseOf(lv.lines), where);
    applyFeatPicks(lv.lines, where);
  }
  applyIncrease(increaseOf(paste.header), "header");
  applyFeatPicks(paste.header, "header");

  return { scores, findings: F };
}

export type { Paste, LevelBlock };

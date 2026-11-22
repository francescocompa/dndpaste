/**
 * The slot extractor as a pure function (D66 step 2, D246): game data in, the checker's slot table out. The table
 * holds names, sources, counts, levels and option lists only; no rules text is ever copied (CLAUDE.md content
 * boundary). `scripts/extract-slots.mjs` runs it on a local data folder; the site runs it in the visitor's browser on
 * the data they add themselves, and keeps only its output.
 *
 * Input: one object of top-level arrays per kind (`class`, `subclass`, `classFeature`, `subclassFeature`, `race`,
 * `subrace`, `background`, `feat`, `optionalfeature`, `spell`, `item`, `baseitem`, `magicvariant`, and the book lists
 * `book`, `adventure`), as `mergeData` builds it from several files. Every field is optional except an entry's `name`
 * and `source`; an entry without them is skipped.
 */
// The data is untyped JSON: one loose alias keeps the walk readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

/** The top-level arrays the extractor reads, merged across files. `spellSources` is a spell → class map, when given. */
export interface DataSet {
  [kind: string]: unknown;
  spellSources?: Record<string, Record<string, unknown>>;
}

export interface ExtractOptions {
  /** Publication dates by book code (YYYY-MM-DD), used where the data's own book lists give none. */
  sourceDates?: Readonly<Record<string, string>>;
  /** Book groups by code (`core`, `setting`, `adventure`, …), used where the data's own book lists give none. */
  sourceGroups?: Readonly<Record<string, string | null>>;
  /** Feat category codes → names (`O` → `Origin`). */
  featCategories?: Readonly<Record<string, string>>;
  /** The table's date stamp, YYYY-MM-DD (default: today). */
  generated?: string;
}

/** The arrays `mergeData` keeps: every kind the extractor reads. */
export const DATA_KEYS: readonly string[] = ["class", "subclass", "classFeature", "subclassFeature", "race", "subrace", "background", "feat",
  "optionalfeature", "spell", "item", "baseitem", "magicvariant", "book", "adventure"];

/** The identity of an entry within its kind, for merging files. */
function entryKey(kind: string, e: J): string {
  switch (kind) {
    case "classFeature": return [e.name, e.className, e.classSource, e.level, e.source].join("|");
    case "subclassFeature": return [e.name, e.className, e.classSource, e.subclassShortName, e.subclassSource, e.level, e.source].join("|");
    case "subclass": return [e.name, e.className, e.classSource, e.source].join("|");
    case "subrace": return [e.name, e.raceName, e.raceSource, e.source].join("|");
    case "magicvariant": return [e.name, e.source ?? e.inherits?.source].join("|");
    default: return [e.name, e.source].join("|");
  }
}

/** A spell → class map: an object of sources, each an object of spells, each naming its `class`, `classVariant` or `subclass`. */
function isSpellSources(o: J): boolean {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const books = Object.values(o).slice(0, 5);
  const map = (v: J) => v && typeof v === "object" && !Array.isArray(v);
  return books.length > 0 && books.every((b: J) => map(b) && Object.values(b).slice(0, 20).every(map) &&
    Object.values(b).slice(0, 20).some((s: J) => map(s.class) || map(s.classVariant) || map(s.subclass)));
}

/**
 * Several parsed files → one data set: the arrays of the kinds above, concatenated. An entry seen twice (the same
 * name and source, in the same kind: a second file about the same entries) is one entry with the fields of both, the
 * first file's value where both have one. A file shaped as a spell → class map is merged into `spellSources`.
 * Everything else in a file is ignored.
 */
export function mergeData(files: readonly unknown[]): DataSet {
  const out: DataSet = {};
  const seen = new Map<string, Map<string, number>>();
  for (const f of files) {
    if (!f || typeof f !== "object" || Array.isArray(f)) continue;
    // A spell → class map, as a file or as a data set's own part.
    const lookup = isSpellSources(f) ? f : (f as DataSet).spellSources;
    if (lookup && typeof lookup === "object") {
      const dst = (out.spellSources ??= {});
      for (const [src, spells] of Object.entries(lookup as Record<string, Record<string, unknown>>)) dst[src] = { ...(dst[src] ?? {}), ...spells };
      if (lookup === f) continue;
    }
    for (const kind of DATA_KEYS) {
      const list = (f as Record<string, unknown>)[kind];
      if (!Array.isArray(list)) continue;
      const arr = ((out[kind] as J[] | undefined) ?? (out[kind] = [])) as J[];
      const idx = seen.get(kind) ?? new Map<string, number>();
      seen.set(kind, idx);
      for (const e of list) {
        // A book list entry needs its code; every other entry its name.
        if (!e || typeof e !== "object" || typeof (kind === "book" || kind === "adventure" ? e.source : e.name) !== "string") continue;
        const k = entryKey(kind, e);
        const at = idx.get(k);
        if (at === undefined) { idx.set(k, arr.length); arr.push(e); }
        else arr[at] = { ...e, ...arr[at] };
      }
    }
  }
  return out;
}

/** Option family codes → names. */
export const FAMILIES: Readonly<Record<string, string>> = { EI: "Eldritch Invocations", MM: "Metamagic", "MV:B": "Maneuvers", "MV:C2-UA": "Maneuvers (UA)",
  AI: "Artificer Infusions", AS: "Arcane Shots", RN: "Runes", ED: "Elemental Disciplines", PB: "Pact Boons", "FS:F": "Fighting Styles (Fighter)",
  "FS:R": "Fighting Styles (Ranger)", "FS:P": "Fighting Styles (Paladin)", "FS:B": "Fighting Styles (Bard)", OTH: "Other", "FS:F/FS:P/FS:R": "Fighting Styles" };

/** The 2024 rules' publication date: a book from it on is 2024. */
const XPHB_DATE = "2024-09-17";
const TABLES = ["classes", "subclasses", "species", "backgrounds", "feats", "optionalFeatures", "spells", "items", "magicVariants"] as const;

const uid = (e: J, extra: unknown[] = []) => [e.name, ...extra, e.source].join("|");
const isSrd = (e: J) => Boolean(e.srd || e.srd52 || e.basicRules || e.basicRules2024);
const named = (e: J) => e && typeof e === "object" && typeof e.name === "string" && typeof e.source === "string";
const list = (d: DataSet, k: string): J[] => (Array.isArray(d[k]) ? (d[k] as J[]).filter(named) : []);

// ── helpers over the data's choice encodings ────────────────────────────────────
function chooseSpec(entries: J): J {
  // skillProficiencies / toolProficiencies / languageProficiencies entries → { fixed:[], choose:{count,from}|null, any:n }
  const out: J = { fixed: [], choose: null, any: 0 };
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const [k, v] of Object.entries(entry ?? {}) as [string, J][]) {
      if (k === "choose") out.choose = { count: v.count ?? 1, from: v.from ?? null };
      else if (k === "any" || k === "anyStandard" || k === "anyArtisansTool" || k === "anyMusicalInstrument" || k === "anyGamingSet") out.any += Number(v) || 1;
      else if (v === true) out.fixed.push(k);
    }
  }
  return out.fixed.length || out.choose || out.any ? out : null;
}
function abilitySpec(entries: J): J {
  const out: J = { fixed: {}, choose: null };
  for (const entry of Array.isArray(entries) ? entries : []) {
    for (const [k, v] of Object.entries(entry ?? {}) as [string, J][]) {
      if (k === "choose") out.choose = v.weighted ? { from: v.weighted.from, weights: v.weighted.weights } : { from: v.from, count: v.count ?? 1, amount: v.amount ?? 1 };
      else if (typeof v === "number") out.fixed[k] = v;
    }
  }
  return Object.keys(out.fixed).length || out.choose ? out : null;
}
/** A feat's fixed score increases (a half feat with no pick, D340): `{ str: 1 }`; numbers only, written only when present. */
function fixedAbilities(ab: J): { abilityFixed?: Record<string, number> } {
  const out = Object.fromEntries(Object.entries(ab?.fixed ?? {}).filter(([k]) => ["str", "dex", "con", "int", "wis", "cha"].includes(k)));
  return Object.keys(out).length ? { abilityFixed: out as Record<string, number> } : {};
}
function walk(node: J, fn: (n: J) => void): void {
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn));
  else if (node && typeof node === "object") { fn(node); Object.values(node).forEach((v) => walk(v, fn)); }
}
/** A name written with an inline reference tag keeps only the name. */
function stripTags(s: unknown): string { return String(s).replace(/\{@\w+ ([^}|]*)(\|[^}]*)?\}/g, "$1"); }
const OPTFEATURE = /\{@(?:optfeature) ([^}|]+)/;
function optionNames(entries: J): string[] {
  // Returns [] when the options are optional features: those slots are owed via optionalfeatureProgression, not as a Feature.
  const names: string[] = []; let optfeat = false;
  walk(entries, (n) => {
    if (n.type === "options" && Array.isArray(n.entries)) {
      for (const o of n.entries) {
        if (typeof o === "string") { const m = OPTFEATURE.exec(o); if (m) { optfeat = true; names.push(m[1]); } }
        else if (o?.type === "refOptionalfeature") { optfeat = true; names.push(String(o.optionalfeature).split("|")[0]); }
        else if (o?.type === "refClassFeature") names.push(String(o.classFeature).split("|")[0]);
        else if (o?.type === "refSubclassFeature") names.push(String(o.subclassFeature).split("|")[0]);
        else if (o?.name) names.push(stripTags(o.name));
      }
    }
  });
  return optfeat ? [] : names;
}
function additionalSpellsSpec(groups: J): J {
  // Groups are alternatives (one per lineage / feat version): counts are the MAX over groups, not the sum.
  const out: J = { fixed: [], choose: 0, cantripChoose: 0, ability: null, groups: [] };
  for (const g of Array.isArray(groups) ? groups : []) {
    if (g.name) out.groups.push(g.name);
    if (g.ability?.choose) out.ability = g.ability.choose;
    let choose = 0, cantrip = 0;
    const visit = (node: J): void => {
      if (Array.isArray(node)) {
        for (const s of node) {
          if (typeof s === "string") out.fixed.push(s.split("|")[0].replace(/#c$/, ""));
          else if (s && typeof s === "object" && s.choose) { if (/level=0/.test(String(s.choose))) cantrip += s.count ?? 1; else choose += s.count ?? 1; }
          else visit(s);
        }
        return;
      }
      if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) { if (k === "ability" || k === "name" || k === "expanded") continue; visit(v); }
    };
    visit(g);
    out.choose = Math.max(out.choose, choose); out.cantripChoose = Math.max(out.cantripChoose, cantrip);
  }
  out.fixed = [...new Set(out.fixed)];
  return out.fixed.length || out.choose || out.cantripChoose || out.ability ? out : null;
}
function progressionMap(p: J): number[] {
  // [n per level ×20] or {level:n} → cumulative array of 20
  const arr = new Array(20).fill(0);
  if (Array.isArray(p)) return p.slice(0, 20);
  let cur = 0;
  for (let l = 1; l <= 20; l++) { if (p?.[l] !== undefined) cur = p[l]; arr[l - 1] = cur; }
  return arr;
}
const prereqLevel = (e: J): number | null => (Array.isArray(e.prerequisite) ? e.prerequisite : []).map((p: J) => p?.level?.level ?? p?.level).find((x: J) => typeof x === "number") ?? null;

// ── 2014 starting-equipment choice groups ─────────────────────────────────────
// A list of groups; a group keyed "_" is granted outright (not a choice) and is skipped. A group keyed by single
// letters (a/b/c…) is a choice: each option is a list of entries, either a bare "name|SRC" string or
// `{item:"name|SRC", quantity}`. Generic entries (`{equipmentType}`, `{special}`) carry no entity name.
function resolveItemName(nameSrc: string, itemsByKey: Map<string, J>): string {
  const [name, src] = String(nameSrc).split("|");
  const key = `${name.toLowerCase()}|${(src ?? "").toLowerCase()}`;
  const hit = itemsByKey.get(key) ?? [...itemsByKey.values()].find((it) => it.name.toLowerCase() === name.toLowerCase());
  if (hit) return `${hit.name}|${hit.source}`;
  const titled = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return src ? `${titled}|${src.toUpperCase()}` : titled;
}
function equipmentChoiceGroups(groups: J, itemsByKey: Map<string, J>): Record<string, string[]>[] {
  const out: Record<string, string[]>[] = [];
  for (const g of Array.isArray(groups) ? groups : []) {
    const options: Record<string, string[]> = {};
    let any = false;
    let generic = false; // an option that is not a nameable entity ("any simple weapon") makes the group unjudgeable by name
    for (const [letter, entries] of Object.entries(g ?? {}) as [string, J][]) {
      if (!/^[a-z]$/.test(letter)) continue; // "_" is a fixed grant, not a choice
      const names: string[] = [];
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (typeof entry === "string") { names.push(resolveItemName(entry, itemsByKey)); any = true; }
        else if (entry && typeof entry === "object" && typeof entry.item === "string") { names.push(resolveItemName(entry.item, itemsByKey)); any = true; }
        else if (entry && typeof entry === "object" && (entry.special || entry.equipmentType)) generic = true;
      }
      options[letter] = names;
    }
    if (any && !generic) out.push(options);
  }
  return out;
}
// ── 2024 starting-equipment sets (D365) ──────────────────────────────────────
// What each option letter holds, names and numbers only: an item's name and how many, a kind of item for a generic
// entry (`Musical Instrument`), a short special name (`Spellbook`), and the coin, in copper. Written only when a letter
// has something, so an editor can show "A: Chain Mail, Greatsword, …, 4 GP" beside the letter.
const EQUIPMENT_TYPES: Record<string, string> = {
  instrumentMusical: "Musical Instrument", toolArtisan: "Artisan's Tools", setGaming: "Gaming Set",
  weaponSimple: "Simple Weapon", weaponSimpleMelee: "Simple Melee Weapon", weaponSimpleRanged: "Simple Ranged Weapon",
  weaponMartial: "Martial Weapon", weaponMartialMelee: "Martial Melee Weapon", weaponMartialRanged: "Martial Ranged Weapon",
  focusSpellcastingHoly: "Holy Symbol", focusSpellcastingDruidic: "Druidic Focus", focusSpellcastingArcane: "Arcane Focus",
};
/** One option letter's contents: `[name, count]` per entry, and its coin in copper. */
export interface EquipmentSet { items: [string, number][]; cp: number }
function equipmentSets(groups: J, itemsByKey: Map<string, J>): { equipmentSets?: Record<string, EquipmentSet> } {
  const out: Record<string, EquipmentSet> = {};
  for (const g of Array.isArray(groups) ? groups : []) {
    for (const [letter, entries] of Object.entries(g ?? {}) as [string, J][]) {
      if (!/^[A-Z]$/.test(letter) || !Array.isArray(entries)) continue;
      const set: EquipmentSet = { items: [], cp: 0 };
      for (const e of entries) {
        const qty = typeof e?.quantity === "number" && e.quantity > 0 ? e.quantity : 1;
        if (typeof e === "string" || typeof e?.item === "string") set.items.push([resolveItemName(typeof e === "string" ? e : e.item, itemsByKey).split("|")[0], qty]);
        else if (typeof e?.value === "number") set.cp += e.value;
        else if (typeof e?.equipmentType === "string" && EQUIPMENT_TYPES[e.equipmentType]) set.items.push([EQUIPMENT_TYPES[e.equipmentType], qty]);
        else if (Array.isArray(e?.equipmentTypes)) {
          const kinds = e.equipmentTypes.map((t: string) => EQUIPMENT_TYPES[t]).filter(Boolean);
          if (kinds.length) set.items.push([kinds.join(" or "), qty]);
        } else if (typeof e?.special === "string" && e.special.length <= 24) set.items.push([e.special, qty]);
      }
      if (set.items.length || set.cp) out[letter] = set;
    }
  }
  return Object.keys(out).length ? { equipmentSets: out } : {};
}
const letterKeys = (groups: J): string[] => (Array.isArray(groups) ? groups : []).flatMap((o: J) => Object.keys(o ?? {}).filter((k) => /^[A-Z]$/.test(k)));

/** The slot table: the checker's data (src/check.ts `Slots`), names and numbers only. */
export type SlotTable = Record<string, J>;

/** Game data → the slot table. Pure: no I/O, no clock unless `generated` is left out. */
export function extractSlots(data: DataSet, opts: ExtractOptions = {}): SlotTable {
  // Edition: the entity's own field when present, else inferred from its source's publication date (the data's book
  // lists, else `opts.sourceDates`). Homebrew and unknown sources stay null.
  const sourceEdition: Record<string, string> = {}, sourceGroup: Record<string, string | null> = {}, sourceDate: Record<string, string> = {};
  for (const [code, date] of Object.entries(opts.sourceDates ?? {})) if (date) { sourceEdition[code] = date >= XPHB_DATE ? "2024" : "2014"; sourceDate[code] = date; }
  for (const [code, group] of Object.entries(opts.sourceGroups ?? {})) sourceGroup[code] = group;
  for (const key of ["book", "adventure"]) {
    for (const b of Array.isArray(data[key]) ? (data[key] as J[]) : []) {
      if (b?.source && b.published) { sourceEdition[b.source] = b.published >= XPHB_DATE ? "2024" : "2014"; sourceDate[b.source] = b.published; }
      if (b?.source) sourceGroup[b.source] = b.group ?? (key === "adventure" ? "adventure" : null);
    }
  }
  const core = (e: J) => sourceGroup[e.source] === "core";
  const edition = (e: J) => (e.edition === "one" ? "2024" : e.edition === "classic" ? "2014" : sourceEdition[e.source] ?? null);

  // ── items (first: classes and backgrounds need them for equipment choice groups) ─
  const items: Record<string, J> = {};
  for (const i of list(data, "item")) items[uid(i)] = { name: i.name, source: i.source, edition: edition(i), srd: isSrd(i), rarity: i.rarity ?? "none", attune: Boolean(i.reqAttune) };
  // Generic magic variants (D55): "Flame Tongue", "+1 Armor" — not entities for each base item, so a specific name
  // ("Flame Tongue Warhammer") resolves as variant + base item. Kept: the naming affixes and the requires/excludes
  // matchers (item-type codes and flags, never text). Base items keep only the matcher keys.
  // A variant's book is its `inherits.source`: it may have no `source` of its own.
  const variantList = (Array.isArray(data.magicvariant) ? (data.magicvariant as J[]) : []).filter((v) => v && typeof v.name === "string");
  const matcherKeys = new Set<string>();
  for (const v of variantList) { for (const r of v.requires ?? []) Object.keys(r).forEach((k) => matcherKeys.add(k)); Object.keys(v.excludes ?? {}).forEach((k) => matcherKeys.add(k)); }
  matcherKeys.delete("name"); matcherKeys.delete("source");
  const propsOf = (i: J) => {
    const out: J = {};
    for (const k of matcherKeys) if (i[k] !== undefined) out[k] = k === "property" ? i[k].map((p: J) => (typeof p === "string" ? p : p.uid)) : i[k];
    return out;
  };
  for (const i of list(data, "baseitem")) items[uid(i)] = { name: i.name, source: i.source, edition: edition(i), srd: isSrd(i), rarity: "none", attune: false, base: true, props: propsOf(i),
    ...(i.weapon && i.mastery?.length ? { mastery: true } : {}) }; // a weapon with a mastery property: what `Masteries:` can name
  const itemsByKey = new Map<string, J>();
  for (const it of Object.values(items)) itemsByKey.set(`${it.name.toLowerCase()}|${it.source.toLowerCase()}`, it);
  const magicVariants: Record<string, J> = {};
  for (const v of variantList) {
    const inh = v.inherits ?? {};
    const src = inh.source ?? String(v.type ?? "").split("|")[1] ?? null;
    if (!src || (!inh.namePrefix && !inh.nameSuffix)) continue; // named one-offs ("… of the Guardian") have no affix to compose with
    magicVariants[`${v.name}|${src}`] = {
      name: v.name, source: src, edition: edition({ source: src, edition: v.edition }), srd: isSrd(inh), rarity: inh.rarity ?? "unknown",
      ...(inh.namePrefix ? { prefix: inh.namePrefix } : {}), ...(inh.nameSuffix ? { suffix: inh.nameSuffix } : {}), ...(inh.nameRemove ? { remove: inh.nameRemove } : {}),
      requires: v.requires ?? [], ...(v.excludes ? { excludes: v.excludes } : {}),
    };
  }

  // ── classes ───────────────────────────────────────────────────────────────────
  const classes: Record<string, J> = {}, subclasses: Record<string, J> = {}, classFeatures: Record<string, J> = {};
  for (const cf of Array.isArray(data.classFeature) ? (data.classFeature as J[]) : []) if (cf?.name) classFeatures[[cf.name, cf.className, cf.classSource, cf.level, cf.source].join("|")] = cf;
  for (const c of list(data, "class")) {
    if (c.isSidekick) continue;
    const feats = (Array.isArray(c.classFeatures) ? c.classFeatures : []).map((x: J) => (typeof x === "string" ? { uid: x } : { uid: String(x?.classFeature ?? ""), sub: Boolean(x?.gainSubclassFeature) }));
    const parseUid = (u: string) => { const p = u.split("|"); return { name: p[0], level: Number(p[3]), source: p[4] || c.source }; };
    const asiLevels = feats.filter((x: J) => /^Ability Score Improvement/.test(x.uid)).map((x: J) => parseUid(x.uid).level);
    const subFeat = feats.find((x: J) => x.sub);
    const subclassLevel = subFeat ? parseUid(subFeat.uid).level : null;
    const expertiseLevels = feats.filter((x: J) => /^Expertise/.test(x.uid)).map((x: J) => parseUid(x.uid).level);
    const features: Record<string, J> = {};
    for (const x of feats) {
      const { name, level, source } = parseUid(x.uid);
      const cf = classFeatures[[name, c.name, c.source, level, source].join("|")];
      if (!cf) continue;
      const opts = optionNames(cf.entries);
      if (opts.length) features[name] = { level, options: opts };
    }
    const options: Record<string, J> = {};
    for (const o of Array.isArray(c.optionalfeatureProgression) ? c.optionalfeatureProgression : []) options[(o.featureType ?? []).join("/")] = { name: o.name, progression: progressionMap(o.progression) };
    const featProg: Record<string, J> = {};
    for (const fp of Array.isArray(c.featProgression) ? c.featProgression : []) featProg[(fp.category ?? []).join("/")] = { name: fp.name, progression: progressionMap(fp.progression) };
    let masteries: number[] | null = null;
    for (const g of Array.isArray(c.classTableGroups) ? c.classTableGroups : []) {
      const i = (g.colLabels ?? []).findIndex((l: J) => /Weapon Mastery/i.test(stripTags(l)));
      if (i >= 0 && g.rows) masteries = g.rows.map((r: J) => Number(r[i]) || 0);
    }
    const optionalClassFeatures: Record<string, J> = {};
    for (const cf of Object.values(classFeatures)) if (cf.isClassFeatureVariant && cf.className === c.name && cf.classSource === c.source) optionalClassFeatures[cf.name] = { level: cf.level, source: cf.source };
    const sp = c.startingProficiencies ?? {};
    classes[uid(c)] = {
      name: c.name, source: c.source, edition: edition(c), srd: isSrd(c), hd: c.hd?.faces ?? null,
      subclassLevel, asiLevels, expertiseLevels, features, optionalClassFeatures, options, featProgression: featProg, masteries,
      hasMastery: feats.some((x: J) => /^Weapon Mastery\|/.test(x.uid)),
      skills: chooseSpec(sp.skills), tools: chooseSpec(sp.tools), multiclassSkills: chooseSpec(c.multiclassing?.proficienciesGained?.skills),
      equipmentOptions: letterKeys(c.startingEquipment?.defaultData),
      equipmentGroups: equipmentChoiceGroups(c.startingEquipment?.defaultData, itemsByKey),
      ...equipmentSets(c.startingEquipment?.defaultData, itemsByKey),
      casting: c.spellcastingAbility ? {
        ability: c.spellcastingAbility, progression: c.casterProgression ?? null, preparedChange: c.preparedSpellsChange ?? null,
        cantrips: c.cantripProgression ?? null, prepared: c.preparedSpellsProgression ?? null, known: c.spellsKnownProgression ?? null,
      } : null,
    };
  }
  // Subclass features by subclass: the features a subclass lists, matched by name, level, source, short name and class
  // name (not the class's source: a subclass printed again for a newer class keeps its older features).
  const subFeatures = new Map<string, J>();
  for (const sf of Array.isArray(data.subclassFeature) ? (data.subclassFeature as J[]) : []) {
    if (!sf?.name) continue;
    const k = [sf.name, sf.level, sf.source, sf.subclassShortName, sf.className].join("|");
    if (!subFeatures.has(k)) subFeatures.set(k, sf);
  }
  for (const s of list(data, "subclass")) {
    const features: Record<string, J> = {};
    for (const u of Array.isArray(s.subclassFeatures) ? s.subclassFeatures : []) {
      const p = String(typeof u === "string" ? u : u?.subclassFeature ?? "").split("|");
      const sf = subFeatures.get([p[0], Number(p[5]), p[6] || s.source, s.shortName, s.className].join("|"));
      if (!sf) continue;
      const opts = optionNames(sf.entries);
      if (opts.length) features[p[0]] = { level: Number(p[5]), options: opts };
    }
    const options: Record<string, J> = {};
    for (const o of Array.isArray(s.optionalfeatureProgression) ? s.optionalfeatureProgression : []) options[(o.featureType ?? []).join("/")] = { name: o.name, progression: progressionMap(o.progression) };
    const spells = additionalSpellsSpec(s.additionalSpells);
    subclasses[[s.name, s.className, s.classSource, s.source].join("|")] = {
      name: s.name, shortName: s.shortName, className: s.className, classSource: s.classSource, source: s.source, edition: edition(s), srd: isSrd(s),
      features, options, grantedSpells: spells?.fixed ?? [], casting: s.spellcastingAbility ? { ability: s.spellcastingAbility, progression: s.casterProgression ?? null, cantrips: s.cantripProgression ?? null, prepared: s.preparedSpellsProgression ?? null, known: s.spellsKnownProgression ?? null } : null,
    };
  }

  // ── species ───────────────────────────────────────────────────────────────────
  const species: Record<string, J> = {};
  const races = list(data, "race");
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const r of races) {
    const versions = (Array.isArray(r._versions) ? r._versions : []).map((v: J) => v?.name).filter(Boolean)
      .map((n: string) => n.replace(new RegExp(`^${escape(r.name)}; `), "").replace(/ (Lineage|Legacy|Ancestry)$/, ""));
    const sp = additionalSpellsSpec(r.additionalSpells);
    species[uid(r)] = {
      name: r.name, source: r.source, edition: edition(r), srd: isSrd(r), size: r.size ?? null,
      skills: chooseSpec(r.skillProficiencies), tools: chooseSpec(r.toolProficiencies), languages: chooseSpec(r.languageProficiencies),
      ability: abilitySpec(r.ability), feats: (Array.isArray(r.feats) ? r.feats : []).map((f: J) => f.anyFromCategory ? { category: f.anyFromCategory.category, count: f.anyFromCategory.count ?? 1 } : { fixed: Object.keys(f) }),
      versions, spellGroups: sp?.groups ?? [], spellAbility: sp?.ability ?? null, cantripChoose: sp?.cantripChoose ?? 0, grantedSpells: sp?.fixed ?? [],
    };
  }
  // 2014-style subraces become their own species entries, named this way: "Elf (Wood)|PHB".
  for (const s of Array.isArray(data.subrace) ? (data.subrace as J[]) : []) {
    if (!s?.name || !s.raceName) continue;
    const base = species[`${s.raceName}|${s.raceSource ?? s.source}`];
    if (!base) continue;
    const sp = additionalSpellsSpec(s.additionalSpells);
    const merge = (a: J, b: J) => (a && b ? { fixed: [...a.fixed, ...b.fixed], choose: b.choose ?? a.choose, any: a.any + b.any } : b ?? a);
    species[`${s.raceName} (${s.name})|${s.source}`] = {
      ...base, name: `${s.raceName} (${s.name})`, source: s.source, edition: edition({ source: s.source }) ?? base.edition, srd: isSrd(s), // the subrace's own flag
      subraceOf: `${s.raceName}|${s.raceSource ?? s.source}`,
      skills: merge(base.skills, chooseSpec(s.skillProficiencies)), tools: merge(base.tools, chooseSpec(s.toolProficiencies)), languages: merge(base.languages, chooseSpec(s.languageProficiencies)),
      ability: abilitySpec([...(races.find((r) => r.name === s.raceName && r.source === (s.raceSource ?? s.source))?.ability ?? []), ...(s.ability ?? [])]),
      versions: (Array.isArray(s._versions) ? s._versions : []).map((v: J) => v?.name).filter(Boolean),
      spellGroups: sp?.groups ?? base.spellGroups, spellAbility: sp?.ability ?? base.spellAbility, cantripChoose: sp?.cantripChoose ?? base.cantripChoose, grantedSpells: [...new Set([...base.grantedSpells, ...(sp?.fixed ?? [])])],
    };
  }

  // ── backgrounds ───────────────────────────────────────────────────────────────
  const backgrounds: Record<string, J> = {};
  for (const b of list(data, "background")) {
    backgrounds[uid(b)] = {
      name: b.name, source: b.source, edition: edition(b), srd: isSrd(b),
      ability: abilitySpec(b.ability), skills: chooseSpec(b.skillProficiencies), tools: chooseSpec(b.toolProficiencies), languages: chooseSpec(b.languageProficiencies),
      feats: (Array.isArray(b.feats) ? b.feats : []).flatMap((f: J) => Object.keys(f ?? {}).map((k) => k.split("|")[0])),
      equipmentOptions: letterKeys(b.startingEquipment),
      equipmentGroups: equipmentChoiceGroups(b.startingEquipment, itemsByKey),
      ...equipmentSets(b.startingEquipment, itemsByKey),
    };
  }

  // ── feats ─────────────────────────────────────────────────────────────────────
  const feats: Record<string, J> = {};
  for (const f of list(data, "feat")) {
    const sp = additionalSpellsSpec(f.additionalSpells);
    const ab = abilitySpec(f.ability);
    feats[uid(f)] = {
      name: f.name, source: f.source, edition: edition(f), srd: isSrd(f), category: f.category ?? null, repeatable: Boolean(f.repeatable),
      abilityChoose: ab?.choose ? ab.choose.from ?? null : sp?.ability ?? null, ...fixedAbilities(ab), skills: chooseSpec(f.skillProficiencies), tools: chooseSpec(f.toolProficiencies),
      expertise: chooseSpec(f.expertise), versions: (Array.isArray(f._versions) ? f._versions : []).map((v: J) => v?.name).filter(Boolean).map((n: string) => n.replace(new RegExp(`^${escape(f.name)}; `), "")),
      cantripChoose: sp?.cantripChoose ?? 0, spellChoose: sp?.choose ?? 0, grantedSpells: sp?.fixed ?? [],
      prereqLevel: prereqLevel(f),
    };
  }

  // ── optional features, spells ─────────────────────────────────────────────────
  const optionalFeatures: Record<string, J> = {};
  for (const o of list(data, "optionalfeature")) {
    optionalFeatures[uid(o)] = { name: o.name, source: o.source, edition: edition(o), srd: isSrd(o), types: o.featureType, prereqLevel: prereqLevel(o) };
    // Feats the option itself grants (D51). `progression` is {"*": n} for "n each time the option is taken"; a
    // per-level map takes its largest value.
    const grants = (Array.isArray(o.featProgression) ? o.featProgression : []).map((fp: J) => ({ category: fp.category, count: Array.isArray(fp.progression) ? Math.max(0, ...fp.progression) : fp.progression?.["*"] ?? Math.max(0, ...Object.values(fp.progression ?? {}) as number[]) })).filter((g: J) => g.count > 0);
    if (grants.length) optionalFeatures[uid(o)].feats = grants;
    // Spells the option grants outright (Pact of the Chain → Find Familiar): written, they are highlights (D201).
    const osp = additionalSpellsSpec(o.additionalSpells);
    if (osp?.fixed.length) optionalFeatures[uid(o)].grantedSpells = osp.fixed;
  }
  const families = { ...FAMILIES };
  const spells: Record<string, J> = {};
  // Spell → class and subclass legality, keyed by the spell's own (lower case) source then its (lower case) name.
  // Names only. A spell may also carry its classes itself: a list of class names.
  const lookup = data.spellSources ?? {};
  const classesOf = (s: J) => {
    const entry: J = (lookup[String(s.source ?? "").toLowerCase()] as J)?.[String(s.name ?? "").toLowerCase()];
    // Spells published outside the class's own book list their classes under `classVariant`; merge both.
    const cls = [...new Set([entry?.class, entry?.classVariant].filter(Boolean).flatMap((m: J) => Object.values(m).flatMap((bySrc: J) => Object.keys(bySrc))))];
    const own = Array.isArray(s.classes) ? s.classes : Array.isArray(s.classes?.fromClassList) ? s.classes.fromClassList.map((c: J) => c?.name) : [];
    for (const c of own) if (typeof c === "string" && !cls.includes(c)) cls.push(c);
    const subs = new Set<string>();
    if (entry?.subclass) {
      for (const grouping of Object.values(entry.subclass) as J[]) {
        for (const [className, srcMap] of Object.entries(grouping) as [string, J][]) {
          for (const subMap of Object.values(srcMap) as J[]) {
            for (const [subKey, subVal] of Object.entries(subMap) as [string, J][]) subs.add(`${subVal?.name || subKey}|${className}`);
          }
        }
      }
    }
    return { classes: cls, subclasses: [...subs] };
  };
  for (const s of list(data, "spell")) {
    const { classes: cls, subclasses: subs } = classesOf(s);
    spells[uid(s)] = { name: s.name, source: s.source, edition: edition(s), srd: isSrd(s), level: s.level, classes: cls, ...(subs.length ? { subclasses: subs } : {}) };
  }
  const full: SlotTable = { meta: null, classes, subclasses, species, backgrounds, feats, optionalFeatures, families, featCategories: { ...(opts.featCategories ?? {}) }, spells, items, magicVariants };
  for (const k of TABLES) for (const e of Object.values(full[k]) as J[]) e.core = core(e);
  const meta: J = { generated: opts.generated ?? new Date().toISOString().slice(0, 10), counts: {} };
  for (const k of TABLES) meta.counts[k] = Object.keys(full[k]).length;
  // Every book code an entity of the table cites (D205). Codes only.
  meta.sources = [...new Set(TABLES.flatMap((k) => (Object.values(full[k]) as J[]).map((e) => e.source)).filter((x) => typeof x === "string"))].sort();
  // Each cited book's release date (D221). A code with no date is left out and ranks oldest.
  meta.sourceDates = Object.fromEntries(meta.sources.filter((c: string) => sourceDate[c]).map((c: string) => [c, sourceDate[c]]));
  // Setting books and adventures (D221): their printing of a name loses to a core book's printing in the same edition.
  meta.settingSources = meta.sources.filter((c: string) => /^(setting|setting-alt|adventure)$/.test(sourceGroup[c] ?? ""));
  full.meta = meta;
  return full;
}

/** The SRD-flagged part of a slot table (the committed subset). */
export function srdSubset(full: SlotTable): SlotTable {
  const pick = (tbl: Record<string, J>) => Object.fromEntries(Object.entries(tbl).filter(([, v]) => v.srd));
  const srd: SlotTable = { meta: { ...full.meta, subset: "srd" }, families: full.families, featCategories: full.featCategories, ...Object.fromEntries(TABLES.map((k) => [k, pick(full[k])])) };
  srd.meta.counts = Object.fromEntries(Object.keys(full.meta.counts).map((k) => [k, Object.keys(srd[k]).length]));
  return srd;
}

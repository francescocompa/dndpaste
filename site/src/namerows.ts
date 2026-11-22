/**
 * Slot table → the editor's autocomplete rows (D151, D154–D163). Pure, shared by scripts/names.mjs (the bundled SRD
 * names, names.gen.ts) and by the browser for the visitor's own sources (D246). Names, books and the links the ranking
 * and the `[ ]` slots need; no rules text.
 */
import { shortLineage } from "../../src/dndpaste.ts";
// The slot table is untyped JSON from the extractor (src/extract.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
type Row = [string, number, ...J[]];

export interface RowOptions {
  /** An entry's book bits, 0 to leave it out (D159). */
  bookOf: (e: J) => number;
  /** Classes already numbered (the bundled list first), so class bits stay comparable; new ones are added after. */
  classes?: readonly string[];
  /** The skill list the short lists' bits count over (the bundled one), else the table's own. */
  skills?: readonly string[];
  /** Feat category codes → names, where the table has none of its own. */
  featCategories?: Readonly<Record<string, string>>;
  /** Species names known elsewhere (the bundled list): a `Base (Variant)` of one of them is a lineage option (D268, D291). */
  bases?: Iterable<string>;
}

export interface NameRows {
  CLASSES: string[]; CLASS_ROWS: Row[]; SPELLS: Row[]; SUBCLASSES: Row[]; SPECIES: Row[]; BACKGROUNDS: Row[]; FEATS: Row[];
  OPTIONS: Row[]; FAMILIES: Record<string, string>; ITEMS: Row[]; MASTERY_WEAPONS: Row[]; SKILLS: string[]; SKILL_LISTS: J[][];
  LANGUAGES: string[]; TOOLS: string[]; CLASS_FEATURES: J[][]; CASTERS: J[][]; DETAILS: Row[]; LINEAGES: J[][];
  SPECIES_FEATURES: J[][]; SPECIES_FIXED: J[][]; GEAR_OPTIONS: J[][];
}

const ABILITY: Record<string, number> = { str: 1, dex: 2, con: 4, int: 8, wis: 16, cha: 32 };
const abilityBits = (list: J) => (Array.isArray(list) ? list : []).reduce((a: number, x: string) => a | (ABILITY[x] ?? 0), 0);
const title = (s: string) => s.replace(/(^|[\s(-])([a-z]+)/g, (_m, p, w) => p + (p === " " && /^(of|the|and)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)));
const lc = (s: string) => s.toLowerCase();
const byName = (a: J[], b: J[]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
/** Option family → the class it belongs to, for ranking only (D156). */
const FAMILY_CLASS: Record<string, string> = { EI: "Warlock", PB: "Warlock", MM: "Sorcerer", "MV:B": "Fighter", AS: "Fighter", RN: "Fighter",
  ED: "Monk", AI: "Artificer", "FS:F": "Fighter", "FS:R": "Ranger", "FS:P": "Paladin", "FS:B": "Bard" };
/** The highest spell level a class can pick at each class level (D162), from its casting progression. */
const CAP: Record<string, (k: number) => number> = {
  full: (k) => Math.min(9, Math.ceil(k / 2)),
  "1/2": (k) => (k < 2 ? 0 : Math.min(5, Math.floor((k - 1) / 4) + 1)),
  artificer: (k) => Math.min(5, Math.floor((k - 1) / 4) + 1),
  pact: (k) => (k >= 11 ? Math.min(9, 6 + Math.floor((k - 11) / 2)) : Math.min(5, Math.ceil(k / 2))),
};
const FORM_OPTIONS = new Set(["Pact of the Chain", "Pact of the Blade"]);
const FORM_SPELL = /^(Find Familiar|Find Steed|Find Greater Steed|Summon .+)$/;
/** Class bits are 32-bit: a class past the 31st gets none (no ranking, never dimmed). */
const MAX_CLASSES = 31;

/** The rows for one slot table. `sup` is the hand-kept supplement (data/supplement.json), empty for a visitor's data. */
export function nameRows(slots: J, sup: J, o: RowOptions): NameRows {
  const vals = (k: string): J[] => Object.values(slots[k] ?? {});
  const keep = (e: J) => o.bookOf(e) !== 0;
  const cats = { ...(o.featCategories ?? {}), ...(slots.featCategories ?? {}) };

  /** Rows merged by name (and by `same`, the extras that must match): books OR'd together, `merge` folds the rest. */
  function rows(entries: J[], extras: (e: J) => J[], merge: ((r: Row, x: J[]) => void) | null = null, same: (e: J) => string = () => ""): Row[] {
    const m = new Map<string, Row>();
    for (const e of entries.filter(keep)) {
      const x = extras(e);
      const k = merge ? `${e.name}\u0000${same(e)}` : `${e.name}\u0000${JSON.stringify(x)}`;
      const r = m.get(k);
      if (!r) m.set(k, [e.name, o.bookOf(e), ...x]);
      else { r[1] |= o.bookOf(e); if (merge) merge(r, x); }
    }
    return [...m.values()].sort(byName);
  }

  // Classes: the given ones, then the table's, then any class a spell names (Artificer), for the class-first ranking (D156).
  const classes = [...(o.classes ?? [])];
  for (const c of [...new Set(vals("classes").filter(keep).map((c) => c.name))].sort()) if (!classes.includes(c)) classes.push(c);
  for (const s of vals("spells")) for (const c of s.classes ?? []) if (!classes.includes(c)) classes.push(c);
  const classBit = (name: string) => { const i = classes.indexOf(name); return i < 0 || i >= MAX_CLASSES ? 0 : 2 ** i; };

  const SPELLS = rows(vals("spells"), (s) => [s.level, (s.classes ?? []).reduce((a: number, c: string) => a | classBit(c), 0)],
    (r, [level, bits]) => { r[2] = Math.min(r[2], level); r[3] |= bits; });
  const SUBCLASSES = rows(vals("subclasses"), (s) => [classes.indexOf(s.className), s.shortName && s.shortName !== s.name ? s.shortName : ""]);
  // D291: a 2014 subrace (`Elf (High)`, the data's `subraceOf`) or a `Base (Variant)` of a known species is no species of
  // its own: it is a lineage option of its base, `Elf|PHB [High]` (D282).
  const bases = new Set([...vals("species").map((e) => lc(e.name)), ...[...(o.bases ?? [])].map(lc)]);
  const variantOf = (e: J): [string, string] | null => {
    const m = /^(.+?)\s*\(([^()]+)\)$/.exec(String(e.name));
    if (!m) return null;
    const base = typeof e.subraceOf === "string" ? e.subraceOf.split("|")[0] : m[1];
    return lc(base) === lc(m[1]) && (e.subraceOf || bases.has(lc(m[1]))) ? [m[1], m[2]] : null;
  };
  const SPECIES = rows(vals("species").filter((e) => !variantOf(e)), () => []);
  const BACKGROUNDS = rows(vals("backgrounds"), () => []);
  // D340: the last field is a half feat's fixed +1s (Durable's CON) as ability bits; every one in the data is +1.
  const FEATS = rows(vals("feats"), (f) => [cats[f.category] ?? "", abilityBits(f.abilityChoose),
    f.versions ?? [], f.cantripChoose ?? 0, f.spellChoose ?? 0, abilityBits(Object.keys(f.abilityFixed ?? {}))]);
  const OPTIONS = rows(vals("optionalFeatures"), (op) => [
    (op.types ?? []).reduce((a: number, t: string) => a | classBit(FAMILY_CLASS[t] ?? ""), 0),
    (op.types ?? []).some((t: string) => t.startsWith("FS")) ? 1 : 0,
    sup.optionPicks?.[`${op.name}|${op.source}`] ?? 0,
    [...(op.types ?? [])].sort(),
  // A name whose family differs by book stays two rows (D186): Pact of the Blade is a Pact Boon in the PHB, an invocation in the XPHB.
  ], (r, [bits, fs, picks]) => { r[2] |= bits; r[3] |= fs; r[4] = Math.max(r[4], picks); }, (op) => [...(op.types ?? [])].sort().join("/"));
  // Picks stay per name, as before the split: the PHB Pact of the Tome asks its three cantrips too.
  for (const r of OPTIONS) r[4] = Math.max(...OPTIONS.filter((x) => x[0] === r[0]).map((x) => x[4]));
  const ITEMS = rows([...vals("items"), ...vals("magicVariants")],
    (i) => [i.rarity === "none" ? 1 : 0], (r, [mundane]) => { r[2] &= mundane; });
  // Weapons with a mastery property: the only names a `Masteries:` line takes (D165).
  const MASTERY_WEAPONS = rows(vals("items").filter((i) => i.mastery), () => []);

  // Class features with a choice (D163): Divine Order's Protector or Thaumaturge. Names only. A visitor's names file
  // may list one on its own (`features`), with its class when it gives one.
  const CLASS_FEATURES: J[][] = [];
  for (const c of vals("classes").filter(keep)) {
    for (const [f, v] of Object.entries(c.features ?? {}) as [string, J][]) {
      if (!v?.options?.length || CLASS_FEATURES.some((r) => r[0] === f)) continue;
      // Options that add a cantrip of the class as a second group (D163 review): Thaumaturge, Magician.
      CLASS_FEATURES.push([f, classes.indexOf(c.name), v.options, sup.featureOptionCantrips?.[`${f}|${c.source}`] ?? []]);
    }
  }
  for (const v of vals("features").filter(keep)) {
    if (v.options?.length && !CLASS_FEATURES.some((r) => r[0] === v.name)) CLASS_FEATURES.push([v.name, v.className ? classes.indexOf(v.className) : -1, v.options, []]);
  }
  CLASS_FEATURES.sort(byName);

  // A Warlock's Mystic Arcanum counts (6th at 11, up to 9th at 17).
  const CASTERS = vals("classes").filter((c) => keep(c) && CAP[c.casting?.progression])
    .map((c) => [c.name, o.bookOf(c), Array.from({ length: 20 }, (_, i) => CAP[c.casting.progression](i + 1))]).sort(byName);

  // Skills, languages and tools the table names anywhere (choose lists and fixed grants).
  const skills = new Set<string>(), languages = new Set<string>(), tools = new Set<string>();
  const walk = (node: J): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    for (const [k, v] of Object.entries(node) as [string, J][]) {
      if (v && typeof v === "object" && !Array.isArray(v) && (k === "skills" || k === "multiclassSkills" || k === "languages" || k === "tools")) {
        const set = k === "languages" ? languages : k === "tools" ? tools : skills;
        for (const x of [...(Array.isArray(v.fixed) ? v.fixed : []), ...(v.choose?.from ?? [])]) if (typeof x === "string") set.add(x);
      }
      walk(v);
    }
  };
  for (const k of ["classes", "species", "backgrounds", "feats"]) walk(vals(k).filter(keep));
  const words = (set: Set<string>) => [...set].filter((x) => x !== "other" && x !== "any").map(title).sort();

  // Species lineages (D280, D291): per species printing, its defining trait ("" for 2014 subraces), the abilities the
  // trait's spellcasting takes (0: none), its options as the editor writes them (short, D289). The other species
  // features with picks stay `Feature` lines (SPECIES_FEATURES).
  const LINEAGES: J[][] = [];
  const addLineage = (species: string, books: number, trait: string, ab: number, opts: string[]) => {
    if (!books || !opts.length) return;
    const had = LINEAGES.find((r) => r[0] === species && r[2] === trait && r[3] === ab && JSON.stringify(r[4]) === JSON.stringify(opts));
    if (had) had[1] |= books;
    else LINEAGES.push([species, books, trait, ab, opts]);
  };
  const SPECIES_FEATURES: J[][] = [];
  for (const sd of vals("species").filter(keep)) {
    const uid = `${sd.name}|${sd.source}`;
    const extra = sup.speciesFeatures?.[uid] ?? {};
    const v = variantOf(sd);
    const trait = sup.lineageTrait?.[uid] !== undefined ? sup.lineageTrait[uid] : sd.versions?.length && !v ? `${sd.name} Lineage` : null;
    if (trait) {
      const opts: string[] = sd.versions?.length ? sd.versions : extra[trait] ?? [];
      addLineage(sd.name, o.bookOf(sd), trait, abilityBits(sup.lineageAbility?.[uid] ?? sd.spellAbility), opts.map((x) => shortLineage(x, sd.name, trait)));
    }
    for (const [f, picks] of Object.entries(extra) as [string, J][]) {
      if (f !== trait && picks.length && !SPECIES_FEATURES.some((r) => r[0] === f)) SPECIES_FEATURES.push([f, picks]);
    }
  }
  // Each base's 2014 subraces, one row per book.
  const subs = new Map<string, Map<number, string[]>>();
  for (const sd of vals("species").filter(keep)) {
    const v = variantOf(sd);
    if (!v) continue;
    const byBook = subs.get(v[0]) ?? new Map<number, string[]>();
    const b = o.bookOf(sd);
    byBook.set(b, [...(byBook.get(b) ?? []), v[1]].sort());
    subs.set(v[0], byBook);
  }
  // A 2024 book's variants are its lineage, owed as the 2024 traits are (D280); a 2014 book's are subraces.
  for (const [base, byBook] of subs) for (const [b, opts] of byBook) addLineage(base, b, b & (2 | 8 | 32) ? `${base} Lineage` : "", 0, opts);
  LINEAGES.sort((a, b) => byName(a, b) || a[1] - b[1]);
  SPECIES_FEATURES.sort(byName);

  // Short skill lists (D227): the skills a species or a class lets its player choose from, as bits over SKILLS; "M" is a
  // class's list when it joins as a multiclass. Names only. Only lists that leave some skills out.
  const SKILLS = o.skills ? [...o.skills] : words(skills);
  const skillBits = (from: string[]) => from.reduce((a, x) => { const i = SKILLS.indexOf(title(x)); return i < 0 ? a : a | 2 ** i; }, 0);
  const ALL_SKILLS = 2 ** SKILLS.length - 1;
  const SKILL_LISTS: J[][] = [];
  for (const [kind, table, field] of [["S", "species", "skills"], ["C", "classes", "skills"], ["M", "classes", "multiclassSkills"]]) {
    for (const e of vals(table).filter(keep)) {
      const from = e[field]?.choose?.from;
      if (!from?.length) continue;
      const bits = skillBits(from);
      if (bits === ALL_SKILLS) continue;
      const had = SKILL_LISTS.find((r) => r[0] === kind && r[1] === e.name && r[3] === bits);
      if (had) had[2] |= o.bookOf(e);
      else SKILL_LISTS.push([kind, e.name, o.bookOf(e), bits]);
    }
  }
  SKILL_LISTS.sort((a, b) => byName([a[1] + a[0]], [b[1] + b[0]]) || a[2] - b[2]);

  // Names a pick writes with its brackets (D242): the printings that ask a detail. A feat with an ability, a version,
  // cantrips or spells to pick; an option that asks picks; a class feature with options and a lineage trait (no books:
  // every printing); and a chosen form (D195): Pact of the Chain and of the Blade, Find Familiar, the Summon spells.
  const optionPicks = (op: J) => sup.optionPicks?.[`${op.name}|${op.source}`] ?? 0;
  const DETAILS = rows([
    ...vals("feats").filter((f) => f.abilityChoose?.length || f.versions?.length || f.cantripChoose || f.spellChoose),
    ...vals("optionalFeatures").filter((op) => optionPicks(op) || FORM_OPTIONS.has(op.name) ||
      ((op.types ?? []).includes("PB") && OPTIONS.some((r) => r[0] === op.name && r[4]))),
    ...vals("spells").filter((sp) => FORM_SPELL.test(sp.name)),
  ], () => [], (r) => r);
  for (const name of [...CLASS_FEATURES.map((f) => f[0]), ...SPECIES_FEATURES.map((f) => f[0])]) {
    if (!DETAILS.some((r) => r[0] === name)) DETAILS.push([name, 0]);
  }
  // A species with lineages (D280) or 2014 subraces (D296): a pick writes `Elf []` in those books, so its list opens.
  for (const l of LINEAGES) {
    // D298: the trait itself (a 0.9 `Feature: Elven Lineage` line, read with W006) opens its brackets in every printing.
    if (l[2] && !DETAILS.some((r) => r[0] === l[2])) DETAILS.push([l[2], 0]);
    const had = DETAILS.find((r) => r[0] === l[0]);
    if (had) { if (had[1]) had[1] |= l[1]; } else DETAILS.push([l[0], l[1]]);
  }
  DETAILS.sort(byName);

  // D331: a 2014 species' fixed score increases, numbers only, for the score popover's final (the site's mirror of
  // finalScores; src/check.ts may not ship). One row per printing that has any: [name, source, edition, STR…CHA].
  const SPECIES_FIXED: J[][] = vals("species").filter((e) => keep(e) && e.ability?.fixed && Object.keys(e.ability.fixed).length)
    .map((e) => [e.name, e.source, e.edition ?? "", ["str", "dex", "con", "int", "wis", "cha"].map((a) => e.ability.fixed[a] ?? 0)])
    .sort((a, b) => byName(a, b) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

  // D362 (D336): a class's or background's starting gear, names only: its option letters (2024: `A`, `B`) and the
  // items its choice groups name (2014: `Mace` or `Warhammer`). [C class or B background, name, books, letters, items,
  // sets]. D365: `sets` holds what each letter holds, in the letters' order: `Javelin ×8`, then the coin (`4 GP`).
  const coin = (cp: number) => [[Math.floor(cp / 100), "GP"], [Math.floor((cp % 100) / 10), "SP"], [cp % 10, "CP"]].filter(([v]) => v).map(([v, u]) => `${v} ${u}`).join(" ");
  const setOf = (x: J): string[] => [...(x?.items ?? []).map(([nm, q]: [string, number]) => (q > 1 ? `${nm} ×${q}` : nm)), ...(x?.cp ? [coin(x.cp)] : [])];
  const GEAR_OPTIONS: J[][] = [];
  for (const [kind, table] of [["C", "classes"], ["B", "backgrounds"]]) {
    for (const e of vals(table).filter(keep)) {
      const letters: string[] = [...(e.equipmentOptions ?? [])];
      const items: string[] = [];
      for (const g of e.equipmentGroups ?? []) for (const list of Object.values(g) as string[][]) {
        for (const x of list ?? []) { const nm = String(x).split("|")[0]; if (nm && !items.includes(nm)) items.push(nm); }
      }
      if (!letters.length && !items.length) continue;
      const sets = letters.map((l) => setOf(e.equipmentSets?.[l]));
      const had = GEAR_OPTIONS.find((r) => r[0] === kind && r[1] === e.name && JSON.stringify([r[3], r[4], r[5]]) === JSON.stringify([letters, items, sets]));
      if (had) had[2] |= o.bookOf(e);
      else GEAR_OPTIONS.push([kind, e.name, o.bookOf(e), letters, items, sets]);
    }
  }
  GEAR_OPTIONS.sort((a, b) => byName([a[1] + a[0]], [b[1] + b[0]]) || a[2] - b[2]);

  return {
    CLASSES: classes, CLASS_ROWS: rows(vals("classes"), () => []), SPELLS, SUBCLASSES, SPECIES, BACKGROUNDS, FEATS, OPTIONS,
    FAMILIES: { ...(slots.families ?? {}) }, ITEMS, MASTERY_WEAPONS, SKILLS, SKILL_LISTS, LANGUAGES: words(languages), TOOLS: words(tools),
    CLASS_FEATURES, CASTERS, DETAILS, LINEAGES, SPECIES_FEATURES, SPECIES_FIXED, GEAR_OPTIONS,
  };
}

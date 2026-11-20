// Writes site/src/names.gen.ts, the names behind the editor's autocomplete (D151, D154–D159): spells, feats, optional
// features, species, backgrounds, subclasses, classes, items, skills, languages, tools and the species lineage picks,
// with their books and the few links the ranking and the `[ ]` slots need. Names only: no rules text (CLAUDE.md).
// Books: PHB, XPHB, DMG, XDMG only (D159). Read from the committed SRD slot table and supplement. Run it by hand after
// either file changes, then commit the diff; test/names.test.ts fails while the committed file is stale:
//   node site/scripts/names.mjs [out file]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const load = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/${rel}`, import.meta.url)), "utf8"));
const slots = load("srd/slots.json");
const sup = load("supplement.json");
const out = process.argv[2] ?? fileURLToPath(new URL("../src/names.gen.ts", import.meta.url));

/** Book bits (D155): 1 PHB, 2 XPHB, 4 DMG, 8 XDMG. Any other book is left out (D159). */
const BOOK = { PHB: 1, XPHB: 2, DMG: 4, XDMG: 8 };
const ABILITY = { str: 1, dex: 2, con: 4, int: 8, wis: 16, cha: 32 };
const abilityBits = (list) => (list ?? []).reduce((a, x) => a | (ABILITY[x] ?? 0), 0);
const keep = (e) => e.source in BOOK;
const title = (s) => s.replace(/(^|[\s(-])([a-z]+)/g, (m, p, w) => p + (p === " " && /^(of|the|and)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)));
const byName = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

// Classes: the core twelve, plus any class a spell names (Artificer), for the class-first ranking (D156).
const classes = [...new Set(Object.values(slots.classes).filter(keep).map((c) => c.name))].sort();
for (const s of Object.values(slots.spells)) for (const c of s.classes ?? []) if (!classes.includes(c)) classes.push(c);
const classBit = (name) => { const i = classes.indexOf(name); return i < 0 ? 0 : 2 ** i; };
/** Option family → the class it belongs to, for ranking only (D156). */
const FAMILY_CLASS = { EI: "Warlock", PB: "Warlock", MM: "Sorcerer", "MV:B": "Fighter", AS: "Fighter", RN: "Fighter",
  ED: "Monk", AI: "Artificer", "FS:F": "Fighter", "FS:R": "Ranger", "FS:P": "Paladin", "FS:B": "Bard" };

/** Rows merged by name (and by `same`, the extras that must match): books OR'd together, `merge` folds the rest. */
function rows(entries, extras, merge = null, same = () => "") {
  const m = new Map();
  for (const e of entries.filter(keep)) {
    const x = extras(e);
    const k = merge ? `${e.name}\u0000${same(e)}` : `${e.name}\u0000${JSON.stringify(x)}`;
    const r = m.get(k);
    if (!r) m.set(k, [e.name, BOOK[e.source], ...x]);
    else { r[1] |= BOOK[e.source]; if (merge) merge(r, x); }
  }
  return [...m.values()].sort(byName);
}

const spells = rows(Object.values(slots.spells), (s) => [s.level, (s.classes ?? []).reduce((a, c) => a | classBit(c), 0)],
  (r, [level, bits]) => { r[2] = Math.min(r[2], level); r[3] |= bits; });
const subclasses = rows(Object.values(slots.subclasses), (s) => [classes.indexOf(s.className), s.shortName && s.shortName !== s.name ? s.shortName : ""]);
const species = rows(Object.values(slots.species), () => []);
const backgrounds = rows(Object.values(slots.backgrounds), () => []);
const feats = rows(Object.values(slots.feats), (f) => [slots.featCategories[f.category] ?? "", abilityBits(f.abilityChoose),
  f.versions ?? [], f.cantripChoose ?? 0, f.spellChoose ?? 0]);
const options = rows(Object.values(slots.optionalFeatures), (o) => [
  (o.types ?? []).reduce((a, t) => a | classBit(FAMILY_CLASS[t] ?? ""), 0),
  (o.types ?? []).some((t) => t.startsWith("FS")) ? 1 : 0,
  sup.optionPicks?.[`${o.name}|${o.source}`] ?? 0,
  [...(o.types ?? [])].sort(),
// A name whose family differs by book stays two rows (D186): Pact of the Blade is a Pact Boon in the PHB, an invocation in the XPHB.
], (r, [bits, fs, picks]) => { r[2] |= bits; r[3] |= fs; r[4] = Math.max(r[4], picks); }, (o) => [...(o.types ?? [])].sort().join("/"));
// Picks stay per name, as before the split: the PHB Pact of the Tome asks its three cantrips too.
for (const r of options) r[4] = Math.max(...options.filter((x) => x[0] === r[0]).map((x) => x[4]));
const items = rows([...Object.values(slots.items), ...Object.values(slots.magicVariants)],
  (i) => [i.rarity === "none" ? 1 : 0], (r, [mundane]) => { r[2] &= mundane; });
// Weapons with a mastery property: the only names a `Masteries:` line takes (D165). Books are those of the entries that have one.
const masteryWeapons = rows(Object.values(slots.items).filter((i) => i.mastery), () => []);

// Class features with a choice (D163): Divine Order's Protector or Thaumaturge. Names only.
const features = [];
for (const c of Object.values(slots.classes).filter(keep)) {
  for (const [f, v] of Object.entries(c.features ?? {})) {
    if (!v?.options?.length || features.some((r) => r[0] === f)) continue;
    // Options that add a cantrip of the class as a second group (D163 review): Thaumaturge, Magician.
    features.push([f, classes.indexOf(c.name), v.options, sup.featureOptionCantrips?.[`${f}|${c.source}`] ?? []]);
  }
}
features.sort(byName);

// The highest spell level a class can pick at each class level (D162), from its casting progression; ranking and the
// dimmed rows only. A Warlock's Mystic Arcanum counts (6th at 11, up to 9th at 17).
const CAP = {
  full: (k) => Math.min(9, Math.ceil(k / 2)),
  "1/2": (k) => (k < 2 ? 0 : Math.min(5, Math.floor((k - 1) / 4) + 1)),
  artificer: (k) => Math.min(5, Math.floor((k - 1) / 4) + 1),
  pact: (k) => (k >= 11 ? Math.min(9, 6 + Math.floor((k - 11) / 2)) : Math.min(5, Math.ceil(k / 2))),
};
const casters = Object.values(slots.classes).filter((c) => keep(c) && CAP[c.casting?.progression])
  .map((c) => [c.name, BOOK[c.source], Array.from({ length: 20 }, (_, i) => CAP[c.casting.progression](i + 1))]).sort(byName);

// Skills, languages and tools the table names anywhere (choose lists and fixed grants).
const skills = new Set(), languages = new Set(), tools = new Set();
const walk = (o, key) => {
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) { for (const x of o) walk(x, key); return; }
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object" && !Array.isArray(v) && (k === "skills" || k === "multiclassSkills" || k === "languages" || k === "tools")) {
      const set = k === "languages" ? languages : k === "tools" ? tools : skills;
      for (const x of [...(Array.isArray(v.fixed) ? v.fixed : []), ...(v.choose?.from ?? [])]) if (typeof x === "string") set.add(x);
    }
    walk(v, k);
  }
};
for (const k of ["classes", "species", "backgrounds", "feats"]) walk(Object.values(slots[k]).filter(keep));
const words = (set) => [...set].filter((x) => x !== "other" && x !== "any").map(title).sort();

// Species lineage features (D156): the feature's name, the abilities its first slot takes (none: no ability slot), its picks.
const lineages = [];
for (const sd of Object.values(slots.species).filter(keep)) {
  const uid = `${sd.name}|${sd.source}`;
  const extra = sup.speciesFeatures?.[uid] ?? {};
  const trait = sup.lineageTrait?.[uid];
  if (trait) lineages.push([trait, abilityBits(sd.spellAbility), extra[trait] ?? sd.versions ?? []]);
  for (const [f, picks] of Object.entries(extra)) if (f !== trait && picks.length) lineages.push([f, 0, picks]);
}
lineages.sort(byName);

// Short skill lists (D227): the skills a species or a class lets its player choose from, as bits over SKILLS; "M" is a
// class's list when it joins as a multiclass. Names only. Only lists that leave some skills out.
const skillNames = words(skills);
const skillBits = (from) => from.reduce((a, x) => { const i = skillNames.indexOf(title(x)); return i < 0 ? a : a | 2 ** i; }, 0);
const ALL_SKILLS = 2 ** skillNames.length - 1;
const skillLists = [];
for (const [kind, table, field] of [["S", "species", "skills"], ["C", "classes", "skills"], ["M", "classes", "multiclassSkills"]]) {
  for (const e of Object.values(slots[table]).filter(keep)) {
    const from = e[field]?.choose?.from;
    if (!from?.length) continue;
    const bits = skillBits(from);
    if (bits === ALL_SKILLS) continue;
    const had = skillLists.find((r) => r[0] === kind && r[1] === e.name && r[3] === bits);
    if (had) had[2] |= BOOK[e.source];
    else skillLists.push([kind, e.name, BOOK[e.source], bits]);
  }
}
skillLists.sort((a, b) => byName([a[1] + a[0]], [b[1] + b[0]]) || a[2] - b[2]);

// Names a pick writes with its brackets (D242): the printings that ask a detail. A feat with an ability, a version,
// cantrips or spells to pick; an option that asks picks (a pact boon carries its picks into both books, as above);
// a class feature with options and a lineage trait (no books: every printing); and a chosen form (D195): Pact of the
// Chain and of the Blade, Find Familiar, Find Steed, Find Greater Steed and the Summon spells.
const FORM_OPTIONS = new Set(["Pact of the Chain", "Pact of the Blade"]);
const FORM_SPELL = /^(Find Familiar|Find Steed|Find Greater Steed|Summon .+)$/;
const optionPicks = (o) => sup.optionPicks?.[`${o.name}|${o.source}`] ?? 0;
const details = rows([
  ...Object.values(slots.feats).filter((f) => f.abilityChoose?.length || f.versions?.length || f.cantripChoose || f.spellChoose),
  ...Object.values(slots.optionalFeatures).filter((o) => optionPicks(o) || FORM_OPTIONS.has(o.name) ||
    ((o.types ?? []).includes("PB") && options.some((r) => r[0] === o.name && r[4]))),
  ...Object.values(slots.spells).filter((sp) => FORM_SPELL.test(sp.name)),
], () => [], (r) => r);
for (const name of [...features.map((f) => f[0]), ...lineages.filter((l) => l[1] || l[2].length).map((l) => l[0])]) {
  if (!details.some((r) => r[0] === name)) details.push([name, 0]);
}
details.sort(byName);

const q = (v) => JSON.stringify(v);
const list = (rs) => rs.map((r) => `  ${q(r)},`).join("\n");
writeFileSync(out, `/**
 * The editor's autocomplete names (D151, D154–D159, D162, D163). Names, books and the links the ranking and the \`[ ]\` slots need;
 * no rules text. Generated by site/scripts/names.mjs from the committed SRD slot table and supplement; do not edit by
 * hand. Bundled on its own as /assets/names.js, loaded the first time the editor gets focus (D158).
 */
/** Book bits (D155): 1 PHB, 2 XPHB, 4 DMG, 8 XDMG. */
export type Books = number;
/** Bits over \`classes\` (bit i = classes[i]). */
export type ClassBits = number;
/** Ability bits: 1 STR, 2 DEX, 4 CON, 8 INT, 16 WIS, 32 CHA. */
export type AbilityBits = number;

export const CLASSES: readonly string[] = ${q(classes)};
/** [name, books] */
export const CLASS_ROWS: readonly (readonly [string, Books])[] = ${q(rows(Object.values(slots.classes), () => []))};
/** [name, books, level, classes] */
export const SPELLS: readonly (readonly [string, Books, number, ClassBits])[] = [
${list(spells)}
];
/** [name, books, index in CLASSES, short name or ""] */
export const SUBCLASSES: readonly (readonly [string, Books, number, string])[] = ${q(subclasses)};
/** [name, books] */
export const SPECIES: readonly (readonly [string, Books])[] = ${q(species)};
/** [name, books] */
export const BACKGROUNDS: readonly (readonly [string, Books])[] = ${q(backgrounds)};
/** [name, books, category name, abilities its first slot takes, class versions, cantrips to pick, spells to pick] */
export const FEATS: readonly (readonly [string, Books, string, AbilityBits, readonly string[], number, number])[] = [
${list(feats)}
];
/** [name, books, classes its families belong to, 1 if a fighting style, picks it asks, family codes] (D186) */
export const OPTIONS: readonly (readonly [string, Books, ClassBits, number, number, readonly string[]])[] = [
${list(options)}
];
/** Option family code → its name, for an \`Options (<marker>)\` line's filter (D186). */
export const FAMILIES: Readonly<Record<string, string>> = ${q(slots.families)};
/** [name, books, 1 if mundane] */
export const ITEMS: readonly (readonly [string, Books, number])[] = [
${list(items)}
];
/** [name, books]: weapons with a mastery property, for \`Masteries:\` (D165) */
export const MASTERY_WEAPONS: readonly (readonly [string, Books])[] = ${q(masteryWeapons)};
export const SKILLS: readonly string[] = ${q(skillNames)};
/** [S species, C class, M class as a multiclass; name, books, bits over SKILLS]: the skills a short list lets a player choose (D227). */
export const SKILL_LISTS: readonly (readonly ["S" | "C" | "M", string, Books, number])[] = ${q(skillLists)};
export const LANGUAGES: readonly string[] = ${q(words(languages))};
export const TOOLS: readonly string[] = ${q(words(tools))};
/** [class feature name, index in CLASSES, its options, the options that add a cantrip of that class] (D163) */
export const CLASS_FEATURES: readonly (readonly [string, number, readonly string[], readonly string[]])[] = ${q(features)};
/** [class, books, the highest spell level it can pick at class level 1–20] (D162) */
export const CASTERS: readonly (readonly [string, Books, readonly number[]])[] = ${q(casters)};
/** [name, books (0: every printing)]: a pick that asks a detail, written with its brackets (D242) */
export const DETAILS: readonly (readonly [string, Books])[] = ${q(details)};
/** [feature name, abilities its first slot takes (0: no ability slot), picks] */
export const LINEAGES: readonly (readonly [string, AbilityBits, readonly string[]])[] = ${q(lineages)};
`);
console.log(`${out}: ${spells.length} spells, ${feats.length} feats, ${options.length} options, ${items.length} items, ${masteryWeapons.length} mastery weapons, ` +
  `${species.length} species, ${backgrounds.length} backgrounds, ${subclasses.length} subclasses, ${classes.length} classes, ${lineages.length} lineage features, ${features.length} class features, ${casters.length} casters`);

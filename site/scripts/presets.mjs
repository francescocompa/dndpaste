// Writes site/src/presets.ts, the table behind the form's "Start a build" (D121–D125): for each core class in 2014
// (PHB) and 2024 (XPHB), the keys a build owes at each class level, the way the checker counts them (src/check.ts,
// owed-slot ledger), and how many picks each counted line expects there (the editor's ghost counts, D129–D133).
// Key names and numbers only: no names of subclasses, spells, options or features, no rules text.
// Read from the committed SRD slot table and supplement, so no new data leaves the repo (D125). Run it by hand after
// either file changes, then commit the diff (D115); test/preset.test.ts fails while the committed file is stale:
//   node site/scripts/presets.mjs [out file]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const load = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/${rel}`, import.meta.url)), "utf8"));
const slots = load("srd/slots.json");
const sup = load("supplement.json");
const EDITION = { PHB: "2014", XPHB: "2024" };

/** What a class grants at class level k, from k-1 (the checker's `delta`). */
const delta = (p, k) => (!p || k < 1 || k > p.length ? 0 : p[k - 1] - (k >= 2 ? p[k - 2] : 0));
/** Skills a class asks you to choose (fixed ones are granted, not picked). */
const count = (sk) => (sk?.choose?.count ?? 0) + (sk?.any ?? 0);
/** A feat-progression or option family that fills a marked feat slot (D110), else null. */
const marker = (fam, name) => (fam.split("/").some((f) => f.startsWith("FS")) ? "Fighting Style" : fam === "EB" ? name : null);

const sum = (a) => a.reduce((x, y) => x + y, 0);
/** Lines the editor counts (D129); Feat and Subclass are always one pick and get none. */
const COUNTED = ["Skills", "Expertise", "Cantrips", "Spells", "Options", "Masteries", "Prepared"];

const rows = [];
for (const cd of Object.values(slots.classes)) {
  if (!cd.core || !(cd.source in EDITION)) continue;
  const uid = `${cd.name}|${cd.source}`;
  const owes = [];
  const counts = [];
  const cast = cd.casting;
  const book = sup.spellbook?.[uid];
  // The mastery loadout by class level: the table's progression, else the supplement's fixed count (a class whose
  // table entry has mastery but no progression: 2024 Paladin, Ranger, Rogue).
  const fixed = sup.masteryCount?.[uid];
  const masteries = cd.masteries ?? (fixed ? Array.from({ length: 20 }, () => fixed) : null);
  // Keys this class has a count for (D129). A loadout total neither file has (masteries without a progression) or
  // that needs the ability modifier (a 2014 prepare count) is unknown, so the editor shows no ghost for it.
  const counted = COUNTED.filter((key) =>
    key === "Masteries" ? Boolean(masteries) : key === "Prepared" ? cd.source === "XPHB" && cast?.preparedChange === "restLong" && Boolean(cast.prepared) : true);
  for (let k = 1; k <= 20; k++) {
    const keys = new Set();
    if (k === 1 && ((masteries && masteries[0]) || cd.hasMastery)) keys.add("Masteries");
    if (k > 1 && delta(masteries, k) > 0) keys.add("Masteries"); // the loadout grows (D122)
    if (cd.subclassLevel === k) keys.add("Subclass");
    if (cd.asiLevels.includes(k)) keys.add("Feat");
    if (cd.expertiseLevels.includes(k)) keys.add("Expertise");
    for (const [fam, p] of Object.entries(cd.featProgression ?? {})) {
      if (!delta(p.progression, k)) continue;
      const m = marker(fam, p.name);
      keys.add(m ? `Feat (${m})` : "Feat");
    }
    for (const [fam, p] of Object.entries(cd.options ?? {})) {
      if (!delta(p.progression, k)) continue;
      keys.add(marker(fam, p.name) ? "Feat (Fighting Style)" : "Options");
    }
    const cast = cd.casting;
    if (delta(cast?.cantrips, k) > 0) keys.add("Cantrips");
    if (sup.spellbook?.[uid]) keys.add("Spells");
    else if (cast?.preparedChange === "level" ? delta(cast.prepared, k) > 0 : delta(cast?.known, k) > 0) keys.add("Spells");
    for (const fs of Object.values(cd.features ?? {})) if (fs.level === k) keys.add("Feature");
    for (const fp of Object.values(sup.classFeaturePicks?.[uid] ?? {})) if (fp.levels.includes(k)) keys.add(fp.key);
    owes.push([...keys]);
    // The counts at class level k: gains, except the two loadouts (Masteries, Prepared), which are the total from k.
    const c = {
      Expertise: (cd.expertiseLevels.includes(k) ? sup.expertiseCount : 0),
      Cantrips: Math.max(0, delta(cast?.cantrips, k)),
      Spells: book ? (k === 1 ? book.first : book.perLevel) : Math.max(0, cast?.preparedChange === "level" ? delta(cast.prepared, k) : delta(cast?.known, k)),
      Options: sum(Object.entries(cd.options ?? {}).filter(([fam, p]) => !marker(fam, p.name)).map(([, p]) => Math.max(0, delta(p.progression, k)))),
      Masteries: masteries?.[k - 1] ?? 0,
      Prepared: counted.includes("Prepared") ? cast.prepared[k - 1] ?? 0 : 0,
    };
    for (const fp of Object.values(sup.classFeaturePicks?.[uid] ?? {})) if (fp.levels.includes(k) && fp.key in c) c[fp.key] += fp.count;
    counts.push(Object.fromEntries(Object.entries(c).filter(([key, v]) => v > 0 && counted.includes(key))));
  }
  // Class level 1 differs by when the class is taken: the first class owes its skills and starting gear (a letter
  // under 2024 rules only, D111); a class taken later owes only its multiclass skills (D124).
  const first = [];
  if (count(cd.skills)) first.push("Skills");
  if (cd.equipmentOptions?.length && cd.source === "XPHB") first.push("Gear");
  const multi = count(cd.multiclassSkills) ? ["Skills"] : [];
  const skills = [count(cd.skills), count(cd.multiclassSkills)];
  rows.push({ name: cd.name, source: cd.source, first, multi, owes, counted, skills, counts });
}
rows.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));

const q = (v) => JSON.stringify(v);
const out = process.argv[2] ?? fileURLToPath(new URL("../src/presets.ts", import.meta.url));
writeFileSync(out, `/**
 * Class presets for the form's "Start a build" (D121–D125): the keys each core class owes at each class level, as the
 * checker counts them, and the picks each counted line expects (the editor's ghost counts, D129–D133). Key names and
 * numbers only. Generated by site/scripts/presets.mjs from the committed SRD slot table; do
 * not edit by hand.
 */
export type Edition = "2014" | "2024";
export interface ClassPreset {
  name: string;
  /** PHB for 2014, XPHB for 2024. */
  source: "PHB" | "XPHB";
  /** Extra keys at class level 1 when this is the build's first class (skills, starting gear). */
  first: readonly string[];
  /** Extra keys at class level 1 when the class is taken later (multiclass skills). */
  multi: readonly string[];
  /** owes[k - 1]: the keys owed at class level k, 1–20. */
  owes: readonly (readonly string[])[];
  /** The keys the editor counts for this class (D129); a key not here gets no ghost. */
  counted: readonly string[];
  /** Skills to choose at class level 1: [as the first class, as a later class]. */
  skills: readonly [number, number];
  /** counts[k - 1]: picks each counted key expects at class level k (a total for Masteries and Prepared); absent is 0. */
  counts: readonly Readonly<Record<string, number>>[];
}

export const PRESETS: readonly ClassPreset[] = [
${rows.map((r) => `  { name: ${q(r.name)}, source: ${q(r.source)}, first: ${q(r.first)}, multi: ${q(r.multi)},\n    owes: ${q(r.owes)},\n    counted: ${q(r.counted)}, skills: ${q(r.skills)},\n    counts: ${q(r.counts)} },`).join("\n")}
];
`);
console.log(`${out}: ${rows.length} presets (${rows.filter((r) => r.source === "PHB").length} 2014, ${rows.filter((r) => r.source === "XPHB").length} 2024)`);

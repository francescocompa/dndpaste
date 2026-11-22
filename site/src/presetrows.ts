/**
 * Slot table → class presets and species lines (D121–D125, D129–D133, D211): the keys a class owes at each class level,
 * as the checker counts them, and the picks each counted line expects (the editor's ghost counts). Key names,
 * numbers, and the names of features with a pick (D313). Pure, shared by scripts/presets.mjs (the bundled SRD presets, presets.ts) and by the browser for the
 * visitor's own classes (D246), which get no supplement: a count only the supplement knows stays unknown.
 */
// The slot table is untyped JSON from the extractor (src/extract.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
/** Expertise picks per gain, where the supplement doesn't say. */
const EXPERTISE = 2;

/** What a class grants at class level k, from k-1 (the checker's `delta`). */
const delta = (p: J, k: number): number => (!p || k < 1 || k > p.length ? 0 : p[k - 1] - (k >= 2 ? p[k - 2] : 0));
/** Skills a class asks you to choose (fixed ones are granted, not picked). */
const count = (sk: J): number => (sk?.choose?.count ?? 0) + (sk?.any ?? 0);
/** A feat-progression or option family that fills a marked feat slot (D110), else null. */
const marker = (fam: string, name: string): string | null => (fam.split("/").some((f: string) => f.startsWith("FS")) ? "Fighting Style" : fam === "EB" ? name : null);

const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
/** Lines the editor counts (D129); Feat and Subclass are always one pick and get none. */
const COUNTED = ["Skills", "Expertise", "Cantrips", "Spells", "Options", "Masteries", "Prepared"];

/** The class presets and species lines of a slot table, for the entries `keep` lets in. */
export function presetRows(slots: J, sup: J, keep: (e: J) => boolean): { rows: J[]; species: J[]; backgrounds: J[] } {
const rows: J[] = [];
for (const cd of Object.values(slots.classes ?? {}) as J[]) {
  if (!keep(cd)) continue;
  const y2024 = cd.source === "XPHB" || (cd.source !== "PHB" && cd.edition === "2024");
  const uid = `${cd.name}|${cd.source}`;
  const owes: string[][] = [];
  const counts: J[] = [];
  // D313: the names of the features with a pick, by class level (`Divine Order` at 1), so a `Feature` line can name it.
  const features: Record<number, string[]> = {};
  const cast = cd.casting;
  const book = sup.spellbook?.[uid];
  // The mastery loadout by class level: the table's progression, else the supplement's fixed count (a class whose
  // table entry has mastery but no progression: 2024 Paladin, Ranger, Rogue).
  const fixed = sup.masteryCount?.[uid];
  const masteries = cd.masteries ?? (fixed ? Array.from({ length: 20 }, () => fixed) : null);
  // Keys this class has a count for (D129). A loadout total neither file has (masteries without a progression) or
  // that needs the ability modifier (a 2014 prepare count) is unknown, so the editor shows no ghost for it.
  const counted = COUNTED.filter((key) =>
    key === "Masteries" ? Boolean(masteries) : key === "Prepared" ? y2024 && cast?.preparedChange === "restLong" && Boolean(cast.prepared) : true);
  for (let k = 1; k <= 20; k++) {
    const keys = new Set<string>();
    if (k === 1 && ((masteries && masteries[0]) || cd.hasMastery)) keys.add("Masteries");
    if (k > 1 && delta(masteries, k) > 0) keys.add("Masteries"); // the loadout grows (D122)
    if (cd.subclassLevel === k) keys.add("Subclass");
    if ((cd.asiLevels ?? []).includes(k)) keys.add("Feat");
    if ((cd.expertiseLevels ?? []).includes(k)) keys.add("Expertise");
    for (const [fam, p] of Object.entries(cd.featProgression ?? {}) as [string, J][]) {
      if (!delta(p.progression, k)) continue;
      const m = marker(fam, p.name);
      keys.add(m ? `Feat (${m})` : "Feat");
    }
    for (const [fam, p] of Object.entries(cd.options ?? {}) as [string, J][]) {
      if (!delta(p.progression, k)) continue;
      keys.add(marker(fam, p.name) ? "Feat (Fighting Style)" : "Options");
    }
    const cast = cd.casting;
    if (delta(cast?.cantrips, k) > 0) keys.add("Cantrips");
    if (sup.spellbook?.[uid]) keys.add("Spells");
    else if (cast?.preparedChange === "level" ? delta(cast.prepared, k) > 0 : delta(cast?.known, k) > 0) keys.add("Spells");
    for (const [name, fs] of Object.entries(cd.features ?? {}) as [string, J][]) {
      if (fs.level !== k) continue;
      keys.add("Feature");
      (features[k] ??= []).push(name);
    }
    for (const fp of Object.values(sup.classFeaturePicks?.[uid] ?? {}) as J[]) if (fp.levels.includes(k)) keys.add(fp.key);
    owes.push([...keys]);
    // The counts at class level k: gains, except the two loadouts (Masteries, Prepared), which are the total from k.
    const c: Record<string, number> = {
      Expertise: ((cd.expertiseLevels ?? []).includes(k) ? sup.expertiseCount ?? EXPERTISE : 0),
      Cantrips: Math.max(0, delta(cast?.cantrips, k)),
      Spells: book ? (k === 1 ? book.first : book.perLevel) : Math.max(0, cast?.preparedChange === "level" ? delta(cast.prepared, k) : delta(cast?.known, k)),
      Options: sum((Object.entries(cd.options ?? {}) as [string, J][]).filter(([fam, p]) => !marker(fam, p.name)).map(([, p]) => Math.max(0, delta(p.progression, k)))),
      Masteries: masteries?.[k - 1] ?? 0,
      Prepared: counted.includes("Prepared") ? cast.prepared[k - 1] ?? 0 : 0,
    };
    for (const fp of Object.values(sup.classFeaturePicks?.[uid] ?? {}) as J[]) if (fp.levels.includes(k) && fp.key in c) c[fp.key] += fp.count;
    counts.push(Object.fromEntries(Object.entries(c).filter(([key, v]) => v > 0 && counted.includes(key))));
  }
  // Class level 1 differs by when the class is taken: the first class owes its skills and starting gear (a letter
  // under 2024 rules only, D111); a class taken later owes only its multiclass skills (D124).
  const first: string[] = [];
  if (count(cd.skills)) first.push("Skills");
  if (cd.equipmentOptions?.length && y2024) first.push("Gear");
  const multi = count(cd.multiclassSkills) ? ["Skills"] : [];
  const skills = [count(cd.skills), count(cd.multiclassSkills)];
  rows.push({ name: cd.name, source: cd.source, first, multi, owes, counted, skills, counts, ...(Object.keys(features).length ? { features } : {}) });
}
rows.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));

// D211: the lines a species owes, the way the checker's Species block counts them (warnings only, not its infos):
// Skills, Tools and Languages to choose, an Origin feat, and the lineage trait, `["Species", trait]`: its pick goes in the
// Species line's brackets since 0.10 (D280, D291; the supplement's name, or `<Species> Lineage` for a species with
// versions). Other species features with picks stay `Feature` lines. Key names, counts and the trait's name only.
const species: J[] = [];
for (const sd of Object.values(slots.species ?? {}) as J[]) {
  if (!keep(sd)) continue;
  const uid = `${sd.name}|${sd.source}`;
  const lines: [string, number | string][] = [];
  for (const [key, n] of [["Skills", count(sd.skills)], ["Tools", count(sd.tools)], ["Languages", count(sd.languages)],
    ["Feat", sum((sd.feats ?? []).map((f: J) => f.count ?? 0))]] as [string, number][]) if (n > 0) lines.push([key, n]);
  const trait = sup.lineageTrait?.[uid] !== undefined ? sup.lineageTrait[uid] : sd.versions?.length ? `${sd.name} Lineage` : null;
  if (trait) lines.push(["Species", trait]);
  for (const f of Object.keys(sup.speciesFeatures?.[uid] ?? {})) if (f !== trait) lines.push(["Feature", f]);
  if (lines.length) species.push({ name: sd.name, source: sd.source, lines });
}
species.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));

// D351: what a background's block owes, the way the checker's Background block counts it: the abilities its Scores
// increase takes (2024), and the Skills, Tools and Languages it leaves to choose. What it grants is not a line.
// A background the table has no parts for (a variant) gets no row. Key names, ability codes and counts only.
const backgrounds: J[] = [];
for (const bd of Object.values(slots.backgrounds ?? {}) as J[]) {
  if (!keep(bd) || (!bd.ability && !bd.skills && !bd.tools && !bd.languages)) continue;
  const abilities = (bd.ability?.choose?.from ?? []).map((a: string) => a.toUpperCase());
  const lines: [string, number][] = [];
  for (const [key, n] of [["Skills", count(bd.skills)], ["Tools", count(bd.tools)], ["Languages", count(bd.languages)]] as [string, number][]) if (n > 0) lines.push([key, n]);
  backgrounds.push({ name: bd.name, source: bd.source, abilities, lines });
}
backgrounds.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
return { rows, species, backgrounds };
}

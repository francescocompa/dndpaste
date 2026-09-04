#!/usr/bin/env node
// Build the checker's slot table from a 5etools data mirror.
//   node scripts/extract-slots.mjs [mirror/data dir]  → data/slots.json (full, gitignored)
//                                                     → data/srd/slots.json (SRD-flagged entities only, committed)
// The output holds names, counts, levels and option lists — no rules text (CLAUDE.md content boundary).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DEFAULT = join(homedir(), "Documents/D&D/5etool_mirror/5etools-v2.33.3/data");
const root = process.argv[2] ?? DEFAULT;
if (!existsSync(root)) { console.error(`mirror not found: ${root}`); process.exit(1); }

const load = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const listDir = (rel, prefix) => readdirSync(join(root, rel)).filter((f) => f.startsWith(prefix) && f.endsWith(".json") && !f.includes("fluff"));
const uid = (e, extra = []) => [e.name, ...extra, e.source].join("|");
const isSrd = (e) => Boolean(e.srd || e.srd52 || e.basicRules || e.basicRules2024);
// Edition: the entity's own field when present, else inferred from its source's publication date
// (books.json / adventures.json; XPHB shipped 2024-09-17). Homebrew and unknown sources stay null.
const XPHB_DATE = "2024-09-17";
const sourceEdition = {}, sourceGroup = {};
for (const [file, key] of [["books.json", "book"], ["adventures.json", "adventure"]]) {
  try { for (const b of load(file)[key] ?? []) { if (b.source && b.published) sourceEdition[b.source] = b.published >= XPHB_DATE ? "2024" : "2014"; if (b.source) sourceGroup[b.source] = b.group ?? (key === "adventure" ? "adventure" : null); } } catch { /* optional */ }
}
const core = (e) => sourceGroup[e.source] === "core";
const edition = (e) => (e.edition === "one" ? "2024" : e.edition === "classic" ? "2014" : sourceEdition[e.source] ?? null);

// ── helpers over 5etools choice encodings ────────────────────────────────────
function chooseSpec(list) {
  // skillProficiencies / toolProficiencies / languageProficiencies entries → { fixed:[], choose:{count,from}|null, any:n }
  const out = { fixed: [], choose: null, any: 0 };
  for (const entry of list ?? []) {
    for (const [k, v] of Object.entries(entry)) {
      if (k === "choose") out.choose = { count: v.count ?? 1, from: v.from ?? null };
      else if (k === "any" || k === "anyStandard" || k === "anyArtisansTool" || k === "anyMusicalInstrument" || k === "anyGamingSet") out.any += Number(v) || 1;
      else if (v === true) out.fixed.push(k);
    }
  }
  return out.fixed.length || out.choose || out.any ? out : null;
}
function abilitySpec(list) {
  const out = { fixed: {}, choose: null };
  for (const entry of list ?? []) {
    for (const [k, v] of Object.entries(entry)) {
      if (k === "choose") out.choose = v.weighted ? { from: v.weighted.from, weights: v.weighted.weights } : { from: v.from, count: v.count ?? 1, amount: v.amount ?? 1 };
      else if (typeof v === "number") out.fixed[k] = v;
    }
  }
  return Object.keys(out.fixed).length || out.choose ? out : null;
}
function walk(node, fn) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, fn));
  else if (node && typeof node === "object") { fn(node); Object.values(node).forEach((v) => walk(v, fn)); }
}
function stripTags(s) { return String(s).replace(/\{@\w+ ([^}|]*)(\|[^}]*)?\}/g, "$1"); }
function optionNames(entries) {
  // Returns [] when the options are optional features: those slots are owed via optionalfeatureProgression, not as a Feature.
  const names = []; let optfeat = false;
  walk(entries, (n) => {
    if (n.type === "options" && Array.isArray(n.entries)) {
      for (const o of n.entries) {
        if (typeof o === "string") { const m = /\{@optfeature ([^}|]+)/.exec(o); if (m) { optfeat = true; names.push(m[1]); } }
        else if (o.type === "refOptionalfeature") { optfeat = true; names.push(String(o.optionalfeature).split("|")[0]); }
        else if (o.type === "refClassFeature") names.push(String(o.classFeature).split("|")[0]);
        else if (o.type === "refSubclassFeature") names.push(String(o.subclassFeature).split("|")[0]);
        else if (o.name) names.push(stripTags(o.name));
      }
    }
  });
  return optfeat ? [] : names;
}
function additionalSpellsSpec(list) {
  // Groups are alternatives (one per lineage / feat version): counts are the MAX over groups, not the sum.
  const out = { fixed: [], choose: 0, cantripChoose: 0, ability: null, groups: [] };
  for (const g of list ?? []) {
    if (g.name) out.groups.push(g.name);
    if (g.ability?.choose) out.ability = g.ability.choose;
    let choose = 0, cantrip = 0;
    const visit = (node) => {
      if (Array.isArray(node)) { for (const s of node) {
        if (typeof s === "string") out.fixed.push(s.split("|")[0].replace(/#c$/, ""));
        else if (s && typeof s === "object" && s.choose) { if (/level=0/.test(String(s.choose))) cantrip += s.count ?? 1; else choose += s.count ?? 1; }
        else visit(s);
      } return; }
      if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) { if (k === "ability" || k === "name") continue; visit(v); }
    };
    visit(g);
    out.choose = Math.max(out.choose, choose); out.cantripChoose = Math.max(out.cantripChoose, cantrip);
  }
  out.fixed = [...new Set(out.fixed)];
  return out.fixed.length || out.choose || out.cantripChoose || out.ability ? out : null;
}
function progressionMap(p) {
  // [n per level ×20] or {level:n} → cumulative array of 20
  const arr = new Array(20).fill(0);
  if (Array.isArray(p)) return p.slice(0, 20);
  let cur = 0;
  for (let l = 1; l <= 20; l++) { if (p[l] !== undefined) cur = p[l]; arr[l - 1] = cur; }
  return arr;
}

// ── classes ───────────────────────────────────────────────────────────────────
const classes = {}, subclasses = {}, classFeatures = {};
for (const f of listDir("class", "class-")) {
  const d = load(join("class", f));
  for (const cf of d.classFeature ?? []) classFeatures[[cf.name, cf.className, cf.classSource, cf.level, cf.source].join("|")] = cf;
  for (const c of d.class ?? []) {
    if (c.isSidekick) continue;
    const feats = (c.classFeatures ?? []).map((x) => (typeof x === "string" ? { uid: x } : { uid: x.classFeature, sub: Boolean(x.gainSubclassFeature) }));
    const parseUid = (u) => { const p = u.split("|"); return { name: p[0], level: Number(p[3]), source: p[4] || c.source }; };
    const asiLevels = feats.filter((x) => /^Ability Score Improvement/.test(x.uid)).map((x) => parseUid(x.uid).level);
    const subclassLevel = feats.find((x) => x.sub) ? parseUid(feats.find((x) => x.sub).uid).level : null;
    const expertiseLevels = feats.filter((x) => /^Expertise/.test(x.uid)).map((x) => parseUid(x.uid).level);
    const features = {};
    for (const x of feats) {
      const { name, level, source } = parseUid(x.uid);
      const cf = classFeatures[[name, c.name, c.source, level, source].join("|")];
      if (!cf) continue;
      const opts = optionNames(cf.entries);
      if (opts.length) features[name] = { level, options: opts };
    }
    const options = {};
    for (const o of c.optionalfeatureProgression ?? []) options[o.featureType.join("/")] = { name: o.name, progression: progressionMap(o.progression) };
    const featProg = {};
    for (const fp of c.featProgression ?? []) featProg[fp.category.join("/")] = { name: fp.name, progression: progressionMap(fp.progression) };
    let masteries = null;
    for (const g of c.classTableGroups ?? []) {
      const i = (g.colLabels ?? []).findIndex((l) => /Weapon Mastery/i.test(stripTags(l)));
      if (i >= 0 && g.rows) masteries = g.rows.map((r) => Number(r[i]) || 0);
    }
    const optionalClassFeatures = {};
    for (const cf of Object.values(classFeatures)) if (cf.isClassFeatureVariant && cf.className === c.name && cf.classSource === c.source) optionalClassFeatures[cf.name] = { level: cf.level, source: cf.source };
    const sp = c.startingProficiencies ?? {};
    classes[uid(c)] = {
      name: c.name, source: c.source, edition: edition(c), srd: isSrd(c), hd: c.hd?.faces ?? null,
      subclassLevel, asiLevels, expertiseLevels, features, optionalClassFeatures, options, featProgression: featProg, masteries,
      hasMastery: feats.some((x) => /^Weapon Mastery\|/.test(x.uid)),
      skills: chooseSpec(sp.skills), tools: chooseSpec(sp.tools), multiclassSkills: chooseSpec(c.multiclassing?.proficienciesGained?.skills),
      equipmentOptions: (c.startingEquipment?.defaultData ?? []).flatMap((o) => Object.keys(o).filter((k) => /^[A-Z]$/.test(k))),
      casting: c.spellcastingAbility ? {
        ability: c.spellcastingAbility, progression: c.casterProgression ?? null, preparedChange: c.preparedSpellsChange ?? null,
        cantrips: c.cantripProgression ?? null, prepared: c.preparedSpellsProgression ?? null, known: c.spellsKnownProgression ?? null,
      } : null,
    };
  }
  for (const s of d.subclass ?? []) {
    const features = {};
    for (const u of s.subclassFeatures ?? []) {
      const p = (typeof u === "string" ? u : u.subclassFeature).split("|");
      const sf = (d.subclassFeature ?? []).find((x) => x.name === p[0] && x.level === Number(p[5]) && x.source === (p[6] || s.source) && x.subclassShortName === s.shortName);
      if (!sf) continue;
      const opts = optionNames(sf.entries);
      if (opts.length) features[p[0]] = { level: Number(p[5]), options: opts };
    }
    const options = {};
    for (const o of s.optionalfeatureProgression ?? []) options[o.featureType.join("/")] = { name: o.name, progression: progressionMap(o.progression) };
    const spells = additionalSpellsSpec(s.additionalSpells);
    subclasses[[s.name, s.className, s.classSource, s.source].join("|")] = {
      name: s.name, shortName: s.shortName, className: s.className, classSource: s.classSource, source: s.source, edition: edition(s), srd: isSrd(s),
      features, options, grantedSpells: spells?.fixed ?? [], casting: s.spellcastingAbility ? { ability: s.spellcastingAbility, progression: s.casterProgression ?? null, cantrips: s.cantripProgression ?? null, prepared: s.preparedSpellsProgression ?? null, known: s.spellsKnownProgression ?? null } : null,
    };
  }
}

// ── species ───────────────────────────────────────────────────────────────────
const species = {};
for (const r of load("races.json").race ?? []) {
  const versions = (r._versions ?? []).map((v) => v.name).filter(Boolean).map((n) => n.replace(new RegExp(`^${r.name}; `), "").replace(/ (Lineage|Legacy|Ancestry)$/, ""));
  const sp = additionalSpellsSpec(r.additionalSpells);
  species[uid(r)] = {
    name: r.name, source: r.source, edition: edition(r), srd: isSrd(r), size: r.size ?? null,
    skills: chooseSpec(r.skillProficiencies), tools: chooseSpec(r.toolProficiencies), languages: chooseSpec(r.languageProficiencies),
    ability: abilitySpec(r.ability), feats: (r.feats ?? []).map((f) => f.anyFromCategory ? { category: f.anyFromCategory.category, count: f.anyFromCategory.count ?? 1 } : { fixed: Object.keys(f) }),
    versions, spellGroups: sp?.groups ?? [], spellAbility: sp?.ability ?? null, cantripChoose: sp?.cantripChoose ?? 0, grantedSpells: sp?.fixed ?? [],
  };
}

// 2014-style subraces become their own species entries, named the 5etools way: "Elf (Wood)|PHB".
for (const s of load("races.json").subrace ?? []) {
  if (!s.name || !s.raceName) continue;
  const base = species[`${s.raceName}|${s.raceSource ?? s.source}`];
  if (!base) continue;
  const sp = additionalSpellsSpec(s.additionalSpells);
  const merge = (a, b) => (a && b ? { fixed: [...a.fixed, ...b.fixed], choose: b.choose ?? a.choose, any: a.any + b.any } : b ?? a);
  species[`${s.raceName} (${s.name})|${s.source}`] = {
    ...base, name: `${s.raceName} (${s.name})`, source: s.source, edition: edition({ source: s.source }) ?? base.edition, srd: Boolean(base.srd || isSrd(s)),
    subraceOf: `${s.raceName}|${s.raceSource ?? s.source}`,
    skills: merge(base.skills, chooseSpec(s.skillProficiencies)), tools: merge(base.tools, chooseSpec(s.toolProficiencies)), languages: merge(base.languages, chooseSpec(s.languageProficiencies)),
    ability: abilitySpec([...(load("races.json").race.find((r) => r.name === s.raceName && r.source === (s.raceSource ?? s.source))?.ability ?? []), ...(s.ability ?? [])]),
    versions: (s._versions ?? []).map((v) => v.name).filter(Boolean),
    spellGroups: sp?.groups ?? base.spellGroups, spellAbility: sp?.ability ?? base.spellAbility, cantripChoose: sp?.cantripChoose ?? base.cantripChoose, grantedSpells: [...new Set([...base.grantedSpells, ...(sp?.fixed ?? [])])],
  };
}

// ── backgrounds ───────────────────────────────────────────────────────────────
const backgrounds = {};
for (const b of load("backgrounds.json").background ?? []) {
  backgrounds[uid(b)] = {
    name: b.name, source: b.source, edition: edition(b), srd: isSrd(b),
    ability: abilitySpec(b.ability), skills: chooseSpec(b.skillProficiencies), tools: chooseSpec(b.toolProficiencies), languages: chooseSpec(b.languageProficiencies),
    feats: (b.feats ?? []).flatMap((f) => Object.keys(f).map((k) => k.split("|")[0])),
    equipmentOptions: (b.startingEquipment ?? []).flatMap((o) => Object.keys(o).filter((k) => /^[A-Z]$/.test(k))),
  };
}

// ── feats ─────────────────────────────────────────────────────────────────────
const feats = {};
for (const f of load("feats.json").feat ?? []) {
  const sp = additionalSpellsSpec(f.additionalSpells);
  const ab = abilitySpec(f.ability);
  feats[uid(f)] = {
    name: f.name, source: f.source, edition: edition(f), srd: isSrd(f), category: f.category ?? null, repeatable: Boolean(f.repeatable),
    abilityChoose: ab?.choose ? ab.choose.from ?? null : sp?.ability ?? null, skills: chooseSpec(f.skillProficiencies), tools: chooseSpec(f.toolProficiencies),
    expertise: chooseSpec(f.expertise), versions: (f._versions ?? []).map((v) => v.name).filter(Boolean).map((n) => n.replace(new RegExp(`^${f.name}; `), "")),
    cantripChoose: sp?.cantripChoose ?? 0, spellChoose: sp?.choose ?? 0, grantedSpells: sp?.fixed ?? [],
    prereqLevel: (f.prerequisite ?? []).map((p) => p.level?.level ?? p.level).find((x) => typeof x === "number") ?? null,
  };
}

// ── optional features, spells, items ──────────────────────────────────────────
const optionalFeatures = {}, families = {};
for (const o of load("optionalfeatures.json").optionalfeature ?? []) {
  optionalFeatures[uid(o)] = { name: o.name, source: o.source, edition: edition(o), srd: isSrd(o), types: o.featureType, prereqLevel: (o.prerequisite ?? []).map((p) => p.level?.level ?? p.level).find((x) => typeof x === "number") ?? null };
}
Object.assign(families, { EI: "Eldritch Invocations", MM: "Metamagic", "MV:B": "Maneuvers", "MV:C2-UA": "Maneuvers (UA)", AI: "Artificer Infusions", AS: "Arcane Shots", RN: "Runes", ED: "Elemental Disciplines", PB: "Pact Boons", "FS:F": "Fighting Styles (Fighter)", "FS:R": "Fighting Styles (Ranger)", "FS:P": "Fighting Styles (Paladin)", "FS:B": "Fighting Styles (Bard)", OTH: "Other", "FS:F/FS:P/FS:R": "Fighting Styles" });
const spells = {};
for (const f of listDir("spells", "spells-")) for (const s of load(join("spells", f)).spell ?? []) spells[uid(s)] = { name: s.name, source: s.source, edition: edition(s), srd: isSrd(s), level: s.level };
const items = {};
for (const i of load("items.json").item ?? []) items[uid(i)] = { name: i.name, source: i.source, edition: edition(i), srd: isSrd(i), rarity: i.rarity ?? "none", attune: Boolean(i.reqAttune) };
for (const i of load("items-base.json").baseitem ?? []) items[uid(i)] = { name: i.name, source: i.source, edition: edition(i), srd: isSrd(i), rarity: "none", attune: false };

for (const tbl of [classes, subclasses, species, backgrounds, feats, optionalFeatures, spells, items]) for (const e of Object.values(tbl)) e.core = core(e);
const meta = { mirror: root, generated: new Date().toISOString().slice(0, 10), counts: {} };
const full = { meta, classes, subclasses, species, backgrounds, feats, optionalFeatures, families, spells, items };
for (const k of Object.keys(full)) if (k !== "meta" && k !== "families") meta.counts[k] = Object.keys(full[k]).length;

const srdFilter = (tbl) => Object.fromEntries(Object.entries(tbl).filter(([, v]) => v.srd));
const srd = { meta: { ...meta, subset: "srd" }, families, ...Object.fromEntries(["classes", "subclasses", "species", "backgrounds", "feats", "optionalFeatures", "spells", "items"].map((k) => [k, srdFilter(full[k])])) };
srd.meta.counts = Object.fromEntries(Object.keys(meta.counts).map((k) => [k, Object.keys(srd[k]).length]));

mkdirSync(new URL("../data/srd/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/slots.json", import.meta.url), JSON.stringify(full));
writeFileSync(new URL("../data/srd/slots.json", import.meta.url), JSON.stringify(srd));
console.log("full", meta.counts);
console.log("srd ", srd.meta.counts);

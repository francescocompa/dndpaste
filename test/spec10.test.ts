// SPEC 0.10 (D280–D283, D286): a species' defining pick on the Species line. One describe per decision.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, tidy, applyFix, type Paste } from "../src/dndpaste.js";
import { check, normalise, speciesPicks, shortLineage, speciesLineage, type Slots, type Supplement, type Finding } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;

const codes = (p: Paste) => p.diagnostics.map((d) => d.code);
const species = (text: string) => { const sp = parse(text).entities.find((e) => e.key === "Species"); return sp?.item ? emit({ identifier: null, header: new Map(), entities: [sp], levels: [], diagnostics: [] }).split("\n")[0] : null; };
const sp = (f: Finding[]) => f.filter((x) => x.where === "Species").map((x) => `${x.kind}|${x.severity}|${x.message}`);
const run = (text: string) => check(parse(text), srd, supplement);

describe("D280, D281: the defining pick, then its ability, in brackets on the Species line", () => {
  test("the bracket form reads clean and emits as written", () => {
    for (const t of ["Species: Elf [Drow; WIS]", "Species: Dragonborn [Black]", "Species: Goliath [Fire]", "Species: Tiefling|XPHB [Infernal; CHA]", "Species: Elf|PHB [Wood]"]) {
      assert.deepEqual(codes(parse(t)), [], t);
      assert.equal(emit(parse(t)), t + "\n", t);
    }
  });
  test("an Ability line in the Species block folds into the brackets with no warning", () => {
    const p = parse("Species: Elf [Drow]\nSkills: Perception\nAbility: WIS");
    assert.deepEqual(codes(p), []);
    assert.equal(emit(p), "Species: Elf [Drow; WIS]\nSkills: Perception\n");
  });
  test("speciesPicks reads the lineage and the ability, in either order", () => {
    const pick = (t: string) => { const it = parse(t).entities[0].item; const r = it ? speciesPicks(it) : null; return [r?.lineage?.ref.name ?? null, r?.ability?.[0].ref.name ?? null]; };
    assert.deepEqual(pick("Species: Elf [Drow; WIS]"), ["Drow", "WIS"]);
    assert.deepEqual(pick("Species: Elf [WIS; Drow]"), ["Drow", "WIS"]);
    assert.deepEqual(pick("Species: Elf [Drow]"), ["Drow", null]);
    assert.deepEqual(pick("Species: Elf"), [null, null]);
  });
});

describe("D283: a 0.9 defining-pick Feature line reads with W006 and moves onto the Species line", () => {
  test("each 0.9 spelling, the ability first or none", () => {
    const cases: [string, string][] = [
      ["Species: Elf\nFeature: Elven Lineage [WIS; Wood]", "Species: Elf [Wood; WIS]"],
      ["Species: Elf\nFeature: Elven Lineage [Drow]", "Species: Elf [Drow]"],
      ["Species: Tiefling|XPHB\nFeature: Fiendish Legacy [CHA; Infernal]", "Species: Tiefling|XPHB [Infernal; CHA]"],
      ["Species: Dragonborn\nFeature: Draconic Ancestry [Red]", "Species: Dragonborn [Red]"],
      ["Species: Goliath\nFeature: Giant Ancestry [Fire Giant]", "Species: Goliath [Fire Giant]"],
      ["Species: Gnome\nFeature: Gnomish Lineage [INT; Rock Gnome]", "Species: Gnome [Rock Gnome; INT]"],
    ];
    for (const [old, now] of cases) {
      const p = parse(old);
      assert.deepEqual(codes(p), ["W006"], old);
      assert.equal(emit(p), now + "\n", old);
      assert.equal(tidy(old), now + "\n", "Tidy writes it");
      const fix = p.diagnostics[0].fix;
      assert.ok(fix?.safe, old);
      assert.equal(applyFix(old, fix), now, "the one-click fix writes the same");
    }
  });
  test("other Species features stay; a level block's or the header's lineage-named feature stays", () => {
    assert.equal(emit(parse("Species: Elf\nFeature: Elven Lineage [Wood], Size [Small]")), "Species: Elf [Wood]\nFeature: Size [Small]\n");
    assert.deepEqual(codes(parse("Classes: Sorcerer 3\n\nL3 Sorcerer\nFeature: Draconic Ancestry [Red]")), []);
    assert.deepEqual(codes(parse("Feature: Draconic Ancestry [Red]\n\nSpecies: Dragonborn")), []);
  });
  test("a Species line that already names a lineage keeps the Feature line as written", () => {
    const p = parse("Species: Elf [Drow]\nFeature: Elven Lineage [Wood]");
    assert.deepEqual(codes(p), []);
    assert.equal(emit(p), "Species: Elf [Drow]\nFeature: Elven Lineage [Wood]\n");
  });
  test("a 0.7 Ability line and a 0.9 lineage line make the bracket form", () => {
    assert.equal(tidy("Species: Elf\nAbility: WIS\nFeature: Elven Lineage [Wood]"), "Species: Elf [Wood; WIS]\n");
  });
});

describe("D282: a 2014 subrace is the same form; Elf (Wood) reads with W007", () => {
  test("Elf (Wood)|PHB reads as Elf|PHB [Wood], and Tidy writes it", () => {
    const p = parse("Rules: 2014\n\nSpecies: Elf (Wood)|PHB");
    assert.deepEqual(codes(p), ["W007"]);
    assert.equal(species("Species: Elf (Wood)|PHB"), "Species: Elf|PHB [Wood]");
    assert.equal(tidy("Species: Elf (Wood)|PHB"), "Species: Elf|PHB [Wood]\n");
    const one = parse("Species: Elf (Wood)|PHB").diagnostics[0].fix;
    assert.equal(applyFix("Species: Elf (Wood)|PHB", one ?? { label: "", safe: true, edits: [] }), "Species: Elf|PHB [Wood]");
  });
  test("names with more than a variant stay as written", () => {
    assert.deepEqual(codes(parse('Species: "Half-Elf (Variant; Drow Descent)"|SCAG')), []);
    assert.equal(species("Species: Elf (Kaladesh) (Vahadar)|PSK"), "Species: Elf (Kaladesh)|PSK [Vahadar]");
  });
  test("the checker maps Elf [Wood] to the data's Elf (Wood)", () => {
    assert.deepEqual(sp(run("Rules: 2014\nClasses: Druid 1\n\nSpecies: Elf|PHB [Wood]")).filter((x) => /unresolved|lineage|extra/.test(x)), []);
    assert.deepEqual(sp(run("Rules: 2014\nClasses: Druid 1\n\nSpecies: Dwarf [Hill]")).filter((x) => /unresolved|lineage|extra/.test(x)), []);
    assert.deepEqual(sp(run("Rules: 2014\nClasses: Druid 1\n\nSpecies: Elf (Wood)|PHB")), sp(run("Rules: 2014\nClasses: Druid 1\n\nSpecies: Elf|PHB [Wood]")), "both spellings check the same");
  });
});

describe("D286: the source goes after the name, before the brackets", () => {
  test("Name [details]|SOURCE is E011 with a safe fix that Tidy makes", () => {
    for (const [bad, good] of [["Species: Elf [Wood]|PHB", "Species: Elf|PHB [Wood]"], ["Feat: Fey Touched [CHA]|TCE", "Feat: Fey Touched|TCE [CHA]"]]) {
      const p = parse(bad);
      assert.deepEqual(codes(p), ["E011"], bad);
      assert.match(p.diagnostics[0].message, /source goes after the name/);
      assert.ok(p.diagnostics[0].fix?.safe);
      assert.equal(tidy(bad), good + "\n");
    }
  });
});

describe("D280, D35: the checker owns the defining pick's slots", () => {
  test("a lineage the species offers, short or long, and its ability", () => {
    for (const t of ["Species: Elf [Drow; WIS]", "Species: Elf [High Elf; INT]", "Species: Dragonborn [Red]", "Species: Goliath [Fire]", "Species: Tiefling [Infernal; CHA]", "Species: Gnome [Rock; INT]"]) {
      assert.deepEqual(sp(run(`Rules: 2024\nClasses: Fighter 1\n\n${t}`)).filter((x) => !/Skills|Cantrips|Languages|Feat/.test(x)), [], t);
    }
  });
  test("a missing lineage names the bracket form, with short names", () => {
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Elf")).includes("missing|warning|Elf asks for a lineage (Elven Lineage): Elf [Drow | High | Wood]"));
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Dragonborn")).some((x) => x.startsWith("missing|warning|Dragonborn asks for a lineage (Draconic Ancestry): Dragonborn [Black | Blue")));
  });
  test("a missing ability is info; a wrong one or one nobody asks is reported", () => {
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Gnome [Rock]")).includes("missing|info|Gnome asks for a spellcasting ability: Gnome [Rock; INT | WIS | CHA]"));
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Elf [Drow; STR]")).some((x) => x.startsWith("unresolved|info|Elf's spellcasting ability is one of INT, WIS, CHA")));
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Goliath [Fire; STR]")).some((x) => x.startsWith("extra|info|Goliath asks for no ability")));
  });
  test("a lineage the species doesn't offer, or a species with none", () => {
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Dragonborn [Purple]")).some((x) => x.startsWith('unresolved|info|"Draconic Ancestry" pick "Purple" is not one of: Black, Blue')));
    assert.ok(sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Human [Wood]")).some((x) => x.startsWith('extra|info|Human has no lineage the data knows; "Wood"')));
  });
  test("shortLineage drops the word that repeats the species or the trait", () => {
    assert.equal(shortLineage("High Elf", "Elf", "Elven Lineage"), "High");
    assert.equal(shortLineage("Fire Giant", "Goliath", "Giant Ancestry"), "Fire");
    assert.equal(shortLineage("Rock Gnome", "Gnome", "Gnomish Lineage"), "Rock");
    assert.equal(shortLineage("Infernal", "Tiefling", "Fiendish Legacy"), "Infernal");
  });
});

describe("D287: a lineage written before the species' name reads with data, and Tidy with data writes the brackets", () => {
  const withData = (t: string) => tidy(t, { species: (it, rules) => speciesLineage(it, srd, supplement, rules) });
  test("Wood Elf, Black Dragonborn, Hill Dwarf", () => {
    assert.equal(withData("Species: Wood Elf"), "Species: Elf [Wood]\n");
    assert.equal(withData("Species: Black Dragonborn"), "Species: Dragonborn [Black]\n");
    assert.equal(withData("Rules: 2014\n\nSpecies: Hill Dwarf"), "Rules: 2014\n\nSpecies: Dwarf [Hill]\n");
    assert.equal(withData("Species: Drow Elf [WIS]"), "Species: Elf [Drow; WIS]\n", "an ability already written stays after the lineage");
  });
  test("the parser alone keeps the name; a real species name or one with no such lineage stays", () => {
    assert.deepEqual(codes(parse("Species: Wood Elf")), []);
    assert.equal(tidy("Species: Wood Elf"), "Species: Wood Elf\n");
    assert.equal(withData("Species: Half-Elf"), "Species: Half-Elf\n");
    assert.equal(withData("Species: Purple Dragonborn"), "Species: Purple Dragonborn\n");
  });
  test("the checker reads it as the bracket form, with an info, and normalise writes it", () => {
    const f = sp(run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Black Dragonborn"));
    assert.ok(f.includes('unresolved|info|"Black Dragonborn" reads as Dragonborn [Black]; Tidy writes it that way'), JSON.stringify(f));
    assert.ok(!f.some((x) => /matches nothing|asks for a lineage/.test(x)), JSON.stringify(f));
    assert.equal(emit(normalise(parse("Species: Black Dragonborn"), srd, supplement)), "Species: Dragonborn [Black]\n");
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit } from "../src/dndpaste.js";
import { check, normalise, type Slots, type Supplement, type Finding } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;
const fullPath = join(root, "data", "slots.json");
const full = existsSync(fullPath) ? (JSON.parse(readFileSync(fullPath, "utf8")) as Slots) : null;

const run = (text: string, slots: Slots = srd) => {
  const p = parse(text);
  assert.deepEqual(p.diagnostics.filter((d) => d.code.startsWith("E")), [], "grammar must be clean for a checker test");
  return check(p, slots, supplement);
};
const kinds = (f: Finding[], kind: string) => f.filter((x) => x.kind === kind);
const has = (f: Finding[], kind: string, re: RegExp) => f.some((x) => x.kind === kind && re.test(x.message));

test("no finding is ever an error", () => {
  const f = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Alert, Savage Attacker");
  assert.ok(f.every((x) => x.severity === "warning" || x.severity === "info"));
});

test("empty and sparse pastes check without crashing", () => {
  assert.deepEqual(run(""), []);
  const f = run("Classes: Fighter");
  assert.equal(kinds(f, "missing").length, 0, "unknown levels owe nothing");
});

test("Fighter 1 with nothing: owes skills, fighting style, masteries", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1");
  assert.ok(has(f, "missing", /2 more Skills/), JSON.stringify(f));
  assert.ok(has(f, "missing", /Fighting Style/));
  assert.ok(has(f, "missing", /Masteries/));
});

test("a complete Fighter 3 Champion is quiet", () => {
  const f = run([
    "Rules: 2024", "Classes: Fighter 3", "",
    "L1 Fighter", "Skills: Athletics, Perception", "Fighting Style: Archery", "Masteries: Longbow, Shortsword, Greatsword",
    "L3 Fighter", "Subclass: Champion",
  ].join("\n"));
  assert.deepEqual(f.filter((x) => x.severity === "warning"), [], JSON.stringify(f));
});

test("extras are accepted and flagged as info (D34)", () => {
  const f = run("Rules: 2024\nClasses: Fighter 4\n\nL1 Fighter\nSkills: Athletics, Perception\nFighting Style: Archery\nMasteries: Longbow, Shortsword, Greatsword\n\nL4 Fighter\nFeat: Alert, Savage Attacker");
  assert.equal(kinds(f, "extra").length, 1, JSON.stringify(f));
  assert.match(kinds(f, "extra")[0].message, /ASI\/Feat/);
  const g = run("Rules: 2024\nClasses: Fighter 4\n\nL1 Fighter\nSkills: Athletics, Perception\nFighting Style: Archery\nMasteries: Longbow, Shortsword, Greatsword\n\nL2 Fighter\nFighting Style: Defense\n\nL4 Fighter\nFeat: Alert");
  const extra = kinds(g, "extra");
  assert.equal(extra.length, 1, JSON.stringify(g));
  assert.equal(extra[0].severity, "info");
  assert.match(extra[0].message, /Fighting Style/);
  assert.match(extra[0].message, /DM boon/);
});

test("Items are resolved but never owed", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nSkills: Athletics, Perception\nFighting Style: Archery\nMasteries: Longbow, Shortsword, Greatsword\nItems: Bag of Holding, Sword of Nowhere");
  assert.equal(kinds(f, "missing").length, 0);
  const u = kinds(f, "unresolved").filter((x) => /matches nothing/.test(x.message));
  assert.equal(u.length, 1, JSON.stringify(f));
  assert.match(u[0].message, /Sword of Nowhere/);
  assert.equal(u[0].severity, "info");
});

test("subclass at the wrong class level is misplaced", () => {
  const f = run("Rules: 2024\nClasses: Fighter 2\n\nL2 Fighter\nSubclass: Champion");
  assert.ok(has(f, "misplaced", /class level 3/), JSON.stringify(f));
});

test("origin feat in an ASI slot is misplaced; unknown feat is unresolved", () => {
  const f = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Magic Initiate [WIS; Cleric]");
  assert.ok(has(f, "misplaced", /Origin feat/));
  const g = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Totally Made Up");
  assert.ok(has(g, "unresolved", /Totally Made Up/));
});

test("feat detail slots: ability and version", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Human\nFeat: Magic Initiate");
  assert.ok(has(f, "missing", /ability pick/), JSON.stringify(f));
  assert.ok(has(f, "missing", /version/));
});

test("Prepared under a level-up picker is redundant and normalise drops it", () => {
  const text = "Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nSkills: Arcana, Deception\nOptions: Pact of the Blade\nCantrips: Eldritch Blast, Chill Touch\nSpells: Hellish Rebuke, Charm Person\nPrepared: Hellish Rebuke, Charm Person";
  const p = parse(text);
  const f = check(p, srd, supplement);
  assert.ok(has(f, "redundant", /prepared spells/i), JSON.stringify(f));
  assert.deepEqual(f.filter((x) => x.severity === "warning"), [], JSON.stringify(f));
  const n = normalise(p, srd, supplement);
  assert.equal(n.levels[0].lines.has("Prepared"), false);
  assert.equal(p.levels[0].lines.has("Prepared"), true, "normalise must not mutate its input");
  assert.doesNotMatch(emit(n), /Prepared/);
});

test("unplaced picks in a multiclass are assigned and reported", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1 / Rogue 1\nSkills: Athletics, Perception, Stealth, Sleight of Hand, Acrobatics, Deception");
  assert.ok(kinds(f, "unplaced").length >= 1, JSON.stringify(f));
});

test("species block: lineage, skill, ability", () => {
  const f = run("Rules: 2024\nClasses: Druid 1\n\nSpecies: Elf");
  assert.ok(has(f, "missing", /Elven Lineage/), JSON.stringify(f));
  assert.ok(has(f, "missing", /Skills/));
  const g = run("Rules: 2024\nClasses: Druid 1\n\nSpecies: Elf\nAbility: WIS\nSkills: Perception\nFeature: Elven Lineage [Wood]");
  assert.equal(g.filter((x) => x.where === "Species" && x.severity === "warning").length, 0, JSON.stringify(g));
});

test("official background: ASI owed, granted skills redundant", () => {
  const f = run("Rules: 2024\nClasses: Wizard 1\n\nBackground: Sage");
  assert.ok(has(f, "missing", /ability bonuses/), JSON.stringify(f));
  const g = run("Rules: 2024\nClasses: Wizard 1\n\nBackground: Sage\nASI: +2 INT, +1 CON\nSkills: Arcana");
  assert.ok(has(g, "redundant", /Arcana/));
});

test("fixtures: all check without throwing; SRD ones are warning-free where expected", () => {
  const f = run(readFileSync(join(root, "fixtures", "druid-custom-background.dndpaste"), "utf8"));
  // Circle of the Moon and Thorn Whip are not SRD: unresolved, plus the consequent "owes a Subclass/Cantrip" — nothing else may warn.
  for (const w of f.filter((x) => x.severity === "warning")) assert.match(w.message, /Circle of the Moon|Thorn Whip|Subclass|Cantrips/, JSON.stringify(f));
});

test("every fixture checks without throwing (SRD table)", () => {
  for (const f of readdirSync(join(root, "fixtures")).filter((n) => n.endsWith(".dndpaste"))) {
    const fs = run(readFileSync(join(root, "fixtures", f), "utf8"));
    assert.ok(fs.every((x) => x.kind !== "CRASH" && (x.severity === "warning" || x.severity === "info")), f);
  }
});

test("size: Medium is silent, an invalid size is reported", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Human\nSkills: Athletics\nFeat: Alert");
  assert.equal(f.filter((x) => /size/i.test(x.message)).length, 0, JSON.stringify(f));
  const g = run("Rules: 2024\nClasses: Fighter 1\n\nSpecies: Human\nFeature: Size [Large]");
  assert.ok(has(g, "unresolved", /size must be one of/));
});

test("+N prefix resolves the base item", () => {
  const f = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nItems: +1 Longsword, +2 Nonsense Blade");
  const u = kinds(f, "unresolved").filter((x) => /matches nothing/.test(x.message));
  assert.equal(u.length, 1, JSON.stringify(f));
  assert.match(u[0].message, /Nonsense/);
});

test("real builds against the full extract (skipped when data/slots.json is absent)", { skip: !full }, () => {
  for (const name of ["shigen", "vice"]) {
    const f = run(readFileSync(join(root, "fixtures", `${name}.dndpaste`), "utf8"), full as Slots);
    const warnings = f.filter((x) => x.severity === "warning");
    // Allowed: homebrew refs (|HB), skills the sheets never recorded, and two genuine sheet defects the
    // checker caught — Agonizing Blast taken at Warlock 1 (needs 2) and Vice one prepared spell short.
    for (const w of warnings) assert.match(w.message, /\|HB|Skills|Agonizing Blast|owes 1 more Spells/, `${name}: ${w.message}`);
  }
});

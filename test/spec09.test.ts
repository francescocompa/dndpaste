// SPEC 0.9 (D180–D185): family keys, the Options family marker, the spell level cap. One describe per decision.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, keyDef, keyGroup, levelCap, familyOf, scopeLines, KEYS, type Paste, type Value } from "../src/dndpaste.js";
import { check, normalise, type Slots, type Supplement, type Finding } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const fixtures = join(root, "fixtures");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;

const codes = (p: Paste) => p.diagnostics.map((d) => d.code);
const names = (v: Value | undefined) => (v && v.type === "items" ? v.items.map((i) => i.ref.name) : null);
const canon = (text: string) => emit(parse(text));
const run = (text: string): Finding[] => {
  const p = parse(text);
  assert.deepEqual(p.diagnostics.filter((d) => d.code.startsWith("E")), [], JSON.stringify(p.diagnostics));
  return check(p, srd, supplement);
};
const lines = (f: Finding[]) => f.map((x) => `${x.kind}|${x.severity}|${x.where}|${x.message}`).sort();
const read = (rel: string) => readFileSync(join(fixtures, rel), "utf8");

describe("D180: option families get their own keys; Options stays", () => {
  test("each family key is a list key in H and L, after Masteries and before Options", () => {
    const fam = KEYS.filter((k) => k.family?.codes.length).map((k) => k.key);
    assert.deepEqual(fam, ["Invocations", "Metamagic", "Maneuvers", "Infusions", "Arcane Shots", "Runes", "Disciplines", "Pact Boon"]);
    const order = KEYS.map((k) => k.key);
    assert.ok(order.indexOf("Masteries") < order.indexOf("Invocations") && order.indexOf("Pact Boon") < order.indexOf("Options"));
    for (const k of fam) assert.deepEqual(keyDef(k)?.scopes, ["H", "L"], k);
    assert.deepEqual(codes(parse("Species: Elf\nInvocations: Agonizing Blast")), ["E005"]);
  });
  test("a family line reads and emits as written, beside a plain Options line", () => {
    const text = "L5 Warlock\nInvocations: Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]\nOptions: Pact of the Tome\n";
    const p = parse(text);
    assert.deepEqual(codes(p), []);
    assert.deepEqual(names(p.levels[0].lines.get("Invocations")), ["Agonizing Blast", "Repelling Blast"]);
    assert.equal(emit(p), text);
  });
  test("canonical order: Masteries, the families in table order, Options; a 0.8 paste emits unchanged", () => {
    assert.equal(canon("L3 Fighter\nOptions: X\nManeuvers: Riposte\nMetamagic: Quickened Spell\nMasteries: Longsword"),
      "L3 Fighter\nMasteries: Longsword\nMetamagic: Quickened Spell\nManeuvers: Riposte\nOptions: X\n");
    for (const f of ["mc-planned-20.dndpaste", "heavenly-archer-v3.dndpaste", "flat-multiclass.dndpaste"]) assert.equal(canon(read(f)), read(f), f);
  });
  test("a family key gets the W002 bracket hint, a drop and an empty value like Options", () => {
    assert.deepEqual(codes(parse("Invocations: Agonizing Blast (Eldritch Blast)")), ["W002"]);
    assert.deepEqual(codes(parse("L5 Warlock\nInvocations: -Agonizing Blast\nMetamagic:")), ["W004"]);
  });
  test("the key group: option families read as Options, Masteries as itself", () => {
    assert.equal(keyGroup("Invocations"), "Options");
    assert.equal(keyGroup("Options (Soul Techniques)"), "Options");
    assert.equal(keyGroup("Masteries"), "Masteries");
    assert.equal(keyGroup("Spells (3rd)"), "Spells");
    assert.deepEqual(familyOf("Maneuvers"), { codes: ["MV"] });
    assert.equal(familyOf("Options"), null);
  });
});

describe("D181: Options takes a family marker; a family's name folds into its key", () => {
  test("singular or plural, any case, folds; emit writes the family key", () => {
    for (const m of ["Invocation", "invocations", "INVOCATION"]) {
      const p = parse(`L2 Warlock\nOptions (${m}): Agonizing Blast`);
      assert.deepEqual(codes(p), [], m);
      assert.deepEqual([...p.levels[0].lines.keys()], ["Invocations"], m);
      assert.equal(emit(p), "L2 Warlock\nInvocations: Agonizing Blast\n", m);
    }
    assert.equal(keyDef("Options (Pact Boons)")?.key, "Pact Boon");
  });
  test("the long-form fixture emits as its canonical sibling, with no diagnostics", () => {
    const p = parse(read("noncanonical/mc-planned-20-families.dndpaste"));
    assert.deepEqual(codes(p), []);
    assert.equal(emit(p), read("mc-planned-20-families.dndpaste"));
  });
  test("any other marker is an open list, kept as written and sorted after Options", () => {
    const p = parse("L3 Monk\nOptions (Soul Techniques): Inner Flame\nOptions: X");
    assert.deepEqual(codes(p), []);
    assert.deepEqual(scopeLines(p.levels[0].lines).map(([k]) => k), ["Options", "Options (Soul Techniques)"]);
    assert.deepEqual(familyOf("Options (Soul Techniques)"), { marker: "Soul Techniques" });
  });
  test("two spellings of one line in a scope are E003; an empty marker is E002", () => {
    assert.deepEqual(codes(parse("L2 Warlock\nInvocations: Agonizing Blast\nOptions (Invocation): Repelling Blast")), ["E003"]);
    assert.deepEqual(codes(parse("Options (Soul Techniques): A\nOptions (soul techniques): B")), ["E003"]);
    assert.deepEqual(codes(parse("Options (): A")), ["E002"]);
    assert.deepEqual(codes(parse("Invocations (Eldritch): A")), ["E002"], "a family key takes no marker of its own");
  });
});

describe("D182: Masteries is an Options family", () => {
  test("Options (Masteries) and Options (Mastery) read as Masteries; the AST key stays Masteries", () => {
    for (const m of ["Masteries", "mastery"]) {
      const p = parse(`L1 Fighter\nOptions (${m}): Longsword, Shortbow`);
      assert.deepEqual(codes(p), [], m);
      assert.deepEqual(names(p.levels[0].lines.get("Masteries")), ["Longsword", "Shortbow"], m);
    }
    assert.deepEqual(codes(parse("L1 Fighter\nMasteries: Longsword\nOptions (Mastery): Shortbow")), ["E003"]);
  });
});

describe("D183: class-feature picks stay Feature lines", () => {
  test("Feature takes no marker; there is no feature-name key", () => {
    assert.deepEqual(codes(parse("Feature (Divine Order): Thaumaturge")), ["E002"]);
    assert.deepEqual(codes(parse("Divine Order: Thaumaturge")), ["E002"]);
    assert.deepEqual(codes(parse("L1 Cleric\nFeature: Divine Order [Thaumaturge; Guidance]")), []);
  });
});

describe("D184: Spells and Prepared take a level cap", () => {
  test("an ordinal 1st–9th, matched ignoring case, written lower case; its own line beside the uncapped one", () => {
    const p = parse("L11 Warlock\nSpells (6TH): Mass Suggestion\nSpells: Counterspell");
    assert.deepEqual(codes(p), []);
    assert.deepEqual(names(p.levels[0].lines.get("Spells (6th)")), ["Mass Suggestion"]);
    assert.equal(emit(p), "L11 Warlock\nSpells: Counterspell\nSpells (6th): Mass Suggestion\n");
    assert.equal(levelCap("Spells (6th)"), 6);
    assert.equal(levelCap("Prepared (1st)"), 1);
    assert.equal(levelCap("Spells"), null);
  });
  test("capped lines sort by level; Prepared takes a cap too, in its own scopes", () => {
    assert.equal(canon("L5 Wizard\nSpells (3rd): Fireball\nSpells (2nd): Misty Step\nPrepared (3rd): Fireball"),
      "L5 Wizard\nSpells (2nd): Misty Step\nSpells (3rd): Fireball\nPrepared (3rd): Fireball\n");
    assert.deepEqual(codes(parse("Species: Elf\nPrepared (1st): Bless")), ["E005"]);
    assert.deepEqual(codes(parse("Species: Elf\nSpells (1st): Bless")), []);
  });
  test("anything else in the parentheses, or a cap on another key, is E002; the same cap twice is E003", () => {
    for (const bad of ["Spells (3): Fireball", "Spells (cantrip): Light", "Spells (10th): Wish", "Spells (3th): Fireball", "Spells (0th): Light", "Cantrips (1st): Light", "Gear (3rd): Rope"]) {
      assert.deepEqual(codes(parse(bad)), ["E002"], bad);
    }
    assert.deepEqual(codes(parse("Spells (3rd): Fireball\nSpells (3RD): Fly")), ["E003"]);
    assert.deepEqual(codes(parse("Spells (3rd):")), ["W004"]);
  });
  test("the 0.9 fixture round-trips", () => {
    const text = read("mc-planned-20-families.dndpaste");
    const p = parse(text);
    assert.deepEqual(codes(p), []);
    assert.equal(emit(p), text);
  });
});

describe("D185: the checker checks each line against its own family and cap", () => {
  const warlock = "Rules: 2024\nClasses: Warlock 11\n\nL11 Warlock\n";
  test("family lines count into the same slots: the 0.9 fixture checks like its 0.8 twin", () => {
    const a = lines(run(read("mc-planned-20.dndpaste")));
    const b = lines(run(read("mc-planned-20-families.dndpaste")));
    assert.deepEqual(b, a);
  });
  test("an option of another family is misplaced", () => {
    const f = run(warlock + "Metamagic: Agonizing Blast");
    assert.ok(f.some((x) => x.kind === "misplaced" && x.severity === "warning" && /Agonizing Blast.*not Metamagic/.test(x.message)), JSON.stringify(f));
    assert.ok(!run(warlock + "Invocations: Agonizing Blast").some((x) => /not Invocations/.test(x.message)));
  });
  test("an open marker matches the table's family names and codes; a near miss gets a hint, an unknown one is accepted", () => {
    assert.ok(!run(warlock + "Options (Eldritch Invocations): Agonizing Blast").some((x) => x.key?.startsWith("Options (")));
    assert.ok(!run(warlock + "Options (EI): Agonizing Blast").some((x) => x.key?.startsWith("Options (")));
    const near = run(warlock + "Options (Manuevers): Riposte");
    assert.ok(near.some((x) => x.kind === "unresolved" && x.severity === "warning" && /did you mean "Maneuvers"/.test(x.message)), JSON.stringify(near));
    const open = run(warlock + "Options (Soul Techniques): Agonizing Blast");
    assert.ok(open.some((x) => x.kind === "unresolved" && x.severity === "info" && /not an option family .* accepted/.test(x.message)), JSON.stringify(open));
    const wrong = run(warlock + "Options (Metamagic): Agonizing Blast");
    assert.ok(wrong.some((x) => x.kind === "misplaced" && /not Metamagic/.test(x.message)), JSON.stringify(wrong));
    const open2 = run(warlock + "Options (Eldritch Invocations): Quickened Spell");
    assert.ok(open2.some((x) => x.kind === "misplaced" && /Quickened Spell.*not Options \(Eldritch Invocations\)/.test(x.message)), JSON.stringify(open2));
  });
  test("a spell above its line's cap is misplaced; at or below is fine; the cap is not judged against the class", () => {
    const f = run(warlock + "Spells (5th): Circle of Death");
    assert.ok(f.some((x) => x.kind === "misplaced" && x.severity === "warning" && /Circle of Death.*above this line's cap/.test(x.message)), JSON.stringify(f));
    assert.ok(!run(warlock + "Spells (6th): Circle of Death").some((x) => /above this line's cap/.test(x.message)));
    const high = run("Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nSpells (9th): Hex");
    assert.ok(!high.some((x) => /cap/.test(x.message)), "a 9th cap at Warlock 1 is not a finding");
  });
  test("normalise reaches into capped lines", () => {
    // A 2024 Warlock picks its prepared spells on level-up, so any Prepared line is redundant, a capped one too.
    const p = parse("Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nSpells: Hex\nPrepared (1st): Hex");
    assert.ok(check(p, srd, supplement).some((x) => x.kind === "redundant" && x.key === "Prepared"));
    assert.deepEqual([...normalise(p, srd, supplement).levels[0].lines.keys()], ["Spells"]);
  });
});

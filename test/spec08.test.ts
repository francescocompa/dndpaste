// SPEC 0.8 (D106–D113): one describe per decision, parser and checker side by side.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, isClean, keyDef, KEYS, LEGACY_KEYS, scopeLines, type Paste, type Value } from "../src/dndpaste.js";
import { check, normalise, finalScores, type Slots, type Supplement, type Finding } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const fixtures = join(root, "fixtures");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;

const codes = (p: Paste) => p.diagnostics.map((d) => d.code);
const run = (text: string, slots: Slots = srd) => {
  const p = parse(text);
  assert.deepEqual(p.diagnostics.filter((d) => d.code.startsWith("E")), [], JSON.stringify(p.diagnostics));
  return check(p, slots, supplement);
};
const has = (f: Finding[], kind: string, re: RegExp) => f.some((x) => x.kind === kind && re.test(x.message));
const names = (v: Value | undefined) => (v && v.type === "items" ? v.items.map((i) => i.ref.name) : null);
const canon = (text: string) => emit(parse(text));

describe("D106: named scores take / too", () => {
  test("STR 8/DEX 13/CON 14 parses like STR 8, DEX 13, CON 14", () => {
    const a = parse("Scores: STR 8/DEX 13/CON 14"), b = parse("Scores: STR 8, DEX 13, CON 14");
    assert.deepEqual(codes(a), []);
    assert.deepEqual(a.header.get("Scores"), b.header.get("Scores"));
    assert.equal(emit(a), "Scores: STR 8, DEX 13, CON 14\n");
  });
  test("any order, and all six named emit the six-number form", () => {
    assert.equal(canon("Scores: CHA 15/STR 8/DEX 13/CON 14/INT 12/WIS 10"), "Scores: 8/13/14/12/10/15\n");
  });
  test("numbers and names do not mix", () => {
    assert.deepEqual(codes(parse("Scores: DEX 15/13")), ["E012"]);
    assert.deepEqual(codes(parse("Scores: 8/13/14")), ["E012"]);
  });
});

describe("D107: an ability pick is the first detail slot of the thing that asks it", () => {
  test("the parser keeps it as an ordinary first group; the checker reads past it", () => {
    const p = parse("Rules: 2024\nClasses: Druid 1\n\nSpecies: Elf\nSkills: Perception\nFeature: Elven Lineage [INT; High Elf]");
    assert.deepEqual(codes(p), []);
    const f = check(p, srd, supplement);
    assert.ok(!has(f, "missing", /casting-ability/), JSON.stringify(f));
    assert.ok(!has(f, "unresolved", /Elven Lineage/), "the lineage pick is read after the ability slot");
    assert.ok(!has(f, "missing", /Elven Lineage/), JSON.stringify(f));
  });
  test("a species that asks a casting ability with none written is missing/info", () => {
    const f = run("Rules: 2024\nClasses: Druid 1\n\nSpecies: Elf\nSkills: Perception\nFeature: Elven Lineage [Wood]");
    const m = f.find((x) => x.kind === "missing" && /casting-ability/.test(x.message));
    assert.ok(m && m.severity === "info", JSON.stringify(f));
  });
  test("a feat that asks no ability has no leading slot; a 0.7 empty leading slot still reads", () => {
    const now = run("Rules: 2024\nClasses: Fighter 1\n\nBackground: Custom\nScores: +2 STR, +1 CON\nFeat: Skilled [Arcana, History, Insight]");
    assert.ok(!now.some((x) => x.key === "Feat"), JSON.stringify(now));
    const old = run("Rules: 2024\nClasses: Fighter 1\n\nBackground: Custom\nScores: +2 STR, +1 CON\nFeat: Skilled [; Arcana, History, Insight]");
    assert.ok(!old.some((x) => x.key === "Feat"), JSON.stringify(old));
  });
  test("a feat that asks an ability keeps it first, versions after it", () => {
    const ok = run("Rules: 2024\nClasses: Fighter 1\n\nBackground: Custom\nScores: +2 STR, +1 CON\nFeat: Magic Initiate [WIS; Cleric; Guidance, Light; Bless]");
    assert.ok(!has(ok, "missing", /version/), JSON.stringify(ok));
    const no = run("Rules: 2024\nClasses: Fighter 1\n\nBackground: Custom\nScores: +2 STR, +1 CON\nFeat: Magic Initiate [WIS]");
    assert.ok(has(no, "missing", /asks for a version in brackets, after its ability/), JSON.stringify(no));
  });
});

describe("D108: Scores holds increases too; the + decides", () => {
  test("an increase in a block, base and increase together in the header", () => {
    const p = parse("Scores: 8/13/14/12/10/15\nScores: +2 CHA\n\nBackground: Sage|XPHB\nScores: +1 INT, +1 CON\n\nL4 Fighter\nScores: +2 STR");
    assert.deepEqual(codes(p), []);
    const h = p.header.get("Scores");
    assert.ok(h && h.type === "scores");
    assert.deepEqual(h.values, [8, 13, 14, 12, 10, 15]);
    assert.deepEqual(h.increase, [{ amount: 2, ability: "CHA" }]);
    const b = p.entities[0].lines.get("Scores");
    assert.ok(b && b.type === "scores" && b.values.every((x) => x === null));
    assert.equal(emit(p), "Scores: 8/13/14/12/10/15\nScores: +2 CHA\n\nBackground: Sage|XPHB\nScores: +1 INT, +1 CON\n\nL4 Fighter\nScores: +2 STR\n");
    assert.deepEqual(scopeLines(p.header).map(([k]) => k), ["Scores", "Scores"], "one entry per line");
  });
  test("increase first, base second: the base still writes first", () => {
    assert.equal(canon("Scores: +2 CHA\nScores: 8/13/14/12/10/15"), "Scores: 8/13/14/12/10/15\nScores: +2 CHA\n");
  });
  test("a base outside the header is E005; a second base or a second increase is E003", () => {
    assert.deepEqual(codes(parse("Species: Elf\nScores: DEX 15")), ["E005"]);
    assert.deepEqual(codes(parse("Scores: 8/13/14/12/10/15\nScores: DEX 15")), ["E003"]);
    assert.deepEqual(codes(parse("Species: Elf\nScores: +2 DEX\nScores: +1 WIS")), ["E003"]);
  });
  test("the checker: a background's bonuses are a Scores increase; finalScores counts every increase", () => {
    const f = run("Rules: 2024\nScores: 10/10/10/10/10/10\nScores: +1 STR\nClasses: Wizard 4\n\nBackground: Sage|XPHB\nScores: +2 INT, +1 CON\n\nL4 Wizard\nScores: +1 WIS");
    assert.ok(!has(f, "missing", /ability bonuses/), JSON.stringify(f));
    const { scores } = finalScores(parse("Rules: 2024\nScores: 10/10/10/10/10/10\nScores: +1 STR\nClasses: Wizard 4\n\nBackground: Sage|XPHB\nScores: +2 INT, +1 CON\n\nL4 Wizard\nScores: +1 WIS"), srd, supplement);
    assert.deepEqual(scores, { str: 11, dex: 10, con: 11, int: 12, wis: 11, cha: 10 });
    const g = run("Rules: 2024\nClasses: Wizard 1\n\nBackground: Sage|XPHB\nSkills: Arcana");
    assert.ok(has(g, "missing", /asks for ability bonuses \(Scores:/), JSON.stringify(g));
  });
  test("a level's Scores increase is not its ASI (that is the feat line, D109)", () => {
    const f = run("Rules: 2024\nClasses: Fighter 4\n\nL1 Fighter\nSkills: Athletics, Perception\nFeat (Fighting Style): Archery\nMasteries: Longbow, Shortsword, Greatsword\n\nL3 Fighter\nSubclass: Champion\n\nL4 Fighter\nScores: +2 STR");
    assert.ok(has(f, "missing", /Fighter owes 1 more ASI\/Feat/), JSON.stringify(f));
  });
});

describe("D109: a level's ASI is the feat line, both editions", () => {
  test("fills the ASI slot, by full name or ASI, and raises the scores", () => {
    for (const name of ["Ability Score Improvement", "ASI"]) {
      const text = `Rules: 2014\nScores: 15/14/13/12/10/8\nClasses: Fighter 4\n\nL3 Fighter\nSubclass: Champion\n\nL4 Fighter\nFeat: ${name} [+1 STR, +1 CON]`;
      const f = run(text);
      assert.ok(!has(f, "missing", /ASI\/Feat/) && !f.some((x) => x.key === "Feat"), `${name}: ${JSON.stringify(f)}`);
      const { scores } = finalScores(parse(text), srd, supplement);
      assert.equal(scores?.str, 16);
      assert.equal(scores?.con, 14);
      assert.equal(canon(text).split("\n").at(-2), `Feat: ${name} [+1 STR, +1 CON]`, "emit keeps the name as written");
    }
  });
  test("bad or missing increases are reported at info", () => {
    assert.ok(has(run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: ASI [+2 CHA, +1 STR]"), "unresolved", /\+2 to one ability or \+1 to two/));
    assert.ok(has(run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: ASI [CHA]"), "unresolved", /\+2 to one ability or \+1 to two/));
    const m = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Ability Score Improvement").find((x) => /asks for its increases/.test(x.message));
    assert.ok(m && m.kind === "missing" && m.severity === "info");
  });
  test("the 20 cap applies", () => {
    const { findings } = finalScores(parse("Rules: 2024\nScores: 8/13/14/12/10/19\nClasses: Fighter 4\n\nL4 Fighter\nFeat: ASI [+2 CHA]"), srd, supplement);
    assert.ok(findings.some((x) => x.kind === "misplaced" && /past the 20 cap/.test(x.message)));
  });
});

describe("D110: Feat takes an optional slot marker; the Fighting Style key goes", () => {
  test("the marker is its own line, kept as written, sorted after the unmarked line", () => {
    const p = parse("L1 Fighter\nFeat (fighting style): Archery\nFeat: Alert\nFeat (Origin): Skilled [Arcana, History, Insight]");
    assert.deepEqual(codes(p), []);
    assert.deepEqual(names(p.levels[0].lines.get("Feat (fighting style)")), ["Archery"]);
    assert.equal(emit(p), "L1 Fighter\nFeat: Alert\nFeat (fighting style): Archery\nFeat (Origin): Skilled [Arcana, History, Insight]\n");
    assert.equal(keyDef("Feat (Epic Boon)")?.key, "Feat");
  });
  test("a marker only where the key takes one (0.9 adds Options, D181); the same marker twice in a scope is E003", () => {
    assert.deepEqual(codes(parse("Feature (Divine Order): Thaumaturge")), ["E002"]);
    assert.deepEqual(codes(parse("Feat (Origin): Alert\nFeat (ORIGIN): Skilled")), ["E003"]);
    assert.deepEqual(codes(parse("Feat: Alert\nFeat (Origin): Skilled")), [], "a marked and an unmarked line coexist");
  });
  test("the checker: a fighting-style feat fills the style slot, marked or not", () => {
    const base = "Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nSkills: Athletics, Perception\nMasteries: Longbow, Shortsword, Greatsword\n";
    for (const line of ["Feat (Fighting Style): Archery", "Feat: Archery"]) {
      const f = run(base + line);
      assert.ok(!has(f, "missing", /Fighting Style/) && !has(f, "extra", /ASI\/Feat/), `${line}: ${JSON.stringify(f)}`);
    }
    assert.ok(has(run(base), "missing", /owes 1 more Fighting Style/));
  });
  test("a near-miss marker gets the nearest category; an unknown one is accepted at info", () => {
    const typo = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nFeat (Figthing Style): Archery");
    const t = typo.find((x) => /no feat category has that name/.test(x.message));
    assert.ok(t && t.severity === "warning" && /did you mean "Fighting Style"/.test(t.message), JSON.stringify(typo));
    const odd = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nFeat (Tavern Brawl Circuit): Archery");
    assert.ok(odd.some((x) => x.severity === "info" && /not a feat category in the loaded data — accepted/.test(x.message)), JSON.stringify(odd));
  });
  test("a feat whose category is not the marker's is misplaced; a category code works as a marker", () => {
    assert.ok(has(run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nFeat (Fighting Style): Alert"), "misplaced", /this line's slot is Fighting Style/));
    assert.ok(!run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nFeat (FS): Archery").some((x) => x.key === "Feat" || /category/.test(x.message)));
  });
  test("the table carries 5etools' category names", () => {
    assert.equal(srd.featCategories?.FS, "Fighting Style");
    assert.equal(srd.featCategories?.EB, "Epic Boon");
  });
});

describe("D111: Gear replaces Equipment and Items; placement decides", () => {
  test("quantities only on Gear", () => {
    assert.deepEqual(codes(parse("L2 Fighter\nGear: Arrows (20) x2")), []);
    assert.deepEqual(codes(parse("L2 Fighter\nSpells: Hex x2")), ["E009"]);
  });
  test("an option letter is the starting pick in L1; elsewhere it is out of place", () => {
    const l1 = run("Rules: 2024\nClasses: Fighter 2\n\nL1 Fighter\nGear: Z");
    assert.ok(has(l1, "unresolved", /no starting-equipment option Z/), JSON.stringify(l1));
    const l2 = run("Rules: 2024\nClasses: Fighter 2\n\nL2 Fighter\nGear: A");
    assert.ok(has(l2, "misplaced", /option letter A goes in the background or the first level block/), JSON.stringify(l2));
  });
  test("gear gained in play is never owed", () => {
    const f = run("Rules: 2024\nClasses: Fighter 2\n\nL2 Fighter\nGear: Bag of Holding");
    assert.ok(!f.some((x) => x.key === "Gear" && x.kind === "missing"), JSON.stringify(f));
  });
});

describe("D112: an empty value means not chosen yet", () => {
  test("a list key is an empty list with W004, kept by emit", () => {
    const p = parse("Classes: Wizard 1\n\nL1 Wizard\nSpells:\nCantrips: Fire Bolt");
    assert.deepEqual(codes(p), ["W004"]);
    assert.ok(isClean(p));
    assert.deepEqual(names(p.levels[0].lines.get("Spells")), []);
    assert.equal(emit(p), "Classes: Wizard 1\n\nL1 Wizard\nCantrips: Fire Bolt\nSpells:\n");
  });
  test("every key keeps its to-do: header keys, an entity line, a marked feat, an X- key", () => {
    const text = "Paste:\nProducer:\nRules:\nScores:\nClasses:\nHP:\nX-Plan:\n\nSpecies:\nFeat (Origin):\n\nBackground:\nGear:\n";
    const p = parse(text);
    assert.deepEqual([...new Set(codes(p))].sort(), ["W001", "W004"], JSON.stringify(p.diagnostics));
    assert.equal(codes(p).filter((c) => c === "W004").length, 11);
    assert.equal(p.entities[0].item, null);
    assert.deepEqual(p.header.get("Rules"), { type: "empty" });
    assert.deepEqual(p.header.get("Classes"), { type: "classes", entries: [] });
    assert.equal(emit(p), text);
  });
  test("the checker treats an empty value as absent", () => {
    const f = run("Rules: 2024\nClasses: Druid 1\n\nL1 Druid\nSpells:\nPrepared:");
    assert.ok(!f.some((x) => x.key === "Spells" && x.kind === "redundant"), JSON.stringify(f));
    assert.deepEqual(run("Rules:\nClasses:\n\nSpecies:\n\nBackground:\n"), []);
    const n = normalise(parse("Rules: 2024\nClasses: Druid 1\n\nL1 Druid\nSpells:"), srd, supplement);
    assert.equal(emit(n), "Rules: 2024\nClasses: Druid 1\n\nL1 Druid\nSpells:\n", "normalise keeps the to-do");
  });
});

describe("D113: 0.8 reads 0.7 keys with a renamed-key warning and writes the 0.8 form", () => {
  test("the 0.7 fixtures canonicalise to their 0.8 siblings with W005 only", () => {
    const dir = join(fixtures, "v0.7");
    const files = readdirSync(dir).filter((n) => n.endsWith(".dndpaste"));
    assert.ok(files.length >= 1);
    for (const f of files) {
      const p = parse(readFileSync(join(dir, f), "utf8"));
      assert.ok(codes(p).length > 0 && codes(p).every((c) => c === "W005"), `${f}: ${JSON.stringify(p.diagnostics)}`);
      assert.equal(emit(p), readFileSync(join(fixtures, f), "utf8"), f);
    }
  });
  test("each alias: ASI, Ability, Fighting Style, Equipment, Items", () => {
    const text = [
      "Classes: Fighter 4", "Fighting Style: Archery", "",
      "Species: Elf", "Ability: WIS", "Feature: Elven Lineage [Wood]", "ASI: +2 DEX", "",
      "Background: Soldier", "Equipment: A", "",
      "L1 Fighter", "Equipment: B", "Items: Rope x2", "",
      "L4 Fighter", "ASI: +1 STR, +1 CON",
    ].join("\n");
    const p = parse(text);
    assert.deepEqual(codes(p), ["W005", "W005", "W005", "W005", "W005", "W005", "W005"]);
    assert.equal(emit(p), [
      "Classes: Fighter 4", "Feat (Fighting Style): Archery", "",
      "Species: Elf", "Scores: +2 DEX", "Feature: Elven Lineage [WIS; Wood]", "",
      "Background: Soldier", "Gear: A", "",
      "L1 Fighter", "Gear: B, Rope x2", "",
      "L4 Fighter", "Feat: Ability Score Improvement [+1 STR, +1 CON]", "",
    ].join("\n"));
  });
  test("an Ability line with no single owner stays as written, with the warning", () => {
    const p = parse("Species: Elf\nAbility: WIS\nFeature: Elven Lineage [Wood], Keen Senses [Perception]");
    assert.deepEqual(codes(p), ["W005"]);
    assert.match(p.diagnostics[0].message, /kept as written/);
    assert.equal(emit(p), "Species: Elf\nFeature: Elven Lineage [Wood], Keen Senses [Perception]\nAbility: WIS\n");
    assert.deepEqual(codes(parse(emit(p))), ["W005"], "it round-trips");
  });
  test("an alias outside its 0.7 scopes is still E005; 0.8 KEYS list no alias", () => {
    assert.deepEqual(codes(parse("Ability: WIS")), ["E005"]);
    const keys = KEYS.map((k) => k.key);
    for (const k of LEGACY_KEYS) assert.ok(!keys.includes(k.key) && k.renamed, k.key);
    assert.ok(keys.includes("Gear") && !keys.includes("ASI"));
  });
});

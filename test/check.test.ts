import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit } from "../src/dndpaste.js";
import { check, normalise, finalScores, type Slots, type Supplement, type Finding } from "../src/check.js";

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
    assert.ok(fs.every((x) => x.severity === "warning" || x.severity === "info"), f);
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

describe("T2.5: dangling Class 0 (D42) and name-alias fallback (D43)", () => {
  test("Class 0 with no level block is an unplaced info; normalise keeps it", () => {
    const text = "Rules: 2024\nClasses: Warlock 5 / Fighter 0\n\nL1 Warlock\nSkills: Arcana, Deception";
    const p = parse(text);
    const f = check(p, srd, supplement);
    const hit = f.filter((x) => x.kind === "unplaced" && /Fighter 0 declares nothing/.test(x.message));
    assert.equal(hit.length, 1, JSON.stringify(f));
    assert.equal(hit[0].severity, "info");
    const n = normalise(p, srd, supplement);
    const clsV = n.header.get("Classes");
    assert.equal(clsV?.type, "classes");
    assert.ok(clsV && clsV.type === "classes" && clsV.entries.some((e) => e.ref.name.toLowerCase() === "fighter" && e.levels === 0), JSON.stringify(clsV));
  });

  test("Class 0 with a level block for that class is not dangling", () => {
    const f = run("Rules: 2024\nClasses: Warlock 5 / Fighter 0\n\nL1 Warlock\nSkills: Arcana, Deception\n\nL6 Fighter\nFighting Style: Archery");
    assert.equal(f.filter((x) => /declares nothing/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("a name-alias with exactly one contains-match resolves, with an info finding", () => {
    const f = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nFeat: Truesight");
    const hit = f.filter((x) => x.kind === "unresolved" && /resolved as/.test(x.message));
    assert.equal(hit.length, 1, JSON.stringify(f));
    assert.equal(hit[0].severity, "info");
    assert.match(hit[0].message, /resolved as Boon of Truesight\|XPHB/);
    // no longer literally unresolved: the "matches nothing" message must not also fire
    assert.equal(f.filter((x) => /Truesight.*matches nothing/.test(x.message)).length, 0);
  });

  test("a name-alias whose hit's edition differs from Rules states the mismatch", () => {
    const f = run("Rules: 2014\nClasses: Fighter 1\n\nL1 Fighter\nFeat: Truesight");
    assert.ok(has(f, "unresolved", /resolved as Boon of Truesight\|XPHB \(2024 edition; paste is 2014\)/), JSON.stringify(f));
  });

  test("a name-alias with two or more contains-matches stays unresolved", () => {
    const f = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nItems: Water");
    assert.ok(has(f, "unresolved", /"Water" matches nothing/), JSON.stringify(f));
    assert.equal(f.filter((x) => /resolved as/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("a ref under 4 characters never falls back to an alias", () => {
    const f = run("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nSpells: Fog");
    assert.ok(has(f, "unresolved", /"Fog" matches nothing/), JSON.stringify(f));
    assert.equal(f.filter((x) => /resolved as/.test(x.message)).length, 0, JSON.stringify(f));
  });
});

describe("2014 starting-equipment picks (T2.2)", () => {
  test("missing picks are reported for the L1 class and the background", () => {
    const f = run("Rules: 2014\nClasses: Cleric 1\n\nBackground: Acolyte\n\nL1 Cleric");
    assert.ok(has(f, "missing", /Cleric starting equipment: no item chosen for pick 1.*Mace.*Warhammer/), JSON.stringify(f));
    assert.ok(has(f, "missing", /Cleric starting equipment: no item chosen for pick 4.*Priest's Pack.*Explorer's Pack/), JSON.stringify(f));
    assert.ok(has(f, "missing", /Acolyte starting equipment: no item chosen for pick 1/), JSON.stringify(f));
    const missing = kinds(f, "missing").filter((x) => x.key === "Equipment");
    assert.equal(missing.length, 5, JSON.stringify(missing)); // 4 Cleric groups + 1 Acolyte group
    assert.ok(missing.every((x) => x.severity === "info"));
  });

  test("naming the chosen items clears every pick", () => {
    const f = run([
      "Rules: 2014", "Classes: Cleric 1", "",
      "Background: Acolyte", "Equipment: Book", "",
      "L1 Cleric", "Equipment: Warhammer, Chain Mail, Light Crossbow, Crossbow Bolts (20), Explorer's Pack",
    ].join("\n"));
    assert.equal(kinds(f, "missing").filter((x) => x.key === "Equipment").length, 0, JSON.stringify(f));
  });

  test("an Equipment item outside any group is left alone (D33/D34)", () => {
    const f = run([
      "Rules: 2014", "Classes: Cleric 1", "",
      "Background: Acolyte", "Equipment: Book", "",
      "L1 Cleric", "Equipment: Warhammer, Chain Mail, Light Crossbow, Crossbow Bolts (20), Explorer's Pack, Rope, Torch",
    ].join("\n"));
    assert.equal(kinds(f, "missing").filter((x) => x.key === "Equipment").length, 0, JSON.stringify(f));
    assert.equal(f.filter((x) => /Rope|Torch/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("2024 pastes are unaffected: no 2014-style Equipment missing findings", () => {
    const f = run("Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric");
    assert.equal(f.filter((x) => x.kind === "missing" && x.key === "Equipment").length, 0, JSON.stringify(f));
  });

  test("existing 2014 fixture (old-subrace-cleric-5) gets no new warnings, only info-level equipment picks", () => {
    const f = run(readFileSync(join(root, "fixtures", "old-subrace-cleric-5.dndpaste"), "utf8"));
    // The fixture has no Equipment lines at all; the new check reports that at info severity only —
    // it must not add or upgrade any warning (pre-existing warnings here are unrelated, D-noted elsewhere).
    assert.ok(f.every((x) => x.key !== "Equipment" || x.severity === "info"), JSON.stringify(f));
    assert.equal(kinds(f, "missing").filter((x) => x.key === "Equipment").length, 5, JSON.stringify(f));
  });
});

describe("spell-list legality (T2.1)", () => {
  test("a spell off the class's list is misplaced", () => {
    const f = run("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: Guidance");
    assert.ok(has(f, "misplaced", /"Guidance" is not on Wizard's spell list/), JSON.stringify(f));
  });

  test("a spell on the class's list is quiet", () => {
    const f = run("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: Fire Bolt");
    assert.equal(f.filter((x) => x.kind === "misplaced" && /Fire Bolt/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("a spell fixed-granted by a feat picked anywhere in the build is not flagged off-list (skipped when data/slots.json is absent)", { skip: !full }, () => {
    const f = run("Rules: 2024\nClasses: Fighter 1\nFeat: Fey Touched|TCE [WIS]\n\nL1 Fighter\nSpells: Misty Step", full as Slots);
    assert.equal(f.filter((x) => x.kind === "misplaced" && /Misty Step/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("header-scope (unplaced) spell lines are skipped, not checked for list legality", () => {
    const f = run("Rules: 2024\nClasses: Wizard 1\nCantrips: Guidance");
    assert.equal(f.filter((x) => x.kind === "misplaced" && /Guidance/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("a spell on a chosen subclass's expanded list clears the check (skipped when data/slots.json is absent)", { skip: !full }, () => {
    const f = run("Rules: 2024\nClasses: Sorcerer 1\n\nL1 Sorcerer\nSubclass: Divine Soul\nSpells: Cure Wounds", full as Slots);
    assert.equal(f.filter((x) => x.kind === "misplaced" && /Cure Wounds/.test(x.message)).length, 0, JSON.stringify(f));
  });

  test("every fixture still checks with no new misplaced spell-list warnings (SRD table)", () => {
    for (const name of readdirSync(join(root, "fixtures")).filter((n) => n.endsWith(".dndpaste"))) {
      const fs = run(readFileSync(join(root, "fixtures", name), "utf8"));
      for (const f of fs.filter((x) => x.kind === "misplaced")) assert.doesNotMatch(f.message, /is not on .*'s spell list/, `${name}: ${f.message}`);
    }
  });
});

// ─── T2.4: ability-score arithmetic (finalScores) ──────────────────────────

test("finalScores: no Scores line means no scores and no findings", () => {
  const { scores, findings } = finalScores(parse("Classes: Fighter 1"), srd, supplement);
  assert.equal(scores, null);
  assert.deepEqual(findings, []);
});

test("finalScores: Vice and Shigen compute to their sheet values (skipped when data/slots.json is absent)", { skip: !full }, () => {
  // Vice: base 8/15/14/10/8/15; Fey Puppet background ASI +2 CHA/+1 DEX; no ASI reached at Warlock 2
  // (next at 4) and both homebrew feats (Fey Pact, Fey Sentinel) are unresolved, so neither bumps a score.
  const vice = finalScores(parse(readFileSync(join(root, "fixtures", "vice.dndpaste"), "utf8")), full as Slots, supplement);
  assert.deepEqual(vice.scores, { str: 8, dex: 16, con: 14, int: 10, wis: 8, cha: 17 });

  // Shigen: base 8/13/14/12/10/15; Archer Priest background ASI +2 CHA/+1 DEX; Potent Dragonmark|EFA
  // (a General feat) picks CHA for its half-feat +1 at L5, within the played Fighter1/Warlock5 range.
  const shigen = finalScores(parse(readFileSync(join(root, "fixtures", "shigen.dndpaste"), "utf8")), full as Slots, supplement);
  assert.deepEqual(shigen.scores, { str: 8, dex: 14, con: 14, int: 12, wis: 10, cha: 18 });
});

test("finalScores: an increment past the 20 cap is warned and the score is capped", () => {
  const p = parse("Rules: 2024\nScores: 8/13/14/12/10/19\nClasses: Fighter 4\n\nL4 Fighter\nASI: +2 CHA");
  const { scores, findings } = finalScores(p, srd, supplement);
  assert.equal(scores?.cha, 20);
  assert.ok(findings.some((f) => f.severity === "warning" && /past the 20 cap/.test(f.message)), JSON.stringify(findings));
});

test("finalScores: an illegal background ability pick is warned", () => {
  const p = parse("Rules: 2024\nScores: 10/10/10/10/10/10\nClasses: Wizard 1\n\nBackground: Sage\nASI: +2 STR, +1 DEX\nSkills: Arcana, History");
  const { scores, findings } = finalScores(p, srd, supplement);
  assert.equal(scores?.str, 12); // still applied — the paste's own stated fact
  assert.equal(scores?.dex, 11);
  assert.ok(findings.some((f) => f.severity === "warning" && f.kind === "unresolved" && /not offered/.test(f.message)), JSON.stringify(findings));
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

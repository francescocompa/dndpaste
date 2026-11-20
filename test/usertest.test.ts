// Wide user test fixes (T3.12, D192–D197; D200–D206). One describe per decision.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, tidy, applyFix, foldOptions, familyKey, abilityOf, isAbilitySlot, KEYS, type Paste, type Diagnostic } from "../src/dndpaste.js";
import { check, normalise, FINDING_CODES, type Slots, type Supplement, type Finding } from "../src/check.js";
import { UA_SOURCES } from "../src/sources.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;

const diag = (text: string, code: string): Diagnostic => {
  const d = parse(text).diagnostics.find((x) => x.code === code);
  assert.ok(d, `${code} in ${JSON.stringify(parse(text).diagnostics)}`);
  return d;
};
const run = (text: string): Finding[] => {
  const p = parse(text);
  assert.deepEqual(p.diagnostics.filter((d) => d.code.startsWith("E")), [], JSON.stringify(p.diagnostics));
  return check(p, srd, supplement);
};
const msgs = (f: Finding[]) => f.map((x) => x.message);

describe("D192: every error says how to fix it, in a few words", () => {
  test("T01: a header key under Species says Move above Species, and its fix moves it there", () => {
    const text = "Rules: 2024\nClasses: Wizard 5\nSpecies: Goblin\nSpells: Shield\nSubclass: Diviner";
    const d = diag(text, "E005");
    assert.equal(d.hint, "Move above Species");
    assert.ok(d.fix?.safe);
    assert.equal(applyFix(text, d.fix), "Rules: 2024\nClasses: Wizard 5\nSubclass: Diviner\nSpecies: Goblin\nSpells: Shield");
    assert.equal(diag("Species: Elf\n\nBackground: Sage\nMasteries: Longbow", "E005").hint, "Move above Species");
    assert.equal(diag("Background: Sage\nMasteries: Longbow", "E005").hint, "Move above Background");
    assert.equal(diag("Rules: 2024\n\nL1 Fighter\nClasses: Fighter 1", "E005").hint, "Move to the header");
    assert.equal(diag("L1 Fighter\nScores: 8/13/14/12/10/15", "E005").hint, "Move to the header");
  });

  test("T37: Tidy moves those lines instead of refusing, and keeps what it can't fix", () => {
    assert.equal(tidy("Rules: 2024\nClasses: Wizard 5\nSpecies: Goblin\nSubclass: Diviner\nGear: Rope\n"),
      "Rules: 2024\nClasses: Wizard 5\nSubclass: Diviner\nGear: Rope\n\nSpecies: Goblin\n");
    // A moved line that duplicates a header key is joined on the next pass.
    assert.equal(tidy("Classes: Wizard 5\nGear: Rope\nSpecies: Goblin\nGear: Torch\n"), "Classes: Wizard 5\nGear: Rope, Torch\n\nSpecies: Goblin\n");
    // An error with no safe fix stays as written.
    assert.equal(tidy("Rules: 2024\nClass: Wizard\n"), "Rules: 2024\nClass: Wizard\n");
  });

  test("T16: did-you-mean on near misses; E001 says Key: value", () => {
    for (const [line, hint, fixed] of [
      ["Class: Wizard", "Did you mean Classes?", "Classes: Wizard"],
      ["Feats: Grappler", "Did you mean Feat?", "Feat: Grappler"],
      ["Race: Goblin", "Did you mean Species?", "Species: Goblin"],
      ["Spels: Shield", "Did you mean Spells?", "Spells: Shield"],
      ["INT: 17", "Write Scores: INT 17", "Scores: INT 17"],
      ["Feats (Origin): Alert", "Did you mean Feat (Origin)?", "Feat (Origin): Alert"],
    ]) {
      const d = diag(`Rules: 2024\n${line}`, "E002");
      assert.equal(d.hint, hint, line);
      assert.equal(d.fix?.safe, false, "a guess is never made by Tidy");
      assert.equal(applyFix(`Rules: 2024\n${line}`, d.fix as NonNullable<Diagnostic["fix"]>), `Rules: 2024\n${fixed}`);
    }
    assert.equal(diag("Rules: 2024\nFamiliar: Imp", "E002").hint, "Use a key from the key list; free text goes in Note");
    assert.equal(diag("Rules: 2024\nLevel 5 Wizard", "E001").hint, "Write L5 Wizard");
    assert.equal(diag("Rules: 2024\nsome words", "E001").hint, "Write Key: value");
    const tight = diag("Rules: 2024\nSkills:Arcana", "E001");
    assert.equal(tight.hint, "Add a space after the colon");
    assert.equal(tidy("Rules: 2024\nSkills:Arcana"), "Rules: 2024\nSkills: Arcana\n");
  });

  test("T17: E003 says to join with commas, and joins", () => {
    const text = "Rules: 2024\nFeature: Light Bearer\nFeature: Healing Hands";
    const d = diag(text, "E003");
    assert.equal(d.hint, "Join with commas");
    assert.equal(applyFix(text, d.fix as NonNullable<Diagnostic["fix"]>), "Rules: 2024\nFeature: Light Bearer, Healing Hands");
    assert.equal(tidy(text + "\nFeature: Foo"), "Rules: 2024\nFeature: Light Bearer, Healing Hands, Foo\n");
    assert.equal(diag("Rules: 2024\nRules: 2014", "E003").hint, "Keep one line for this key", "no join for a single value");
    assert.equal(diag("Rules: 2024\nScores: DEX 15\nScores: CON 13", "E003").fix?.edits[0].text, "Scores: DEX 15, CON 13");
  });

  test("T19: E012 on Classes with commas says to use /, and Tidy makes it", () => {
    const d = diag("Classes: Sorcerer 5, Warlock 5", "E012");
    assert.equal(d.hint, "Use / between classes");
    assert.equal(tidy("Classes: Sorcerer 5, Warlock 5"), "Classes: Sorcerer 5 / Warlock 5\n");
  });

  test("every error code has a hint", () => {
    for (const t of ["x\n---", "x\nL3 Wizard\nL2 Wizard", "Species: Elf, Dwarf", "Feat: -Alert", "Feat: Alert x2", "Feat: Alert [", "Feat: Alert @3", "L1 Fighter\nSpecies: Elf", "Paste: 2"]) {
      for (const d of parse(t).diagnostics.filter((x) => x.code.startsWith("E"))) assert.ok(d.hint, `${d.code} in ${t}`);
    }
  });

  test("T07: a written but unresolved Subclass counts as picked; owed picks say N of M and where to add them", () => {
    const f = run("Rules: 2024\nClasses: Barbarian 3\nSubclass: Path of the Beast\n\nL1 Barbarian\nSkills: Athletics, Survival\nMasteries: Greataxe, Handaxe");
    assert.ok(!msgs(f).some((m) => /Subclass written/.test(m)), JSON.stringify(f));
    const placed = run("Rules: 2024\nClasses: Barbarian 3\n\nL1 Barbarian\nSkills: Athletics, Survival\nMasteries: Greataxe, Handaxe\n\nL3 Barbarian\nSubclass: Path of the Beast");
    assert.ok(!msgs(placed).some((m) => /Subclass written/.test(m)), JSON.stringify(placed));
    const owed = run("Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: Guidance").find((x) => x.key === "Cantrips");
    assert.equal(owed?.message, "Cleric: 1 of 3 Cantrips written; add 2 at L1 Cleric");
    assert.deepEqual(owed?.at, { key: "Cantrips", level: 1 });
    const flat = run("Rules: 2024\nClasses: Cleric 1").find((x) => x.key === "Cantrips");
    assert.equal(flat?.message, "Cleric: 0 of 3 Cantrips written; add 3 to the Cantrips line");
    assert.deepEqual(flat?.at, { key: "Cantrips", level: null });
  });

  test("T21: a message never doubles its key", () => {
    const f = check(parse("Rules: 2024\nClasses: Artificerz 1\n\nSpecies: Elf (Lorwyn)"), srd, supplement);
    for (const x of f) assert.ok(!x.message.startsWith(`${x.where}:`), x.message);
    assert.ok(msgs(f).includes('"Elven Lineage" pick "Lorwyn" is not one of: Drow, High, Wood'), JSON.stringify(f));
  });
});

describe("D193, D201: granted spells and features are highlights", () => {
  test("T02: a domain's always-prepared spell is never misplaced, never counted, never a DM boon", () => {
    const f = run("Rules: 2024\nClasses: Cleric 3\n\nL1 Cleric\nSkills: Insight, Medicine\nCantrips: Guidance, Light, Thaumaturgy\n\nL3 Cleric\nSubclass: Life Domain\nPrepared: Aid, Bless");
    assert.deepEqual(f.filter((x) => /Aid|Bless|boon|Prepared/i.test(x.message)), [], JSON.stringify(f));
    const header = run("Rules: 2024\nClasses: Cleric 3\nSubclass: Life Domain\nPrepared: Aid, Bless, Counterspell");
    assert.ok(!msgs(header).some((m) => /Prepared|boon|beyond/i.test(m)), JSON.stringify(header));
  });

  test("Pact of the Chain's Find Familiar, written, is a highlight too", () => {
    const f = run("Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nInvocations: Pact of the Chain [Imp]\nSpells: Find Familiar [Owl], Hex");
    assert.ok(!msgs(f).some((m) => /Find Familiar|Imp|Owl/.test(m)), JSON.stringify(f));
  });

  test("T26: a bare feature the build gets is silent where it lands; a pick with details still reports", () => {
    const f = run("Rules: 2024\nClasses: Wizard 3\nFeature: Arcane Recovery\n\nL3 Wizard\nSubclass: Evoker\nFeature: Potent Cantrip");
    assert.ok(!msgs(f).some((m) => /Arcane Recovery|Potent Cantrip/.test(m)), JSON.stringify(f));
    const g = run("Rules: 2024\nClasses: Wizard 3\n\nL3 Wizard\nFeature: Potent Cantrip [Fire Bolt]");
    assert.ok(msgs(g).some((m) => /Potent Cantrip/.test(m)), JSON.stringify(g));
  });

  test("T22 (D206): [+1 CHA] reads as [CHA] on a 2024 half feat, not on an origin feat", () => {
    assert.equal(abilityOf([{ ref: { name: "+1 cha", source: null }, at: null }]), "CHA");
    assert.ok(isAbilitySlot([{ ref: { name: "CHA", source: null }, at: null }]));
    assert.equal(abilityOf([{ ref: { name: "+2 CHA", source: null }, at: null }]), null);
    const boon = run("Rules: 2024\nScores: 8/13/14/12/10/15\nClasses: Sorcerer 19\n\nL19 Sorcerer\nFeat (Epic Boon): Boon of the Night Spirit [+1 CON]");
    assert.ok(!msgs(boon).some((m) => /Night Spirit/.test(m)), JSON.stringify(boon));
    const grappler = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Grappler [+1 STR]");
    assert.ok(!msgs(grappler).some((m) => /Grappler/.test(m)), JSON.stringify(grappler));
    const origin = run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Magic Initiate [+1 WIS; Cleric; Guidance, Light; Bless]");
    assert.ok(msgs(origin).includes('"Magic Initiate": write [WIS]; [+1 WIS] is for 2024 half feats'), JSON.stringify(origin));
  });
});

describe("D194, D205: homebrew and Unearthed Arcana never break the build", () => {
  test("T03: a UA code, |HB and an unknown code are infos, each saying what it is", () => {
    assert.ok(UA_SOURCES.some((u) => u.code === "XUA2025Psion"));
    const f = run("Rules: 2024\nClasses: Fighter 3\n\nSpecies: Drider|ZZZNOPE\n\nL3 Fighter\nSubclass: Psi Warrior|XUA2025Psion\nFeat: Fey Pact|HB");
    const u = f.filter((x) => x.kind === "unresolved");
    assert.ok(u.every((x) => x.severity === "info"), JSON.stringify(u));
    assert.ok(msgs(u).some((m) => /"Drider\|ZZZNOPE": ZZZNOPE is not a known book code/.test(m)));
    assert.ok(msgs(u).some((m) => /"Psi Warrior\|XUA2025Psion" is from Unearthed Arcana/.test(m)));
    assert.ok(msgs(u).some((m) => /"Fey Pact\|HB" is homebrew/.test(m)));
  });

  test("a book the SRD table lacks is still a known book: it resolves as usual", () => {
    assert.ok(srd.meta?.sources?.includes("TCE"));
    const f = run("Rules: 2014\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: Booming Blade|TCE");
    assert.ok(msgs(f).some((m) => /"Booming Blade\|TCE" matches nothing/.test(m)), JSON.stringify(f));
  });

  test("T30: names may hold parentheses; T23: Options (<name>) stays free", () => {
    const p = parse("Rules: 2014\n\nSpecies: Human (Mark of Making)|ERLW\n\nL1 Psion\nOptions (Psionic Discipline): Telekinetic Propel");
    assert.deepEqual(p.diagnostics.map((d) => d.code), ["W007"], "a 2014 subrace name reads as Human|ERLW [Mark of Making] (D282)");
    assert.equal(p.entities[0].item?.ref.name, "Human");
    assert.equal(emit(p).split("\n")[2], "Species: Human|ERLW [Mark of Making]");
    assert.deepEqual(parse("Gear: Arrows (20) x2").diagnostics, [], "parentheses in other names are part of the name");
    assert.ok(p.levels[0].lines.has("Options (Psionic Discipline)"));
  });
});

describe("D195: forms in brackets, notes, one spelling per pick", () => {
  test("T05: Pact of the Chain, Pact of the Blade, Find Familiar, Find Steed and a Summon spell take a bracket", () => {
    const text = "Rules: 2024\nClasses: Warlock 5 / Paladin 5\n\nL1 Warlock\nInvocations: Pact of the Chain [Imp]\n\nL3 Warlock\nInvocations: Pact of the Blade [Glaive]\nSpells: Summon Fey [Fuming]\n\nL7 Paladin\nPrepared: Find Steed [Warhorse]";
    const p = parse(text);
    assert.deepEqual(p.diagnostics, []);
    assert.equal(emit(p).includes("Pact of the Chain [Imp]") && emit(p).includes("Find Steed [Warhorse]"), true);
    const f = check(p, srd, supplement);
    assert.ok(!msgs(f).some((m) => /Imp|Glaive|Fuming|Warhorse/.test(m)), JSON.stringify(f));
  });

  test("T14 (D200): Note holds free text in any block, is written last, and the checker ignores it", () => {
    const k = KEYS.find((d) => d.key === "Note");
    assert.deepEqual([k?.type, k?.scopes], ["text", ["H", "S", "B", "L"]]);
    assert.equal(KEYS[KEYS.length - 1].key, "Note");
    const text = "Rules: 2024\nNote: Eldritch Knight planned at L3; versions: A, B\nClasses: Fighter 1\n\nL1 Fighter\nNote: version B takes Sharpshooter [here]\nSkills: Athletics, Perception";
    const p = parse(text);
    assert.deepEqual(p.diagnostics, []);
    assert.equal(emit(p), "Rules: 2024\nClasses: Fighter 1\nNote: Eldritch Knight planned at L3; versions: A, B\n\nL1 Fighter\nSkills: Athletics, Perception\nNote: version B takes Sharpshooter [here]\n");
    assert.ok(!msgs(check(p, srd, supplement)).some((m) => /Note|Sharpshooter|Eldritch/.test(m)));
    const c = diag("Rules: 2024\n# Eldritch Knight planned", "E001");
    assert.equal(c.fix?.edits[0].text, "Note: Eldritch Knight planned");
    assert.equal(parse("# My build\nRules: 2024").identifier, "# My build", "a first line with no colon is still the name");
    assert.equal(tidy("Note: a\nNote: b"), "Note: a; b\n");
  });

  test("T33: a plain Options line folds into its family key when every pick is that family", () => {
    assert.equal(familyKey("EI"), "Invocations");
    assert.equal(familyKey("MV:B"), "Maneuvers");
    assert.equal(familyKey("Invocation"), "Invocations");
    assert.equal(familyKey("FS:F"), null);
    const fam = (r: { name: string }) => (/pact|blast/i.test(r.name) ? "EI" : /riposte/i.test(r.name) ? "MV:B" : null);
    assert.equal(tidy("Rules: 2024\n\nL2 Warlock\nOptions: Pact of the Chain, Agonizing Blast [Eldritch Blast]", { optionFamily: fam }),
      "Rules: 2024\n\nL2 Warlock\nInvocations: Pact of the Chain, Agonizing Blast [Eldritch Blast]\n");
    assert.equal(tidy("Rules: 2024\nOptions: Pact of the Chain, Riposte", { optionFamily: fam }), "Rules: 2024\nOptions: Pact of the Chain, Riposte\n", "two families stay");
    assert.equal(tidy("Rules: 2024\nOptions: Pact of the Chain"), "Rules: 2024\nOptions: Pact of the Chain\n", "no family data, no fold");
    const p = parse("Rules: 2024\nInvocations: Agonizing Blast [Eldritch Blast]\nOptions: Pact of the Chain");
    assert.equal(foldOptions(p, fam), 1);
    assert.equal(emit(p), "Rules: 2024\nInvocations: Agonizing Blast [Eldritch Blast], Pact of the Chain\n");
    const n = normalise(parse("Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nOptions: Pact of the Chain"), srd, supplement);
    assert.equal(emit(n), "Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nInvocations: Pact of the Chain\n");
  });

  test("T31: a repeated Gear name gets an info pointing to x2, and normalise writes it", () => {
    const text = "Rules: 2024\nClasses: Fighter 1\nGear: Shortsword, Shortsword|XPHB, Shortsword, Rope x2, Rope";
    const f = run(text).filter((x) => x.key === "Gear" && x.kind === "redundant");
    assert.deepEqual(msgs(f), ['Gear: "Shortsword" is written 2 times; write Shortsword x2', 'Gear: "Rope" is written 2 times; write Rope x3']);
    assert.equal(emit(normalise(parse(text), srd, supplement)), "Rules: 2024\nClasses: Fighter 1\nGear: Shortsword x2, Shortsword|XPHB, Rope x3\n");
  });
});

test("SPEC §8.9: a note, a chosen form and two highlights draw no finding", () => {
  const spec = readFileSync(join(root, "SPEC.md"), "utf8");
  const block = /### 8\.9[^\n]*\n\n```\n([\s\S]*?)```/.exec(spec);
  assert.ok(block, "SPEC §8.9 has its example");
  const text = block[1];
  assert.equal(emit(parse(text)), text, "the example is canonical");
  const f = run(text);
  assert.ok(!msgs(f).some((m) => /Imp|Blessing|Burning Hands|Note|Pact/.test(m)), JSON.stringify(f));
});

describe("D202: emit never drops a line that failed to parse", () => {
  test("T04: an erroring line is kept as written, in its block, and reads back the same", () => {
    const text = "X\nClasses: A 1, B 2\nSpecies: Elf\nSubclass: Diviner\n\nL1 Wizard\nFeatz: Alert\nL1 Wizard\n";
    const p = parse(text);
    assert.deepEqual(p.kept?.map((k) => [k.line, k.scope]), [[2, "H"], [4, "S"], [7, 1], [8, 1]]);
    const out = emit(p);
    assert.equal(out, "X\nClasses: A 1, B 2\n\nSpecies: Elf\nSubclass: Diviner\n\nL1 Wizard\nFeatz: Alert\nL1 Wizard\n");
    assert.equal(emit(parse(out)), out, "idempotent with errors too");
    const codes = (q: Paste) => q.diagnostics.map((d) => d.code);
    assert.deepEqual(codes(parse(out)), codes(p));
  });
});

describe("D204: findings carry codes", () => {
  test("one code per kind", () => {
    assert.deepEqual(Object.values(FINDING_CODES), ["C001", "C002", "C003", "C004", "C005", "C006"]);
    for (const x of run("Rules: 2024\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Alert, Savage Attacker")) assert.equal(x.code, FINDING_CODES[x.kind]);
  });
});

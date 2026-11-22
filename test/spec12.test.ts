// SPEC 0.12 (D337, D340–D343): Masteries add up like Spells, with -Name to drop one; ASI and half-feat bonuses count with
// no +x written. Names only, no rules text.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, tidy, applyFix, loadoutAt, masteryWalk, foldMasteries, SPEC_VERSION, type Paste, type Item } from "../src/dndpaste.js";
import * as checkModule from "../src/check.js";
import { check, normalise, finalScores, type Slots, type Supplement, type FeatSlots } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const fixtures = join(root, "fixtures");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;
const fullPath = join(root, "data", "slots.json");
const full = existsSync(fullPath) ? (JSON.parse(readFileSync(fullPath, "utf8")) as Slots) : null;

const codes = (p: Paste) => p.diagnostics.map((d) => d.code);
const names = (items: Item[]) => items.map((it) => it.ref.name);
const build = (...lines: string[]) => ["Rules: 2024", "Classes: Fighter 10", "", ...lines].join("\n");
const masteriesAt = (t: string, n: number) => names(loadoutAt(parse(t), n).masteries);

test("the library implements SPEC 0.12", () => assert.equal(SPEC_VERSION, "0.12"));

describe("D337: Masteries add up across levels", () => {
  const additive = build("L1 Fighter", "Masteries: Longsword, Sap, Handaxe", "", "L4 Fighter", "Masteries: Flail");
  test("a later line lists only the new masteries, with no diagnostic", () => {
    assert.deepEqual(codes(parse(additive)), []);
    assert.deepEqual(masteriesAt(additive, 1), ["Longsword", "Sap", "Handaxe"]);
    assert.deepEqual(masteriesAt(additive, 3), ["Longsword", "Sap", "Handaxe"]);
    assert.deepEqual(masteriesAt(additive, 4), ["Longsword", "Sap", "Handaxe", "Flail"]);
    assert.deepEqual(masteriesAt(additive, 20), ["Longsword", "Sap", "Handaxe", "Flail"], "past the last block, the last loadout");
    assert.equal(tidy(additive), emit(parse(additive)), "an additive paste is already tidy");
  });
  test("-Name drops a held mastery, as -Item does", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sap, Handaxe", "", "L4 Fighter", "Masteries: Flail, -Sap");
    assert.deepEqual(codes(parse(t)), []);
    assert.deepEqual(masteriesAt(t, 4), ["Longsword", "Handaxe", "Flail"]);
    assert.ok(emit(parse(t)).includes("Masteries: Flail, -Sap"), "emit keeps the drop");
  });
  test("a name the build already holds is ignored, whatever its case", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sap", "", "L4 Fighter", "Masteries: longsword, Flail, Sap");
    assert.deepEqual(codes(parse(t)), [], "a snapshot that only adds reads with no warning");
    assert.deepEqual(masteriesAt(t, 4), ["Longsword", "Sap", "Flail"]);
    const [, step] = masteryWalk(parse(t));
    assert.deepEqual(names(step.added), ["Flail"]);
    assert.deepEqual(names(step.repeated), ["longsword", "Sap"]);
    assert.deepEqual(step.leftOut, []);
  });
  test("the family forms count too: Options (Mastery) and Options (Masteries)", () => {
    const t = build("L1 Fighter", "Options (Mastery): Longsword, Sap", "", "L4 Fighter", "Options (Masteries): Longsword, Flail");
    assert.deepEqual(masteriesAt(t, 4), ["Longsword", "Sap", "Flail"]);
    assert.ok(codes(parse(t)).includes("W008"));
  });
  test("the header's unplaced line is part of the loadout at every level, and a level line may drop from it", () => {
    const t = ["Rules: 2024", "Classes: Fighter 10", "Masteries: Longsword", "", "L4 Fighter", "Masteries: Flail", "", "L6 Fighter", "Masteries: -Longsword"].join("\n");
    assert.deepEqual(codes(parse(t)), []);
    assert.deepEqual(masteriesAt(t, 1), ["Longsword"]);
    assert.deepEqual(masteriesAt(t, 4), ["Longsword", "Flail"]);
    assert.deepEqual(masteriesAt(t, 6), ["Flail"]);
    assert.deepEqual(masteriesAt("Masteries: Longsword, Sap", 5), ["Longsword", "Sap"], "a flat paste reads as its header");
  });
});

describe("D337, D342: the 0.11 snapshot shape warns (W008)", () => {
  const swap = build("L1 Fighter", "Masteries: Longsword, Sap, Handaxe", "", "L4 Fighter", "Masteries: Longsword, Handaxe, Flail");
  test("a later line that repeats held names and leaves one out warns on that line; the name left out stays", () => {
    const p = parse(swap);
    const w = p.diagnostics.filter((d) => d.code === "W008");
    assert.equal(w.length, 1);
    assert.equal(w[0].line, 8);
    assert.match(w[0].message, /still held: Sap, at L4 \(D337\)/);
    assert.equal(w[0].hint, "Write -Sap to drop it");
    assert.deepEqual(masteriesAt(swap, 4), ["Longsword", "Sap", "Handaxe", "Flail"]);
  });
  test("its fix is not safe: it writes the new names and drops the one left out", () => {
    const fix = parse(swap).diagnostics.find((d) => d.code === "W008")?.fix;
    assert.ok(fix && !fix.safe);
    assert.equal(fix.label, "Drop Sap");
    const fixed = applyFix(swap, fix);
    assert.ok(fixed.includes("Masteries: Flail, -Sap"));
    assert.deepEqual(codes(parse(fixed)), []);
    assert.deepEqual(masteriesAt(fixed, 4), ["Longsword", "Handaxe", "Flail"]);
  });
  test("two names left out are named together", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sap, Handaxe", "", "L4 Fighter", "Masteries: Longsword, Flail, Lance");
    const w = parse(t).diagnostics.find((d) => d.code === "W008");
    assert.equal(w?.hint, "Write -Sap, -Handaxe to drop them");
    assert.equal(w?.fix?.label, "Drop Sap and Handaxe");
    assert.ok(applyFix(t, w!.fix!).includes("Masteries: Flail, Lance, -Sap, -Handaxe"));
  });
  test("no warning for a line that repeats nothing, or for the first line", () => {
    assert.deepEqual(codes(parse(build("L1 Fighter", "Masteries: Longsword, Sap", "", "L4 Fighter", "Masteries: Flail"))), []);
    assert.deepEqual(codes(parse(build("L4 Fighter", "Masteries: Longsword, Sap"))), []);
    assert.deepEqual(codes(parse(build("L1 Fighter", "Masteries: Longsword, Sap", "", "L4 Fighter", "Masteries: Sap, -Longsword"))), [], "a drop is not a left-out name");
  });
  test("D364 (amends D342): Tidy folds a W008 line and keeps the swap: the name left out becomes -Name", () => {
    const out = tidy(swap);
    assert.ok(out.includes("L4 Fighter\nMasteries: Flail, -Sap\n"), out);
    assert.deepEqual(codes(parse(out)), [], "the warning goes");
    assert.deepEqual(masteriesAt(out, 4), ["Longsword", "Handaxe", "Flail"], "the 0.11 author's swap holds");
    assert.equal(out.split("\n").find((l) => l.startsWith("Masteries: Flail")), applyFix(swap, parse(swap).diagnostics.find((d) => d.code === "W008")!.fix!).split("\n")[7], "Tidy writes the fix's line");
    assert.equal(tidy(out), out, "Tidy is idempotent");
  });
  test("D364: a later snapshot line reads against the folded one, so a name dropped once is not dropped again", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sickle, Handaxe", "", "L4 Fighter", "Masteries: Longsword, Sickle, Handaxe, Lance",
      "", "L10 Fighter", "Masteries: Longsword, Handaxe, Lance, Flail", "", "L16 Fighter", "Masteries: Longsword, Handaxe, Lance, Flail, Greataxe");
    const out = tidy(t);
    assert.ok(out.includes("L4 Fighter\nMasteries: Lance\n"), out);
    assert.ok(out.includes("L10 Fighter\nMasteries: Flail, -Sickle\n"), out);
    assert.ok(out.includes("L16 Fighter\nMasteries: Greataxe"), out);
    assert.deepEqual(codes(parse(out)), []);
    assert.deepEqual(masteriesAt(out, 16), ["Longsword", "Handaxe", "Lance", "Flail", "Greataxe"]);
  });
  test("D364: a W008 line's own drops stay, before the names left out", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sap, Handaxe", "", "L4 Fighter", "Masteries: Longsword, Flail, -Handaxe");
    assert.ok(codes(parse(t)).includes("W008"));
    assert.ok(tidy(t).includes("Masteries: Flail, -Handaxe, -Sap"), tidy(t));
  });
});

describe("D337: Tidy and normalise write a snapshot as additive lines", () => {
  test("repeated names go; a line left with nothing goes; emit alone keeps them (it never drops, §0 rule 6)", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Sap", "", "L4 Fighter", "Masteries: Longsword, Sap, Flail", "", "L6 Fighter", "Feat: Ability Score Improvement [+2 STR]", "Masteries: Sap, Longsword, Flail");
    const out = tidy(t);
    assert.ok(out.includes("L4 Fighter\nMasteries: Flail\n"));
    assert.ok(out.includes("L6 Fighter\nFeat: Ability Score Improvement [+2 STR]\n") && !/L6 Fighter\n[^]*Masteries/.test(out));
    assert.equal(tidy(out), out, "Tidy is idempotent");
    assert.ok(emit(parse(t)).includes("Masteries: Longsword, Sap, Flail"));
    for (const n of [1, 4, 6, 10]) assert.deepEqual(masteriesAt(out, n), masteriesAt(t, n), `L${n} reads the same`);
  });
  test("foldMasteries changes the paste in place and counts the lines, a W008 line too (D364)", () => {
    const p = parse(build("L1 Fighter", "Masteries: Longsword", "", "L4 Fighter", "Masteries: Longsword, Flail"));
    assert.equal(foldMasteries(p), 1);
    assert.equal(foldMasteries(p), 0);
    const q = parse(build("L1 Fighter", "Masteries: Longsword, Sap", "", "L4 Fighter", "Masteries: Longsword, Flail"));
    assert.equal(foldMasteries(q), 1);
    assert.match(emit(q), /Masteries: Flail, -Sap/);
  });
  test("normalise makes the lines additive too", () => {
    const t = build("L1 Fighter", "Masteries: Longsword, Greatsword, Handaxe", "", "L4 Fighter", "Masteries: Longsword, Greatsword, Handaxe, Javelin");
    const out = emit(normalise(parse(t), srd, supplement));
    assert.ok(out.includes("L4 Fighter\nMasteries: Javelin\n"), out);
  });
  test("the 0.11 fixtures read clean, read the same at every level, and convert to their 0.12 siblings", () => {
    const dir = join(fixtures, "v0.11");
    const files = readdirSync(dir).filter((n) => n.endsWith(".dndpaste"));
    assert.ok(files.length >= 1);
    for (const f of files) {
      const old = readFileSync(join(dir, f), "utf8");
      const sibling = readFileSync(join(fixtures, f), "utf8");
      assert.deepEqual(codes(parse(old)), [], f);
      assert.equal(tidy(old), sibling, f);
      assert.notEqual(old, sibling, `${f} keeps the snapshot form`);
      for (let n = 1; n <= 20; n++) assert.deepEqual(masteriesAt(old, n), masteriesAt(sibling, n), `${f} L${n}`);
      assert.deepEqual(check(parse(old), srd, supplement), check(parse(sibling), srd, supplement), `${f}: same findings`);
    }
  });
});

describe("D343: loadoutAt", () => {
  test("Prepared stays a snapshot: the last level block's line up to the level, capped lines included, else the header's", () => {
    const t = ["Rules: 2024", "Classes: Wizard 9", "Prepared: Shield", "", "L1 Wizard", "Prepared: Magic Missile, Sleep", "", "L5 Wizard", "Prepared: Fireball", "Prepared (2nd): Misty Step"].join("\n");
    assert.deepEqual(names(loadoutAt(parse(t), 1).prepared), ["Magic Missile", "Sleep"]);
    assert.deepEqual(names(loadoutAt(parse(t), 4).prepared), ["Magic Missile", "Sleep"]);
    assert.deepEqual(names(loadoutAt(parse(t), 5).prepared), ["Fireball", "Misty Step"]);
    assert.deepEqual(names(loadoutAt(parse("Prepared: Shield"), 3).prepared), ["Shield"]);
    assert.deepEqual(loadoutAt(parse(""), 1), { masteries: [], prepared: [] });
  });
  test("exported from dndpaste/check too, and carried by the UMD build", () => {
    assert.equal(checkModule.loadoutAt, loadoutAt);
    const umd = createRequire(import.meta.url)(join(root, "dist", "dndpaste.umd.cjs")) as typeof import("../src/dndpaste.js");
    assert.equal(umd.SPEC_VERSION, "0.12");
    assert.deepEqual(umd.loadoutAt(umd.parse("L1 Fighter\nMasteries: Sap\n\nL4 Fighter\nMasteries: Flail"), 4).masteries.map((i) => i.ref.name), ["Sap", "Flail"]);
    assert.equal(typeof umd.foldMasteries, "function");
  });
});

describe("D334, D341: an ASI counts with no +x written", () => {
  const asi = (pick: string) => `Rules: 2024\nScores: STR 14/DEX 12/CON 13/INT 8/WIS 10/CHA 15\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Ability Score Improvement [${pick}]`;
  const final = (t: string, slots: Slots = srd) => finalScores(parse(t), slots, supplement).scores;
  const unresolvedAsi = (t: string) => check(parse(t), srd, supplement).some((f) => f.kind === "unresolved" && /\+2 to one ability or \+1 to two/.test(f.message));
  test("one ability is +2", () => {
    assert.equal(final(asi("CHA"))?.cha, 17);
    assert.equal(final(asi("cha"))?.cha, 17);
    assert.equal(unresolvedAsi(asi("CHA")), false);
  });
  test("two abilities are +1 each, with or without +1 written on either", () => {
    for (const pick of ["STR, CON", "+1 STR, CON", "STR, +1 CON", "+1 STR, +1 CON"]) {
      const s = final(asi(pick));
      assert.equal(s?.str, 15, pick);
      assert.equal(s?.con, 14, pick);
      assert.equal(unresolvedAsi(asi(pick)), false, pick);
    }
  });
  test("the short name ASI reads the same; the written form is kept by emit", () => {
    assert.equal(final(asi("CHA").replace("Ability Score Improvement", "ASI"))?.cha, 17);
    assert.ok(emit(parse(asi("STR, CON"))).includes("Feat: Ability Score Improvement [STR, CON]"));
  });
  test("still reported: three abilities, a lone +1, a pick in a second slot", () => {
    for (const pick of ["CHA, WIS, INT", "+1 CHA", "+2 CHA, WIS", "CHA; WIS"]) assert.equal(unresolvedAsi(asi(pick)), true, pick);
  });
});

describe("D334, D340: a half feat counts with no +x written", () => {
  const level4 = (feat: string) => `Rules: 2024\nScores: STR 14/DEX 12/CON 13/INT 8/WIS 10/CHA 15\nClasses: Fighter 4\n\nL4 Fighter\nFeat: ${feat}`;
  const durable: FeatSlots = { name: "Durable", source: "XPHB", edition: "2024", category: "G", repeatable: false, abilityChoose: null, abilityFixed: { con: 1 }, versions: [], cantripChoose: 0, spellChoose: 0, grantedSpells: [], prereqLevel: 4 };
  const withDurable: Slots = { ...srd, feats: { ...srd.feats, "Durable|XPHB": durable } };
  test("a picked half feat is +1 to its one picked ability", () => {
    assert.equal(finalScores(parse(level4("Grappler [STR]")), srd, supplement).scores?.str, 15);
    assert.equal(finalScores(parse(level4("Grappler [+1 STR]")), srd, supplement).scores?.str, 15, "the D206 spelling too");
  });
  test("a half feat with a fixed increase is +1 with nothing written", () => {
    const s = finalScores(parse(level4("Durable")), withDurable, supplement).scores;
    assert.equal(s?.con, 14);
    assert.equal(s?.str, 14, "no other score moves");
  });
  test("the fixed increase is capped at 20 like any half feat", () => {
    const t = level4("Durable").replace("CON 13", "CON 20");
    const { scores, findings } = finalScores(parse(t), withDurable, supplement);
    assert.equal(scores?.con, 20);
    assert.ok(findings.some((f) => /past the 20 cap/.test(f.message)));
  });
  test("real fixed half feats in the full extract (skipped when data/slots.json is absent)", { skip: !full }, () => {
    assert.ok(Object.values((full as Slots).feats).some((f) => f.abilityFixed), "data/slots.json predates abilityFixed (D340): regenerate it, STATE says how");
    const s = finalScores(parse(readFileSync(join(fixtures, "masteries-fighter.dndpaste"), "utf8")), full as Slots, supplement).scores;
    // STR 15 +2 (L4 ASI) +1 (L6 ASI) +1 (L8 Great Weapon Master, fixed); CON 14 +1 (L6 ASI).
    assert.equal(s?.str, 19);
    assert.equal(s?.con, 15);
    assert.equal(finalScores(parse(level4("Keen Mind")), full as Slots, supplement).scores?.int, 9);
  });
});

// T8.2 level-up (D305): the next level's block with its owed keys, and Classes: one higher.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classRef, lensOffer, levelUp, matchLevels, nextLevel } from "../src/levelup.ts";
import { nextOpen, owedKeys, presetText } from "../src/preset.ts";
import { parse } from "../../src/dndpaste.ts";

const W5 = presetText("2024", [{ cls: "Wizard", levels: 5 }]);

test("D316: the next level is one past the last level header (L1 with none), none past 20 or without Classes:", () => {
  assert.equal(nextLevel(W5), 6);
  assert.equal(nextLevel("Vesk\nClasses: Fighter 1 / Wizard 3\n"), 1, "blocks first: no header yet");
  assert.equal(nextLevel("Vesk\nClasses: Fighter 1 / Wizard 3\n\nL1 Fighter\n\nL3 Wizard\n"), 4);
  assert.equal(nextLevel("Vesk\nClasses:\n"), 1);
  assert.equal(nextLevel("Vesk\nClasses: Wizard 20\n\nL20 Wizard\n"), null);
  assert.equal(nextLevel("Vesk\nSpecies: Elf\n"), null);
  assert.equal(levelUp("Vesk\nClasses: Wizard 20\n\nL20 Wizard\n", "Wizard"), null);
});

test("D305: the same class goes up one; its block holds what that level owes", () => {
  const r = levelUp(W5, "Wizard");
  assert.ok(r);
  assert.match(r.text, /^Classes: Wizard\|XPHB 6$/m);
  const keys = owedKeys("2024", "Wizard", 6, 6);
  assert.ok(keys.length, "a Wizard 6 owes something");
  assert.ok(r.text.endsWith(`\n\nL6 Wizard|XPHB\n${keys.map((k) => `${k}:`).join("\n")}\n`), r.text.slice(-120));
  assert.equal(r.text.slice(0, r.cursor).split("\n").pop(), `${keys[0]}:`, "the cursor ends the first owed key");
  assert.equal(r.text.slice(0, W5.trimEnd().length), W5.trimEnd().replace("Wizard|XPHB 5", "Wizard|XPHB 6"), "the rest stays as written");
  assert.equal(parse(r.text).diagnostics.filter((d) => d.code.startsWith("E")).length, 0, "it still reads");
});

test("D305: a new class joins Classes: as `/ <Class> 1` and owes its multiclass keys", () => {
  const r = levelUp("Vesk\nRules: 2024\nClasses: Wizard 5\n\nL1 Wizard\n\nL5 Wizard\n", "fighter");
  assert.ok(r);
  assert.match(r.text, /^Classes: Wizard 5 \/ Fighter\|XPHB 1$/m);
  const keys = owedKeys("2024", "Fighter", 1, 6);
  assert.ok(r.text.endsWith(`L6 Fighter|XPHB\n${keys.map((k) => `${k}:`).join("\n")}\n`));
  assert.equal(classRef("Rules: 2014\nClasses: Wizard 2\n", "Cleric"), "Cleric|PHB", "2014 writes |PHB");
  assert.equal(classRef("Classes: Wizard 2\n", "wizard"), "Wizard", "a class keeps how Classes: writes it");
});

test("D305: a class the table doesn't know gets its header and no keys", () => {
  const r = levelUp("Vesk\nClasses: Wizard 1\n\nL1 Wizard\n", "Blood Hunter|TCSR");
  assert.ok(r);
  assert.match(r.text, /^Classes: Wizard 1 \/ Blood Hunter\|TCSR 1$/m);
  assert.ok(r.text.endsWith("\n\nL2 Blood Hunter|TCSR\n"));
  assert.equal(r.cursor, r.text.length - 1, "the cursor ends the header");
});

test("D310, D313: the level-up names a feature with a pick, and the cursor lands on the block's first open choice", () => {
  const c = "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard|XPHB\n";
  const up = levelUp(c, "Cleric");
  assert.ok(up);
  assert.match(up.text, /\nL2 Cleric\|XPHB\nCantrips:\nFeature: Divine Order \[\]\nPrepared:\n$/);
  assert.equal(up.text.slice(0, up.cursor).split("\n").at(-1), "Cantrips:", "the first open choice");
  // A level that owes nothing: the cursor at the end of its header.
  const f = levelUp("Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter|XPHB\n", "Fighter");
  assert.ok(f);
  assert.equal(f.text.slice(0, f.cursor).split("\n").at(-1), "L2 Fighter", "Classes: writes it so");
});

test("D310: nextOpen finds an empty key or empty brackets from a line down, else null", () => {
  const t = "Rules: 2024\nScores: 8/8/8/8/8/8\nClasses: Cleric 1\n\nSpecies: Elf []\n\nL1 Cleric\nCantrips:\n";
  assert.equal(t.slice(0, nextOpen(t, 0)!).split("\n").at(-1), "Species: Elf [", "the brackets come first");
  assert.equal(t.slice(0, nextOpen(t, t.indexOf("L1"))!).split("\n").at(-1), "Cantrips:");
  assert.equal(nextOpen("Rules: 2024\nNote: hi\n", 0), null);
  assert.equal(nextOpen("Rules: 2024\nNotakey:\n", 0), null, "a key the format doesn't know isn't a choice");
});

// His build (/ui-review round 3): Classes: says 8 levels, the headers stop at L6.
const STUCK = "Vesk\nRules: 2024\nClasses: Wizard 6 / Fighter 2\n\nSpecies: Elf\n\nBackground: Sage\n\nL1 Wizard|XPHB\n\nL3 Wizard|XPHB\n\nL6 Fighter|XPHB\n";

test("D316: inside the Classes: total the lens offers the next block's level, with the classes still without a block", () => {
  const o = lensOffer(STUCK);
  assert.deepEqual(o, { level: 7, inside: true, classes: [{ ref: "Fighter", name: "Fighter", level: 2 }, { ref: "Wizard", name: "Wizard", level: 6 }] });
  // Round 4: after L7 Fighter, L8 reads as Wizard; Fighter stays on offer (as Fighter 3).
  const o8 = lensOffer(`${STUCK}\nL7 Fighter\n`);
  assert.deepEqual(o8?.classes.map((x) => `${x.name} ${x.level}`), ["Wizard 6", "Fighter 3"]);
  const f8 = levelUp(`${STUCK}\nL7 Fighter\n`, "Fighter");
  assert.match(f8?.text ?? "", /^Classes: Wizard 6 \/ Fighter 3$/m, "a class past its Classes: count goes up, as another class joins");
  const f = levelUp(STUCK, "Fighter");
  assert.ok(f);
  assert.match(f.text, /^Classes: Wizard 6 \/ Fighter 2$/m, "Classes: stays as it is");
  assert.ok(f.text.endsWith("\n\nL7 Fighter\n") || /\nL7 Fighter\n/.test(f.text), f.text.slice(-80));
  const w = levelUp(STUCK, "Wizard");
  assert.ok(w);
  assert.match(w.text, /^Classes: Wizard 6 \/ Fighter 2$/m);
  assert.match(w.text, /\nL7 Wizard\n/);
  // Another class inside the total joins Classes: as `/ <ref> 1` (his answer: "Also allow another class").
  const c = levelUp(STUCK, "Cleric");
  assert.ok(c);
  assert.match(c.text, /^Classes: Wizard 6 \/ Fighter 2 \/ Cleric\|XPHB 1$/m);
  assert.match(c.text, /\nL7 Cleric\|XPHB\n/);
});

test("D316: once the blocks reach the total, the lens offers total + 1 and Classes: goes up", () => {
  const full = `${STUCK}\nL7 Fighter\n\nL8 Wizard\n`;
  const o = lensOffer(full);
  assert.equal(o?.level, 9);
  assert.equal(o?.inside, false);
  assert.deepEqual(o?.classes.map((x) => `${x.name} ${x.level}`), ["Wizard 7", "Fighter 3"]);
  assert.match(levelUp(full, "Fighter")?.text ?? "", /^Classes: Wizard 6 \/ Fighter 3$/m);
});

test("D314: the Match chip raises Classes: to fit the headers, and only raises", () => {
  const t = "Vesk\nRules: 2024\nClasses: Wizard 2\n\nL1 Wizard|XPHB\n\nL3 Fighter|XPHB\n";
  assert.match(matchLevels(t) ?? "", /^Classes: Wizard 2 \/ Fighter\|XPHB 1$/m);
  assert.equal(matchLevels(STUCK), null, "Classes: higher than the headers: nothing to raise");
  assert.equal(matchLevels("Vesk\nClasses: Wizard 3\n\nL1 Wizard\n"), null);
  assert.match(matchLevels("Vesk\nClasses: Wizard 1\n\nL1 Wizard\n\nL4 Wizard\n") ?? "", /^Classes: Wizard 4$/m, "a header past the total");
});

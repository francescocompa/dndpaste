// T8.2 level-up (D305): the next level's block with its owed keys, and Classes: one higher.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classRef, levelUp, nextLevel } from "../src/levelup.ts";
import { owedKeys, presetText } from "../src/preset.ts";
import { parse } from "../../src/dndpaste.ts";

const W5 = presetText("2024", [{ cls: "Wizard", levels: 5 }]);

test("D305: the next level is the Classes: total + 1, none past 20 or without Classes:", () => {
  assert.equal(nextLevel(W5), 6);
  assert.equal(nextLevel("Vesk\nClasses: Fighter 1 / Wizard 3\n"), 5);
  assert.equal(nextLevel("Vesk\nClasses:\n"), 1);
  assert.equal(nextLevel("Vesk\nClasses: Wizard 20\n"), null);
  assert.equal(nextLevel("Vesk\nSpecies: Elf\n"), null);
  assert.equal(levelUp("Vesk\nClasses: Wizard 20\n", "Wizard"), null);
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
  const r = levelUp("Vesk\nRules: 2024\nClasses: Wizard 5\n\nL1 Wizard\n", "fighter");
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

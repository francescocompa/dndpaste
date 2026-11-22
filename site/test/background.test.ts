// The editor's Background block (D351, D352): its counts, the block fitted on a pick, and the Scores line's bonuses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../src/dndpaste.ts";
import { backgroundSpec, ghostCounts } from "../src/ghost.ts";
import { bonusSpotAt, fitBackground } from "../src/background.ts";
import { BACKGROUND_PRESETS } from "../src/presets.ts";

const ghosts = (t: string) => ghostCounts(parse(t), t).map((g) => [g.line, g.have, g.of]);
const at = (t: string, s: string) => t.indexOf(s) + s.length;

test("D351: the presets carry each SRD background's increase abilities and what it leaves to choose", () => {
  const sage = BACKGROUND_PRESETS.find((b) => b.name === "Sage" && b.source === "XPHB");
  assert.deepEqual(sage, { name: "Sage", source: "XPHB", abilities: ["CON", "INT", "WIS"], lines: [] });
  assert.deepEqual(BACKGROUND_PRESETS.find((b) => b.name === "Sage" && b.source === "PHB")?.lines, [["Languages", 2]]);
  assert.ok(!BACKGROUND_PRESETS.some((b) => b.name === "Variant Criminal (Spy)"), "no row without parts");
});

test("D351: backgroundSpec: Custom holds everything; an official one only what it asks; unknown is none", () => {
  const c = backgroundSpec({ name: "custom", source: null }, "2024");
  assert.deepEqual([c?.keys, [...(c?.counts ?? [])], c?.abilities.length], [["Scores", "Skills", "Tools", "Feat"], [["Scores", 3], ["Skills", 2], ["Tools", 1], ["Feat", 1]], 6]);
  assert.deepEqual(backgroundSpec({ name: "Custom", source: null }, "2014")?.keys, ["Skills", "Tools", "Languages"]);
  assert.deepEqual(backgroundSpec({ name: "Sage", source: null }, "2024")?.keys, ["Scores"]);
  assert.deepEqual(backgroundSpec({ name: "Sage", source: "PHB" }, "2024")?.keys, ["Languages"]);
  assert.equal(backgroundSpec({ name: "Haunted One", source: null }, "2024"), null);
  assert.equal(backgroundSpec({ name: "Sage", source: null }, null), null, "no edition, no table row (as species)");
});

test("D351: the Background block's counts; Scores counts its bonus points", () => {
  assert.deepEqual(ghosts("Rules: 2024\n\nBackground: Custom\nScores:\nSkills:\nTools:\nFeat:\n"), [[4, 0, 3], [5, 0, 2], [6, 0, 1], [7, 0, 1]]);
  assert.deepEqual(ghosts("Rules: 2024\n\nBackground: Custom\nScores: +2 WIS, +1 DEX\nSkills: Arcana\nFeat: Alert\n"), [[4, 3, 3], [5, 1, 2], [6, 1, 1]]);
  assert.deepEqual(ghosts("Rules: 2024\n\nBackground: Sage\nScores:\nSkills:\nGear: A\n"), [[4, 0, 3]], "granted skills owe no count");
  assert.deepEqual(ghosts("Rules: 2014\n\nBackground: Sage\nLanguages: Elvish\n"), [[4, 1, 2]]);
  assert.deepEqual(ghosts("Rules: 2024\n\nBackground: Acolyte\nScores: STR 15\n"), [], "a base line in the block is no increase");
});

test("D351: picking a background fits its block: the lines it asks for, none it doesn't, names kept", () => {
  const start = "Rules: 2024\nScores:\nClasses: Fighter 1\n\nSpecies:\n\nBackground: Sage\nScores:\nSkills:\nTools:\nGear:\n\nL1 Fighter\n";
  assert.equal(fitBackground(start, at(start, "Background: Sage")),
    "Rules: 2024\nScores:\nClasses: Fighter 1\n\nSpecies:\n\nBackground: Sage\nScores:\nGear:\n\nL1 Fighter\n");
  const custom = start.replace("Background: Sage", "Background: Custom");
  assert.equal(fitBackground(custom, at(custom, "Background: Custom")),
    "Rules: 2024\nScores:\nClasses: Fighter 1\n\nSpecies:\n\nBackground: Custom\nScores:\nSkills:\nTools:\nFeat:\nGear:\n\nL1 Fighter\n");
  // A line with names stays, whatever the background asks; a missing one goes where the key table puts it.
  const named = "Rules: 2024\n\nBackground: Sage|XPHB\nSkills: Arcana\nTools:\nNote: keep\n";
  assert.equal(fitBackground(named, at(named, "Sage|XPHB")), "Rules: 2024\n\nBackground: Sage|XPHB\nScores:\nSkills: Arcana\nNote: keep\n");
  const last = "Rules: 2024\n\nBackground: Custom";
  assert.equal(fitBackground(last, last.length), "Rules: 2024\n\nBackground: Custom\nScores:\nSkills:\nTools:\nFeat:");
  assert.equal(fitBackground("Rules: 2014\n\nBackground: Sage\nLanguages:\n", 25), null, "nothing to change");
  assert.equal(fitBackground("Rules: 2024\n\nBackground: Haunted One\nSkills:\n", 25), null, "an unknown background is left alone");
});

test("D352: a Background block's Scores line lists the bonuses left, from the background's abilities", () => {
  const sage = "Rules: 2024\n\nBackground: Sage\nScores:";
  const s0 = bonusSpotAt(sage, sage.length);
  assert.deepEqual([s0?.rows, s0?.pad, s0?.have], [["+2 CON", "+2 INT", "+2 WIS", "+1 CON", "+1 INT", "+1 WIS"], true, 0]);
  const two = `${sage} +2 INT, `;
  assert.deepEqual(bonusSpotAt(two, two.length)?.rows, ["+1 CON", "+1 WIS"]);
  const one = `${sage} +1 INT, `;
  assert.deepEqual(bonusSpotAt(one, one.length)?.rows, ["+2 CON", "+2 WIS", "+1 CON", "+1 WIS"]);
  const ones = `${sage} +1 INT, +1 CON, `;
  assert.deepEqual(bonusSpotAt(ones, ones.length)?.rows, ["+1 WIS"]);
  const full = `${sage} +2 INT, +1 CON, `;
  assert.deepEqual(bonusSpotAt(full, full.length)?.rows, []);
  // What is typed narrows the list, by bonus or by ability; the pick replaces it.
  const typed = `${sage} +2 INT, w`;
  const t = bonusSpotAt(typed, typed.length);
  assert.deepEqual([t?.rows, typed.slice(t?.start, t?.end)], [["+1 WIS"], "w"]);
  const custom = "Rules: 2024\n\nBackground: Custom\nScores: +2";
  assert.deepEqual(bonusSpotAt(custom, custom.length)?.rows, ["+2 STR", "+2 DEX", "+2 CON", "+2 INT", "+2 WIS", "+2 CHA"]);
});

test("D352: no bonus list outside a background's Scores line, nor for 2014, an unknown one or an unread value", () => {
  for (const t of ["Rules: 2024\nScores:", "Rules: 2024\n\nSpecies: Elf\nScores:", "Rules: 2024\n\nBackground: Sage\n\nL1 Fighter\nScores:",
    "Rules: 2014\n\nBackground: Sage\nScores:", "Rules: 2024\n\nBackground: Haunted One\nScores:", "Rules: 2024\n\nBackground: Sage\nScores: STR 15, ",
    "Rules: 2024\n\nBackground: Sage\nSkills:"]) assert.equal(bonusSpotAt(t, t.length), null, t);
  const mid = "Rules: 2024\n\nBackground: Sage\nScores: +2 INT";
  assert.equal(bonusSpotAt(mid, mid.length - 4), null, "not at the line's end");
});

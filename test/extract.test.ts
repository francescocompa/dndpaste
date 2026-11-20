// The slot extractor as a pure function (D246): data in, names and counts out, no text kept.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSlots, mergeData, srdSubset } from "../src/extract.js";

const DESCRIPTION = "A long description that the extractor must never keep anywhere in its output.";

const files = [
  { book: [{ source: "MYHB", published: "2025-01-01", group: "supplement" }] },
  {
    class: [{
      name: "Gunslinger", source: "MYHB", srd: true, hd: { faces: 8 },
      classFeatures: ["Trick Shot|Gunslinger|MYHB|1", { classFeature: "Path|Gunslinger|MYHB|3", gainSubclassFeature: true }, "Ability Score Improvement|Gunslinger|MYHB|4"],
      spellcastingAbility: "wis", casterProgression: "1/2", cantripProgression: [2, 2, 2, 3],
      startingProficiencies: { skills: [{ choose: { from: ["athletics", "perception"], count: 2 } }] },
      entries: [DESCRIPTION],
    }],
    classFeature: [{ name: "Trick Shot", className: "Gunslinger", classSource: "MYHB", level: 1, source: "MYHB",
      entries: [DESCRIPTION, { type: "options", entries: [{ name: "Bank Shot", entries: [DESCRIPTION] }, { name: "Ricochet" }] }] }],
    subclass: [{ name: "Path of Smoke", shortName: "Smoke", className: "Gunslinger", classSource: "MYHB", source: "MYHB", subclassFeatures: [] }],
  },
  { spell: [{ name: "Ember Ward", source: "MYHB", level: 0, entries: [DESCRIPTION] }, { name: "Moonbeam Lance", source: "MYHB", level: 2 }] },
  // A second file about the same spell (fewer fields) and a spell → class map.
  { spell: [{ name: "Moonbeam Lance", source: "MYHB", extra: 1 }] },
  { myhb: { "moonbeam lance": { class: { MYHB: { Gunslinger: true } } } } },
  { feat: [{ name: "Lucky Streak", source: "MYHB", category: "O", ability: [{ choose: { from: ["str", "dex"] } }] }] },
];

test("D246: extractSlots keeps names, counts and option lists, never text", () => {
  const t = extractSlots(mergeData(files), { generated: "2026-11-20" });
  assert.deepEqual(Object.keys(t.classes), ["Gunslinger|MYHB"]);
  const g = t.classes["Gunslinger|MYHB"];
  assert.equal(g.subclassLevel, 3);
  assert.deepEqual(g.asiLevels, [4]);
  assert.deepEqual(g.features["Trick Shot"], { level: 1, options: ["Bank Shot", "Ricochet"] });
  assert.equal(g.edition, "2024", "the book's date makes it a 2024 book");
  assert.deepEqual(g.skills.choose, { count: 2, from: ["athletics", "perception"] });
  assert.equal(t.spells["Moonbeam Lance|MYHB"].level, 2, "a second file's copy adds fields, never drops them");
  assert.deepEqual(t.spells["Moonbeam Lance|MYHB"].classes, ["Gunslinger"]);
  assert.equal(t.spells["Ember Ward|MYHB"].level, 0);
  assert.deepEqual(t.feats["Lucky Streak|MYHB"].abilityChoose, ["str", "dex"]);
  assert.deepEqual(t.meta.sources, ["MYHB"]);
  assert.ok(!JSON.stringify(t).includes("description"), "no text in the table");
});

test("D246: entries without a name and a source are skipped; the SRD subset keeps flagged ones", () => {
  const t = extractSlots(mergeData([{ spell: [{ name: "No Book" }, { source: "MYHB" }, { name: "Kept", source: "MYHB", srd: true }] }]), { generated: "2026-11-20" });
  assert.deepEqual(Object.keys(t.spells), ["Kept|MYHB"]);
  assert.equal(t.spells["Kept|MYHB"].edition, null, "an unknown book has no edition");
  assert.deepEqual(Object.keys(srdSubset(t).spells), ["Kept|MYHB"]);
});

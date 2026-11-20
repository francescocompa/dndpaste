// One-click fixes (D196 T12, D192 T01, D210–D215): src/fixes.ts. Each fix: where it shows, what it says, what it does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../src/dndpaste.ts";
import { ghostCounts } from "../src/ghost.ts";
import { CANONICAL, fixCursor, lineFixes, markFixes, nameFixes, tidyPlan } from "../src/fixes.ts";
import type { Fix } from "../src/fixes.ts";
import { highlightRows } from "../src/client/highlight.ts";
import * as N from "../src/names.gen.ts";

const fixes = (text: string): Fix[] => {
  const p = parse(text);
  return [...lineFixes(text, p, p.diagnostics, ghostCounts(p, text)), ...nameFixes(N, text, p)];
};
const at = (text: string, line: number, kind?: string) => fixes(text).find((f) => f.line === line && (!kind || f.kind === kind));

test("T01, D192: a header line under Species (E005) moves above Species in one click", () => {
  const text = "Rules: 2024\nClasses: Wizard 5\nSpecies: Goblin\nSpells: Shield\nSubclass: Diviner\n";
  const f = at(text, 5);
  assert.equal(f, undefined, "no level block to move a Subclass into");
  assert.equal(at(text, 4), undefined, "an unknown species: its Spells line is left alone");
  const lv = "Rules: 2024\nClasses: Wizard 5\nSpecies: Goblin\nSubclass: Diviner\nFeat: Alert\n\nL1 Wizard\n\nL3 Wizard\nSpells: Fly\n";
  assert.equal(at(lv, 4)?.act, "Move to L3 Wizard", "review: a subclass goes where its class gains it");
  assert.equal(at(lv, 4)?.apply(lv), "Rules: 2024\nClasses: Wizard 5\nSpecies: Goblin\nFeat: Alert\n\nL1 Wizard\n\nL3 Wizard\nSpells: Fly\nSubclass: Diviner\n");
});

test("D213: a pick the written species doesn't give moves above Species; blank lines stay with the block", () => {
  const text = "Rules: 2024\nClasses: Wizard 5\n\nSpecies: Elf\nSpells: Shield\nSkills: Insight\n\nL1 Wizard\n";
  const f = at(text, 5, "move-up");
  assert.equal(f?.why, "Elf gives no Spells picks. A build-wide Spells line goes above Species.");
  assert.equal(f?.apply(text), "Rules: 2024\nClasses: Wizard 5\nSpells: Shield\n\nSpecies: Elf\nSkills: Insight\n\nL1 Wizard\n");
  assert.equal(at(text, 6, "move-up"), undefined, "an Elf asks for a skill");
  const bg = "Rules: 2024\nClasses: Wizard 1\n\nBackground: Sage\nCantrips: Light\nMasteries: Dagger\n";
  assert.equal(at(bg, 6), undefined, "E005 Masteries: Tidy's job (D225 review)");
});

test("D225 (review): the library's unsafe fixes show as one-click fixes; its safe ones are left to Tidy", () => {
  const text = "Paste: 1\nRules: 2024\nClasses: Sorcerer 5, Warlock 5\nFighting Style: Archery\n\nSpecies: Elf\nMasteries: Dagger\n";
  for (const l of [3, 4]) assert.equal(at(text, l), undefined, `line ${l}: Tidy's job`);
  assert.equal(at(text, 7)?.kind, "move-up", "a pick the species doesn't give: the site's, Tidy doesn't move it");
  const note = "Rules: 2024\nClasses: Fighter 1\n# a comment\n";
  const f = at(note, 3);
  assert.equal(f?.kind, "lib");
  assert.equal(f?.act, "Make it a note");
  assert.equal(f?.apply(note), "Rules: 2024\nClasses: Fighter 1\nNote: a comment\n");
  assert.equal(f?.apply("Rules: 2024\nClasses: Fighter 1\n# another\n"), null, "its line changed since");
});

test("D215 (T10): a level header whose block lacks owed keys offers them, laid out as a preset does", () => {
  const text = "Rules: 2024\nClasses: Fighter 8\n\nL1 Fighter\n\nL3 Fighter\n";
  const l1 = at(text, 4);
  assert.equal(l1?.at, "level");
  assert.equal(l1?.act, "Add Skills, Gear, Masteries, Feat (Fighting Style)");
  assert.equal(at(text, 6)?.apply(text), "Rules: 2024\nClasses: Fighter 8\n\nL1 Fighter\n\nL3 Fighter\nSubclass:\n");
  const kept = "Rules: 2024\nClasses: Fighter 3\n\nL3 Fighter\nSubclass: Champion\n";
  assert.equal(at(kept, 4), undefined, "nothing missing, no offer");
  const fam = "Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nSkills:\nGear:\nInvocations:\nCantrips:\nSpells:\n";
  assert.equal(at(fam, 4), undefined, "a family key fills Options");
  assert.equal(at("Classes: Fighter 3\n\nL3 Fighter\n", 3), undefined, "no edition, no table");
});

test("D211 (T11), D291: a species lays out its owed lines; its lineage goes in the Species line's brackets", () => {
  const text = "Rules: 2024\nClasses: Warlock 1\n\nSpecies: Elf\n\nL1 Warlock\n";
  const f = at(text, 4, "species-lines");
  assert.equal(f?.act, "Add Skills, Elven Lineage");
  assert.equal(f?.apply(text), "Rules: 2024\nClasses: Warlock 1\n\nSpecies: Elf []\nSkills:\n\nL1 Warlock\n", "D291: the brackets on the Species line");
  const after = f?.apply(text) ?? "";
  assert.equal(fixCursor(text, after), after.indexOf("[]") + 1, "D270: the cursor goes inside the brackets");
  assert.equal(fixCursor("Skills:\n", "Skills:\nGear:\n"), null, "no brackets written, no move");
  const feat = "Rules: 2024\n\nSpecies: Elf\nFeature: Size [Medium]\nSkills: Insight\n";
  assert.equal(at(feat, 3)?.apply(feat), "Rules: 2024\n\nSpecies: Elf []\nFeature: Size [Medium]\nSkills: Insight\n");
  assert.equal(at("Rules: 2024\n\nSpecies: Elf [Drow; WIS]\nSkills: Insight\n", 3), undefined, "0.10: the lineage is written");
  assert.equal(at("Rules: 2024\n\nSpecies: Elf\nSkills: Insight\nFeature: Elven Lineage [INT; High Elf]\n", 3), undefined, "0.9: W006 reads it");
  assert.equal(at("Rules: 2014\n\nSpecies: Elf|PHB [High]\n", 3)?.act, "Add Languages", "D291: a 2014 subrace takes its own row");
  assert.equal(at("Rules: 2024\n\nSpecies: Human\n", 3)?.act, "Add Skills, Feat", "Skillful and the Origin feat");
  // The species' Skills line counts its picks.
  const g = ghostCounts(parse(feat), feat).find((x) => x.line === 5);
  assert.deepEqual(g && [g.n, g.have, g.of], [0, 1, 1]);
});

test("D214: a plain Options line of one family moves to that family's key", () => {
  const text = "Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nOptions: Agonizing Blast, Repelling Blast\n";
  assert.equal(at(text, 5)?.act, "Change to Invocations", "review: a rename when there's no Invocations line");
  const two = "Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nInvocations: Pact of the Tome\nOptions: Agonizing Blast\n";
  assert.equal(at(two, 6)?.act, "Move to Invocations");
  assert.equal(at(two, 6)?.apply(two), "Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nInvocations: Pact of the Tome, Agonizing Blast\n");
  assert.equal(at(text, 5)?.apply(text), "Rules: 2024\nClasses: Warlock 2\n\nL1 Warlock\nInvocations: Agonizing Blast, Repelling Blast\n");
  assert.equal(at("Rules: 2024\nClasses: Fighter 3\n\nL3 Fighter\nOptions: Archery, Agonizing Blast\n", 5, "family"), undefined, "two families");
  for (const d of ["[Guidance; Identify]", "[Guidance, Identify]"]) {
    const tome = `Rules: 2024\nClasses: Warlock 3\n\nL3 Warlock\nOptions: Pact of the Tome ${d}, Agonizing Blast\n`;
    assert.equal(at(tome, 5)?.act, "Change to Invocations", `T34: bracket details ${d} don't stop the fold`);
  }
});

test("D212 (T09): a 2014 Cleric's Spells line offers Switch to Prepared, as in 2024", () => {
  const text = "Rules: 2014\nClasses: Cleric 3 / Paladin 2\nL1 Cleric\nSpells: Bless, Cure Wounds, Healing Word\n";
  assert.equal(at(text, 4)?.act, "Change to Prepared");
  assert.equal(at(text, 4)?.apply(text)?.split("\n")[3], "Prepared: Bless, Cure Wounds, Healing Word");
});

test("markFixes: the underline and the line on the key, or on the level header; one fix per line", () => {
  const text = "Rules: 2024\nClasses: Fighter 3\n\nL3 Fighter\n\nSpecies: Goblin\nGear: Rope\n";
  const p = parse(text);
  const fs = lineFixes(text, p, p.diagnostics, ghostCounts(p, text));
  const rows = markFixes(highlightRows(text, p.diagnostics, new Map()), fs);
  assert.ok(rows[3].includes(`<span class="lvh wl" data-line="4">`));
  const bad = "Rules: 2024\nClasses: Wizard 1\n\nSpecies: Elf\nSpells: Shield\n";
  const pb = parse(bad);
  const rb = markFixes(highlightRows(bad, pb.diagnostics, new Map()), lineFixes(bad, pb, pb.diagnostics, []));
  assert.ok(rb[4].includes(`<span class="k wl" data-line="5">Spells</span>`), rb[4]);
  assert.equal(at("Rules: 2024\nClasses: Warlock 1\n\nL1 Warlock\nSpells: Hex|PHB\n", 5), undefined, "review: no other-edition hint");
});

test("D229: Tidy's plan lists each change; a Subclass goes to its level; a struck-through change is left out", () => {
  const text = "Rules: 2024\nClasses: Warlock 3 / Wizard 2\n\nSpecies: Elf\nMasteries: Dagger\nSubclass: Fiend Patron\n\nL1 Warlock\nOptions: Agonizing Blast\n\nL3 Warlock\n";
  const p = tidyPlan(text, N);
  assert.ok(p);
  assert.deepEqual(p.changes.map((c) => c.label), ["Subclass: Move to L3 Warlock", "Masteries: Move above Species", "Options: Change to Invocations", CANONICAL]);
  assert.ok(p.changes.every((c) => !c.off));
  assert.match(p.text, /L3 Warlock\nSubclass: Fiend Patron/);
  assert.match(p.text, /L1 Warlock\nInvocations: Agonizing Blast/);
  assert.ok(!/Species: Elf\nMasteries/.test(p.text));
  assert.equal(tidyPlan(p.text, N), null, "a tidy text has nothing to tidy");
  assert.ok(!tidyPlan(text)?.changes.some((c) => c.label.startsWith("Options")), "no names table: no fold");
  const left = tidyPlan(text, N, new Set(["Masteries: Move above Species", CANONICAL]));
  assert.deepEqual(left?.changes.filter((c) => c.off).map((c) => c.label), ["Masteries: Move above Species", CANONICAL], "still listed, struck through");
  assert.match(left?.text ?? "", /Species: Elf\nMasteries: Dagger\n/, "left where it was");
  assert.match(left?.text ?? "", /L1 Warlock\nInvocations: Agonizing Blast/, "the rest still made");
  assert.equal(tidyPlan("   \n"), null);
  assert.equal(tidyPlan("Rules: 2024\nClasses: Fighter 1\nZzz\n"), null, "an error it can't fix stays; nothing else to do");
});

test("D287, D291: a lineage written before the species' name gets a fix, and Tidy writes the bracket form", () => {
  const fix = (text: string) => nameFixes(N, text, parse(text)).find((f) => f.kind === "lineage");
  const wood = "Rules: 2024\n\nSpecies: Wood Elf\nSkills: Insight\n";
  assert.equal(fix(wood)?.act, "Change to Elf [Wood]");
  assert.equal(fix(wood)?.apply(wood), "Rules: 2024\n\nSpecies: Elf [Wood]\nSkills: Insight\n");
  const black = "Rules: 2024\n\nSpecies: Black Dragonborn\n";
  assert.equal(fix(black)?.apply(black), "Rules: 2024\n\nSpecies: Dragonborn [Black]\n");
  const hill = "Rules: 2014\n\nSpecies: Hill Dwarf|PHB\n";
  assert.equal(fix(hill)?.apply(hill), "Rules: 2014\n\nSpecies: Dwarf|PHB [Hill]\n", "a 2014 subrace, its source kept");
  const ab = "Rules: 2024\n\nSpecies: High Elf [INT]\n";
  assert.equal(fix(ab)?.apply(ab), "Rules: 2024\n\nSpecies: Elf [High; INT]\n", "lineage first, then the ability (D281)");
  for (const none of ["Species: Elf\n", "Species: Half-Elf\n", "Species: Simic Hybrid\n", "Species: Purple Elf\n"]) assert.equal(fix(none), undefined, none);
  const p = tidyPlan(wood, N);
  assert.equal(p?.text, "Rules: 2024\n\nSpecies: Elf [Wood]\nSkills: Insight\n");
  assert.ok(p?.changes.some((c) => c.label === "Species: Change to Elf [Wood]"));
  assert.equal(tidyPlan(wood)?.text ?? wood, wood, "no names table: the name stays");
  const old = "Rules: 2024\n\nSpecies: Elf|XPHB\nFeature: Elven Lineage [WIS; Wood Elf]\n";
  assert.equal(tidyPlan(old, N)?.text, "Rules: 2024\n\nSpecies: Elf|XPHB [Wood Elf; WIS]\n", "W006: the 0.9 line moves onto the Species line");
});

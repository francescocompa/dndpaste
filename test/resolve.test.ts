// Subclass placement (D220) and bare names (D221). One describe per decision.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../src/dndpaste.js";
import { check, isUaSource, type Slots, type Supplement, type Finding, type FeatSlots } from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Slots;
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8")) as Supplement;
const fullPath = join(root, "data", "slots.json");
const full = existsSync(fullPath) ? (JSON.parse(readFileSync(fullPath, "utf8")) as Slots) : null;

const run = (text: string, slots: Slots = srd): Finding[] => {
  const p = parse(text);
  assert.deepEqual(p.diagnostics.filter((d) => d.code.startsWith("E")), [], JSON.stringify(p.diagnostics));
  return check(p, slots, supplement);
};
const on = (f: Finding[], key: string) => f.filter((x) => x.key === key);
const blocks = (cls: string, from: number, to: number, at: Record<number, string> = {}) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => `L${n} ${cls}${at[n] ? `\n${at[n]}` : ""}`).join("\n\n");

describe("D220: a Subclass line goes in the level block where the class gains it, or in the header", () => {
  test("a level block below the subclass level says which block to move it to, with an at target", () => {
    const f = on(run(`Rules: 2024\nClasses: Wizard 5\n\n${blocks("Wizard", 1, 5, { 1: "Subclass: Evoker" })}`), "Subclass");
    assert.equal(f.length, 1, JSON.stringify(f));
    assert.equal(f[0].kind, "misplaced");
    assert.equal(f[0].where, "L1");
    assert.equal(f[0].message, "Wizard gets its subclass at class level 3, not 1; move it to L3 Wizard");
    assert.deepEqual(f[0].at, { key: "Subclass", level: 3 });
  });
  test("a level block above it moves it down; the right block has no finding", () => {
    const late = on(run(`Rules: 2024\nClasses: Wizard 5\n\n${blocks("Wizard", 1, 5, { 4: "Subclass: Evoker" })}`), "Subclass");
    assert.deepEqual(late.map((x) => [x.message, x.at]), [["Wizard gets its subclass at class level 3, not 4; move it to L3 Wizard", { key: "Subclass", level: 3 }]]);
    assert.deepEqual(on(run(`Rules: 2024\nClasses: Wizard 5\n\n${blocks("Wizard", 1, 5, { 3: "Subclass: Evoker" })}`), "Subclass"), []);
  });
  test("the target is the character level where the class reaches its subclass level, in a multiclass", () => {
    const text = `Rules: 2024\nClasses: Fighter 2 / Wizard 3\n\n${blocks("Fighter", 1, 2)}\n\n${blocks("Wizard", 3, 5, { 3: "Subclass: Evoker" })}`;
    const f = on(run(text), "Subclass");
    assert.deepEqual(f.map((x) => [x.message, x.at]), [["Wizard gets its subclass at class level 3, not 1; move it to L5 Wizard", { key: "Subclass", level: 5 }]]);
  });
  test("a block of another class says whose subclass it is and where it goes", () => {
    const text = `Rules: 2024\nClasses: Fighter 3 / Wizard 3\n\n${blocks("Fighter", 1, 3, { 3: "Subclass: Evoker" })}\n\n${blocks("Wizard", 4, 6)}`;
    const f = on(run(text), "Subclass").filter((x) => x.kind === "misplaced");
    assert.deepEqual(f.map((x) => [x.kind, x.message, x.at]), [["misplaced", "Evoker is a Wizard subclass; move it to L6 Wizard", { key: "Subclass", level: 6 }]]);
  });
  test("a class still below its subclass level: move it to the header until then (at level null)", () => {
    const f = on(run(`Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSubclass: Evoker`), "Subclass");
    assert.deepEqual(f.map((x) => [x.message, x.at]), [["Wizard gets its subclass at class level 3, not 1; move it to the header until then", { key: "Subclass", level: null }]]);
  });
  test("a header Subclass stays allowed: no finding, flat or with level blocks, and none ahead of its level", () => {
    assert.deepEqual(on(run("Rules: 2024\nClasses: Wizard 5\nSubclass: Evoker"), "Subclass"), []);
    assert.deepEqual(on(run(`Rules: 2024\nClasses: Wizard 5\nSubclass: Evoker\n\n${blocks("Wizard", 1, 5)}`), "Subclass"), []);
    assert.deepEqual(on(run("Rules: 2024\nClasses: Wizard 1\nSubclass: Evoker"), "Subclass"), []);
  });
  test("`<subclass> <class>` is an accepted spelling: it resolves with no finding, in the header and in a block", () => {
    assert.deepEqual(on(run("Rules: 2024\nClasses: Wizard 5\nSubclass: Evoker Wizard"), "Subclass"), []);
    assert.deepEqual(on(run(`Rules: 2024\nClasses: Wizard 5\n\n${blocks("Wizard", 1, 5, { 3: "Subclass: Evoker Wizard" })}`), "Subclass"), []);
    assert.deepEqual(on(run("Rules: 2014\nClasses: Fighter 3\nSubclass: Champion Fighter"), "Subclass"), []);
  });
  test("Diviner Wizard resolves against the full table (skipped when data/slots.json is absent)", { skip: !full }, () => {
    assert.deepEqual(on(run("Rules: 2024\nClasses: Wizard 5\nSubclass: Diviner Wizard", full as Slots), "Subclass"), []);
    assert.deepEqual(on(run("Rules: 2014\nClasses: Wizard 5\nSubclass: Divination Wizard", full as Slots), "Subclass"), []);
  });
});

/** The SRD table plus a few made-up entities, so the tests do not hang on which books the subset holds. */
const withFeats = (feats: FeatSlots[], dates: Record<string, string> | null = { OLDB: "2016-01-01", NEWB: "2023-01-01" }): Slots => {
  const t = structuredClone(srd);
  for (const f of feats) t.feats[`${f.name}|${f.source}`] = f;
  t.meta = { ...t.meta, sources: [...(t.meta?.sources ?? []), "OLDB", "NEWB", "UATestFeats"] };
  if (dates) t.meta.sourceDates = { ...t.meta.sourceDates, ...dates }; else delete t.meta.sourceDates;
  return t;
};
const feat = (name: string, source: string, edition: string | null = "2014", core = false): FeatSlots & { core: boolean } =>
  ({ name, source, edition, core, category: null, repeatable: false, abilityChoose: null, versions: [], cantripChoose: 0, spellChoose: 0, grantedSpells: [], prereqLevel: null });
const featFindings = (text: string, slots: Slots) => run(text, slots).filter((x) => x.key === "Feat" || x.key === "L");

describe("D221: a bare name is the newest printing within Rules; Unearthed Arcana always carries its code", () => {
  test("no Rules: the newest of all (an SRD background printed in 2014 and 2024 resolves to 2024, no several-sources finding)", () => {
    const none = run("Background: Acolyte");
    assert.ok(!none.some((x) => /several sources/.test(x.message)), JSON.stringify(none));
    assert.ok(none.some((x) => /Acolyte asks for ability bonuses/.test(x.message)), "the 2024 Acolyte asks for Scores");
    const y2014 = run("Rules: 2014\nBackground: Acolyte");
    assert.ok(!y2014.some((x) => /asks for ability bonuses/.test(x.message)), "Rules: 2014 picks the 2014 printing");
  });
  test("several non-core printings in one edition: the newest; a code picks its own", () => {
    const t = withFeats([feat("Test Feat", "OLDB"), feat("Test Feat", "NEWB")]);
    const text = "Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Test Feat";
    assert.deepEqual(featFindings(text, t).filter((x) => x.kind === "unresolved"), []);
    assert.deepEqual(featFindings(`${text}|OLDB`, t).filter((x) => x.kind === "unresolved"), []);
  });
  test("Rules still picks the edition first: an older printing in the paste's edition beats a newer one outside it", () => {
    const t = withFeats([feat("Test Feat", "OLDB", "2014"), feat("Test Feat", "NEWB", "2024")]);
    assert.deepEqual(featFindings("Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Test Feat", t).filter((x) => x.kind === "unresolved"), []);
  });
  test("a setting book's printing loses to a core book's in the same edition, however new; across editions the newest wins", () => {
    const t = withFeats([feat("Test Feat", "COREB", "2024", true), feat("Test Feat", "SETB", "2024"), feat("Test Feat", "OLDB", "2014", true)], { OLDB: "2014-08-19", COREB: "2024-09-17", SETB: "2025-11-18" });
    t.meta = { ...t.meta, settingSources: ["SETB"] };
    // SETB is newest; with COREB in its edition it drops out, and COREB (2024) is newer than OLDB. Proof: a code-less
    // Feat that resolves has no unresolved finding, and the same table with SETB alone in 2024 resolves to SETB.
    const text = (rules: string) => `${rules}Classes: Fighter 4\n\nL4 Fighter\nFeat: Test Feat`;
    for (const r of ["", "Rules: 2024\n", "Rules: 2014\n"]) assert.deepEqual(featFindings(text(r), t).filter((x) => x.kind === "unresolved"), [], r);
  });
  test("a table with no release dates keeps the several-sources finding", () => {
    const t = withFeats([feat("Test Feat", "OLDB"), feat("Test Feat", "NEWB")], null);
    const f = featFindings("Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Test Feat", t);
    assert.ok(f.some((x) => x.message === `Feat: "Test Feat" matches several sources; add |SOURCE`), JSON.stringify(f));
  });
  test("a bare name only Unearthed Arcana prints is a warning that names the code to add; with the code, none", () => {
    assert.ok(isUaSource("UATestFeats") && isUaSource("UA2020Feats") && isUaSource("XUA2099Test") && !isUaSource("XPHB") && !isUaSource("XUA"));
    const t = withFeats([feat("Playtest Feat", "UATestFeats")]);
    const f = featFindings("Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Playtest Feat", t);
    assert.deepEqual(f.filter((x) => x.kind === "unresolved").map((x) => [x.severity, x.message]), [["warning", `Feat: "Playtest Feat" is Unearthed Arcana; write it as Playtest Feat|UATestFeats`]]);
    assert.deepEqual(featFindings("Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Playtest Feat|UATestFeats", t).filter((x) => x.kind === "unresolved"), []);
  });
  test("a published printing beats a playtest one, whatever the dates", () => {
    const t = withFeats([feat("Test Feat", "OLDB"), feat("Test Feat", "UATestFeats")], { OLDB: "2016-01-01", UATestFeats: "2024-01-01" });
    assert.deepEqual(featFindings("Rules: 2014\nClasses: Fighter 4\n\nL4 Fighter\nFeat: Test Feat", t).filter((x) => x.kind === "unresolved"), []);
  });
  test("the full table: Elf is the 2024 PHB's, not a setting book's; Goblin resolves (skipped when data/slots.json is absent)", { skip: !full }, () => {
    const lineage = (text: string) => run(text, full as Slots).find((x) => x.key === "Species" && /asks for a lineage/.test(x.message))?.message ?? "";
    assert.match(lineage("Rules: 2024\nSpecies: Elf"), /Elf \[Drow \| High \| Wood\]/);
    assert.match(lineage("Species: Elf"), /Elf \[Drow \| High \| Wood\]/);
    assert.ok(!run("Species: Elf [Lorwyn]", full as Slots).some((x) => x.key === "Species" && x.kind !== "missing"), "a lineage only another printing offers picks that printing (Elf|LFL)");
    assert.ok(!run("Rules: 2014\nSpecies: Goblin", full as Slots).some((x) => /several sources/.test(x.message)));
  });
  test("the full table's own playtest class needs its code (skipped when data/slots.json is absent)", { skip: !full }, () => {
    const f = run("Classes: Mystic 1", full as Slots).filter((x) => x.key === "Classes");
    assert.deepEqual(f.map((x) => x.message), [`"Mystic" is Unearthed Arcana; write it as Mystic|UATheMysticClass`]);
    assert.deepEqual(run("Classes: Mystic|UATheMysticClass 1", full as Slots).filter((x) => x.key === "Classes"), []);
  });
});

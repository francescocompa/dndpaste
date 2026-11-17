// "Start a build" (T3.8, D121–D125): the class presets and the text they lay out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyDef, parse, emit, splitMarker } from "../../src/dndpaste.ts";
import { PRESETS } from "../src/presets.ts";
import { CLASS_NAMES, OTHER_NAME, cleanRows, presetText, totalLevels } from "../src/preset.ts";
import { presetRows, startReady, starterHtml } from "../src/client/starter.ts";
import { textOf } from "./helpers.ts";
import type { Edition, Row } from "../src/preset.ts";
import { status } from "../src/client/status.ts";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDITIONS: Edition[] = ["2014", "2024"];
const errors = (text: string) => parse(text).diagnostics.filter((d) => d.code.startsWith("E"));

/** Parses with no E-code, only "not chosen yet" warnings (D112), and is already canonical. */
function sound(text: string, what: string): void {
  assert.deepEqual(errors(text), [], what);
  assert.deepEqual([...new Set(parse(text).diagnostics.map((d) => d.code))].filter((c) => c !== "W004"), [], what);
  assert.equal(emit(parse(text)), text, `${what}: canonical`);
  const s = status(text);
  assert.equal(s.canSave, true, `${what}: the form can save it`);
  assert.equal(s.canTidy, false, `${what}: Tidy has nothing to change`);
}

test("preset table (D123, D125): 12 classes in 2014 and 2024, 20 levels each, profile keys only", () => {
  assert.equal(PRESETS.length, 24);
  assert.equal(CLASS_NAMES.length, 12);
  for (const name of CLASS_NAMES) for (const src of ["PHB", "XPHB"]) assert.ok(PRESETS.some((p) => p.name === name && p.source === src), `${name}|${src}`);
  assert.ok(!CLASS_NAMES.includes("Artificer"), "Artificer is not in the SRD subset");
  for (const p of PRESETS) {
    assert.equal(p.owes.length, 20, p.name);
    for (const key of [...p.first, ...p.multi, ...p.owes.flat()]) assert.ok(keyDef(splitMarker(key).key), `${p.name}: ${key}`);
    assert.ok(!p.multi.includes("Gear"), `${p.name}: no starting gear for a later class`);
    assert.equal(p.first.includes("Gear"), p.source === "XPHB", `${p.name}|${p.source}: a starting-gear letter only under 2024 rules (D111)`);
  }
});

test("the committed table is what the script makes from the committed slot table (D115)", () => {
  const out = join(mkdtempSync(join(tmpdir(), "presets-")), "presets.ts");
  execFileSync(process.execPath, [new URL("../scripts/presets.mjs", import.meta.url).pathname, out]);
  assert.equal(readFileSync(out, "utf8"), readFileSync(new URL("../src/presets.ts", import.meta.url), "utf8"), "run node site/scripts/presets.mjs");
});

test("every single-class preset at level 1 and level 20, both editions, parses with no E-code and is canonical", () => {
  let n = 0;
  for (const edition of EDITIONS) for (const cls of CLASS_NAMES) for (const levels of [1, 20]) {
    const text = presetText(edition, [{ cls, levels }]);
    const what = `${cls} ${levels} (${edition})`;
    sound(text, what);
    const p = parse(text);
    const rules = p.header.get("Rules");
    assert.ok(rules?.type === "enum" && rules.value === edition, what);
    const src = edition === "2024" ? "XPHB" : "PHB";
    assert.ok(text.includes(`\nClasses: ${cls}|${src} ${levels}\n`), what);
    assert.ok(text.startsWith(`Rules: ${edition}\nScores:\n`), what);
    // A 2024 background has the same parts every time (D126); a 2014 one varies, so its block stays empty.
    assert.ok(text.includes(edition === "2024" ? "\n\nSpecies:\n\nBackground:\nScores:\nSkills:\nTools:\nGear:\n\nL1 " : "\n\nSpecies:\n\nBackground:\n\nL1 "), what);
    n++;
  }
  assert.equal(n, 48);
});

test("every level in between lays out too, and only levels that owe a pick get a block", () => {
  for (const edition of EDITIONS) for (const cls of CLASS_NAMES) for (let levels = 2; levels < 20; levels++) sound(presetText(edition, [{ cls, levels }]), `${cls} ${levels} (${edition})`);
  const barb = parse(presetText("2014", [{ cls: "Barbarian", levels: 7 }]));
  assert.deepEqual(barb.levels.map((l) => l.n), [1, 3, 4], "Barbarian 2014 owes nothing at 2, 5, 6, 7");
});

test("the laid-out lines are empty values only: no names, no rules text (content boundary)", () => {
  for (const edition of EDITIONS) for (const cls of CLASS_NAMES) {
    for (const line of presetText(edition, [{ cls, levels: 20 }]).split("\n")) {
      if (!line || /^(Rules|Classes): /.test(line) || /^L\d+ [A-Z][a-z]+\|X?PHB$/.test(line)) continue;
      assert.match(line, /^[A-Z][a-z]+( \([A-Z][a-z]+( [A-Z][a-z]+)*\))?:$/, `${cls} (${edition}): ${line}`);
    }
  }
});

test("milestones land where the class owes them", () => {
  const f = presetText("2024", [{ cls: "Fighter", levels: 20 }]);
  const at = (text: string, n: number) => parse(text).levels.find((l) => l.n === n)?.lines;
  assert.deepEqual([...at(f, 1)!.keys()].sort(), ["Feat (Fighting Style)", "Gear", "Masteries", "Skills"]);
  assert.ok(at(f, 3)!.has("Subclass"));
  for (const n of [4, 6, 8, 12, 14, 16]) assert.ok(at(f, n)!.has("Feat"), `Fighter 2024 feat at ${n}`);
  assert.ok(at(f, 19)!.has("Feat (Epic Boon)"));
  const w = presetText("2014", [{ cls: "Wizard", levels: 3 }]);
  assert.ok(at(w, 1)!.has("Cantrips") && at(w, 1)!.has("Spells") && !at(w, 1)!.has("Gear"), "2014: no gear letter");
  assert.ok(at(w, 2)!.has("Subclass"));
  const c = presetText("2024", [{ cls: "Cleric", levels: 1 }]);
  assert.ok(!at(c, 1)!.has("Spells"), "a full-list caster adds no Spells (SPEC §5.1)");
});

test("multiclass rows (D124): runs in the order taken, switch headers from emit, multiclass picks for a later class", () => {
  const sets: [Edition, Row[]][] = [
    ["2024", [{ cls: "Fighter", levels: 1 }, { cls: "Warlock", levels: 4 }]],
    ["2024", [{ cls: "Fighter", levels: 1 }, { cls: "Rogue", levels: 3 }, { cls: "Fighter", levels: 5 }, { cls: "Rogue", levels: 11 }]],
    ["2014", [{ cls: "Paladin", levels: 6 }, { cls: "Sorcerer", levels: 14 }]],
    ["2014", [{ cls: "Rogue", levels: 2 }, { cls: "Wizard", levels: 1 }, { cls: "Rogue", levels: 2 }]],
    ["2024", [{ cls: "Sorcerer", levels: 1 }, { cls: "Warlock", levels: 2 }, { cls: "Sorcerer", levels: 4 }, { cls: "Bard", levels: 6 }]],
    ["2024", CLASS_NAMES.map((cls) => ({ cls, levels: 1 }))],
  ];
  for (const [edition, rows] of sets) {
    const text = presetText(edition, rows);
    const what = `${rows.map((r) => `${r.cls} ${r.levels}`).join(" / ")} (${edition})`;
    sound(text, what);
    assert.equal(parse(text).levels.at(-1)!.n <= totalLevels(rows), true, what);
  }
  const fw = parse(presetText("2024", [{ cls: "Fighter", levels: 1 }, { cls: "Warlock", levels: 4 }]));
  const classes = fw.header.get("Classes");
  assert.ok(classes?.type === "classes");
  assert.deepEqual(classes.entries.map((e) => `${e.ref.name} ${e.levels}`), ["Fighter 1", "Warlock 4"]);
  const l2 = fw.levels.find((l) => l.n === 2)!;
  assert.equal(l2.class.name, "Warlock");
  assert.ok(!l2.lines.has("Gear") && !l2.lines.has("Skills"), "a later Warlock owes no gear and no skills");
  // Runs fold to totals with a header at each change (D49): Rogue 2 / Wizard 1 / Rogue 2 → Rogue 4 / Wizard 1.
  const rw = presetText("2014", [{ cls: "Rogue", levels: 2 }, { cls: "Wizard", levels: 1 }, { cls: "Rogue", levels: 2 }]);
  assert.ok(rw.includes("\nClasses: Rogue|PHB 4 / Wizard|PHB 1\n"));
  assert.ok(rw.includes("\nL3 Wizard|PHB\n") && rw.includes("\nL4 Rogue|PHB\n"));
  // A later Rogue owes its one multiclass skill; a later Bard too.
  const later = parse(presetText("2024", [{ cls: "Wizard", levels: 1 }, { cls: "Rogue", levels: 1 }]));
  assert.ok(later.levels.find((l) => l.n === 2)!.lines.has("Skills"));
});

test("rows: a class repeated in a row merges, levels stop at 20, empty rows and unusable names drop", () => {
  assert.deepEqual(cleanRows([{ cls: "Fighter", levels: 2 }, { cls: "Fighter", levels: 3 }]), [{ cls: "Fighter", levels: 5 }]);
  assert.deepEqual(cleanRows([{ cls: "Fighter", levels: 15 }, { cls: "Rogue", levels: 9 }, { cls: "Bard", levels: 1 }]), [{ cls: "Fighter", levels: 15 }, { cls: "Rogue", levels: 5 }]);
  assert.deepEqual(cleanRows([{ cls: "", levels: 3 }, { cls: "Rogue: 3", levels: 1 }, { cls: "Monk", levels: 0 }, { cls: "Monk", levels: 2 }, { cls: " Artificer ", levels: 1 }]),
    [{ cls: "Monk", levels: 2 }, { cls: "Artificer", levels: 1 }]);
  assert.equal(presetText("2024", []), "");
  assert.equal(presetText("2024", [{ cls: "", levels: 1 }]), "");
  assert.equal(parse(presetText("2024", [{ cls: "Monk", levels: 30 }])).levels.at(-1)!.n <= 20, true);
});

test("a class not on the list (round 1 note): it sets its levels and lays out nothing for itself", () => {
  const text = presetText("2024", [{ cls: "Fighter", levels: 2 }, { cls: "Blood Hunter|TDCC", levels: 3 }, { cls: "Fighter", levels: 1 }]);
  sound(text, "Fighter / Blood Hunter / Fighter");
  assert.ok(text.includes("\nClasses: Fighter|XPHB 3 / Blood Hunter|TDCC 3\n"), "the name as typed, no edition source");
  const p = parse(text);
  for (const n of [3, 4, 5]) assert.equal(p.levels.find((l) => l.n === n)?.lines.size ?? 0, 0, `L${n} owes nothing`);
  assert.ok(p.levels.some((l) => l.n === 3 && l.class.name === "Blood Hunter"), "a header where it starts");
  sound(presetText("2014", [{ cls: "Artificer", levels: 5 }]), "an Other class alone");
  assert.ok(presetText("2014", [{ cls: "Artificer", levels: 5 }]).includes("\nL1 Artificer\n"));
  for (const bad of ["", "Rogue: 3", "A/B", "Cleric, Wizard", "[x]", "Name|", "9lives", "x".repeat(41)]) assert.ok(!OTHER_NAME.test(bad), bad);
  for (const ok of ["Artificer", "Blood Hunter|TDCC", "Gunslinger-2", "Sentinel's Way"]) assert.ok(OTHER_NAME.test(ok), ok);
  assert.equal(presetText("2024", [{ cls: "Rogue: 3", levels: 3 }]), "", "an unusable name lays out nothing");
});

test("the builder (round 1 pins): no order note, the total level alone, Start the build; Other class asks a usable name", () => {
  const two = [{ cls: "Fighter", name: "", levels: 1 }, { cls: "Warlock", name: "", levels: 4 }];
  const html = starterHtml("2024", two);
  assert.ok(!html.includes("order you take"), "no order note");
  assert.ok(textOf(html).includes("Level 5") && !html.includes(" of 20"));
  assert.ok(textOf(html).includes("Start the build") && html.includes("#pencil"));
  assert.ok(!html.includes("sbname"), "no name field for listed classes");
  assert.equal(startReady([{ cls: "", name: "", levels: 1 }]), false);
  assert.equal(startReady(two), true);
  const other = [{ cls: "other", name: "", levels: 2 }];
  assert.ok(starterHtml("2024", other).includes(`class="in sbname"`));
  assert.equal(startReady(other), false, "Other class waits for a name");
  assert.equal(startReady([{ cls: "other", name: "Rogue: 3", levels: 2 }]), false, "an unusable name keeps Start off");
  assert.ok(starterHtml("2024", [{ cls: "other", name: "Rogue: 3", levels: 2 }]).includes(`aria-invalid="true"`));
  assert.equal(startReady([{ cls: "other", name: " Artificer ", levels: 2 }]), true);
  assert.deepEqual(presetRows([{ cls: "other", name: " Artificer ", levels: 2 }, ...two]).map((r) => r.cls), ["Artificer", "Fighter", "Warlock"]);
  assert.ok(starterHtml("2024", [{ cls: "Monk", name: "", levels: 20 }]).includes(`class="bt ghost sbadd" disabled`), "Add a class off at 20");
});

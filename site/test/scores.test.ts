import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ABILITIES, parse } from "../../src/dndpaste.ts";
import type { Paste } from "../../src/dndpaste.ts";
import { build } from "esbuild";
import * as N from "../src/names.gen.ts";
import { fillScore, finalFoot, finalOf, finalTitle, methodOf, pickScore, scoreLineAt, scoreRows } from "../src/scores.ts";
import { renderPaste, scoreMark } from "../src/render.ts";
import { FIXTURES, textOf } from "./helpers.ts";

// src/check.ts imports `./dndpaste.js` and uses parameter properties, which Node's type stripping can't load: bundle it.
const lib = await build({ entryPoints: [fileURLToPath(new URL("../../src/check.ts", import.meta.url))], bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent" });
const { finalScores } = await import(`data:text/javascript;base64,${Buffer.from(lib.outputFiles[0].text).toString("base64")}`) as { finalScores: (p: Paste, slots: unknown) => { scores: Record<string, number | null> | null } };
const slots = JSON.parse(readFileSync(fileURLToPath(new URL("../../data/srd/slots.json", import.meta.url)), "utf8"));
const at = (s: string) => { const i = s.indexOf("¦"); return { text: s.slice(0, i) + s.slice(i + 1), pos: i }; };

// D331: the site's final mirrors the library's finalScores over the SRD names, on every fixture and a few 2014 builds.
const EXTRA = [
  "Rules: 2014\nScores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\nClasses: Wizard 4\n\nSpecies: Elf [High]\n\nL4 Wizard\nFeat: Ability Score Improvement [+2 INT]\n",
  "Scores: STR 15/DEX 10/CON 14/INT 8/WIS 12/CHA 8\nClasses: Fighter 1\n\nSpecies: Dwarf|PHB [Hill]\n",
  "Rules: 2014\nScores: 15/14/13/12/10/8\n\nSpecies: Half-Orc\n",
  "Rules: 2024\nScores: STR 15/DEX 14/CON 13/INT 8/WIS 12/CHA 10\nClasses: Fighter 4\n\nBackground: Soldier\nScores: +2 STR, +1 CON\n\nL1 Fighter\n\nL4 Fighter\nFeat: Grappler [STR]\n",
];
for (const [name, text] of [...FIXTURES, ...EXTRA.map((t, i): [string, string] => [`extra ${i + 1}`, t])]) {
  test(`D331: the popover's final equals finalScores() on ${name}`, () => {
    const p = parse(text);
    const lib = finalScores(p, slots).scores;
    const site = finalOf(p, N);
    if (!lib) { assert.ok(site.every((x) => x === null)); return; }
    assert.deepEqual(site.map((f) => f?.final ?? null), ABILITIES.map((a) => lib[a.toLowerCase()]), name);
  });
}

test("D321: the title and the foot say where the final comes from", () => {
  const p = parse("Rules: 2024\nScores: STR 8/DEX 14/CON 13/INT 10/WIS 15/CHA 12\nClasses: Cleric 4\n\nBackground: Acolyte\nScores: +2 WIS, +1 CON\n\nL1 Cleric\n\nL4 Cleric\nFeat: Ability Score Improvement [+2 WIS]\n");
  const wis = finalOf(p, N)[4]!;
  assert.deepEqual(finalTitle(4, wis), { from: "WIS 15", to: "19 (+4)" });
  assert.equal(finalFoot(wis), "15 base, +2 Background, +2 L4 feat");
});

test("D321: a click on a score finds its ability; elsewhere on the line, none", () => {
  const sl = (s: string) => { const { text, pos } = at(s); return scoreLineAt(text, pos); };
  assert.equal(sl("Scores: STR 15/DEX 1¦4\n")?.at, 1);
  assert.equal(sl("Scores: STR 15/¦DEX 14\n")?.at, 1, "at the ability");
  assert.equal(sl("Scores: 15/14/13/12/1¦0/8\n")?.at, 4, "the bare form, by position");
  assert.equal(sl("Scor¦es: STR 15\n")?.at, null, "on the key");
  assert.equal(sl("Rules: 2024\n\nBackground: Sage\nScores: +1 ¦INT\n"), null, "an increase");
  assert.equal(sl("\nL1 Fighter\nScores: STR 1¦5\n"), null, "a base goes in the header");
  assert.equal(sl("Scores (point buy): STR 1¦5\n")?.marker, "point-buy", "the marker");
});

test("D322: the caret at the end of a line being filled asks for the next ability", () => {
  const sl = (s: string) => { const { text, pos } = at(s); return scoreLineAt(text, pos); };
  assert.deepEqual(sl("Rules: 2024\nScores:¦\nClasses: Wizard 1\n")?.fill, { i: 0, typed: "" });
  assert.deepEqual(sl("Scores: STR 15/DEX ¦")?.fill, { i: 1, typed: "" });
  assert.deepEqual(sl("Scores: STR 15/DEX 1¦")?.fill, { i: 1, typed: "1" });
  assert.deepEqual(sl("Scores: STR 15/¦")?.fill, { i: 1, typed: "" });
  assert.equal(sl("Scores: STR 15/DEX 14¦")?.fill, null, "a number in full is a score, not a fill");
  const { text, pos } = at("Scores:¦\nClasses: Wizard 1\n");
  const one = fillScore(text, scoreLineAt(text, pos)!, 15);
  assert.equal(one.text, "Scores: STR 15/DEX \nClasses: Wizard 1\n");
  assert.equal(one.cursor, "Scores: STR 15/DEX ".length);
  const last = "Scores: STR 15/DEX 14/CON 13/INT 12/WIS 10/CHA ";
  const done = fillScore(last, scoreLineAt(last, last.length)!, 8);
  assert.deepEqual([done.text, done.done], ["Scores: STR 15/DEX 14/CON 13/INT 12/WIS 10/CHA 8", true]);
});

test("D321: rows by method; a standard-array pick swaps both numbers", () => {
  const v = [15, 14, 13, 12, 10, 8];
  const rows = scoreRows("standard-array", v, 4);
  assert.deepEqual(rows.map((r) => [r.n, r.swap]), [[15, 0], [14, 1], [13, 2], [12, 3], [8, 5]]);
  assert.deepEqual(scoreRows("standard-array", [15, 14, null, null, null, null], 2, true).map((r) => r.n), [13, 12, 10, 8], "a fill offers what is free");
  const pb = scoreRows("point-buy", [15, 15, 8, 8, 8, 8], 3);
  assert.deepEqual(pb.map((r) => [r.n, r.cost, r.over]).slice(0, 3), [[15, 9, false], [14, 7, false], [13, 5, false]]);
  assert.equal(scoreRows("point-buy", [15, 15, 15, 8, 8, 8], 0).find((r) => r.n === 14)?.over, false);
  assert.equal(scoreRows("point-buy", [15, 15, 15, 8, 8, 8], 3).find((r) => r.n === 9)?.over, true, "27 spent: nothing past 8");
  assert.equal(scoreRows("point-buy", [15, 15, 14, 9, 8, 8], 3).find((r) => r.n === 11)?.over, true, "past 27 points");
  assert.deepEqual(scoreRows("custom", v, 0), []);
  const text = "Scores: STR 15/DEX 14/CON 13/INT 12/WIS 10/CHA 8\nClasses: Wizard 1\n";
  const sl = scoreLineAt(text, 41)!;
  assert.equal(sl.at, 4);
  assert.equal(pickScore(text, sl, 4, rows[0]).text, "Scores: STR 10/DEX 14/CON 13/INT 12/WIS 15/CHA 8\nClasses: Wizard 1\n");
  assert.equal(pickScore("Scores (point buy): 15/14/13/12/10/8", scoreLineAt("Scores (point buy): 15/14/13/12/10/8", 21)!, 0, { n: 14, swap: null, cost: 7, over: false }).text,
    "Scores (point buy): STR 14/DEX 14/CON 13/INT 12/WIS 10/CHA 8", "the marker stays as written; the line takes the named form");
});

test("D323, D324: the method: the marker, else the draft's pick, else the numbers", () => {
  assert.equal(methodOf({ marker: null, values: [15, 14, 13, 12, 10, 8] }, null), "standard-array");
  assert.equal(methodOf({ marker: null, values: [15, 14, 13, 12, 10, 8] }, "point-buy"), "point-buy");
  assert.equal(methodOf({ marker: "custom", values: [15, 14, 13, 12, 10, 8] }, "point-buy"), "custom");
  assert.equal(methodOf({ marker: null, values: [null, null, null, null, null, null] }, null), null);
  const v = (values: (number | null)[], method?: "point-buy" | "standard-array" | "custom") => ({ type: "scores" as const, values, increase: null, ...(method ? { method } : {}) });
  assert.equal(scoreMark(v([15, 14, 13, 12, 10, 8])).words, "Std. Array");
  assert.equal(scoreMark(v([15, 14, 13, 12, 10, 8]), "point-buy").words, "Point Buy 0/27");
  assert.equal(scoreMark(v([13, 13, 13, 12, 12, 10])).words, "Point Buy 2/27");
  assert.equal(scoreMark(v([18, 14, 13, 12, 10, 8])).words, "Custom");
  assert.equal(scoreMark(v([15, 15, 15, 10, 8, 8], "point-buy")).words, "Point Buy −2/27", "past the budget");
  assert.deepEqual([scoreMark(v([18, 14, 13, 12, 10, 8], "point-buy")).clash, scoreMark(v([15, 14, 13, 12, 10, 8], "point-buy")).clash], [true, false]);
});

test("D325: the view and print carry the mark after the base row; the marker shows on the key", () => {
  const html = renderPaste(parse("Scores (point buy): STR 13/DEX 13/CON 13/INT 12/WIS 12/CHA 10\nClasses: Wizard 1\n"));
  assert.match(html, /<span class="smk">Point Buy 2\/27<\/span>/);
  assert.ok(textOf(html).startsWith("Scores (point buy):STR 13/DEX 13/CON 13/INT 12/WIS 12/CHA 10 Point Buy 2/27"));
  assert.match(renderPaste(parse("Scores (standard array): STR 18\n")), /class="smk clash" title="[^"]+">Std\. Array</);
  assert.ok(!/smk/.test(renderPaste(parse("Scores: +2 CHA\n"))), "an increase has no mark");
});

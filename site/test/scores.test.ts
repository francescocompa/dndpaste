import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ABILITIES, parse } from "../../src/dndpaste.ts";
import type { Paste } from "../../src/dndpaste.ts";
import { build } from "esbuild";
import * as N from "../src/names.gen.ts";
import { nameRows } from "../src/namerows.ts";
import { fillScore, finalFoot, finalOf, finalTitle, listRows, methodOf, pickScore, scoreLineAt, scoreRows, stepScore } from "../src/scores.ts";
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

// D340, D341 (T9.5): a half feat's fixed +1 counts with nothing written; an ASI's bare ability is +2 alone, +1/+1 for two.
test("D341: an ASI's bare ability counts: alone +2, beside another +1", () => {
  const head = "Rules: 2024\nScores: STR 15/DEX 14/CON 13/INT 8/WIS 12/CHA 10\nClasses: Fighter 4\n\nL1 Fighter\n\nL4 Fighter\n";
  const fin = (feat: string) => finalOf(parse(head + feat + "\n"), N).map((f) => f?.final ?? null);
  assert.deepEqual(fin("Feat: Ability Score Improvement [STR]"), [17, 14, 13, 8, 12, 10]);
  assert.deepEqual(fin("Feat: Ability Score Improvement [STR, CON]"), [16, 14, 14, 8, 12, 10]);
  assert.deepEqual(fin("Feat: Ability Score Improvement [+1 STR, CON]"), [16, 14, 14, 8, 12, 10]);
  assert.deepEqual(fin("Feat: Ability Score Improvement [+2 STR]"), [17, 14, 13, 8, 12, 10], "the written form, as before");
  const p = parse(head + "Feat: Ability Score Improvement [CON]\n");
  assert.equal(finalFoot(finalOf(p, N)[2]!), "13 base, +2 L4 feat");
  assert.deepEqual(finalOf(p, N).map((f) => f?.final ?? null), ABILITIES.map((a) => finalScores(p, slots).scores![a.toLowerCase()]), "the library agrees");
});

// The full table (gitignored, data/slots.json) has the half feats with a fixed increase; the SRD subset has none.
const fullUrl = new URL("../../data/slots.json", import.meta.url);
const full = existsSync(fullUrl) ? JSON.parse(readFileSync(fileURLToPath(fullUrl), "utf8")) : null;
test("D340: a half feat with a fixed increase counts with nothing written, as finalScores() does", { skip: !full?.feats || !Object.values(full.feats).some((f: any) => f.abilityFixed) ? "no regenerated data/slots.json" : false }, () => {
  const BOOK: Record<string, number> = { PHB: 1, XPHB: 2, DMG: 4, XDMG: 8 };
  const names = nameRows(full, {}, { bookOf: (e: { source: string }) => BOOK[e.source] ?? 0 }) as unknown as Parameters<typeof finalOf>[1];
  const head = "Rules: 2024\nScores: STR 15/DEX 14/CON 13/INT 8/WIS 12/CHA 10\nClasses: Fighter 4\n\nL1 Fighter\n\nL4 Fighter\n";
  for (const [feat, want] of [
    ["Feat: Durable", [15, 14, 14, 8, 12, 10]],
    ["Feat: Keen Mind", [15, 14, 13, 9, 12, 10]],
    ["Feat: Great Weapon Master", [16, 14, 13, 8, 12, 10]],
    ["Feat: Ability Score Improvement [DEX]", [15, 16, 13, 8, 12, 10]],
  ] as [string, number[]][]) {
    const p = parse(head + feat + "\n");
    const site = finalOf(p, names).map((f) => f?.final ?? null);
    assert.deepEqual(site, want, feat);
    assert.deepEqual(site, ABILITIES.map((a) => finalScores(p, full).scores![a.toLowerCase()]), `${feat}: the library agrees`);
  }
  assert.equal(finalFoot(finalOf(parse(head + "Feat: Durable\n"), names)[2]!), "13 base, +1 L4 feat");
});

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

test("D360: a Custom score's list is a stepper: one row, the typed or written number, else 10, kept inside 1-30", () => {
  const v = [15, null, 13, null, null, null];
  assert.deepEqual(listRows("custom", v, 1, true).map((r) => r.n), [10], "nothing typed or written: 10");
  assert.deepEqual(listRows("custom", v, 1, true, "1").map((r) => r.n), [1], "what is typed");
  assert.deepEqual(listRows("custom", v, 0).map((r) => r.n), [15], "a click on a written score starts there");
  assert.deepEqual([stepScore(10, 1), stepScore(10, -5), stepScore(30, 1), stepScore(1, -1), stepScore(3, -5)], [11, 5, 30, 1, 1]);
  // The other methods keep their lists, a fill narrowed by what is typed.
  assert.deepEqual(listRows("standard-array", [15, null, null, null, null, null], 1, true, "1").map((r) => r.n), [14, 13, 12, 10]);
  assert.deepEqual(listRows("point-buy", v, 1, false).map((r) => r.n), scoreRows("point-buy", v, 1).map((r) => r.n));
  // The stepper's number is written as any pick is: a fill moves on to the next ability.
  const text = "Scores: STR 15/DEX ";
  const sl = scoreLineAt(text, text.length)!;
  assert.deepEqual(fillScore(text, sl, stepScore(listRows("custom", sl.values, 1, true)[0].n, 2)), { text: "Scores: STR 15/DEX 12/CON ", cursor: 26, done: false });
});

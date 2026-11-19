// D149: on the edit form, W004 (a key with no value yet) leaves Problems for its own To choose row; the summary and
// the phone dock say "N to choose". Display only: the library still reports W004 as a warning (D112).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../src/dndpaste.ts";
import { presetText } from "../src/preset.ts";
import { formPage } from "../src/pages.ts";
import { TO_CHOOSE_SHOWN, dockLineHtml, problemsHtml, status, summaryHtml, toChooseHtml } from "../src/client/status.ts";

const bard5 = presetText("2024", [{ cls: "Bard", levels: 5 }]);
const NO_PROBLEMS = `<div class="dsum"><span class="okc">No problems.</span> Warnings show here; they don't block saving.</div>`;
const chips = (html: string) => [...html.matchAll(/data-line="(\d+)"/g)].map((m) => Number(m[1]));

test("D149: a fresh Bard 5 preset (2024) has no problems rows and 19 to choose", () => {
  assert.equal(parse(bard5).diagnostics.filter((d) => d.code === "W004").length, 19, "the library keeps W004 a warning");
  const s = status(bard5);
  assert.equal(s.errors, 0);
  assert.equal(s.warnings, 0);
  assert.equal(s.toChoose.length, 19);
  assert.deepEqual(s.toChoose, [...s.toChoose].sort((a, b) => a - b));
  assert.equal(s.canSave, true);
  assert.equal(problemsHtml(s), NO_PROBLEMS);
  assert.equal(summaryHtml(s), `<span class="okc">No errors</span> · 19 to choose, ready to save`);
  assert.equal(dockLineHtml(s), `<span class="dsum"><span class="okc">No errors</span> · 19 to choose</span>`);

  const row = toChooseHtml(s);
  assert.match(row, /^<span class="lbl">To choose · 19<\/span><div class="chips lns">/);
  assert.deepEqual(chips(row), s.toChoose.slice(0, TO_CHOOSE_SHOWN));
  assert.match(row, /<button type="button" class="more" data-act="more" aria-label="Show 9 more">\+9<\/button><\/div>$/);
  const all = toChooseHtml(s, true);
  assert.deepEqual(chips(all), s.toChoose, "+N shows every line");
  assert.doesNotMatch(all, /class="more"/);
  const lines = bard5.split("\n");
  for (const l of chips(row)) assert.match(lines[l - 1], /^[A-Za-z ]+:$/, `line ${l} is an empty key line`);
});

test("D149 review: a counted line short of its count (1 of 3 skills) stays to choose until it is full", () => {
  const lines = bard5.split("\n");
  const at = lines.indexOf("Skills:", lines.indexOf("L1 Bard|XPHB")) + 1;
  const fill = (v: string) => lines.map((l, i) => (i === at - 1 ? `Skills: ${v}` : l)).join("\n");
  const one = status(fill("Performance"));
  assert.equal(one.toChoose.length, 19);
  assert.ok(one.toChoose.includes(at));
  assert.equal(one.warnings, 0);
  assert.equal(summaryHtml(one), `<span class="okc">No errors</span> · 19 to choose, ready to save`);
  const full = status(fill("Performance, Insight, History"));
  assert.equal(full.toChoose.length, 18);
  assert.ok(!full.toChoose.includes(at));
  const over = status(fill("Performance, Insight, History, Arcana"));
  assert.ok(!over.toChoose.includes(at), "over the count is not to choose");
});

test("D149: an error, another warning and W004s: Problems lists the first two, To choose the rest", () => {
  const text = "Rules: 2024\nClasses: Bard 1\nX-Note: hi\n\nSpecies:\n\nL1 Bard\nSpels: Hex\nCantrips:\n";
  const s = status(text);
  assert.equal(s.errors, 1);
  assert.equal(s.warnings, 1);
  assert.deepEqual(s.toChoose, [5, 9]);
  const p = problemsHtml(s);
  assert.match(p, /E002/);
  assert.match(p, /W001/);
  assert.doesNotMatch(p, /W004/);
  assert.equal(summaryHtml(s), "<b>1 error</b> · fix it to save", "errors still take priority");
  assert.match(dockLineHtml(s), /<b>E002<\/b>/);
  assert.equal(toChooseHtml(s), `<span class="lbl">To choose · 2</span><div class="chips lns">` +
    `<button type="button" class="hc" data-line="5" data-end aria-label="Line 5">5</button>` +
    `<button type="button" class="hc" data-line="9" data-end aria-label="Line 9">9</button></div>`);

  const fixed = status(text.replace("Spels: Hex", "Spells: Hex"));
  assert.equal(fixed.errors, 0);
  // Spells: Hex is 1 of the 4 a Bard 1 learns: to choose too (D149 review).
  assert.deepEqual(fixed.toChoose, [5, 8, 9]);
  assert.equal(summaryHtml(fixed), `<span class="okc">No errors</span> · 1 warning · 3 to choose, ready to save`);
  assert.equal(dockLineHtml(fixed), `<span class="dsum"><span class="okc">No errors</span> · 1 warning · 3 to choose</span>`);

  const warned = status(text.replace("Spels: Hex", "Spells: Hex").replace(/^Species:$/m, "X-Other: yes"));
  assert.equal(warned.warnings, 2);
  assert.match(summaryHtml(warned), /· 2 warnings · 2 to choose, ready to save$/);
});

test("D149: no To choose row when nothing is empty; the summary reads as before", () => {
  const s = status("Rules: 2024\nClasses: Bard 1\n");
  assert.deepEqual(s.toChoose, []);
  assert.equal(toChooseHtml(s), "");
  assert.equal(summaryHtml(s), `<span class="okc">No problems</span> · ready to save`);
  const w = status("Rules: 2024\nClasses: Bard 1\nX-Note: hi\n");
  assert.equal(summaryHtml(w), `<span class="okc">No errors</span> · 1 warning, ready to save`);
});

test("D149: the server-rendered form splits W004 out of Problems the same way", () => {
  const text = "Rules: 2024\nClasses: Bard 1\n\nSpecies:\n\nL1 Bard\nSpels: Hex\n";
  const html = formPage({ paste: text, diagnostics: parse(text).diagnostics });
  assert.match(html, /E002/);
  assert.doesNotMatch(html, /W004/);
  assert.match(html, /<span class="lbl">To choose · 1<\/span><div class="chips lns"><span class="hc">4<\/span><\/div>/);
  const only = formPage({ paste: bard5, diagnostics: parse(bard5).diagnostics });
  assert.match(only, /<span class="lbl">Problems<\/span><p class="muted">No problems.<\/p>/);
  assert.match(only, /To choose · 19<\/span>.*<span class="more">\+9<\/span>/);
  const partial = bard5.replace("L1 Bard|XPHB\nSkills:", "L1 Bard|XPHB\nSkills: Performance");
  assert.match(formPage({ paste: partial, diagnostics: parse(partial).diagnostics }), /To choose · 19</, "a short counted line counts there too");
  assert.doesNotMatch(formPage({}), /To choose/);
});

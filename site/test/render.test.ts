import { test } from "node:test";
import assert from "node:assert/strict";
import { emitValue, foldClasses, parse } from "../../src/dndpaste.ts";
import type { Scope } from "../../src/dndpaste.ts";
import { esc, renderPaste, renderValue } from "../src/render.ts";
import { FIXTURES, textOf } from "./helpers.ts";

test("esc covers the five HTML specials", () => {
  assert.equal(esc(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

// Every value renders to the emitter's text (Classes keeps its runs as written), so the view never drifts from the format.
for (const [name, text] of FIXTURES) {
  test(`render: every value in ${name} reads as the emitter writes it`, () => {
    const p = parse(text);
    const scopes: Scope[] = [p.header, ...p.entities.map((e) => e.lines), ...p.levels.map((l) => l.lines)];
    for (const scope of scopes) {
      for (const [key, v] of scope) {
        const want = v.type === "classes"
          ? v.entries.map((e) => emitValue({ type: "classes", entries: foldClasses([e]) })).join(" / ")
          : emitValue(v);
        assert.equal(textOf(renderValue(key, v)), want, `${name} ${key}`);
      }
    }
  });

  test(`render: ${name} shows every block and level`, () => {
    const p = parse(text);
    const html = renderPaste(p);
    if (p.identifier) assert.match(html, /class="hv idv"/);
    for (const l of p.levels) assert.ok(html.includes(`<span class="hk lvk">L${l.n}</span>`), `L${l.n}`);
    for (const e of p.entities) assert.ok(html.includes(`<span class="k">${e.key}</span>`), e.key);
    assert.equal((html.match(/<details class="lvb" open>/g) ?? []).length, p.levels.filter((l) => l.lines.size).length);
  });
}

test("render: kind and ability classes (D82)", () => {
  const html = renderPaste(parse(FIXTURES.find(([n]) => n === "vice.dndpaste")![1]));
  for (const k of ["class", "subclass", "species", "background", "feat", "spell"]) assert.ok(html.includes(`kd-${k}`), k);
  assert.ok(html.includes(`<span class="n ab-str">8</span>`));
  assert.ok(html.includes(`<span class="d"><span class="ab ab-cha">CHA</span></span>`));
  assert.ok(html.includes(`<span class="s">|AAG</span>`));
});

test("render: drops, quantities, quoted names, extension keys", () => {
  const p = parse(`L1 Fighter\nItems: Rope x2\nX-Note: A, B\n\nL2 Fighter\nFeat: -Alert, "Name, With Comma"`);
  const html = renderPaste(p);
  assert.ok(html.includes(`<span class="q">x2</span>`));
  assert.ok(html.includes(`<span class="drop"><span class="x">-</span>`));
  assert.ok(html.includes(`<span class="p">&quot;</span><span class="r kd-feat">Name, With Comma</span><span class="p">&quot;</span>`));
  assert.ok(html.includes(`<span class="k xk">X-Note</span>`));
});

test("render: a level block with no lines has nothing to fold", () => {
  const html = renderPaste(parse("L1 Wizard\n\nL2 Wizard\nSpells: Shield"));
  assert.equal((html.match(/<details/g) ?? []).length, 1);
  assert.ok(html.includes(`<div class="bl lvb"><span class="hk lvk">L1</span>`));
  assert.ok(html.includes(`<span class="cnt">1 line</span>`));
});

test("render: hostile names are escaped everywhere", () => {
  const p = parse(`<script>alert(1)</script>\nFeat: <img src=x onerror=alert(1)>|<B>\nSpells: "</span><b>x</b>"\n\nL1 <svg onload=alert(1)>`);
  const html = renderPaste(p);
  assert.ok(!/<script|<img|<svg onload|<b>/i.test(html), html);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("render (0.8): a header base and increase are two Scores rows, in the order written; a slot marker sits apart", () => {
  const p = parse("Scores: 15/10/13/8/10/15\nScores: +2 CHA\nClasses: Warlock 4\nFeat (Origin): Alert\n\nL1 Warlock\nScores: +1 CON\nSpells:\n");
  const html = renderPaste(p);
  const rows = [...html.matchAll(/<span class="hk">([\s\S]*?)<\/span><span class="hv[^"]*">([\s\S]*?)<\/span>(?=<span class="hk|<\/div>)/g)]
    .map((m) => `${textOf(m[1])} ${textOf(m[2])}`.trim());
  assert.deepEqual(rows.slice(0, 4), ["Scores: STR 15/DEX 10/CON 13/INT 8/WIS 10/CHA 15 Point Buy 0/27", "Scores: +2 CHA", "Classes: Warlock 4", "Feat (Origin): Alert"]);
  assert.ok(html.includes(`<span class="k">Feat <span class="km">(Origin)</span></span>`));
  assert.ok(html.includes(`<span class="cnt">1 line</span>`), "the level's count counts the lines shown");
  assert.ok(rows.includes("Scores: +1 CON") && !rows.includes("Spells:"), "a level increase; an empty value is left out (D216)");
});

test("D216 (T25): the view leaves out empty lines and an empty Species or Background block; a level of empty lines keeps its header", () => {
  const p = parse("Rules: 2024\nScores:\nClasses: Warlock 1\n\nSpecies: Elf\nSkills:\n\nBackground:\nTools:\n\nL1 Warlock\nOptions: Agonizing Blast\nCantrips:\n\nL2 Warlock\nSpells:\n");
  const html = renderPaste(p);
  const text = textOf(html);
  assert.ok(!/Scores:|Skills:|Tools:|Cantrips:|Spells:|Background/.test(text), text);
  assert.ok(text.includes("Species:") && text.includes("Elf") && text.includes("Agonizing Blast"));
  assert.ok(html.includes(`<span class="cnt">1 line</span>`));
  assert.ok(/<div class="bl lvb"><span class="hk lvk">L2<\/span>/.test(html), "L2 keeps its header, unfolded");
});

// The paste form's client modules (slice 2): the highlight layer, key hints, live status, link import and recent
// shares. DOM-free; the DOM wiring (src/client/form.ts) is clicked through in the browser (site/FIDELITY.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "../../src/dndpaste.ts";
import { renderValue } from "../src/render.ts";
import { findSeparator, highlight, highlightLine, highlightValue } from "../src/client/highlight.ts";
import { keyHints } from "../src/client/hints.ts";
import { dockLineHtml, importBarHtml, linkedId, problemsHtml, status, summaryHtml } from "../src/client/status.ts";
import { dayLabel, MAX_RECENT, recentHtml, recentStore } from "../src/client/recent.ts";
import { FIXTURES, textOf } from "./helpers.ts";

const NONCANON = new URL("../../fixtures/noncanonical/", import.meta.url);
const ALL: [string, string][] = [
  ...FIXTURES,
  ...readdirSync(NONCANON).filter((f) => f.endsWith(".dndpaste")).map((f): [string, string] => [`noncanonical/${f}`, readFileSync(new URL(f, NONCANON), "utf8")]),
];
const fixture = (name: string) => (FIXTURES.find(([f]) => f === name) as [string, string])[1];
const HOSTILE = [
  `</textarea><script>alert(1)</script>`, `Spells: "<img src=x onerror=alert(1)>", Hex`, `X-Notes: "a & b", '<b>'`,
  `"unclosed`, `Feat: [nested [x]]`, `  L1   Wizard|XPHB  `, `Scores: 8 / 15/14 /10/8/15`, `ASI: +2 cha, +1 Dex`, "\t\tTools:\tx",
];

test("highlight: every line comes back character for character, in every fixture and hostile line", () => {
  for (const [name, text] of [...ALL, ["hostile", HOSTILE.join("\n")] as [string, string]]) {
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const html = highlightLine(line, { first: i === 0, codes: [] });
      assert.equal(textOf(html), line, `${name} line ${i + 1}`);
      assert.ok(!/<(?!\/?(span|b)[ >])/.test(html), `${name} line ${i + 1}: only span and b tags`);
    });
    const rows = highlight(text, parse(text).diagnostics);
    assert.equal((rows.match(/<div class="row/g) ?? []).length, lines.length, `${name}: one row per line`);
  }
});

test("highlight: a canonical line's value is the renderer's own markup (same span classes as the view)", () => {
  let checked = 0;
  for (const [name, text] of FIXTURES) {
    const paste = parse(text);
    const scopes = [paste.header, ...paste.entities.map((e) => e.lines), ...paste.levels.map((l) => l.lines)];
    for (const line of text.split("\n")) {
      const t = line.trim();
      const sep = findSeparator(t);
      if (sep < 0) continue;
      const key = t.slice(0, sep);
      const raw = t.slice(sep + 2);
      const v = scopes.find((s) => s.has(key))?.get(key);
      if (!v || v.type === "classes") continue; // Classes renders its runs as written; checked by text above
      const rendered = renderValue(key, v);
      if (textOf(rendered) !== raw) continue; // the line is not in canonical form
      assert.equal(highlightValue(key, raw), rendered, `${name}: ${line}`);
      checked++;
    }
  }
  assert.ok(checked >= 90, `checked ${checked} canonical lines`);
});

test("highlight: the frames' marks — identifier bold, level header accent, unknown key, X- key, drops, quotes", () => {
  const vice = fixture("vice.dndpaste");
  const html = highlight(vice.replace("Spells: Hex", "Spels: Hex"), parse(vice.replace("Spells: Hex", "Spels: Hex")).diagnostics);
  assert.ok(html.startsWith(`<div class="row"><span class="g"></span><span class="t"><b>Vice</b></span></div>`));
  assert.ok(html.includes(`<span class="lvh"><span class="lvn">L1</span> <span class="r kd-class">Warlock</span></span>`));
  assert.match(html, /<div class="row err"><span class="g"><\/span><span class="t"><span class="k bad">Spels<\/span>/);
  assert.ok(highlightLine("X-Notes: Mirror Image", { first: false, codes: [] }).startsWith(`<span class="k xk">X-Notes</span>`));
  assert.equal(highlightLine("Spells: -Shield, Mage Armor", { first: false, codes: [] }),
    `<span class="k">Spells</span><span class="p">:</span> <span class="drop"><span class="x">-</span><span class="r kd-spell">Shield</span></span><span class="p">, </span><span class="r kd-spell">Mage Armor</span>`);
  assert.ok(highlightLine(`Equipment: "Bag of Tricks, Gray", Arrows (20) x2`, { first: false, codes: [] })
    .includes(`<span class="p">&quot;</span><span class="r kd-item">Bag of Tricks, Gray</span><span class="p">&quot;</span><span class="p">, </span><span class="r kd-item">Arrows (20)</span> <span class="q">x2</span>`));
});

test("hints: the frames' key lists (header 24, drop-dark header 16, L5 Warlock 17, half-typed Spe → Spells)", () => {
  const empty = keyHints("", 0);
  assert.equal(empty.label, "the header");
  assert.equal(empty.keys.length, 24);
  assert.deepEqual(empty.keys.slice(0, 5), ["Paste", "Producer", "Rules", "Scores", "Classes"]);

  const drop = `Rules: 2024\nClasses: Fighter 3 / Warlock 3\nSubclass: Battle Master, Celestial\nFeat: Resilient [CON]\nFighting Style: Archery\nOptions: Riposte\nCantrips: Eldritch Blast\nSpells: Hex`;
  assert.deepEqual(keyHints(drop, 3).keys, ["Paste", "Producer", "Scores", "HP", "Species", "Background", "ASI", "Skills", "Tools",
    "Languages", "Expertise", "Masteries", "Feature", "Prepared", "Equipment", "Items"]);

  const vice = fixture("vice.dndpaste").trimEnd();
  const last = vice.split("\n").length - 1;
  const l5 = keyHints(vice, last);
  assert.equal(l5.label, "L5 Warlock");
  assert.equal(l5.keys.length, 17);
  assert.ok(!l5.keys.includes("Options") && !l5.keys.includes("Species"));

  const typing = keyHints(vice + "\nSpe", last + 1);
  assert.deepEqual(typing.keys, ["Spells"]);
  assert.equal(typing.narrowed, true);
  const noMatch = keyHints(vice + "\nZz", last + 1);
  assert.equal(noMatch.narrowed, false);
  assert.equal(noMatch.keys.length, 17);
});

test("hints: Species and Background blocks, and keys used once leave the list", () => {
  const text = "Rules: 2024\n\nSpecies: Elf\nSkills: Perception\n\nBackground: Sage\n";
  const sp = keyHints(text, 3);
  assert.equal(sp.label, "the Species block");
  assert.ok(!sp.keys.includes("Skills") && !sp.keys.includes("Species") && !sp.keys.includes("Background") && sp.keys.includes("Ability"));
  assert.ok(keyHints("Species: Elf\n", 0).keys.includes("Background"), "a Background line may still open its block");
  assert.ok(!sp.keys.includes("Rules"), "header-only keys are not offered in a block");
  const bg = keyHints(text, 5);
  assert.equal(bg.label, "the Background block");
  assert.ok(bg.keys.includes("Equipment") && !bg.keys.includes("Background") && !bg.keys.includes("Species"));
  const head = keyHints(text, 0);
  assert.ok(!head.keys.includes("Rules") && !head.keys.includes("Species") && !head.keys.includes("Background"));
});

test("status: X- keys warn (W001) and still save; errors and drops; Tidy only when it changes something", () => {
  const ext = status(fixture("st-extension.dndpaste"));
  assert.ok(ext.warnings > 0 && ext.diagnostics.some((d) => d.code === "W001"));
  assert.equal(ext.errors, 0);
  assert.equal(ext.canSave, true);
  assert.match(summaryHtml(ext), /No errors.*warning/);
  assert.match(problemsHtml(ext), /class="dg w"><span class="code">W001<\/span><button type="button" class="at" data-line="\d+">line \d+<\/button>/);

  for (const [name, text] of FIXTURES) {
    const s = status(text);
    assert.equal(s.canSave, true, name);
    assert.equal(s.canTidy, false, `${name} is already canonical`);
  }
  const messy = status("Rules:   2024\nClasses: Wizard 1");
  assert.equal(messy.canTidy, true);
  assert.equal(messy.canon, "Rules: 2024\nClasses: Wizard 1\n");

  const bad = status(fixture("vice.dndpaste").replace("Spells: Hex", "Spels: Hex"));
  assert.equal(bad.canSave, false);
  assert.equal(bad.canTidy, false);
  assert.equal(summaryHtml(bad), "<b>1 error</b> · fix it to save");
  assert.match(problemsHtml(bad), /<span class="code">E002<\/span><button type="button" class="at" data-line="18">line 18<\/button><span>Unknown key: Spels<\/span>/);
  assert.match(dockLineHtml(bad), /data-line="18">.*<b>E002<\/b> line 18<\/button>$/);
});

test("status: an empty paste does not save", () => {
  for (const t of ["", "   \n\n"]) {
    const s = status(t);
    assert.equal(s.empty, true);
    assert.equal(s.canSave, false);
    assert.equal(summaryHtml(s), "Nothing to save yet");
    assert.equal(dockLineHtml(s), `<span class="dsum">Nothing to save yet</span>`);
  }
});

test("status: 32 KB of a clean build saves; one more byte does not", () => {
  const head = "Rules: 2024\n";
  let text = head;
  for (let n = 1; n <= 20; n++) text += `\nL${n} Wizard\nFeature: ${"F".repeat(1200)}\n`;
  const pad = 32 * 1024 - new TextEncoder().encode(text).byteLength - "X-Pad: \n".length;
  assert.ok(pad > 0);
  text += `X-Pad: ${"p".repeat(pad)}\n`;
  assert.equal(new TextEncoder().encode(text).byteLength, 32 * 1024);
  assert.equal(status(text).canSave, true);
  const plus = status(text + "x");
  assert.equal(plus.over, true);
  assert.equal(plus.canSave, false);
  assert.match(summaryHtml(plus), /^<b>Over 32 KB<\/b> · shorten it to save$/);
  assert.match(problemsHtml(plus), /Over the 32 KB limit/);
  // multi-byte text counts in bytes, as the server does
  assert.equal(status("Rules: 2024\nX-Note: " + "é".repeat(16 * 1024)).over, true);
});

test("import: only this site's links or a bare id (D85)", () => {
  const host = "dndpaste.example.workers.dev";
  assert.equal(linkedId("k3Vq9TzR2m", host), "k3Vq9TzR2m");
  assert.equal(linkedId("  dndpaste.example.workers.dev/k3Vq9TzR2m \n", host), "k3Vq9TzR2m");
  assert.equal(linkedId("https://dndpaste.example.workers.dev/k3Vq9TzR2m/raw", host), "k3Vq9TzR2m");
  assert.equal(linkedId("https://DNDPASTE.example.workers.dev/k3Vq9TzR2m?x=1", host), "k3Vq9TzR2m");
  assert.equal(linkedId("https://evil.example/k3Vq9TzR2m", host), null);
  assert.equal(linkedId("dndpaste.example.workers.dev/k3Vq9TzR2", host), null);
  assert.equal(linkedId("Rules: 2024\nk3Vq9TzR2m", host), null);
  assert.equal(linkedId("k3Vq9TzR2m k3Vq9TzR2m", host), null);
  const found = importBarHtml({ kind: "found", id: "k3Vq9TzR2m", title: "Vice", author: "ash" });
  assert.ok(found.startsWith("<span>That's a dndpaste link. Open <b>Vice</b> by ash in the editor?</span>"));
  assert.ok(found.includes(`data-act="import"`) && found.includes(`data-act="keep"`));
  assert.ok(importBarHtml({ kind: "found", id: "k3Vq9TzR2m", title: "", author: "" }).includes("Open <b>Untitled build</b> in the editor?"));
  assert.ok(importBarHtml({ kind: "found", id: "k3Vq9TzR2m", title: "<script>", author: `"x"` }).includes("<b>&lt;script&gt;</b> by &quot;x&quot;"));
  const missing = importBarHtml({ kind: "missing", id: "zzzzzzzzzz" });
  assert.ok(missing.includes("there is no build with the id <b>zzzzzzzzzz</b>") && !missing.includes(`data-act="import"`));
});

test("recent shares: newest first, deduped, capped, escaped; storage blocked still works for the visit", () => {
  const mem = new Map<string, string>();
  const fake = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } } as unknown as Storage;
  const r = recentStore(() => fake);
  assert.deepEqual(r.list(), []);
  r.add({ id: "AAAAAAAAAA", title: "One", created: "2026-11-12T10:00:00Z" });
  r.add({ id: "BBBBBBBBBB", title: "", created: "2026-11-15T10:00:00Z" });
  r.add({ id: "AAAAAAAAAA", title: "One", created: "2026-11-15T11:00:00Z" });
  assert.deepEqual(r.list().map((x) => x.id), ["AAAAAAAAAA", "BBBBBBBBBB"]);
  for (let i = 0; i < 30; i++) r.add({ id: `C${String(i).padStart(9, "0")}`, title: "x", created: "2026-11-15T10:00:00Z" });
  assert.equal(r.list().length, MAX_RECENT);

  mem.set("dndpaste.recent", `[{"id":"<script>xx","title":"x","created":""},{"id":"DDDDDDDDDD","title":"<b>","created":"2026-11-15T10:00:00Z"}]`);
  const list = r.list();
  assert.deepEqual(list.map((x) => x.id), ["DDDDDDDDDD"], "invalid ids are dropped");
  const html = recentHtml(list, new Date("2026-11-15T12:00:00Z"));
  assert.ok(html.includes(`<a href="/DDDDDDDDDD">&lt;b&gt;</a>`) && html.includes("Kept in this browser only."));
  mem.set("dndpaste.recent", "not json");
  assert.deepEqual(r.list(), []);

  const blocked = recentStore(() => { throw new DOMException("denied", "SecurityError"); });
  assert.deepEqual(blocked.list(), []);
  blocked.add({ id: "EEEEEEEEEE", title: "Kept", created: "2026-11-15T10:00:00Z" });
  assert.deepEqual(blocked.list().map((x) => x.id), ["EEEEEEEEEE"]);
  const full = recentStore(() => ({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } }) as unknown as Storage);
  full.add({ id: "FFFFFFFFFF", title: "", created: "2026-11-15T10:00:00Z" });
  assert.ok(recentHtml(full.list(), new Date()).includes(`<a class="none" href="/FFFFFFFFFF">Untitled build</a>`));
  assert.ok(recentHtml([], new Date()).includes("Builds you save appear here."));
});

test("recent shares: day labels", () => {
  const now = new Date(2026, 10, 15, 18);
  assert.equal(dayLabel(new Date(2026, 10, 15, 1).toISOString(), now), "Today");
  assert.equal(dayLabel(new Date(2026, 10, 12, 9).toISOString(), now), "12 Nov");
  assert.equal(dayLabel(new Date(2025, 0, 3).toISOString(), now), "3 Jan 2025");
  assert.equal(dayLabel("nope", now), "");
});

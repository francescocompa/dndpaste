// The paste form's client modules (slice 2): the highlight layer, key hints, live status, link import and recent
// shares. DOM-free; the DOM wiring (src/client/form.ts) is clicked through in the browser (site/FIDELITY.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "../../src/dndpaste.ts";
import { lineEntries, renderValue } from "../src/render.ts";
import { findSeparator, highlight, highlightLine, highlightValue } from "../src/client/highlight.ts";
import { keyHints } from "../src/client/hints.ts";
import { dockLineHtml, importBarHtml, linkedId, problemsHtml, status, summaryHtml } from "../src/client/status.ts";
import { dayLabel, MAX_RECENT, recentHtml, recentStore } from "../src/client/recent.ts";
import { MAX_DRAFTS, draftBarHtml, draftKeeper, draftSlot, draftStore, draftToOffer, draftWhen } from "../src/client/drafts.ts";
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
      // The scope line with this key and this text (a scope may hold a base and an increase `Scores` line, D108).
      const hit = scopes.flatMap(lineEntries).find(([k, v]) => k === key && v.type !== "classes" && textOf(renderValue(k, v)) === raw);
      if (!hit) continue; // not in canonical form, or Classes (renders its runs as written; checked by text above)
      const rendered = renderValue(key, hit[1]);
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

test("hints: the frames' key lists (header 23, drop-dark header 21, L5 Warlock 18, half-typed Spe → Spells; SPEC 0.9 family keys by class (D177), Feat (…))", () => {
  const empty = keyHints("", 0);
  assert.equal(empty.label, "the header");
  assert.equal(empty.keys.length, 23);
  assert.deepEqual(empty.keys.slice(0, 5), ["Paste", "Producer", "Rules", "Scores", "Classes"]);

  const drop = `Rules: 2024\nClasses: Fighter 3 / Warlock 3\nSubclass: Battle Master, Celestial\nFeat: Resilient [CON]\nFeat (Fighting Style): Archery\nOptions: Riposte\nCantrips: Eldritch Blast\nSpells: Hex`;
  assert.deepEqual(keyHints(drop, 3).keys, ["Paste", "Producer", "Scores", "HP", "Species", "Background", "Skills", "Tools",
    "Languages", "Expertise", "Feat (…)", "Masteries", "Invocations", "Maneuvers", "Arcane Shots", "Runes", "Pact Boon", "Feature", "Prepared", "Gear", "Note"]);

  const vice = fixture("vice.dndpaste").trimEnd();
  const last = vice.split("\n").length - 1;
  const l5 = keyHints(vice, last);
  assert.equal(l5.label, "L5 Warlock");
  assert.equal(l5.keys.length, 18);
  assert.ok(!l5.keys.includes("Options") && !l5.keys.includes("Species"));

  const typing = keyHints(vice + "\nSpe", last + 1);
  assert.deepEqual(typing.keys, ["Spells"]);
  assert.equal(typing.narrowed, true);
  const noMatch = keyHints(vice + "\nZz", last + 1);
  assert.equal(noMatch.narrowed, false);
  assert.equal(noMatch.keys.length, 18);
});

test("D177: a frame lists only its class's option family keys; a half-typed key still finds any of them", () => {
  const fam = (keys: string[]) => keys.filter((k) => ["Invocations", "Metamagic", "Maneuvers", "Infusions", "Arcane Shots", "Runes", "Disciplines", "Pact Boon"].includes(k));
  const t = "Mix\nClasses: Warlock 2 / Sorcerer 1\nL1 Warlock\nSpells: Hex\nL2 Sorcerer\n\nL3 Monk\n";
  assert.deepEqual(fam(keyHints(t, 1).keys), ["Invocations", "Metamagic", "Pact Boon"], "the header: its Classes line's");
  assert.deepEqual(fam(keyHints(t, 3).keys), ["Invocations", "Pact Boon"], "L1 Warlock");
  assert.deepEqual(fam(keyHints(t, 5).keys), ["Metamagic"], "L2 Sorcerer");
  assert.deepEqual(fam(keyHints(t, 6).keys), ["Disciplines"], "L3 Monk");
  assert.deepEqual(fam(keyHints("Mix\nL1 Barbarian\n", 2).keys), [], "a class with no family");
  assert.ok(keyHints("Mix\nL1 Barbarian\n", 2).keys.includes("Options"), "plain Options stays");
  const typing = keyHints("Mix\nL1 Barbarian\nMeta", 2);
  assert.deepEqual(typing.keys, ["Metamagic"]);
  assert.equal(typing.narrowed, true);
});

test("D219 (T28): a subclass's option family follows the written subclass; with none written, all of the class's show", () => {
  const fam = (keys: string[]) => keys.filter((k) => ["Maneuvers", "Arcane Shots", "Runes", "Disciplines"].includes(k));
  assert.deepEqual(fam(keyHints("EK\nClasses: Fighter 8\nSubclass: Eldritch Knight\n\nL8 Fighter\n", 5).keys), [], "T28: an Eldritch Knight");
  assert.deepEqual(fam(keyHints("BM\nClasses: Fighter 8\n\nL3 Fighter\nSubclass: Battle Master|XPHB\n\nL8 Fighter\n", 7).keys), ["Maneuvers"]);
  assert.deepEqual(fam(keyHints("F\nClasses: Fighter 8\n\nL8 Fighter\n", 4).keys), ["Maneuvers", "Arcane Shots", "Runes"], "no subclass yet");
  assert.deepEqual(fam(keyHints("Mix\nClasses: Fighter 3 / Monk 3\nSubclass: Champion\n\nL1 Fighter\n", 5).keys), ["Maneuvers", "Arcane Shots", "Runes"],
    "a header Subclass with two classes names neither");
  assert.deepEqual(keyHints("EK\nClasses: Fighter 8\nSubclass: Eldritch Knight\n\nL8 Fighter\nRun", 5).keys, ["Runes"], "a half-typed key still finds it");
});

test("hints (D110): Feat (…) follows Feat, stays offered, and a marked feat line leaves Feat offered", () => {
  const marked = keyHints("Feat (Origin): Alert\n", 1);
  assert.deepEqual(marked.keys.slice(marked.keys.indexOf("Feat"), marked.keys.indexOf("Feat") + 2), ["Feat", "Feat (…)"]);
  assert.deepEqual(keyHints("Feat: Alert\nFeat (Origin): Tough\n", 2).keys.filter((k) => k.startsWith("Feat ") || k === "Feat"), ["Feat (…)"]);
  assert.deepEqual(keyHints("Classes: Fighter 1\n\nL1 Fighter\nFeat (", 3), { label: "L1 Fighter", scope: "L", keys: ["Feat (…)"], narrowed: true });
  assert.deepEqual(keyHints("Classes: Fighter 1\n\nL1 Fighter\nFe", 3).keys, ["Feat", "Feat (…)", "Feature"]);
});

test("highlight (0.8): increases, named scores with a slash (D106), a slot marker (D110), an empty value (D112)", () => {
  const line = (s: string) => highlightLine(s, { first: false, codes: [] });
  assert.equal(highlightValue("Scores", "+2 STR, +1 CON"),
    `<span class="n">+2</span> <span class="ab ab-str">STR</span><span class="p">, </span><span class="n">+1</span> <span class="ab ab-con">CON</span>`);
  assert.equal(highlightValue("Scores", "+2 STR, +1 CON"), renderValue("Scores", { type: "scores", values: [null, null, null, null, null, null], increase: [{ amount: 2, ability: "STR" }, { amount: 1, ability: "CON" }] }));
  assert.equal(highlightValue("Scores", "STR 8/DEX 13"),
    `<span class="ab ab-str">STR</span> <span class="n ab-str">8</span><span class="p">/</span><span class="ab ab-dex">DEX</span> <span class="n ab-dex">13</span>`);
  assert.equal(line("Feat (Fighting Style): Defense"),
    `<span class="k">Feat <span class="km">(Fighting Style)</span></span><span class="p">:</span> <span class="r kd-feat">Defense</span>`);
  assert.ok(line("Feaat (Origin): Alert").startsWith(`<span class="k bad">Feaat (Origin)</span>`));
  assert.equal(line("Spells:"), `<span class="k">Spells</span><span class="p">:</span>`);
});

test("hints: Species and Background blocks, and keys used once leave the list", () => {
  const text = "Rules: 2024\n\nSpecies: Elf\nSkills: Perception\n\nBackground: Sage\n";
  const sp = keyHints(text, 3);
  assert.equal(sp.label, "the Species block");
  assert.ok(!sp.keys.includes("Skills") && !sp.keys.includes("Species") && !sp.keys.includes("Background") && sp.keys.includes("Feature"));
  assert.ok(keyHints("Species: Elf\n", 0).keys.includes("Background"), "a Background line may still open its block");
  assert.ok(!sp.keys.includes("Rules"), "header-only keys are not offered in a block");
  const bg = keyHints(text, 5);
  assert.equal(bg.label, "the Background block");
  assert.ok(bg.keys.includes("Gear") && !bg.keys.includes("Background") && !bg.keys.includes("Species"));
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
  assert.match(dockLineHtml(bad), /data-line="18">.*<b>E002<\/b> <span class="pln">line 18<\/span><span class="pmsg">Unknown key: Spels<\/span><\/button>$/);
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
  assert.ok(missing.includes("no build has the id <b>zzzzzzzzzz</b>") && !missing.includes(`data-act="import"`));
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

test("status, D90: an E001 on the line being typed is held; Save still blocks; letting go shows it", () => {
  const text = fixture("vice.dndpaste").trimEnd() + "\nSpe";
  const line = text.split("\n").length;
  const free = status(text);
  assert.equal(free.diagnostics.find((d) => d.code === "E001")?.line, line, "the half-typed key is an E001");
  const held = status(text, line);
  assert.equal(held.held, 1);
  assert.equal(held.errors, 0);
  assert.ok(!held.diagnostics.some((d) => d.code === "E001"));
  assert.equal(held.canSave, false, "Save still blocks on a held error");
  assert.equal(held.canTidy, false);
  // The frame form-keys-dark-phone: no error in the dock. (Since D149's review, vice's short Options line reads "1 to choose".)
  assert.match(dockLineHtml(held), /^<span class="dsum"><span class="okc">No (problems|errors)<\/span>/);
  // Another line's errors are never held.
  const other = status(text, line - 1);
  assert.equal(other.held, 0);
  assert.equal(other.errors, free.errors);
  const two = status("Rules: 2024\nSpe\nFoo", 2);
  assert.equal(two.held, 1);
  assert.equal(two.diagnostics.filter((d) => d.code === "E001").length, 1);
  assert.equal(status(text, 0).held, 0);
});

test("status, D176: every error on the line being typed is held, an open comma, bracket or quote too; warnings never", () => {
  const base = "Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: ";
  const line = base.split("\n").length;
  for (const tail of ["Guidance, ", "Guidance, Light [", 'Guidance, "Li', "Guidance, Li|"]) {
    const free = status(base + tail);
    assert.ok(free.diagnostics.some((d) => d.code === "E011" && d.line === line), tail);
    const held = status(base + tail, line);
    assert.equal(held.errors, 0, tail);
    assert.ok(held.held > 0, tail);
    assert.equal(held.canSave, false, "Save still blocks on a held error");
  }
  // A warning on the line being typed (an empty value, D149's To choose) is not held.
  const empty = status("Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips:", 5);
  assert.ok(empty.diagnostics.some((d) => d.code === "W004" && d.line === 5));
});

test("status (D95): a name-only paste can't be saved; the toolbar, Problems and dock say why", () => {
  for (const text of ["Vice\n", "https://dndpaste.example/ABCDEFGHIJ\n"]) {
    const s = status(text);
    assert.equal(s.bare, true, text);
    assert.equal(s.canSave, false, text);
    assert.match(summaryHtml(s), /Only a name/);
    assert.match(problemsHtml(s), /Add at least one key besides the name/);
    assert.match(dockLineHtml(s), /perr.*Only a name/);
  }
  for (const text of ["Vice\nSpecies: Human\n", "Vice\nX-Note: hi\n", "Vice\n\nL1 Fighter\n", "Rules: 2024\n"]) {
    assert.equal(status(text).bare, false, text);
    assert.equal(status(text).canSave, true, text);
  }
});

// ─── unsaved drafts (D102) ──────────────────────────────────────────────────

const memStorage = () => {
  const data = new Map<string, string>();
  const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
  return { s, data };
};
const NEW = { title: "", author: "", paste: "" };
const at = (t: string) => () => new Date(t);

test("drafts: a draft that differs from what the form loaded is offered back; Restore returns it, the offer closes", () => {
  const { s } = memStorage();
  const store = draftStore(() => s);
  const typing = draftKeeper(store, draftSlot(null), NEW, null, at("2026-11-16T09:05:00Z"));
  assert.equal(typing.offered, null, "nothing to offer on a first visit");
  typing.keep({ title: "Vice", author: "ash", paste: "Name: Vice" });
  // The tab closes; the form opens again, empty.
  const back = draftKeeper(store, "new", NEW, null);
  assert.deepEqual(back.offered, { title: "Vice", author: "ash", paste: "Name: Vice", rev: null, saved: "2026-11-16T09:05:00.000Z" });
  back.keep({ title: "", author: "", paste: "N" });
  assert.equal(store.get("new")?.paste, "Name: Vice", "typing while the offer stands keeps the old draft");
  assert.equal(back.restore()?.paste, "Name: Vice");
  assert.equal(back.offered, null);
  // A draft equal to what the form loaded is not offered, and typing back to it clears the draft.
  assert.equal(draftToOffer(store.get("new"), { title: "Vice", author: "ash", paste: "Name: Vice" }), null);
  const same = draftKeeper(store, "new", { title: "Vice", author: "ash", paste: "Name: Vice" }, null);
  assert.equal(same.offered, null);
  same.keep({ title: "Vice", author: "ash", paste: "Name: Vice" });
  assert.equal(store.get("new"), null);
});

test("drafts: cleared after a save and never written again on that page; Discard clears too", () => {
  const { s } = memStorage();
  const store = draftStore(() => s);
  const k = draftKeeper(store, "new", NEW, null);
  k.keep({ ...NEW, paste: "Name: A" });
  assert.ok(store.get("new"));
  k.saved();
  assert.equal(store.get("new"), null);
  k.keep({ ...NEW, paste: "Name: A" }); // pagehide after the save lands
  assert.equal(store.get("new"), null);

  k.saved();
  const k2 = draftKeeper(store, "new", NEW, null);
  k2.keep({ ...NEW, paste: "Name: B" });
  const k3 = draftKeeper(store, "new", NEW, null);
  assert.ok(k3.offered);
  k3.discard();
  assert.equal(k3.offered, null);
  assert.equal(store.get("new"), null);
});

test("drafts: one for a new build and one per share being edited, with the revision it opened on", () => {
  const { s } = memStorage();
  const store = draftStore(() => s);
  const loaded = { title: "Vice", author: "", paste: "Name: Vice" };
  draftKeeper(store, draftSlot("abcdefghij"), loaded, 3).keep({ ...loaded, paste: "Name: Vice\nL1 Wizard" });
  draftKeeper(store, draftSlot(null), NEW, null).keep({ ...NEW, paste: "Name: Other" });
  assert.equal(draftSlot("abcdefghij"), "edit:abcdefghij");
  assert.equal(store.get("edit:abcdefghij")?.rev, 3);
  assert.equal(store.get("new")?.paste, "Name: Other");
  draftKeeper(store, draftSlot("abcdefghij"), loaded, 3).saved();
  assert.equal(store.get("edit:abcdefghij"), null);
  assert.equal(store.get("new")?.paste, "Name: Other", "an edit's save leaves the new-build draft");
  assert.equal(store.set("edit:bad id", { ...NEW, rev: null, saved: "" }), false);
  assert.equal(store.get("p:abcdefghij"), null);
  // Past MAX_DRAFTS the oldest goes.
  for (let i = 0; i < MAX_DRAFTS + 2; i++) {
    store.set(draftSlot(`a${String(i).padStart(9, "0")}`), { ...NEW, paste: `x${i}`, rev: 1, saved: `2026-11-16T10:${String(i).padStart(2, "0")}:00.000Z` });
  }
  assert.equal(store.get("edit:a000000000"), null);
  assert.equal(store.get(`edit:a${String(MAX_DRAFTS + 1).padStart(9, "0")}`)?.paste, `x${MAX_DRAFTS + 1}`);
});

test("drafts: blocked, full or broken storage means no draft and no error", () => {
  const blocked = draftStore(() => { throw new Error("SecurityError"); });
  const k = draftKeeper(blocked, "new", NEW, null);
  assert.equal(k.offered, null);
  assert.doesNotThrow(() => { k.keep({ ...NEW, paste: "Name: A" }); k.discard(); k.saved(); });
  assert.equal(blocked.set("new", { ...NEW, rev: null, saved: "2026-11-16T10:00:00.000Z" }), false);
  const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => {} } as unknown as Storage;
  assert.equal(draftStore(() => full).set("new", { ...NEW, rev: null, saved: "2026-11-16T10:00:00.000Z" }), false);
  assert.equal(draftStore(() => null).get("new"), null);
  const { s, data } = memStorage();
  data.set("dndpaste.drafts", "{broken");
  assert.equal(draftStore(() => s).get("new"), null);
  data.set("dndpaste.drafts", JSON.stringify({ new: { title: 1, paste: "x" }, "edit:abcdefghij": { title: "", author: "", paste: "x", rev: 0, saved: "" } }));
  assert.equal(draftStore(() => s).get("new"), null, "a malformed draft reads as none");
  assert.equal(draftStore(() => s).get("edit:abcdefghij"), null);
});

test("drafts: the restore bar says when, in plain words; an older revision says what restoring replaces", () => {
  const now = new Date(2026, 10, 16, 18, 0);
  assert.equal(draftWhen(new Date(2026, 10, 16, 9, 5).toISOString(), now), "today at 9:05");
  assert.equal(draftWhen(new Date(2026, 10, 12, 14, 30).toISOString(), now), "12 Nov at 14:30");
  assert.equal(draftWhen("nonsense", now), "earlier");
  const d = { title: "<b>", author: "", paste: "x", rev: 2, saved: new Date(2026, 10, 16, 9, 5).toISOString() };
  const bar = draftBarHtml(d, now, 2);
  assert.equal(textOf(bar), "You have unsaved changes from today at 9:05.RestoreDiscard");
  assert.ok(bar.includes(`data-act="restore"`) && bar.includes(`data-act="discard"`));
  assert.match(textOf(draftBarHtml(d, now, 4)), /You made them on revision 2. Restoring them replaces the changes saved since/);
  assert.equal(textOf(draftBarHtml({ ...d, rev: null }, now, null)), "You have unsaved changes from today at 9:05.RestoreDiscard");
});

test("D240: client code never writes a style attribute (the live CSP drops it; positions go through CSSOM)", () => {
  // `style-src 'self'` ignores style="" in markup, so a fix button placed that way stayed 0x0 and couldn't be clicked.
  // The /ui-review dev CSP allows inline styles, so only this test catches it.
  const dir = new URL("../src/client/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const code = readFileSync(new URL(f, dir), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    assert.ok(!/style=|setAttribute\(\s*["']style["']/.test(code), `${f} writes a style attribute`);
  }
});

test("D354 (T9.4): a pick that leaves its line open for the next holds the line's error, as typing does", () => {
  // The state the first pick on a counted line leaves (D307 writes `, ` and reopens the list): an error while open.
  for (const [t, line] of [["Rules: 2024\nClasses: Fighter 1\n\nL1 Fighter\nMasteries: Longsword, ", 5],
    ["Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: Light, ", 5],
    ["Rules: 2024\n\nBackground: Sage\nScores: +2 INT, ", 4]] as const) {
    assert.ok(status(t).errors > 0, `${t}: the open line reads as an error`);
    const held = status(t, line);
    assert.deepEqual([held.errors, held.held], [0, 1], `${t}: held while its line is being written`);
  }
  // Every pick writes through form.ts's `insert`: it holds the caret's line before it redraws. Before D354 the bulk
  // flag kept the input handler (the typing hold) from running there, so the error showed right after the pick.
  const form = readFileSync(new URL("../src/client/form.ts", import.meta.url), "utf8");
  const body = /const insert = \(text: string[\s\S]*?\n {2}\};/.exec(form)?.[0] ?? "";
  assert.match(body, /bulk = true;[\s\S]*holdLine = cursorLine\(\) \+ 1;\s*clearTimeout\(holdTimer\);\s*holdTimer = window\.setTimeout\(pauseRelease, HOLD_MS\);\s*refresh\(\);/);
  // Review r1: the pause doesn't let go while a list is open on the line and the line ends open for the next pick.
  assert.match(form, /const pauseRelease = \(\) => \{\s*const open = holdLine > 0 && acs\?\.openLine\(\) === holdLine && \/\[,;\[\]\\s\*\$\//);
});

// Your own sources (M6, D244–D257): reading, keeping, merging into the editor's names, the /sources list, GitHub links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as N from "../src/names.gen.ts";
import { bookPair, counts, dropVariants, keepTable, merge, readPlain, readText, srcPair, NO_SWITCHES, OWN_2014, OWN_2024 } from "../src/yours.ts";
import type { SourceRec, Switches } from "../src/yours.ts";
import { categoryToggle, listHtml } from "../src/sourcesview.ts";
import type { View } from "../src/sourcesview.ts";
import { fetchLink, folderFile, parseLink } from "../src/client/github.ts";
import { spotAt, suggest, sourceFor } from "../src/client/complete.ts";
import type { Names } from "../src/client/complete.ts";
import { tableFor, useYourPresets } from "../src/ghost.ts";
import { call, makeEnv, textOf } from "./helpers.ts";

const PLAIN = `# my table
Spell: Moonbeam Lance|MYHB [2; Druid, Ranger]
Spells: Ember Ward|MYHB [cantrip; Wizard]
Spell: Mystery Bolt|MYHB
Subclass: Oath of Ash|MYHB [Paladin]
Classes: Gunslinger|MYTR
Feat: Lucky Streak|MYHB [Origin]
Option: Ember Lance|MYHB [Eldritch Invocations]
Feature: Ember Gift|MYHB [Spark, Flare]
Item: Lantern of Echoes
not a names line`;

const src = (table: SourceRec["table"], over: Partial<SourceRec> = {}): SourceRec =>
  ({ id: "s1", name: "homebrew.txt", type: "file", on: true, added: "2026-11-20T10:00:00.000Z", files: 1, skipped: 0, table, ...over });
const plainTable = () => keepTable(readPlain(PLAIN, N.FEAT_CATEGORIES));

test("D258: the plain format reads kinds (plural too), books, details; HB by default; other lines are counted, comments not", () => {
  const r = readPlain(PLAIN, N.FEAT_CATEGORIES);
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.data.spell, [
    { name: "Moonbeam Lance", source: "MYHB", level: 2, classes: ["Druid", "Ranger"] },
    { name: "Ember Ward", source: "MYHB", level: 0, classes: ["Wizard"] },
    { name: "Mystery Bolt", source: "MYHB" },
  ]);
  assert.deepEqual(r.data.subclass, [{ name: "Oath of Ash", source: "MYHB", className: "Paladin", shortName: "Oath of Ash" }]);
  assert.deepEqual(r.data.class, [{ name: "Gunslinger", source: "MYTR" }]);
  assert.deepEqual(r.data.feat, [{ name: "Lucky Streak", source: "MYHB", category: "O" }]);
  assert.deepEqual(r.data.optionalfeature, [{ name: "Ember Lance", source: "MYHB", featureType: ["EI"] }]);
  assert.deepEqual(r.data.item, [{ name: "Lantern of Echoes", source: "HB" }]);
  assert.deepEqual(r.features["Ember Gift|MYHB"].options, ["Spark", "Flare"]);
});

test("D275: a feat's ability pick, from a plain line or a JSON file, opens its abilities inside [ ]", () => {
  const plain = readPlain("Feat: Fey Sentinel|MYHB [General; INT, WIS, CHA]\nFeat: Ember Heart|MYHB [CHA, WIS]\nFeat: Lucky Streak|MYHB [Origin]", N.FEAT_CATEGORIES);
  assert.deepEqual(plain.data.feat, [
    { name: "Fey Sentinel", source: "MYHB", category: "G", ability: [{ choose: { from: ["int", "wis", "cha"] } }] },
    { name: "Ember Heart", source: "MYHB", ability: [{ choose: { from: ["cha", "wis"] } }] },
    { name: "Lucky Streak", source: "MYHB", category: "O" },
  ]);
  const json = readText(JSON.stringify({ feat: [{ name: "Spark of Embers", source: "MYHB", category: "O", additionalSpells: [{ ability: { choose: ["int", "wis", "cha"] } }] }] }));
  for (const read of [plain, json]) {
    const m = merge(N, [src(keepTable(read, {}, N.FEAT_CATEGORIES))], NO_SWITCHES);
    const abilityBits = (name: string) => m.names.FEATS.find((f) => f[0] === name)?.[3];
    for (const f of read.data.feat ?? []) if (f.name !== "Lucky Streak") assert.ok(abilityBits(f.name), `${f.name} asks an ability`);
    if (read === plain) assert.equal(abilityBits("Lucky Streak"), 0);
  }
});

test("D160, D244: a kept table holds names, codes and counts; text, long strings and bad codes are dropped", () => {
  const long = "x".repeat(200);
  const read = readText(JSON.stringify({
    spell: [{ name: "Ember Ward", source: "MYHB", level: 0, entries: ["Some text that is not kept."] }, { name: "No Level", source: "MYHB" },
      { name: long, source: "MYHB" }, { name: "Bad Code", source: "<b>" }, { name: "Two\nLines", source: "MYHB" }],
    feat: [{ name: "Lucky Streak", source: "MYHB", versions: [long] }],
  }));
  assert.equal(read.format, "json");
  const t = keepTable(read);
  assert.deepEqual(Object.keys(t.spells).sort(), ["Ember Ward|MYHB", "No Level|MYHB"]);
  assert.equal(t.spells["No Level|MYHB"].level, -1, "a spell with no level goes on both kinds of line");
  assert.ok(!JSON.stringify(t).includes("not kept") && !JSON.stringify(t).includes(long));
  const c = counts(plainTable());
  assert.equal(c.kinds.spells, 3);
  assert.equal(c.kinds.classes, 2, "a class and a feature with options");
  assert.equal(c.options, 2);
  assert.deepEqual([...c.books.keys()].sort(), ["HB", "MYHB", "MYTR"]);
});

const xphbSpells = () => keepTable(readText(JSON.stringify({ spell: [{ name: "Fireball", source: "XPHB", level: 3, classes: ["Sorcerer", "Wizard"] }, { name: "Ember Ward", source: "XPHB", level: 0 }] })));

test("D255: your XPHB spells hide the built-in XPHB spells only; built-in XPHB classes stay; off brings them back", () => {
  const n = N as unknown as Names;
  const builtSpell = N.SPELLS.find((s) => s[0] === "Bless");
  assert.ok(builtSpell && builtSpell[1] & 2 && builtSpell[1] & 1, "the built-in names have Bless in the PHB and the XPHB");
  const m = merge(n, [src(xphbSpells())], NO_SWITCHES).names;
  const after = m.SPELLS.find((s) => s[0] === "Bless");
  assert.equal(after?.[1], builtSpell[1] & ~2, "only its XPHB printing is hidden");
  assert.ok(m.SPELLS.some((s) => s[0] === "Ember Ward" && s[1] === 2));
  assert.deepEqual(m.CLASS_ROWS, N.CLASS_ROWS.map((r) => [...r]), "the built-in XPHB classes stay");
  const off = merge(n, [src(xphbSpells(), { on: false })], NO_SWITCHES).names;
  assert.equal(off.SPELLS.find((s) => s[0] === "Bless")?.[1], builtSpell[1]);
  assert.ok(!off.SPELLS.some((s) => s[0] === "Ember Ward"));
});

test("D253, D267: books for every source, kinds inside a book or a source, and the SRD names switch", () => {
  const n = N as unknown as Names;
  const sw = (o: Partial<Switches>): Switches => ({ ...NO_SWITCHES, ...o });
  const t = plainTable();
  const a = merge(n, [src(t)], sw({ offBooks: ["MYHB"] })).names;
  assert.ok(!a.SPELLS.some((s) => s[0] === "Moonbeam Lance") && a.CLASS_ROWS.some((c) => c[0] === "Gunslinger"));
  const b = merge(n, [src(t)], sw({ offPairs: [srcPair("s1", "spells")] })).names;
  assert.ok(!b.SPELLS.some((s) => s[0] === "Moonbeam Lance") && b.SPELLS.some((s) => s[0] === "Fireball"), "spells off in one source: the SRD's stay");
  assert.ok(b.FEATS.some((f) => f[0] === "Lucky Streak"));
  const e = merge(n, [src(t)], sw({ offPairs: [bookPair("XPHB", "spells"), srcPair("srd", "feats")] })).names;
  assert.ok(!e.SPELLS.some((s) => s[1] === 2) && e.SPELLS.some((s) => s[0] === "Moonbeam Lance"), "XPHB spells off: other books' stay");
  assert.ok(!e.FEATS.some((f) => f[1] & 3) && e.FEATS.some((f) => f[0] === "Lucky Streak"), "SRD feats off: yours stay");
  const c = merge(n, [src(t)], sw({ offBooks: ["XDMG"] })).names;
  assert.ok(!c.ITEMS.some((i) => i[1] & 8), "turning XDMG off hides the built-in XDMG names");
  const d = merge(n, [src(t)], sw({ builtin: false })).names;
  assert.ok(d.SPELLS.every((s) => s[1] & (OWN_2014 | OWN_2024)), "built-in off: only yours");
  assert.ok(d.SKILLS.length === 18, "skills are no kind: they stay");
});

test("D250: your names rank with the built-in ones; a row shows its book; other-edition picks write your code", () => {
  const n = merge(N as unknown as Names, [src(plainTable())], NO_SWITCHES).names;
  const at = (s: string) => spotAt(s, s.length);
  const sp = at("Rules: 2024\nClasses: Druid 3\nSpells: Moonb");
  assert.ok(sp);
  const rows = suggest(n, sp);
  const mine = rows.find((r) => r.name === "Moonbeam Lance");
  assert.deepEqual(rows.slice(0, 2).map((r) => r.name), ["Moonbeam", "Moonbeam Lance"], "one list, by class and match (D250)");
  assert.equal(mine?.book, "MYHB");
  assert.equal(mine?.source, null, "an unknown edition is never the other edition");
  const cant = at("Classes: Wizard 1\nCantrips: Myst");
  assert.ok(cant && suggest(n, cant).some((r) => r.name === "Mystery Bolt"), "a spell with no level is offered on Cantrips");
  const spl = at("Classes: Wizard 1\nSpells: Myst");
  assert.ok(spl && suggest(n, spl).some((r) => r.name === "Mystery Bolt"), "and on Spells");
  assert.equal(sourceFor(OWN_2014, "2024", ["TCE"]), "TCE");
  assert.equal(sourceFor(OWN_2024, "2024", ["MYHB"]), null);
  const f = at("Feature: Ember Gift [");
  assert.deepEqual(f && suggest(n, f).map((r) => r.name).sort(), ["Flare", "Spark"], "a feature's options inside [ ]");
});

test("D246: your classes give ghost counts; a built-in table wins over yours", () => {
  const t = keepTable(readText(JSON.stringify({
    class: [{ name: "Gunslinger", source: "MYHB", spellcastingAbility: "wis", cantripProgression: [2, 2, 3], classFeatures: [{ classFeature: "Path|Gunslinger|MYHB|3", gainSubclassFeature: true }] },
      { name: "Wizard", source: "XPHB", cantripProgression: [9, 9, 9] }],
  })));
  const m = merge(N as unknown as Names, [src(t)], NO_SWITCHES);
  useYourPresets(m.presets, m.species);
  try {
    const p = tableFor({ name: "Gunslinger", source: null }, "2024");
    assert.equal(p?.source, "MYHB");
    assert.deepEqual(p?.counts.slice(0, 3).map((c) => c.Cantrips ?? 0), [2, 0, 1]);
    assert.ok(p?.owes[2].includes("Subclass"));
    assert.notEqual(tableFor({ name: "Wizard", source: null }, "2024")?.counts[0].Cantrips, 9, "the built-in Wizard stays");
  } finally { useYourPresets([], []); }
});

const view = (o: Partial<View>): View => ({ sources: [], sw: NO_SWITCHES, lens: "book", split: false, builtin: new Map([["XPHB", new Map([["spells", 300], ["classes", 12]])]]),
  builtinNames: 1103, open: new Set(), busy: new Set(), confirm: null, now: new Date("2026-11-20T12:00:00"), ...o } as View);

test("D252, D254, D266, D267: the empty state, Group by book or source, Kinds, and the mixed category switch", () => {
  const empty = textOf(listHtml(view({})));
  assert.match(empty, /No sources yet\./);
  assert.match(empty, /1,103 names/);
  const s = [src(plainTable(), { skipped: 1 }), src(xphbSpells(), { id: "s2", name: "owner/repo/data", type: "link", files: 3,
    link: { url: "https://github.com/owner/repo/tree/main/data", kind: "folder", path: "data", checked: "2026-11-20T10:15:00", copy: "2026-11-18T09:00:00", failed: { at: "2026-11-20T10:15:00", message: "GitHub didn't answer." } } })];
  const book = listHtml(view({ sources: s, open: new Set(["Core"]) }));
  assert.match(textOf(book), /Core.*1 book/);
  assert.match(textOf(book), /XPHB · yours replace the SRD spells/);
  assert.match(book, /class="wdot"/, "a failed check marks Group by Source");
  const mix = listHtml(view({ sources: s, sw: { ...NO_SWITCHES, offBooks: ["MYHB"] } }));
  assert.match(mix, /data-catsw="Other books"/);
  assert.match(mix, /aria-checked="mixed"/);
  const toggled = categoryToggle(view({ sources: s, sw: { ...NO_SWITCHES, offBooks: ["MYHB"] } }), "Other books");
  assert.deepEqual(toggled.offBooks, [], "a partly-on category turns all on");
  const split = listHtml(view({ sources: s, lens: "source", split: true, sw: { ...NO_SWITCHES, offPairs: [srcPair("s1", "items")] } }));
  assert.match(split, /data-pair="@s1\|items" aria-checked|data-pair="@s1\|items"/);
  assert.match(split, /role="switch" aria-checked="false"[^>]*data-pair="@s1\|items"/, "the off kind's switch is off");
  assert.match(split, /data-pair="@srd\|spells"/, "the SRD names split too");
  const splitBook = listHtml(view({ sources: s, split: true, open: new Set(["Core"]) }));
  assert.match(splitBook, /data-pair="XPHB\|spells"/);
  const bySource = textOf(listHtml(view({ sources: s, lens: "source" })));
  assert.match(bySource, /Check failed today 10:15: GitHub didn't answer\. Still using the copy from 18 Nov\./);
  assert.match(bySource, /GitHub folder · 3 files/);
  assert.match(bySource, /SRD names/);
  assert.match(bySource, /1 line not read/, "lines not read: a quiet alert with its reason");
  assert.match(listHtml(view({ sources: s, lens: "source" })), /<summary aria-label="1 line not read" title="1 line not read"><svg[^]*?<\/svg><\/summary>/, "D270: only the icon in the meta line");
  assert.doesNotMatch(listHtml(view({ sources: s, lens: "source" })), /class="pop"/, "D270: not the menus' .pop, whose overflow clipped the popover");
  assert.match(bySource, /Built-in · [\d,]+ names/, "D270: the SRD row says built-in");
});

test("D248: GitHub links: files, folders, raw files; nothing else", () => {
  assert.deepEqual(parseLink("https://github.com/o/r/tree/main/data"), { owner: "o", repo: "r", ref: "main", path: "data", kind: "folder" });
  assert.deepEqual(parseLink("https://github.com/o/r/blob/dev/x/names.txt"), { owner: "o", repo: "r", ref: "dev", path: "x/names.txt", kind: "file" });
  assert.deepEqual(parseLink("https://raw.githubusercontent.com/o/r/refs/heads/main/a.json"), { owner: "o", repo: "r", ref: "main", path: "a.json", kind: "file" });
  assert.deepEqual(parseLink("https://github.com/o/r"), { owner: "o", repo: "r", ref: null, path: "", kind: "folder" });
  for (const bad of ["http://github.com/o/r", "https://example.com/o/r", "https://github.com/o", "not a link"]) assert.equal(parseLink(bad), null, bad);
});

test("D249: a folder check lists once, fetches .json by kind, sends its ETag, keeps going on 304, says why it failed", async () => {
  const calls: string[] = [];
  const answers: Record<string, () => Response> = {
    "https://api.github.com/repos/o/r/contents/data?ref=main": () => new Response(JSON.stringify([
      { type: "file", name: "spells.json", path: "data/spells.json", sha: "a1", size: 10 },
      { type: "file", name: "fluff-spells.json", path: "data/fluff-spells.json", sha: "f1", size: 10 },
      { type: "file", name: "readme.md", path: "data/readme.md", sha: "r1", size: 10 },
      { type: "dir", name: "class", path: "data/class", sha: "t1" },
      { type: "dir", name: "monsters", path: "data/monsters", sha: "t2" },
    ]), { headers: { etag: '"e1"' } }),
    "https://api.github.com/repos/o/r/git/trees/t1?recursive=1": () => new Response(JSON.stringify({ tree: [{ type: "blob", path: "class-a.json", sha: "c1", size: 5 }] })),
    "https://api.github.com/repos/o/r/git/trees/t2?recursive=1": () => new Response(JSON.stringify({ tree: [{ type: "blob", path: "big.json", sha: "m1", size: 5 }] })),
    "https://raw.githubusercontent.com/o/r/main/data/spells.json": () => new Response(`{"spell":[{"name":"Ember Ward","source":"MYHB"}]}`),
    "https://raw.githubusercontent.com/o/r/main/data/class/class-a.json": () => new Response(`{"class":[{"name":"Gunslinger","source":"MYHB"}]}`),
  };
  const real = globalThis.fetch;
  let mode: "ok" | "304" | "limit" = "ok";
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    calls.push(`${u}${(init?.headers as Record<string, string> | undefined)?.["If-None-Match"] ? " (etag)" : ""}`);
    if (mode === "304") return new Response(null, { status: 304 });
    if (mode === "limit") return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1795181373" } });
    return answers[u]?.() ?? new Response("nope", { status: 404 });
  }) as typeof fetch;
  try {
    const l = parseLink("https://github.com/o/r/tree/main/data");
    assert.ok(l);
    const got = await fetchLink(l, null);
    assert.equal(got.changed, true);
    assert.deepEqual(got.files.map((f) => f.path).sort(), ["data/class/class-a.json", "data/spells.json"], "kind folders only, no fluff, no other files");
    calls.length = 0;
    mode = "304";
    const again = await fetchLink(l, { ...got.state, kind: "folder" });
    assert.equal(again.changed, false);
    assert.deepEqual(calls, ["https://api.github.com/repos/o/r/contents/data?ref=main (etag)"], "one conditional call");
    mode = "limit";
    await assert.rejects(fetchLink(l, null), /hourly limit/);
    mode = "ok";
    await assert.rejects(fetchLink(parseLink("https://github.com/o/r/tree/main/none") as NonNullable<ReturnType<typeof parseLink>>, null), /no public file or folder/);
  } finally { globalThis.fetch = real; }
});

test("D247, D248: /sources is served with a CSP whose connect-src is the site and GitHub only", async () => {
  const env = makeEnv();
  const r = await call(env, "GET", "/sources");
  assert.equal(r.status, 200);
  const csp = r.headers.get("content-security-policy") ?? "";
  assert.match(csp, /connect-src 'self' https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com;/);
  const html = await r.text();
  assert.match(html, /<script type="module" src="\/assets\/sources\.js"><\/script>/);
  assert.match(textOf(html), /Kept in this browser only, never uploaded\. Clearing site data removes them\./);
  assert.equal((await call(env, "POST", "/sources")).status, 405);
});

test("D160, D248: the sources code and page name, link and suggest no data source", () => {
  const files = ["../src/yours.ts", "../src/sourcesview.ts", "../src/sourcespage.ts", "../src/namerows.ts", "../src/presetrows.ts", "../../src/extract.ts",
    ...readdirSync(new URL("../src/client/", import.meta.url)).filter((f) => /^(sources|sync|github|sourcestore|summary)\.ts$/.test(f)).map((f) => `../src/client/${f}`)];
  for (const f of files) assert.ok(!/5e\s*tools|5etools/i.test(readFileSync(new URL(f, import.meta.url), "utf8")), f);
});

test("D268: a species variant is left out when its plain name is there", () => {
  const sp = { "Dragonborn|XPHB": { name: "Dragonborn", source: "XPHB" }, "Dragonborn (Black)|XPHB": { name: "Dragonborn (Black)", source: "XPHB" },
    "Elf (Drow)|PHB": { name: "Elf (Drow)", source: "PHB" }, "Vedalken (Kaladesh)|PSK": { name: "Vedalken (Kaladesh)", source: "PSK" } };
  assert.deepEqual(Object.keys(dropVariants(sp)), ["Dragonborn|XPHB", "Elf (Drow)|PHB", "Vedalken (Kaladesh)|PSK"]);
  assert.deepEqual(Object.keys(dropVariants(sp, ["Elf"])), ["Dragonborn|XPHB", "Vedalken (Kaladesh)|PSK"], "the SRD's Elf counts as the plain name");
});

test("D261, D269: a folder's files: .json at the top, or a path that names a kind; never descriptions", () => {
  for (const ok of ["spells.json", "class/class-wizard.json", "data/spells/spells-phb.json"]) assert.ok(folderFile(ok), ok);
  for (const no of ["readme.md", "fluff-spells.json", "bestiary/bestiary-mm.json", "class/fluff-class-wizard.json"]) assert.ok(!folderFile(no), no);
});

// The format guide and the form's example (M3 3.2e, D99).
import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS, emit, isAbilitySlot, parse } from "../../src/dndpaste.ts";
import { esc } from "../src/render.ts";
import { CSP } from "../src/app.ts";
import { EXAMPLE, GUIDE_LINK } from "../src/example.ts";
import { SPEC_URL, exampleParts, keyTable } from "../src/guide.ts";
import { FEEDBACK_LINE, FEEDBACK_URL, RELEASES_URL } from "../src/links.ts";
import { KEY_HOLDS, MARKED_FEAT, SCOPE_LABEL, keyDoc, whereLabel } from "../src/keydocs.ts";
import { allCodes } from "../src/codelist.ts";
import { UA_SOURCES } from "../../src/sources.ts";

const BOOKS = allCodes();
import { dateLabel, letterOf, matches, passes, sortRows, typeLabel } from "../src/client/codes.ts";
import { status } from "../src/client/status.ts";
import { asJson, call, form, makeEnv, textOf } from "./helpers.ts";

const VICE = "Vice\nClasses: Warlock 2\n\nL1 Warlock\nCantrips: Mind Sliver\n";

test("example: parses with no diagnostics, is already canonical (Tidy leaves it), and the form can save it", () => {
  const p = parse(EXAMPLE);
  assert.deepEqual(p.diagnostics, []);
  assert.equal(emit(p), EXAMPLE);
  assert.equal(emit(parse(emit(p))), EXAMPLE);
  const s = status(EXAMPLE);
  assert.equal(s.canSave, true);
  assert.equal(s.canTidy, false, "Tidy has nothing to change");
  // It shows each part the guide walks: a name, header keys, both entity blocks, level blocks, a source, details.
  const parts = exampleParts();
  assert.equal(parts.header.split("\n")[0], "Vesk");
  assert.ok(parts.entities.startsWith("Species: ") && parts.entities.includes("\n\nBackground: "));
  assert.ok(parts.levels.startsWith("L1 "));
  assert.equal([parts.header, parts.entities, parts.levels].join("\n\n") + "\n", EXAMPLE);
  assert.ok(/\|[A-Z]+/.test(EXAMPLE) && /\[[^\]]*;[^\]]*\]/.test(EXAMPLE));
});

test("example (D104): a multiclass with an option line, a marked feat (D110) and an inline ability (D107), in 0.8 keys", () => {
  const p = parse(EXAMPLE);
  const classes = p.header.get("Classes");
  assert.ok(classes?.type === "classes" && classes.entries.length >= 2, "two classes or more");
  assert.ok(new Set(p.levels.map((l) => l.class.name)).size >= 2, "level blocks in two classes");
  assert.ok(p.levels.some((l) => l.lines.has("Options")), "an option line");
  const scopes = [p.header, ...p.entities.map((e) => e.lines), ...p.levels.map((l) => l.lines)];
  assert.ok(scopes.some((s) => [...s.keys()].some((k) => k.startsWith("Feat ("))), "a marked feat");
  const sp = p.entities.find((e) => e.key === "Species")?.item;
  assert.ok(sp && sp.details.length === 2 && !isAbilitySlot(sp.details[0]) && isAbilitySlot(sp.details[1]), "D280, D281: the Species line's lineage, then its ability");
  assert.ok(!/^(ASI|Ability|Fighting Style|Equipment|Items):/m.test(EXAMPLE), "no 0.7 key");
});

test("Keys popover: each chip's description is the key table's text (one source), Feat (…) included", () => {
  for (const d of KEYS) {
    const doc = keyDoc(d.key);
    assert.ok(textOf(doc).includes(KEY_HOLDS[d.key]), d.key);
    assert.ok(keyTable().includes(esc(KEY_HOLDS[d.key])), `${d.key} in the table`);
    assert.ok(doc.includes(`Goes in: ${whereLabel(d)}.`), d.key);
  }
  assert.ok(textOf(keyDoc(MARKED_FEAT)).startsWith("Feat (…): " + KEY_HOLDS.Feat));
  assert.equal(keyDoc("Nope"), "");
});

test("/codes (D103): every book code with its title, linked from the guide, never naming where the list comes from", async () => {
  const codes = BOOKS.map((b) => b.code);
  assert.equal(new Set(codes.map((c) => c.toLowerCase())).size, codes.length, "codes are unique");
  for (const want of ["PHB", "XPHB", "TCE", "XGE", "DMG", "XDMG", "HB"]) assert.ok(codes.includes(want), want);
  assert.ok(UA_SOURCES.every((u) => BOOKS.some((b) => b.code === u.code && b.title === u.title && b.type === "Unearthed Arcana")), "D226: the library's UA codes, once");
  assert.ok(BOOKS.every((b) => b.title && !/\{@|entries/.test(b.title)), "titles only");
  const env = makeEnv();
  const r = await call(env, "GET", "/codes");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Content-Security-Policy"), CSP);
  assert.equal(r.headers.get("Cache-Control"), "public, max-age=3600");
  const page = await r.text();
  assert.ok(page.includes("<title>Book codes · dndpaste</title>"));
  for (const b of BOOKS) assert.ok(page.includes(`<th scope="row" class="kk">${esc(b.code)}</th><td>${esc(b.title)}</td><td class="ct">${esc(typeLabel(b))}</td><td class="cd">${esc(dateLabel(b.date))}</td>`), b.code);
  assert.deepEqual(BOOKS.map((b) => b.code), sortRows(BOOKS, "code", "asc").map((b) => b.code), "served sorted by code");
  assert.ok(BOOKS.some((b) => b.code === "PHB" && b.y2014 && b.type === "Core") && BOOKS.some((b) => b.code === "XPHB" && !b.y2014));
  assert.ok(page.includes(`<div class="cbar njs">`), "the search field and filters are hidden without JavaScript");
  assert.ok(!/5e\s*tools|usual|standard/i.test(textOf(page)), "no source name, no usual or standard wording");
  assert.ok(!/style=|<style/i.test(page));
  assert.ok((await (await call(env, "GET", "/guide")).text()).includes(`<a href="/codes">all book codes</a>`));
  assert.ok(!/5e\s*tools|usual|standard/i.test(textOf(await (await call(env, "GET", "/guide")).text())), "the guide either");
  assert.equal((await call(env, "POST", "/codes", form({ paste: VICE }))).status, 405);
});

test("/codes find and sort: every word matches code, title or type; columns sort both ways, ties by code", () => {
  const b = (code: string, title: string, type: "Core" | "Supplement" | "Adventure" | "Extra", y2014 = false) => ({ code, title, type, y2014 });
  const rows = [b("XPHB", "Player's Handbook (2024)", "Core"), b("PHB", "Player's Handbook (2014)", "Core", true), b("TCE", "Tasha's Cauldron of Everything", "Supplement"),
    b("CoS", "Curse of Strahd", "Adventure"), b("FRAiF", "Forgotten Realms: Adventures in Faerûn", "Extra")];
  assert.deepEqual(rows.filter((r) => matches(r, "handbook 2014")).map((r) => r.code), ["PHB"]);
  assert.deepEqual(rows.filter((r) => matches(r, "faerun")).map((r) => r.code), ["FRAiF"], "accents ignored");
  assert.deepEqual(rows.filter((r) => matches(r, "  ")).length, 5);
  assert.deepEqual(rows.filter((r) => matches(r, "adventure")).map((r) => r.code), ["CoS", "FRAiF"]);
  assert.deepEqual(sortRows(rows, "code", "asc").map((r) => r.code), ["CoS", "FRAiF", "PHB", "TCE", "XPHB"]);
  assert.deepEqual(sortRows(rows, "code", "desc").map((r) => r.code), ["XPHB", "TCE", "PHB", "FRAiF", "CoS"]);
  assert.deepEqual(sortRows(rows, "title", "asc").map((r) => r.code), ["CoS", "FRAiF", "PHB", "XPHB", "TCE"]);
  assert.deepEqual(sortRows(rows, "type", "asc").map((r) => r.code), ["XPHB", "PHB", "TCE", "CoS", "FRAiF"]);
  assert.equal(typeLabel(rows[1]), "Core, 2014");
});

test("D228 /codes: publication dates, type and 2014 filters, the A–Z letters", () => {
  assert.equal(dateLabel("2014-08-19"), "Aug 2014");
  assert.equal(dateLabel("2019"), "2019");
  assert.equal(dateLabel(""), "");
  const all = allCodes();
  assert.equal(all.find((b) => b.code === "PHB")?.date, "2014-08-19");
  assert.ok(all.filter((b) => b.type === "Unearthed Arcana").every((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.date)), "every UA code has its release date");
  const b = (code: string, date: string, y2014 = false) => ({ code, title: code, type: "Core" as const, y2014, date });
  const rows = [b("XPHB", "2024-09-17"), b("PHB", "2014-08-19", true), b("EEPC", ""), b("DMG", "2014-12-09", true)];
  assert.deepEqual(sortRows(rows, "date", "asc").map((r) => r.code), ["PHB", "DMG", "XPHB", "EEPC"]);
  assert.deepEqual(sortRows(rows, "date", "desc").map((r) => r.code), ["XPHB", "DMG", "PHB", "EEPC"], "no date stays last");
  assert.ok(matches(rows[1], "2014 aug"), "a year finds its books");
  assert.ok(passes(rows[0], "Core", false) && !passes(rows[1], "Core", false) && !passes(rows[0], "Adventure", true) && passes(rows[1], null, true));
  assert.equal(letterOf(b("xphb", ""), "code"), "X");
  assert.equal(letterOf({ ...b("Q", ""), title: "Égypte" }, "title"), "E", "accents folded");
  assert.equal(letterOf(b("9xx", ""), "code"), "#");
});

test("key table: one row per profile key, in the library's order, with its places and a description", () => {
  assert.deepEqual(Object.keys(KEY_HOLDS).sort(), KEYS.map((d) => d.key).sort(), "KEY_HOLDS and KEYS list the same keys");
  const html = keyTable();
  const rows = [...html.matchAll(/<tr><th scope="row" class="kk">([^<]*)<\/th><td class="kw">([^<]*)<\/td><td class="kh">([^<]*)<small>/g)];
  assert.deepEqual(rows.map((r) => r[1]), KEYS.map((d) => d.key));
  rows.forEach((r, i) => {
    const d = KEYS[i];
    assert.equal(r[2], d.scopes.map((s) => SCOPE_LABEL[s]).join(", ") + (d.opensBlock ? ", opens a block" : ""), d.key);
    assert.equal(r[2], whereLabel(d));
    assert.ok(r[3].length > 0, `${d.key} has a description`);
  });
  for (const v of KEYS.flatMap((d) => d.enumValues ?? [])) assert.ok(html.includes(`<code>${v}</code>`), v);
});

test("/guide: 200 with the site's headers, the example as written, the key table, the spec link", async () => {
  const env = makeEnv();
  const r = await call(env, "GET", "/guide");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Content-Security-Policy"), CSP);
  assert.equal(r.headers.get("Referrer-Policy"), "same-origin");
  assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(r.headers.get("Content-Type") ?? "", /^text\/html/);
  assert.equal(r.headers.get("Cache-Control"), "public, max-age=3600");
  const page = await r.text();
  assert.ok(page.includes("<title>Format guide · dndpaste</title>"));
  assert.ok(page.includes(keyTable()));
  assert.ok(page.includes(`href="${SPEC_URL}"`) && page.includes(`href="${SPEC_URL}#7-diagnostics"`));
  // The full example, line for line, as the editor draws it (one row per line, numbered by CSS).
  const fig = /<figure class="pane ex" aria-label="The example build">([\s\S]*?)<\/figure>/.exec(page)?.[1] ?? "";
  const lines = [...fig.matchAll(/<span class="t">([\s\S]*?)<\/span><\/div>/g)].map((m) => textOf(m[1]));
  assert.deepEqual(lines, EXAMPLE.trimEnd().split("\n"));
  // Reading needs no JavaScript: no script but site.js, no inline style, no host but the spec's.
  const scripts = [...page.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0]);
  assert.deepEqual(scripts, [`<script src="/assets/site.js"></script>`]);
  assert.ok(!/style=|<style/i.test(page));
  const hosts = [...page.matchAll(/https?:\/\/[^"'\s<]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(SPEC_URL) && u !== FEEDBACK_URL && u !== RELEASES_URL);
  assert.deepEqual(hosts, []);
  assert.ok(!/—|–/.test(page.replace(/<title>.*<\/title>/, "")), "no dashes in the guide copy (D88 c)");
  assert.ok(!/;\s/.test(textOf(page.replace(/<code>[\s\S]*?<\/code>|<figure[\s\S]*?<\/figure>/g, ""))), "no semicolons in the prose (humanize)");
  assert.equal((await call(env, "HEAD", "/guide")).status, 200);
  assert.equal((await call(env, "POST", "/guide", form({ paste: VICE }))).status, 405);
  assert.equal((await call(env, "GET", "/guide/x")).status, 404);
});

test("the guide is linked from the header, the form and /about", async () => {
  const env = makeEnv();
  for (const p of ["/", "/about", "/guide", "/nope"]) {
    const page = await (await call(env, "GET", p)).text();
    assert.ok(page.includes(`<a class="nav" href="/guide">Guide</a>`), p);
  }
  assert.ok((await (await call(env, "GET", "/")).text()).includes(GUIDE_LINK));
  assert.ok((await (await call(env, "GET", "/about")).text()).includes(`<a href="/guide">format guide</a>`));
});

test("Start a build: offered only on a new, empty form (not edit, not Duplicate and edit, not a refused save)", async () => {
  const env = makeEnv();
  const has = async (method: string, path: string, init = {}) => (await (await call(env, method, path, init)).text()).includes(`data-start="1"`);
  assert.equal(await has("GET", "/"), true);
  const res = await call(env, "POST", "/", asJson({ title: "Vice", author: "", paste: VICE }));
  const { id, key } = (await res.json()) as { id: string; key: string };
  assert.ok(key);
  assert.equal(await has("GET", `/?from=${id}`), false, "Duplicate and edit");
  assert.equal(await has("GET", `/?from=${id}/1`), false, "Duplicate and edit, a revision");
  assert.equal(await has("GET", "/?from=nothing0000"), false, "Duplicate and edit of a missing id");
  assert.equal(await has("GET", `/${id}/edit`), false, "edit (D97)");
  assert.equal(await has("POST", "/", form({ paste: "Classes Warlock" })), false, "a refused save keeps its text");
});

test("feedback (D147) and format changes (D145): /about and /guide link the issue chooser, /guide links the releases", async () => {
  const env = makeEnv();
  assert.equal(FEEDBACK_URL, "https://github.com/francescocompa/dndpaste/issues/new/choose");
  assert.equal(RELEASES_URL, "https://github.com/francescocompa/dndpaste/releases");
  const about = await (await call(env, "GET", "/about")).text();
  const guide = await (await call(env, "GET", "/guide")).text();
  for (const [name, page] of [["/about", about], ["/guide", guide]]) {
    assert.equal(page.split(FEEDBACK_LINE).length - 1, 1, `${name}: one feedback line`);
    assert.ok(page.includes(`<a href="${FEEDBACK_URL}">Send feedback</a>`), name);
  }
  assert.ok(guide.includes(`<h2 id="changes">Format changes</h2>`));
  assert.ok(guide.includes(`<a href="${RELEASES_URL}">release</a>`));
  assert.ok(!about.includes(RELEASES_URL), "the releases link lives on /guide only");
  // The foot stays the version line only (D137): no feedback link on any other page.
  for (const p of ["/", "/codes", "/nope"]) {
    assert.ok(!(await (await call(env, "GET", p)).text()).includes(FEEDBACK_URL), p);
  }
  assert.ok(!/—|–/.test(textOf(FEEDBACK_LINE)) && !/;\s/.test(textOf(FEEDBACK_LINE)), "plain copy (D88 c)");
});

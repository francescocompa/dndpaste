// The format guide and the form's example (M3 3.2e, D99).
import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS, emit, parse } from "../../src/dndpaste.ts";
import { CSP } from "../src/app.ts";
import { EXAMPLE, GUIDE_LINK } from "../src/example.ts";
import { KEY_HOLDS, SCOPE_LABEL, SPEC_URL, exampleParts, keyTable, whereLabel } from "../src/guide.ts";
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
  assert.equal(parts.header.split("\n")[0], "Briar");
  assert.ok(parts.entities.startsWith("Species: ") && parts.entities.includes("\n\nBackground: "));
  assert.ok(parts.levels.startsWith("L1 "));
  assert.equal([parts.header, parts.entities, parts.levels].join("\n\n") + "\n", EXAMPLE);
  assert.ok(/\|[A-Z]+/.test(EXAMPLE) && /\[[^\]]*;[^\]]*\]/.test(EXAMPLE));
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
  const hosts = [...page.matchAll(/https?:\/\/[^"'\s<]+/g)].map((m) => m[0]).filter((u) => !u.startsWith(SPEC_URL));
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

test("example offer: marked only on a new, empty form (not edit, not Duplicate and edit, not a refused save)", async () => {
  const env = makeEnv();
  const has = async (method: string, path: string, init = {}) => (await (await call(env, method, path, init)).text()).includes(`data-example="1"`);
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

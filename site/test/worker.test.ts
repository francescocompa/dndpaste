import { test } from "node:test";
import assert from "node:assert/strict";
import { emit, parse } from "../../src/dndpaste.ts";
import { CSP } from "../src/app.ts";
import { prerender } from "../src/pages.ts";
import { ID_RE, LIMITS } from "../src/store.ts";
import { CountingLimiter, FIXTURES, ORIGIN, asJson, call, form, makeEnv } from "./helpers.ts";

const VICE = FIXTURES.find(([n]) => n === "vice.dndpaste")![1];

async function saveForm(env: ReturnType<typeof makeEnv>, fields: Record<string, string>) {
  const res = await call(env, "POST", "/", form(fields));
  assert.equal(res.status, 303, await res.clone().text());
  const loc = res.headers.get("Location")!;
  assert.match(loc, /^\/[0-9A-Za-z]{10}$/);
  return loc.slice(1);
}

// ─── round trip: every fixture saves → views → /raw → /canon → /json ───────

for (const [name, text] of FIXTURES) {
  test(`round trip: ${name} (form)`, async () => {
    const env = makeEnv();
    const id = await saveForm(env, { title: name, author: "tester", paste: text.replace(/\n/g, "\r\n") });
    const view = await call(env, "GET", `/${id}`);
    assert.equal(view.status, 200);
    assert.equal(view.headers.get("Content-Type"), "text/html; charset=utf-8");
    assert.ok((await view.text()).includes(`<h1 class="ttl">${name}</h1>`));

    const raw = await call(env, "GET", `/${id}/raw`);
    assert.equal(raw.status, 200);
    assert.equal(await raw.text(), text, "raw is the text as written (CRLF stored as LF)");
    const canon = await call(env, "GET", `/${id}/canon`);
    assert.equal(await canon.text(), emit(parse(text)));
    // The canonical text is a fixed point: saving it again gives the same canon.
    const id2 = await saveForm(env, { paste: emit(parse(text)) });
    assert.equal(await (await call(env, "GET", `/${id2}/canon`)).text(), emit(parse(text)));

    const j = await (await call(env, "GET", `/${id}/json`)).json() as Record<string, string>;
    assert.deepEqual(Object.keys(j), ["title", "author", "paste", "created"]);
    assert.equal(j.paste, text);
    assert.equal(j.title, name);
  });
}

test("save (JSON): 201 with id and url; the record has the D65 shape", async () => {
  const env = makeEnv();
  const res = await call(env, "POST", "/", asJson({ title: "Vice", author: "ash", paste: VICE }), { now: () => new Date("2026-11-15T10:00:00Z") });
  assert.equal(res.status, 201);
  const out = await res.json() as { id: string; url: string };
  assert.match(out.id, ID_RE);
  assert.equal(out.url, `${ORIGIN}/${out.id}`);
  // `r` is the render cached at save (T3.3), derived from the paste; the share itself is the D65 fields.
  assert.deepEqual(JSON.parse(env.PASTES.map.get(`p:${out.id}`)!), { v: 1, title: "Vice", author: "ash", paste: VICE, created: "2026-11-15T10:00:00.000Z", r: prerender(parse(VICE)) });
});

test("save: multipart form data works too", async () => {
  const env = makeEnv();
  const fd = new FormData();
  fd.set("paste", VICE);
  const res = await call(env, "POST", "/", { body: fd });
  assert.equal(res.status, 303);
});

test("save: an id collision retries with a new id", async () => {
  const env = makeEnv();
  env.PASTES.map.set("p:AAAAAAAAAA", "{}");
  const ids = ["AAAAAAAAAA", "bad", "BBBBBBBBBB"];
  const res = await call(env, "POST", "/", asJson({ paste: VICE }), { makeId: () => ids.shift()! });
  assert.equal((await res.json() as { id: string }).id, "BBBBBBBBBB");
  assert.equal(env.PASTES.map.get("p:AAAAAAAAAA"), "{}");
});

test("ids: 10 base62 characters", async () => {
  const { newId } = await import("../src/store.ts");
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) { const id = newId(); assert.match(id, ID_RE); seen.add(id); }
  assert.equal(seen.size, 2000);
});

// ─── refusals ───────────────────────────────────────────────────────────────

test("save: empty or whitespace-only is refused", async () => {
  const env = makeEnv();
  for (const paste of ["", "  \n\n \t"]) {
    const res = await call(env, "POST", "/", form({ paste }));
    assert.equal(res.status, 400);
    assert.ok((await res.text()).includes("Write or paste a build first."));
  }
  assert.equal(env.PASTES.map.size, 0);
});

test("save: 32 KB passes, 32 KB + 1 byte is refused (bytes, not characters)", async () => {
  const env = makeEnv();
  const fill = (bytes: number) => "Vice\n" + "X-Pad: " + "a".repeat(bytes - "Vice\nX-Pad: ".length);
  assert.equal(new TextEncoder().encode(fill(LIMITS.pasteBytes)).byteLength, 32768);
  assert.equal((await call(env, "POST", "/", asJson({ paste: fill(LIMITS.pasteBytes) }))).status, 201);
  assert.equal((await call(env, "POST", "/", asJson({ paste: fill(LIMITS.pasteBytes + 1) }))).status, 413);
  // Multi-byte characters count by their UTF-8 size.
  const wide = "Vice\nX-Pad: " + "é".repeat(LIMITS.pasteBytes / 2);
  assert.equal((await call(env, "POST", "/", form({ paste: wide }))).status, 413);
  const res = await call(env, "POST", "/", form({ paste: fill(LIMITS.pasteBytes + 1) }));
  assert.ok((await res.text()).includes("This build is over 32 KB."));
});

test("save: a body past the envelope is refused before it is read", async () => {
  const env = makeEnv();
  const res = await call(env, "POST", "/", { body: "a".repeat(LIMITS.bodyBytes + 1), type: "application/x-www-form-urlencoded" });
  assert.equal(res.status, 413);
});

test("save: title 100 and author 60 characters pass; one more is refused", async () => {
  const env = makeEnv();
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE, title: "t".repeat(100), author: "a".repeat(60) }))).status, 201);
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE, title: "t".repeat(101) }))).status, 400);
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE, author: "a".repeat(61) }))).status, 400);
  // Characters are code points: 100 emoji is still 100.
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE, title: "🐉".repeat(100) }))).status, 201);
});

test("save: title and author become one trimmed line", async () => {
  const env = makeEnv();
  const res = await call(env, "POST", "/", asJson({ paste: VICE, title: "  Vice\r\n<b>\u0000 ", author: "\tash\n" }));
  const { id } = await res.json() as { id: string };
  const rec = JSON.parse(env.PASTES.map.get(`p:${id}`)!);
  assert.equal(rec.title, "Vice <b>");
  assert.equal(rec.author, "ash");
});

test("save: any E### is refused with its diagnostics; warnings pass", async () => {
  const env = makeEnv();
  const bad = VICE.replace("Spells:", "Spels:");
  const res = await call(env, "POST", "/", form({ title: "Vice", paste: bad }));
  assert.equal(res.status, 422);
  const page = await res.text();
  assert.ok(page.includes(`<span class="code">E002</span><span class="at">line 18</span><span>Unknown key: Spels</span>`));
  assert.ok(page.includes("<b>1 error</b> · fix it to save"));
  assert.ok(page.includes(`placeholder="Untitled build">Vice</textarea>`), "title kept");
  assert.ok(page.includes("Spels: Hex"), "text kept");

  const j = await call(env, "POST", "/", asJson({ paste: bad }));
  assert.equal(j.status, 422);
  const out = await j.json() as { diagnostics: { code: string; line: number }[] };
  assert.deepEqual(out.diagnostics.map((d) => [d.code, d.line]), [["E002", 18]]);

  const ext = FIXTURES.find(([n]) => n === "st-extension.dndpaste")![1];
  assert.equal((await call(env, "POST", "/", asJson({ paste: ext }))).status, 201);
});

test("save: wrong shapes are refused", async () => {
  const env = makeEnv();
  assert.equal((await call(env, "POST", "/", { body: "paste", type: "text/plain" })).status, 415);
  assert.equal((await call(env, "POST", "/", { body: "{nope", type: "application/json" })).status, 400);
  assert.equal((await call(env, "POST", "/", asJson({ paste: 5 }))).status, 400);
  assert.equal((await call(env, "POST", "/", asJson(["x"]))).status, 400);
});

test("save: the per-IP limit answers 429 and stores nothing more", async () => {
  const env = makeEnv({ SAVE_LIMITER: new CountingLimiter(2) });
  const ip = { "CF-Connecting-IP": "203.0.113.9" };
  for (let i = 0; i < 2; i++) assert.equal((await call(env, "POST", "/", { ...asJson({ paste: VICE }), headers: ip })).status, 201);
  const res = await call(env, "POST", "/", { ...asJson({ paste: VICE }), headers: ip });
  assert.equal(res.status, 429);
  assert.equal(env.PASTES.map.size, 2);
  // Another address is not affected.
  assert.equal((await call(env, "POST", "/", { ...asJson({ paste: VICE }), headers: { "CF-Connecting-IP": "203.0.113.10" } })).status, 201);
});

test("save: Turnstile is off without a secret, and refuses a missing token with one", async () => {
  const env = makeEnv({ TURNSTILE_SECRET: "x" });
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE }))).status, 403);
});

// ─── reading ────────────────────────────────────────────────────────────────

test("raw, canon and json: text/plain or JSON, nosniff, open CORS, preflight", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  for (const [sub, type] of [["raw", "text/plain; charset=utf-8"], ["canon", "text/plain; charset=utf-8"], ["json", "application/json; charset=utf-8"]]) {
    const res = await call(env, "GET", `/${id}/${sub}`);
    assert.equal(res.headers.get("Content-Type"), type);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
    const pre = await call(env, "OPTIONS", `/${id}/${sub}`);
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get("Access-Control-Allow-Origin"), "*");
    const missing = await call(env, "GET", `/ZZZZZZZZZZ/${sub}`);
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("Access-Control-Allow-Origin"), "*");
  }
});

test("view: title, byline, date, OG tags, folds; untitled and anonymous", async () => {
  const env = makeEnv();
  const now = () => new Date("2026-11-15T10:00:00Z");
  const res = await call(env, "POST", "/", asJson({ title: "Vice", author: "ash", paste: VICE }), { now });
  const { id } = await res.json() as { id: string };
  const page = await (await call(env, "GET", `/${id}`)).text();
  assert.ok(page.includes(`<div class="by">by ash · <time datetime="2026-11-15T10:00:00.000Z">15 Nov 2026</time></div>`));
  assert.ok(page.includes(`<meta property="og:title" content="Vice">`));
  assert.ok(page.includes(`<meta property="og:description" content="a D&amp;D build on dndpaste">`));
  assert.ok(page.includes(`<meta property="og:url" content="${ORIGIN}/${id}">`));
  assert.ok(page.includes(`<title>Vice · dndpaste</title>`));
  assert.ok(page.includes(`href="/?from=${id}"`));
  assert.equal((page.match(/<details class="lvb" open>/g) ?? []).length, 5);
  // Slice 3 (D87): the split Copy button and fold controls need JS (njs); Duplicate and edit is a plain link.
  assert.ok(page.includes(`<span class="splitb njs"><button type="button" class="bt pri cpy" data-copy="link">`));
  assert.ok(page.includes(`aria-label="More ways to copy" aria-haspopup="menu" aria-expanded="false"`));
  assert.ok(page.includes(`<div class="fold njs"><button type="button" class="b" data-fold="close">Fold all levels</button>`));
  assert.ok(page.includes(`data-act="cancel-report">Cancel</button>`));
  assert.ok(page.includes(`<button type="button" class="dbtn njs" aria-haspopup="dialog" aria-expanded="false">`));
  assert.ok(!/class="foot"|Names only, never rules text/.test(page), "no footer disclaimer (D89 c)");

  const flat = FIXTURES.find(([n]) => n === "flat-multiclass.dndpaste")![1];
  const r2 = await call(env, "POST", "/", asJson({ paste: flat }), { now });
  const p2 = await (await call(env, "GET", `/${(await r2.json() as { id: string }).id}`)).text();
  assert.ok(p2.includes(`<h1 class="ttl none">Untitled build</h1>`));
  assert.ok(p2.includes(`<div class="by">Anonymous · <time`));
  assert.ok(!p2.includes(`class="fold`), "no fold controls without level blocks");
});

test("view, HEAD: same status and headers, no body", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  const res = await call(env, "HEAD", `/${id}`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "");
});

test("form: GET / is the empty form; ?from= pre-fills it; a missing id says so", async () => {
  const env = makeEnv();
  const blank = await (await call(env, "GET", "/")).text();
  assert.ok(blank.includes(`<form class="pform stack" method="post" action="/">`));
  assert.ok(blank.includes(`name="paste"`));
  const id = await saveForm(env, { title: "Vice", author: "ash", paste: VICE });
  const pre = await (await call(env, "GET", `/?from=${id}`)).text();
  assert.ok(pre.includes(`name="title" rows="1" maxlength="100" autocomplete="off" spellcheck="false" placeholder="Untitled build">Vice</textarea>`));
  assert.ok(pre.includes(`name="author" rows="1" maxlength="60" autocomplete="off" spellcheck="false" placeholder="Anonymous">ash</textarea>`));
  assert.ok(pre.includes(`<script type="module" src="/assets/form.js"></script>`));
  assert.ok(pre.includes("Spells: Hex, Armor of Agathys"));
  const miss = await (await call(env, "GET", "/?from=nothing")).text();
  assert.ok(miss.includes("There is no build with the id nothing."));
});

test("routes: about, 404, 405, and fixed pages cannot collide with an id", async () => {
  const env = makeEnv();
  const about = await call(env, "GET", "/about");
  assert.equal(about.status, 200);
  const aboutText = await about.text();
  assert.equal((aboutText.match(/not affiliated with Wizards of the Coast/g) ?? []).length, 1);
  for (const w of ["never rules text", "Report it", "/&lt;id&gt;/raw", "/&lt;id&gt;/canon", "/&lt;id&gt;/json", "Duplicate and edit"]) assert.ok(aboutText.includes(w), w);
  assert.ok(!/—|–/.test(aboutText.replace(/<title>.*<\/title>/, "")), "no dashes in the about copy (D88 c)");
  for (const p of ["/nope", "/ABCDEFGHIJ", "/ABCDEFGHIJK", "/ABCDEFGHI", "/ABCDEFGHIJ/", "/ABCDEFGHIJ/other", "/about/x", "/ABCDE-GHIJ"]) {
    const r = await call(env, "GET", p);
    assert.equal(r.status, 404, p);
    assert.ok((await r.text()).includes("<h1>Not found</h1>"), p);
  }
  assert.equal((await call(env, "PUT", "/")).status, 405);
  assert.equal((await call(env, "DELETE", "/ABCDEFGHIJ")).status, 405);
  assert.equal((await call(env, "GET", "/ABCDEFGHIJ/report")).status, 405);
  assert.equal((await call(env, "POST", "/ABCDEFGHIJ/raw")).status, 405);
});

test("headers: CSP, same-origin referrer and nosniff on every response", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  for (const [m, p] of [["GET", "/"], ["GET", `/${id}`], ["GET", `/${id}/raw`], ["GET", "/about"], ["GET", "/x"], ["PUT", "/"]]) {
    const r = await call(env, m, p);
    assert.equal(r.headers.get("Content-Security-Policy"), CSP, p);
    // same-origin, not no-referrer: no-referrer makes browsers send `Origin: null` on our own POSTs (T3.3 cross-site check).
    assert.equal(r.headers.get("Referrer-Policy"), "same-origin", p);
    assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff", p);
  }
});

test("pages: no inline scripts, inline styles or third-party URLs", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  for (const p of ["/", `/${id}`, "/about", "/missing"]) {
    const page = await (await call(env, "GET", p)).text();
    // Only external files under script-src 'self': site.js on every page (slice 3), form.js on the form (slice 2).
    const scripts = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[0]);
    const want = [`<script src="/assets/site.js"></script>`, ...(p === "/" ? [`<script type="module" src="/assets/form.js"></script>`] : [])];
    assert.deepEqual(scripts, want, p);
    assert.ok(!/style=|<style|fonts\.googleapis|https?:\/\/(?!dndpaste\.test)/i.test(page), p);
  }
});

// ─── canonical origin (D70) ─────────────────────────────────────────────────

test("CANONICAL_ORIGIN: empty serves any host; set, other hosts get a 301 with path, query and CORS", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  assert.equal((await call(env, "GET", `/${id}`)).status, 200);
  env.CANONICAL_ORIGIN = "https://dndpaste.example";
  const r = await call(env, "GET", `/${id}/raw?x=1`);
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("Location"), `https://dndpaste.example/${id}/raw?x=1`);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(r.headers.get("Cache-Control"), "public, max-age=3600");
  env.CANONICAL_ORIGIN = ORIGIN;
  assert.equal((await call(env, "GET", `/${id}`)).status, 200);
  const j = await call(env, "POST", "/", asJson({ paste: VICE }));
  assert.equal((await j.json() as { url: string }).url.startsWith(ORIGIN + "/"), true);
});

// ─── reports ────────────────────────────────────────────────────────────────

test("report: stored under r:<iso>:<id>:<nonce>, never shown; form lands on a thank-you", async () => {
  const env = makeEnv();
  const id = await saveForm(env, { paste: VICE });
  const now = () => new Date("2026-11-15T11:00:00Z");
  const res = await call(env, "POST", `/${id}/report`, form({ reason: "Spam\r\nline two", contact: "me@example.org" }), { now, reportNonce: () => "n0nce1" });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), `/${id}?reported=1`);
  const key = `r:2026-11-15T11:00:00.000Z:${id}:n0nce1`;
  assert.deepEqual(JSON.parse(env.PASTES.map.get(key)!), { id, reason: "Spam\nline two", contact: "me@example.org", created: "2026-11-15T11:00:00.000Z" });
  const thanks = await (await call(env, "GET", `/${id}?reported=1`)).text();
  assert.ok(thanks.includes("Thanks. Your report went to the site's maintainer."));
  assert.ok(!thanks.includes("Spam"));
  const json = await call(env, "POST", `/${id}/report`, asJson({ reason: "x" }));
  assert.equal(json.status, 201);
});

test("report: reason required and ≤ 500, contact ≤ 200, unknown id 404, limited per IP", async () => {
  const env = makeEnv({ REPORT_LIMITER: new CountingLimiter(1) });
  const id = await saveForm(env, { paste: VICE });
  const empty = await call(env, "POST", `/${id}/report`, form({ reason: "  " }));
  assert.equal(empty.status, 400);
  const page = await empty.text();
  assert.ok(page.includes(`<details class="report" open>`));
  assert.ok(page.includes("Write a reason first."));
  assert.equal((await call(env, "POST", `/${id}/report`, form({ reason: "r".repeat(501) }))).status, 400);
  assert.equal((await call(env, "POST", `/${id}/report`, form({ reason: "ok", contact: "c".repeat(201) }))).status, 400);
  assert.equal((await call(env, "POST", "/ZZZZZZZZZZ/report", form({ reason: "ok" }))).status, 404);
  assert.equal((await call(env, "POST", `/${id}/report`, form({ reason: "r".repeat(500) }))).status, 303);
  assert.equal((await call(env, "POST", `/${id}/report`, form({ reason: "again" }))).status, 429);
  assert.equal([...env.PASTES.map.keys()].filter((k) => k.startsWith("r:")).length, 1);
});

test("save (D95): a name-only paste is refused with 422, JSON and form alike", async () => {
  const env = makeEnv();
  const j = await call(env, "POST", "/", asJson({ paste: "Vice\n" }));
  assert.equal(j.status, 422);
  assert.match(((await j.json()) as { error: string }).error, /at least one key besides its name/);
  assert.equal((await call(env, "POST", "/", asJson({ paste: "Vice\nSpecies: Human\n" }))).status, 201);
});

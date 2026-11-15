// Hostile titles, authors, pastes and reports: escaped in every HTML context, untouched in raw/json, never executed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { asJson, call, form, makeEnv } from "./helpers.ts";

const XSS = [
  `<script>alert(1)</script>`,
  `"><img src=x onerror=alert(1)>`,
  `'><svg onload=alert(1)>`,
  `</textarea><script>alert(1)</script>`,
  `</title><script>alert(1)</script>`,
  `javascript:alert(1)`,
  `{{constructor.constructor('alert(1)')()}}`,
  `&lt;b&gt;already escaped&lt;/b&gt;`,
];
/** Live markup an attacker could inject, read off the real tags only (escaped text like &lt;script never forms a tag). */
function liveMarkup(page: string): string | null {
  for (const m of page.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const [tag, name, attrs] = m;
    if (/^(script|img|iframe|object|embed|style|base|link)$/i.test(name) && !/^<link rel="(icon|stylesheet|canonical|alternate)"/.test(tag)) return tag;
    if (/^<svg\b/i.test(tag) && !/^<svg class="i /.test(tag)) return tag;
    for (const a of attrs.matchAll(/\s([a-z][a-z0-9:-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/gi)) {
      const value = (a[2] ?? "").replace(/^["']|["']$/g, "");
      if (/^on/i.test(a[1])) return tag;
      if (/^(href|src|action|formaction)$/i.test(a[1]) && /^\s*javascript:/i.test(value)) return tag;
    }
  }
  const opens = (page.match(/<textarea\b/g) ?? []).length, closes = (page.match(/<\/textarea>/g) ?? []).length;
  if (opens !== closes) return "unbalanced textarea";
  if (page.includes("<b><b>")) return "<b><b>";
  return null;
}

function assertInert(page: string, label: string) {
  assert.equal(liveMarkup(page), null, label);
}

const pasteWith = (bad: string) => `${bad}\nRules: 2024\nFeat: ${JSON.stringify(bad)}|${"X"}\nSpells: "${bad.replace(/"/g, "'")}"\n\nL1 ${bad.replace(/[:"]/g, "")}\nX-Note: "${bad.replace(/"/g, "'")}"`;

for (const bad of XSS) {
  test(`hostile: ${bad}`, async () => {
    const env = makeEnv();
    const paste = pasteWith(bad);
    const res = await call(env, "POST", "/", asJson({ title: bad, author: bad, paste }));
    // Some shapes make a parse error (e.g. a quote inside a quoted name); then the error page must be inert too.
    if (res.status === 422) {
      const back = await call(env, "POST", "/", form({ title: bad, author: bad, paste }));
      assertInert(await back.text(), "error form");
      return;
    }
    assert.equal(res.status, 201, await res.clone().text());
    const { id } = await res.json() as { id: string };
    const view = await (await call(env, "GET", `/${id}`)).text();
    assertInert(view, "view");
    assert.ok(view.includes(`<meta property="og:title" content="`), "og tag present");
    const pre = await (await call(env, "GET", `/?from=${id}`)).text();
    assertInert(pre, "prefilled form");
    // Raw and JSON give the text back exactly, as plain text and JSON, never HTML.
    const raw = await call(env, "GET", `/${id}/raw`);
    assert.equal(raw.headers.get("Content-Type"), "text/plain; charset=utf-8");
    assert.equal(await raw.text(), paste);
    const j = await (await call(env, "GET", `/${id}/json`)).json() as { title: string };
    assert.equal(j.title, bad);
  });
}

test("hostile: the error form echoes a hostile paste inside the textarea, escaped", async () => {
  const env = makeEnv();
  const paste = `</textarea><script>alert(1)</script>\nNope: x`;
  const res = await call(env, "POST", "/", form({ paste, title: `"><script>`, author: "</textarea>" }));
  assert.equal(res.status, 422);
  const page = await res.text();
  assertInert(page, "error form");
  assert.ok(page.includes("&lt;/textarea&gt;&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("hostile: report fields echoed back on an error are escaped", async () => {
  const env = makeEnv();
  const { id } = await (await call(env, "POST", "/", asJson({ paste: "Vice" }))).json() as { id: string };
  const page = await (await call(env, "POST", `/${id}/report`, form({ reason: "", contact: `"><script>alert(1)</script>` }))).text();
  assertInert(page, "report error");
});

test("hostile: ?from= with markup is escaped, ids never reach a page unvalidated", async () => {
  const env = makeEnv();
  const page = await (await call(env, "GET", `/?from=${encodeURIComponent(`"><script>alert(1)</script>`)}`)).text();
  assertInert(page, "from");
});

test("hostile: a 30 KB single line renders escaped and wraps (no layout-breaking nowrap)", async () => {
  const env = makeEnv();
  const long = "Vice\nFeat: " + "<b>".repeat(10000);
  const res = await call(env, "POST", "/", asJson({ paste: long }));
  assert.equal(res.status, 201);
  const { id } = await res.json() as { id: string };
  const page = await (await call(env, "GET", `/${id}`)).text();
  assertInert(page, "long");
  assert.ok(page.includes("&lt;b&gt;".repeat(100)));
});

test("hostile: a stored record that is not JSON, or has the wrong shape, is a 404, not a crash", async () => {
  const env = makeEnv();
  env.PASTES.map.set("p:AAAAAAAAAA", "not json");
  env.PASTES.map.set("p:BBBBBBBBBB", JSON.stringify({ paste: 5 }));
  for (const id of ["AAAAAAAAAA", "BBBBBBBBBB"]) {
    assert.equal((await call(env, "GET", `/${id}`)).status, 404);
    assert.equal((await call(env, "GET", `/${id}/raw`)).status, 404);
  }
});

test("hostile: the detector itself catches live markup and passes escaped text", () => {
  for (const bad of [`<script>x</script>`, `<img src=x>`, `<p onclick="x">`, `<a href="javascript:x">`, `<svg onload=x>`, `<textarea>`, `<b><b>`]) {
    assert.notEqual(liveMarkup(`<p>${bad}</p>`), null, bad);
  }
  assert.equal(liveMarkup(`<p title="&quot; onerror=x">&lt;script&gt;</p><svg class="i i-x" aria-hidden="true"></svg>`), null);
});

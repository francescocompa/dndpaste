/** D97: editable shares as revisions — keys, the edit route, revision routes, cache headers, limits, legacy records. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_KEY } from "../src/app.ts";
import { formPage } from "../src/pages.ts";
import { KEY_RE, LIMITS, getRevision, hashKey, keyOpens, newEditKey } from "../src/store.ts";
import type { PasteRecord } from "../src/store.ts";
import { keyFromHash, keyStore } from "../src/client/keys.ts";
import { CountingLimiter, FIXTURES, MemoryCapNamespace, MemoryKV, asJson, call, form, makeEnv } from "./helpers.ts";

const VICE = FIXTURES.find(([n]) => n === "vice.dndpaste")![1];
const SHIGEN = FIXTURES.find(([n]) => n === "shigen.dndpaste")![1];
const KEY = "A".repeat(42) + "w";
const T0 = () => new Date("2026-11-16T10:00:00Z");
const T1 = () => new Date("2026-11-17T09:30:00Z");

type Env = ReturnType<typeof makeEnv>;

async function saveJson(env: Env, data: Record<string, string> = { title: "Vice", author: "ash", paste: VICE }) {
  const res = await call(env, "POST", "/", asJson(data), { now: T0, makeKey: () => KEY });
  assert.equal(res.status, 201);
  return (await res.json() as { id: string }).id;
}
const editJson = (env: Env, id: string, data: Record<string, string>, now = T1) =>
  call(env, "POST", `/${id}/edit`, asJson(data), { now });
const text = async (env: Env, path: string) => (await call(env, "GET", path)).text();

// ─── keys ───────────────────────────────────────────────────────────────────

test("edit keys: 43 base64url characters from 32 random bytes; only the hash opens; malformed never does", async () => {
  const k = newEditKey();
  assert.match(k, KEY_RE);
  assert.notEqual(newEditKey(), k);
  const rec: PasteRecord = { v: 1, title: "", author: "", paste: "x", created: "", k: await hashKey(k) };
  assert.equal(await keyOpens(rec, k), true);
  assert.equal(await keyOpens(rec, newEditKey()), false);
  for (const bad of ["", "short", k + "x", k.slice(0, 42) + "!", `<script>${k}`, rec.k!]) assert.equal(await keyOpens(rec, bad), false, bad);
  assert.equal(await keyOpens({ ...rec, k: undefined }, k), false, "no hash, no edit");
});

test("edit keys in the browser: kept per id, blocked storage says so, fragments parsed strictly", () => {
  const data = new Map<string, string>();
  const mem = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
  const s = keyStore(() => mem);
  assert.equal(s.writable(), true);
  assert.equal(s.set("abcdefghij", KEY), true);
  assert.equal(s.get("abcdefghij"), KEY);
  assert.equal(s.get("zzzzzzzzzz"), null);
  assert.equal(s.set("bad id", KEY), false);
  assert.equal(s.set("abcdefghij", "not a key"), false);
  data.set("dndpaste.keys", "{broken");
  assert.equal(s.get("abcdefghij"), null, "a broken store reads as empty");
  const blocked = keyStore(() => { throw new Error("SecurityError"); });
  assert.equal(blocked.writable(), false);
  assert.equal(blocked.set("abcdefghij", KEY), false);
  assert.equal(blocked.get("abcdefghij"), null);
  assert.equal(keyFromHash(`#k=${KEY}`, "k"), KEY);
  assert.equal(keyFromHash(`#new=${KEY}`, "new"), KEY);
  for (const h of ["", "#k=", `#k=${KEY}x`, `#k=${KEY}&x=1`, `#new=${KEY}`]) assert.equal(keyFromHash(h, "k"), null, h);
});

// ─── the edit route ─────────────────────────────────────────────────────────

test("edit with the key: revision 2 at the link, revision 1 kept at /<id>/1; created and the key hash carried over", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const res = await editJson(env, id, { title: "Vice, fixed", author: "ash", paste: SHIGEN, key: KEY, base: "1" });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { id, url: `https://dndpaste.test/${id}`, revision: 2 });

  assert.equal(await text(env, `/${id}/raw`), SHIGEN);
  assert.equal(await text(env, `/${id}/1/raw`), VICE);
  assert.equal(await text(env, `/${id}/2/raw`), SHIGEN);
  const j = await (await call(env, "GET", `/${id}/json`)).json() as Record<string, unknown>;
  assert.deepEqual({ ...j, paste: "…" }, { title: "Vice, fixed", author: "ash", paste: "…", created: "2026-11-16T10:00:00.000Z", edited: "2026-11-17T09:30:00.000Z", revision: 2 });
  const j1 = await (await call(env, "GET", `/${id}/1/json`)).json() as Record<string, unknown>;
  assert.deepEqual({ ...j1, paste: "…" }, { title: "Vice", author: "ash", paste: "…", created: "2026-11-16T10:00:00.000Z", edited: null, revision: 1 });

  const head = JSON.parse(env.PASTES.map.get(`p:${id}`)!);
  assert.equal(head.n, 2);
  assert.equal(head.k, await hashKey(KEY));
  const frozen = JSON.parse(env.PASTES.map.get(`p:${id}:1`)!);
  assert.equal(frozen.k, undefined, "the frozen copy carries no key hash");
  assert.equal(frozen.paste, VICE);
  assert.ok(frozen.r && head.r, "both revisions rendered at save");

  const view = await text(env, `/${id}`);
  assert.ok(view.includes("edited <time datetime=\"2026-11-17T09:30:00.000Z\">17 Nov 2026</time>"), "Edited <date> on the view");
  assert.ok(view.includes(`data-id="${id}"><span`), "the latest has no data-rev, so it offers Edit");
  const pinned = await text(env, `/${id}/1`);
  assert.ok(pinned.includes(`data-rev="1"`));
  assert.ok(pinned.includes("This is revision 1 of the build, kept as it was."));
  assert.ok(pinned.includes(`<link rel="canonical" href="https://dndpaste.test/${id}/1">`));
  assert.ok(pinned.includes(`href="/?from=${id}/1"`), "Duplicate and edit copies the revision shown");
  assert.ok(pinned.includes("revision 1 · <time"));
});

test("edit: no key, a wrong key or a malformed key is refused and writes nothing", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const before = new Map(env.PASTES.map);
  const cases: [Record<string, string>, RegExp][] = [
    [{ paste: SHIGEN }, /no edit key/],
    [{ paste: SHIGEN, key: "" }, /no edit key/],
    [{ paste: SHIGEN, key: newEditKey() }, /doesn't open/],
    [{ paste: SHIGEN, key: "<script>alert(1)</script>" }, /doesn't open/],
    [{ paste: SHIGEN, key: "x".repeat(10_000) }, /doesn't open/],
  ];
  for (const [data, msg] of cases) {
    const r = await editJson(env, id, data);
    assert.equal(r.status, 403, JSON.stringify(data).slice(0, 60));
    assert.match((await r.json() as { error: string }).error, msg);
  }
  const f = await call(env, "POST", `/${id}/edit`, form({ paste: SHIGEN, key: "nope" }));
  assert.equal(f.status, 403);
  assert.ok((await f.text()).includes("doesn&#39;t open"), "the no-JS refusal is the form again, with the message");
  assert.deepEqual(env.PASTES.map, before);
  assert.equal(NO_KEY.includes("Duplicate and edit"), true);
});

test("edit: a share saved without JS has no key and can't be edited; one with a key needs it on every edit", async () => {
  const env = makeEnv();
  const res = await call(env, "POST", "/", form({ paste: VICE }));
  const id = res.headers.get("Location")!.slice(1);
  assert.equal(JSON.parse(env.PASTES.map.get(`p:${id}`)!).k, undefined);
  const r = await editJson(env, id, { paste: SHIGEN, key: KEY });
  assert.equal(r.status, 403);
  assert.match((await r.json() as { error: string }).error, /no edit key, so it can't be edited/);
});

test("edit: the form page is the paste form, filled with the latest, saving to the same id; never cached", async () => {
  const env = makeEnv();
  const id = await saveJson(env, { title: `<b>"Vice"</b>`, author: "ash", paste: VICE });
  const r = await call(env, "GET", `/${id}/edit`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  const page = await r.text();
  assert.ok(page.includes(`action="/${id}/edit" data-edit="${id}"`));
  assert.ok(page.includes(`<input type="hidden" name="base" value="1">`));
  assert.ok(page.includes("Save changes"));
  assert.ok(page.includes("Saving adds revision 2"));
  assert.ok(page.includes("&lt;b&gt;&quot;Vice&quot;&lt;/b&gt;"), "the title is escaped in the note and the field");
  assert.ok(!page.includes(`<b>"Vice"</b>`));
  assert.ok(page.includes("Editing needs JavaScript"), "a no-JS visitor learns why it won't save");
  assert.equal((await call(env, "GET", `/ZZZZZZZZZZ/edit`)).status, 404);
  assert.equal((await call(env, "PUT", `/${id}/edit`)).status, 405);
  assert.equal(formPage().includes("data-edit"), false, "the new-paste form is unchanged");
});

test("edit: the same checks as a save (empty, 32 KB, title, errors, D95), before anything is written", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const before = new Map(env.PASTES.map);
  const big = "Species: Elf\n" + "X-Note: " + "a".repeat(LIMITS.pasteBytes);
  const cases: [Record<string, string>, number][] = [
    [{ paste: "   " }, 400],
    [{ paste: big }, 413],
    [{ paste: VICE, title: "t".repeat(LIMITS.title + 1) }, 400],
    [{ paste: "Vice\nSpecies Elf\nNope: x\n" }, 422],
    [{ paste: "Just a name" }, 422],
  ];
  for (const [data, status] of cases) {
    const r = await editJson(env, id, { ...data, key: KEY });
    assert.equal(r.status, status, JSON.stringify(data).slice(0, 50));
  }
  const env413 = await call(env, "POST", `/${id}/edit`, { body: "x".repeat(LIMITS.bodyBytes + 1), type: "application/json" });
  assert.equal(env413.status, 413);
  assert.deepEqual(env.PASTES.map, before);
});

test("edit: a hostile title and paste are escaped on the view, like a save", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const evil = `<img src=x onerror=alert(1)>"'`;
  assert.equal((await editJson(env, id, { title: evil, author: evil, paste: `${evil}\nSpecies: Elf|<script>\n`, key: KEY })).status, 201);
  const view = await text(env, `/${id}`);
  assert.ok(!view.includes("<img src=x"));
  assert.ok(!view.includes("<script>"));
  assert.ok(view.includes("&lt;img src=x onerror=alert(1)&gt;"));
});

test("edit: a form opened on an older revision is refused (409); an unchanged build writes nothing", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  assert.equal((await editJson(env, id, { title: "Vice", author: "ash", paste: SHIGEN, key: KEY, base: "1" })).status, 201);
  const stale = await editJson(env, id, { title: "Vice", author: "ash", paste: VICE + "\n", key: KEY, base: "1" });
  assert.equal(stale.status, 409);
  assert.match((await stale.json() as { error: string }).error, /changed since you opened it/);
  assert.equal((await editJson(env, id, { title: "Vice", author: "ash", paste: VICE, key: KEY, base: "x1" })).status, 409);
  const before = new Map(env.PASTES.map);
  const same = await editJson(env, id, { title: "Vice", author: "ash", paste: SHIGEN, key: KEY, base: "2" });
  assert.equal(same.status, 200);
  assert.equal((await same.json() as { revision: number }).revision, 2);
  assert.deepEqual(env.PASTES.map, before);
});

test("edit: the no-JS form path (with a key) lands on the share with a 303", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const r = await call(env, "POST", `/${id}/edit`, form({ paste: SHIGEN, key: KEY }), { now: T1 });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("Location"), `/${id}`);
});

// ─── limits ─────────────────────────────────────────────────────────────────

test("limits: an edit counts as a save for the per-minute limit and the daily cap", async () => {
  const env = makeEnv({ SAVE_LIMITER: new CountingLimiter(2) });
  const id = await saveJson(env);
  assert.equal((await editJson(env, id, { paste: SHIGEN, key: KEY })).status, 201);
  const r = await editJson(env, id, { paste: VICE, key: KEY });
  assert.equal(r.status, 429);
  assert.match((await r.json() as { error: string }).error, /Too many saves/);

  const caps = new MemoryCapNamespace();
  const env2 = makeEnv({ DAILY_CAP: caps });
  const id2 = await saveJson(env2);
  for (let i = 1; i < LIMITS.savesPerDay; i++) {
    assert.equal((await editJson(env2, id2, { paste: `${VICE}\nX-Note: ${i}\n`, key: KEY }, T0)).status, 201, `edit ${i}`);
  }
  const capped = await editJson(env2, id2, { paste: SHIGEN, key: KEY }, T0);
  assert.equal(capped.status, 429);
  assert.match((await capped.json() as { error: string }).error, /a lot of builds today/);
  assert.equal(JSON.parse(env2.PASTES.map.get(`p:${id2}`)!).n, LIMITS.savesPerDay, "49 edits after the save: revision 50");
});

test("limits: wrong keys don't spend the daily cap", async () => {
  const caps = new MemoryCapNamespace();
  const env = makeEnv({ DAILY_CAP: caps });
  const id = await saveJson(env);
  for (let i = 0; i < 60; i++) assert.equal((await editJson(env, id, { paste: SHIGEN, key: newEditKey() })).status, 403);
  assert.equal((await editJson(env, id, { paste: SHIGEN, key: KEY })).status, 201);
});

test("limits: an edit from another site is refused (403) before the key is read", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const hostile: Record<string, string>[] = [{ "Sec-Fetch-Site": "cross-site" }, { Origin: "https://evil.example" }];
  for (const h of hostile) {
    const r = await call(env, "POST", `/${id}/edit`, { ...asJson({ paste: SHIGEN, key: KEY }), headers: h });
    assert.equal(r.status, 403);
  }
  assert.equal(JSON.parse(env.PASTES.map.get(`p:${id}`)!).n, undefined);
});

class FailAfter extends MemoryKV {
  left: number;
  constructor(map: Map<string, string>, left: number) { super(); this.map = map; this.left = left; }
  override async put(k: string, v: string): Promise<void> {
    if (this.left-- <= 0) throw new Error("KV put() limit exceeded for the day.");
    return super.put(k, v);
  }
}

test("limits: a failed KV write is a 503 that keeps the text, and the share stays on its revision", async () => {
  for (const left of [0, 1]) {
    const env = makeEnv();
    const id = await saveJson(env);
    env.PASTES = new FailAfter(env.PASTES.map, left);
    const r = await call(env, "POST", `/${id}/edit`, form({ title: "Kept", paste: SHIGEN, key: KEY }), { now: T1 });
    assert.equal(r.status, 503, `fails after ${left} writes`);
    const page = await r.text();
    assert.ok(page.includes(">Kept</textarea>"));
    assert.equal(await text(env, `/${id}/raw`), VICE, "the latest is still revision 1");
    assert.equal((await call(env, "GET", `/${id}/2`)).status, 404);
    // When the frozen copy landed and the head did not, revision 1 reads the same from both.
    assert.equal(await text(env, `/${id}/1/raw`), VICE);
  }
});

// ─── revision routes ────────────────────────────────────────────────────────

test("revisions: each URL is fixed forever; the link follows the latest", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  const texts = [VICE, SHIGEN, `${VICE}\nX-Note: third\n`];
  for (const t of texts.slice(1)) assert.equal((await editJson(env, id, { paste: t, key: KEY })).status, 201);
  for (const [i, t] of texts.entries()) {
    assert.equal(await text(env, `/${id}/${i + 1}/raw`), t);
    assert.equal((await call(env, "GET", `/${id}/${i + 1}`)).status, 200);
  }
  assert.equal(await text(env, `/${id}/raw`), texts[2]);
  const snap = await Promise.all([1, 2, 3].map((n) => text(env, `/${id}/${n}/json`)));
  assert.equal((await editJson(env, id, { paste: VICE + "\nX-Note: fourth\n", key: KEY })).status, 201);
  assert.deepEqual(await Promise.all([1, 2, 3].map((n) => text(env, `/${id}/${n}/json`))), snap, "earlier revisions did not move");
});

test("revisions: numbers past the latest, zero, leading zeros, seven digits and sub-routes on a revision are 404", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  for (const p of [`/${id}/2`, `/${id}/2/raw`, `/${id}/0`, `/${id}/01`, `/${id}/1234567`, `/${id}/1/edit`, `/${id}/-1`, `/${id}/1/1`, `/ZZZZZZZZZZ/1`]) {
    const r = await call(env, "GET", p);
    assert.equal(r.status, 404, p);
    assert.equal(r.headers.get("Cache-Control"), "no-store", p);
  }
  assert.equal((await call(env, "POST", `/${id}/1/report`, form({ reason: "x" }))).status, 404);
  assert.equal((await call(env, "POST", `/${id}/1/edit`, asJson({ paste: VICE, key: KEY }))).status, 404);
  assert.equal((await call(env, "GET", `/${id}/1`)).status, 200, "revision 1 of a share never edited is the head");
});

test("cache: the latest for 5 minutes; a revision's data for a year, its page for a day; CORS and types on every new route", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  await editJson(env, id, { paste: SHIGEN, key: KEY });
  const want: [string, string, string][] = [
    [`/${id}`, "public, max-age=300", "text/html; charset=utf-8"],
    [`/${id}/raw`, "public, max-age=300", "text/plain; charset=utf-8"],
    [`/${id}/canon`, "public, max-age=300", "text/plain; charset=utf-8"],
    [`/${id}/json`, "public, max-age=300", "application/json; charset=utf-8"],
    [`/${id}/1`, "public, max-age=86400", "text/html; charset=utf-8"],
    [`/${id}/2`, "public, max-age=86400", "text/html; charset=utf-8"],
    [`/${id}/1/raw`, "public, max-age=31536000, immutable", "text/plain; charset=utf-8"],
    [`/${id}/1/canon`, "public, max-age=31536000, immutable", "text/plain; charset=utf-8"],
    [`/${id}/2/json`, "public, max-age=31536000, immutable", "application/json; charset=utf-8"],
  ];
  for (const [p, cache, type] of want) {
    const r = await call(env, "GET", p);
    assert.equal(r.headers.get("Cache-Control"), cache, p);
    assert.equal(r.headers.get("Content-Type"), type, p);
    assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff", p);
    if (p.split("/").length > 2 && !/\/\d$/.test(p)) assert.equal(r.headers.get("Access-Control-Allow-Origin"), "*", p);
  }
  const opt = await call(env, "OPTIONS", `/${id}/1/raw`);
  assert.equal(opt.status, 204);
  assert.equal(opt.headers.get("Access-Control-Allow-Origin"), "*");
  const missing = await call(env, "GET", `/${id}/9/json`);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal((await call(env, "GET", `/${id}?reported=1`)).headers.get("Cache-Control"), "no-store");
});

// ─── legacy and the rest ────────────────────────────────────────────────────

test("legacy: a record from before D97 is revision 1, readable at /<id>/1, and has no key to edit with", async () => {
  const env = makeEnv();
  const id = "Legacy0001";
  env.PASTES.map.set(`p:${id}`, JSON.stringify({ v: 1, title: "Old", author: "", paste: VICE, created: "2026-11-15T10:00:00.000Z" }));
  assert.equal(await text(env, `/${id}/1/raw`), VICE);
  const j = await (await call(env, "GET", `/${id}/json`)).json() as Record<string, unknown>;
  assert.equal(j.revision, 1);
  assert.equal(j.edited, null);
  assert.equal((await call(env, "GET", `/${id}/2`)).status, 404);
  assert.ok(!(await text(env, `/${id}`)).includes("edited"));
  assert.equal((await editJson(env, id, { paste: SHIGEN, key: KEY })).status, 403);
  const got = await getRevision(env.PASTES, id, 1);
  assert.equal(got?.rec.paste, VICE);
});

test("duplicate: ?from=<id>/<n> fills the form with revision n; a bad revision starts empty", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  await editJson(env, id, { paste: SHIGEN, key: KEY });
  const one = await text(env, `/?from=${id}/1`);
  assert.ok(one.includes(VICE.split("\n")[0]));
  assert.ok(!one.includes("There is no build"));
  for (const bad of [`${id}/3`, `${id}/0`, `${id}/1/2`, `${id}/x`]) assert.ok((await text(env, `/?from=${encodeURIComponent(bad)}`)).includes("There is no build"), bad);
});

test("report: on a revision page it records the revision and lands back there", async () => {
  const env = makeEnv();
  const id = await saveJson(env);
  await editJson(env, id, { paste: SHIGEN, key: KEY });
  const page = await text(env, `/${id}/1`);
  assert.ok(page.includes(`<input type="hidden" name="rev" value="1">`));
  const r = await call(env, "POST", `/${id}/report`, form({ reason: "spam", rev: "1" }), { reportNonce: () => "n1" });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("Location"), `/${id}/1?reported=1`);
  const rep = [...env.PASTES.map.entries()].find(([k]) => k.startsWith("r:"))!;
  assert.equal(JSON.parse(rep[1]).revision, 1);
  const latest = await call(env, "POST", `/${id}/report`, form({ reason: "spam", rev: "<x>" }), { reportNonce: () => "n2" });
  assert.equal(latest.headers.get("Location"), `/${id}?reported=1`, "a bad rev reports the latest");
});

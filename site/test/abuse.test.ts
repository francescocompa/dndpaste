/** T3.3 pre-deploy review: KV write failures, daily cap, cross-site POSTs, IPv6 keys, config, title hygiene, report keys. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalOrigin, oneLine, rateKey } from "../src/app.ts";
import { DailyCap } from "../src/daily.ts";
import { LIMITS } from "../src/store.ts";
import { CountingLimiter, FIXTURES, MemoryCapNamespace, MemoryKV, ORIGIN, asJson, call, form, makeEnv } from "./helpers.ts";

const VICE = FIXTURES.find(([n]) => n === "vice.dndpaste")![1];

/** A KV whose puts fail, as Workers KV does once the free plan's daily writes are spent. */
class FullKV extends MemoryKV {
  override async put(): Promise<void> { throw new Error("KV put() limit exceeded for the day."); }
}

// ─── #1 KV write exhaustion ─────────────────────────────────────────────────

test("save: a failed KV put is a 503 with the site's page, the text kept in the form", async () => {
  const env = makeEnv({ PASTES: new FullKV() });
  const res = await call(env, "POST", "/", form({ title: "Kept", paste: VICE }));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Retry-After"), "3600");
  const page = await res.text();
  assert.ok(page.includes("Try again in an hour."));
  assert.ok(page.includes(">Kept</textarea>"), "title kept");
  assert.ok(page.includes("Spellfire") || page.includes(VICE.split("\n")[0]), "paste kept");
  const j = await call(env, "POST", "/", asJson({ paste: VICE }));
  assert.equal(j.status, 503);
  assert.match((await j.json() as { error: string }).error, /Try again/);
});

test("report: a failed KV put is a 503 with the report form reopened", async () => {
  const env = makeEnv();
  const id = (await (await call(env, "POST", "/", asJson({ paste: VICE }))).json() as { id: string }).id;
  const full = new FullKV();
  full.map = env.PASTES.map;
  env.PASTES = full;
  const res = await call(env, "POST", `/${id}/report`, form({ reason: "spam" }));
  assert.equal(res.status, 503);
  const page = await res.text();
  assert.ok(page.includes(`<details class="report" open>`) && page.includes(">spam</textarea>"));
  assert.equal((await call(env, "POST", `/${id}/report`, asJson({ reason: "spam" }))).status, 503);
});

test("any thrown error (a KV read over quota) is a 503 page, not Cloudflare's 1101", async () => {
  const env = makeEnv();
  env.PASTES.get = async () => { throw new Error("KV get() limit exceeded"); };
  const res = await call(env, "GET", "/ABCDEFGHIJ");
  assert.equal(res.status, 503);
  assert.ok((await res.text()).includes("<h1>Try again later</h1>"));
});

// ─── #1 daily cap per rate key ──────────────────────────────────────────────

test("daily cap: saves stop at the day's limit per IP, other IPs and the next day go on", async () => {
  const caps = new MemoryCapNamespace();
  const env = makeEnv({ DAILY_CAP: caps });
  const day1 = () => new Date("2026-11-16T09:00:00Z");
  const ip = (a: string) => ({ ...asJson({ paste: VICE }), headers: { "CF-Connecting-IP": a } });
  for (let i = 0; i < LIMITS.savesPerDay; i++) assert.equal((await call(env, "POST", "/", ip("203.0.113.7"), { now: day1 })).status, 201);
  const over = await call(env, "POST", "/", ip("203.0.113.7"), { now: day1 });
  assert.equal(over.status, 429);
  assert.match((await over.json() as { error: string }).error, /tomorrow/);
  assert.equal((await call(env, "POST", "/", ip("203.0.113.8"), { now: day1 })).status, 201);
  assert.equal((await call(env, "POST", "/", ip("203.0.113.7"), { now: () => new Date("2026-11-17T00:00:01Z") })).status, 201);
  assert.equal([...env.PASTES.map.keys()].length, LIMITS.savesPerDay + 2);
});

test("daily cap: reports have their own limit; refusals by the minute limiter don't count", async () => {
  const caps = new MemoryCapNamespace();
  const env = makeEnv({ DAILY_CAP: caps, SAVE_LIMITER: new CountingLimiter(0) });
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE }))).status, 429);
  assert.equal(caps.objects.size, 0, "a per-minute refusal never reaches the daily counter");
  env.SAVE_LIMITER = undefined;
  const id = (await (await call(env, "POST", "/", asJson({ paste: VICE }))).json() as { id: string }).id;
  for (let i = 0; i < LIMITS.reportsPerDay; i++) assert.equal((await call(env, "POST", `/${id}/report`, asJson({ reason: "r" }))).status, 201);
  assert.equal((await call(env, "POST", `/${id}/report`, asJson({ reason: "r" }))).status, 429);
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE }))).status, 201, "saves are counted apart");
});

test("daily cap: fails open when the Durable Object errors", async () => {
  const env = makeEnv({ DAILY_CAP: { idFromName: () => "x", get: () => ({ fetch: async () => { throw new Error("DO down"); } }) } });
  assert.equal((await call(env, "POST", "/", asJson({ paste: VICE }))).status, 201);
});

test("DailyCap: counts per day, keeps no address, and its alarm deletes a finished day", async () => {
  const data = new Map<string, unknown>();
  let alarm = 0;
  const cap = new DailyCap({ storage: {
    async get<T>(k: string) { return data.get(k) as T | undefined; },
    async put(k: string, v: unknown) { data.set(k, v); },
    async deleteAll() { data.clear(); },
    async setAlarm(t: number) { alarm = t; },
  } });
  assert.equal(await cap.hit("2026-11-16", 2), true);
  assert.equal(await cap.hit("2026-11-16", 2), true);
  assert.equal(await cap.hit("2026-11-16", 2), false);
  assert.deepEqual([...data.values()], [{ day: "2026-11-16", n: 2 }]);
  assert.equal(alarm, Date.parse("2026-11-17T01:00:00Z"));
  assert.equal((await cap.fetch(new Request("https://x/?limit=x&day=2026-11-16"))).status, 400);
  await cap.hit("2999-01-01", 2);
  await cap.alarm(); // a day still running is kept
  assert.equal(data.size, 1);
  await cap.hit("2000-01-01", 2);
  await cap.alarm(); // a finished day is deleted
  assert.equal(data.size, 0);
});

// ─── #2 cross-site POSTs ────────────────────────────────────────────────────

test("cross-site: POSTs a browser marks cross-site, or from another Origin, are refused before anything is read", async () => {
  const env = makeEnv();
  const cases: [Record<string, string>, number][] = [
    [{ "Sec-Fetch-Site": "cross-site" }, 403],
    [{ Origin: "https://evil.example" }, 403],
    [{ Origin: "null" }, 403],
    [{ Origin: "https://evil.example", "Sec-Fetch-Site": "same-origin" }, 403],
    [{ Origin: ORIGIN, "Sec-Fetch-Site": "same-origin" }, 201],
    [{ "Sec-Fetch-Site": "same-origin" }, 201],
    [{ "Sec-Fetch-Site": "none" }, 201],
    [{}, 201], // curl and scripts: no browser headers, limited per IP like anything else
  ];
  for (const [headers, want] of cases) {
    const r = await call(env, "POST", "/", { ...asJson({ paste: VICE }), headers });
    assert.equal(r.status, want, JSON.stringify(headers));
  }
  assert.equal([...env.PASTES.map.keys()].length, 4);
  const page = await call(env, "POST", "/", { ...form({ paste: VICE }), headers: { Origin: "https://evil.example" } });
  assert.equal(page.status, 403);
  assert.ok((await page.text()).includes("This form was sent from another site."));
});

test("cross-site: the canonical origin counts as ours; reports are covered too", async () => {
  const env = makeEnv();
  const id = (await (await call(env, "POST", "/", asJson({ paste: VICE }))).json() as { id: string }).id;
  assert.equal((await call(env, "POST", `/${id}/report`, { ...form({ reason: "x" }), headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal((await call(env, "POST", `/${id}/report`, { ...form({ reason: "x" }), headers: { Origin: ORIGIN } })).status, 303);
  assert.equal([...env.PASTES.map.keys()].filter((k) => k.startsWith("r:")).length, 1);
  env.CANONICAL_ORIGIN = ORIGIN;
  assert.equal((await call(env, "POST", "/", { ...asJson({ paste: VICE }), headers: { Origin: ORIGIN } })).status, 201);
});

// ─── #3 IPv6 keyed by /64 ───────────────────────────────────────────────────

test("rateKey: IPv4 as is; IPv6 by its /64 in every spelling; IPv4-mapped as IPv4", () => {
  assert.equal(rateKey("203.0.113.7"), "203.0.113.7");
  const k = "2001:db8:aa:1::/64";
  for (const a of ["2001:db8:aa:1::1", "2001:0db8:00aa:0001:ffff:ffff:ffff:ffff", "2001:DB8:AA:1:0:0:0:2", "2001:db8:aa:1::abcd:1%eth0", "2001:db8:aa:1::1.2.3.4"]) {
    assert.equal(rateKey(a), k, a);
  }
  assert.notEqual(rateKey("2001:db8:aa:2::1"), k);
  assert.equal(rateKey("::1"), "0:0:0:0::/64");
  assert.equal(rateKey("2001:db8::"), "2001:db8:0:0::/64");
  assert.equal(rateKey("::ffff:198.51.100.4"), "198.51.100.4");
  assert.equal(rateKey("0:0:0:0:0:ffff:198.51.100.4"), "198.51.100.4");
  assert.equal(rateKey("not an ip"), "not an ip");
});

test("rate limit: two addresses in one IPv6 /64 share the per-minute limit", async () => {
  const lim = new CountingLimiter(1);
  const env = makeEnv({ SAVE_LIMITER: lim });
  const ip = (a: string) => ({ ...asJson({ paste: VICE }), headers: { "CF-Connecting-IP": a } });
  assert.equal((await call(env, "POST", "/", ip("2001:db8:aa:1::1"))).status, 201);
  assert.equal((await call(env, "POST", "/", ip("2001:db8:aa:1:dead:beef:0:2"))).status, 429);
  assert.equal((await call(env, "POST", "/", ip("2001:db8:aa:2::1"))).status, 201);
  assert.deepEqual([...lim.seen.keys()], ["save:2001:db8:aa:1::/64", "save:2001:db8:aa:2::/64"]);
});

// ─── nits ───────────────────────────────────────────────────────────────────

test("CANONICAL_ORIGIN: an unparsable, non-https or path-bearing value fails loudly", async () => {
  for (const bad of ["dndpaste.example", "http://dndpaste.example", "https://dndpaste.example/x", "dndpaste.example:443"]) {
    assert.throws(() => canonicalOrigin(bad), /CANONICAL_ORIGIN/, bad);
    const r = await call(makeEnv({ CANONICAL_ORIGIN: bad }), "GET", "/");
    assert.equal(r.status, 500, bad);
    assert.match(await r.text(), /CANONICAL_ORIGIN/);
  }
  assert.equal(canonicalOrigin("https://dndpaste.example/"), "https://dndpaste.example");
  assert.equal(canonicalOrigin("http://localhost:8787"), "http://localhost:8787");
  assert.equal(canonicalOrigin(""), null);
});

test("oneLine: drops zero-width and bidi controls from titles and authors", async () => {
  assert.equal(oneLine("a​b‎‮c⁦d⁩﻿"), "abcd");
  assert.equal(oneLine(" x\ty\n "), "x y");
  const env = makeEnv();
  const id = (await (await call(env, "POST", "/", asJson({ title: "‮evil‬", author: "zw‍j", paste: VICE }))).json() as { id: string }).id;
  const j = await (await call(env, "GET", `/${id}/json`)).json() as { title: string; author: string };
  assert.equal(j.title, "evil");
  assert.equal(j.author, "zwj");
});

test("report keys: two reports on one id in the same millisecond both land", async () => {
  const env = makeEnv();
  const id = (await (await call(env, "POST", "/", asJson({ paste: VICE }))).json() as { id: string }).id;
  const now = () => new Date("2026-11-16T12:00:00Z");
  await call(env, "POST", `/${id}/report`, asJson({ reason: "one" }), { now });
  await call(env, "POST", `/${id}/report`, asJson({ reason: "two" }), { now });
  const keys = [...env.PASTES.map.keys()].filter((k) => k.startsWith("r:"));
  assert.equal(keys.length, 2);
  for (const k of keys) assert.match(k, new RegExp(`^r:2026-11-16T12:00:00\\.000Z:${id}:[0-9A-Za-z]{6}$`));
});

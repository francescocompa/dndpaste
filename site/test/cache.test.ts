/** The render kept at save (T3.3 #4): views and /canon read it; a renderer change re-renders on read. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { emit, parse } from "../../src/dndpaste.ts";
import { RENDER_VERSION, prerender } from "../src/pages.ts";
import { renderPaste } from "../src/render.ts";
import { FIXTURES, asJson, call, makeEnv } from "./helpers.ts";

const VICE = FIXTURES.find(([n]) => n === "vice.dndpaste")![1];

async function saved(env: ReturnType<typeof makeEnv>) {
  const id = (await (await call(env, "POST", "/", asJson({ paste: VICE }))).json() as { id: string }).id;
  return { id, key: `p:${id}`, rec: JSON.parse(env.PASTES.map.get(`p:${id}`)!) };
}

test("save keeps the view body and canon text in the same KV value, one write", async () => {
  const env = makeEnv();
  let puts = 0;
  const put = env.PASTES.put.bind(env.PASTES);
  env.PASTES.put = async (k, v) => { puts++; return put(k, v); };
  const { rec } = await saved(env);
  assert.equal(puts, 1);
  assert.equal(rec.r.v, RENDER_VERSION);
  assert.equal(rec.r.body, renderPaste(parse(VICE)));
  assert.equal(rec.r.canon, emit(parse(VICE)));
});

test("a current cache is served as is: the view and /canon don't re-render", async () => {
  const env = makeEnv();
  const { id, key, rec } = await saved(env);
  env.PASTES.map.set(key, JSON.stringify({ ...rec, r: { ...rec.r, body: "<p>CACHED-BODY</p>", canon: "CACHED-CANON\n" } }));
  assert.ok((await (await call(env, "GET", `/${id}`)).text()).includes("<p>CACHED-BODY</p>"));
  assert.equal(await (await call(env, "GET", `/${id}/canon`)).text(), "CACHED-CANON\n");
  const j = await (await call(env, "GET", `/${id}/json`)).json() as Record<string, unknown>;
  assert.deepEqual(Object.keys(j), ["title", "author", "paste", "created", "edited", "revision"], "the cache never leaks into /json");
});

test("a stale or missing cache re-renders on read from the paste", async () => {
  const env = makeEnv();
  const { id, key, rec } = await saved(env);
  const fresh = await (await call(env, "GET", `/${id}`)).text();
  for (const r of [{ ...rec.r, v: RENDER_VERSION - 1, body: "<p>STALE</p>", canon: "STALE\n" }, undefined, { v: RENDER_VERSION, body: 7 }]) {
    env.PASTES.map.set(key, JSON.stringify({ ...rec, r }));
    const page = await (await call(env, "GET", `/${id}`)).text();
    assert.ok(!page.includes("STALE"));
    assert.equal(page, fresh);
    assert.equal(await (await call(env, "GET", `/${id}/canon`)).text(), emit(parse(VICE)));
  }
});

/**
 * Locks RENDER_VERSION to the renderer's output. If this fails, the view body or canon text changed: bump
 * RENDER_VERSION in src/pages.ts (so saved shares re-render on read) and paste the new hash here.
 */
const LOCK = { version: 10, hash: "6d63bb7743891dce" };
test("RENDER_VERSION moves with the renderer's output over every fixture", () => {
  const h = createHash("sha256");
  for (const [name, text] of FIXTURES) {
    const { v: _v, ...out } = prerender(parse(text));
    h.update(name).update(JSON.stringify(out));
  }
  const hash = h.digest("hex").slice(0, 16);
  assert.deepEqual({ version: RENDER_VERSION, hash }, LOCK, "renderer output changed: bump RENDER_VERSION and update LOCK");
});

/** The build stamp and the update notice (D137–D140): GET /version, the page foot, the check, the draft hand-over. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { BUILD } from "../src/build.gen.ts";
import { fakeNewBuild } from "../src/devreview.ts";
import { draftKeeper, draftStore } from "../src/client/drafts.ts";
import {
  CHECK_GAP_MS, buildId, readBuild, stampText, toastHtml, updateChecker,
} from "../src/client/update.ts";
import type { Build } from "../src/client/update.ts";
// @ts-expect-error: a plain .mjs build script, no types
import { STAMP_FILE, stamp, stampSource, writeStamp } from "../scripts/stamp.mjs";
import { call, makeEnv } from "./helpers.ts";

const ROOT_VERSION = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;

// ─── the stamp ──────────────────────────────────────────────────────────────

test("stamp: the library version from the root package.json, a short commit (+ when site/ or src/ has changes), its date", () => {
  const s = stamp() as { version: string; commit: string; date: string };
  assert.equal(s.version, ROOT_VERSION);
  assert.match(s.commit, /^([0-9a-f]{7,}\+?|nogit)$/);
  assert.match(s.date, /^(\d{4}-\d{2}-\d{2})?$/);
  assert.equal(BUILD.version, ROOT_VERSION, "src/build.gen.ts is current (npm run build)");
});

test("stamp: build.gen.ts is rewritten only when its text changes (wrangler dev watches src/)", () => {
  writeStamp({ ...BUILD });
  const before = statSync(STAMP_FILE).mtimeMs;
  writeStamp({ ...BUILD });
  assert.equal(statSync(STAMP_FILE).mtimeMs, before);
  assert.equal(readFileSync(STAMP_FILE, "utf8"), stampSource({ ...BUILD }));
});

// ─── GET /version ───────────────────────────────────────────────────────────

test("/version: the deployed build as JSON, never cached", async () => {
  const res = await call(makeEnv(), "GET", "/version");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(await res.json(), { ...BUILD });
});

test("/version: HEAD answers without a body; other methods 405", async () => {
  const head = await call(makeEnv(), "HEAD", "/version");
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Cache-Control"), "no-store");
  assert.equal(await head.text(), "");
  const post = await call(makeEnv(), "POST", "/version", { headers: { "Sec-Fetch-Site": "same-origin" } });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET, HEAD");
});

test("/version: the dev fault answers another commit, only with UI_REVIEW and the cookie, only on /version", async () => {
  const req = (path: string, cookie?: string) => new Request(`http://127.0.0.1:8787${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  const dev = makeEnv({ UI_REVIEW: "http://127.0.0.1:4340" });
  assert.equal(fakeNewBuild(req("/version", "uir-fault=build"), makeEnv(), BUILD), null, "no UI_REVIEW: the real route");
  assert.equal(fakeNewBuild(req("/version"), dev, BUILD), null);
  assert.equal(fakeNewBuild(req("/about", "uir-fault=kv,build"), dev, BUILD), null);
  const res = fakeNewBuild(req("/version", "uir-fault=kv,build"), dev, BUILD)!;
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const b = await res.json() as Build;
  assert.equal(b.version, BUILD.version);
  assert.notEqual(buildId(b), buildId(BUILD));
});

// ─── the page foot (D137) ───────────────────────────────────────────────────

test("foot: every page carries the build stamp, muted, after main", async () => {
  const foot = `<footer class="foot"><span class="bld"`;
  for (const path of ["/", "/about", "/guide", "/codes", "/nope"]) {
    const body = await (await call(makeEnv(), "GET", path)).text();
    const at = body.indexOf(foot);
    assert.ok(at > body.indexOf("</main>"), path);
    assert.ok(body.includes(`>${stampText(BUILD)}</span></footer>`), path);
  }
  assert.equal(stampText({ version: "0.8.0", commit: "39e1cab" }), "v0.8.0", "the version only; the commit stays hidden");
});

// ─── the check (D138) ───────────────────────────────────────────────────────

const CURRENT: Build = { version: "0.8.0", commit: "aaaaaaa" };
function harness(answers: unknown[]) {
  let t = 1_000_000;
  let closed: string | null = null;
  const found: Build[] = [];
  let fetches = 0;
  const c = updateChecker({
    current: CURRENT,
    now: () => t,
    fetchBuild: async () => {
      fetches++;
      const a = answers.length > 1 ? answers.shift() : answers[0];
      if (a instanceof Error) throw a;
      return a;
    },
    onNew: (b) => found.push(b),
    dismissed: { get: () => closed, set: (id) => { closed = id; } },
  });
  return { c, found, fetches: () => fetches, tick: (ms: number) => { t += ms; } };
}

test("check: none in the first minute after load; then at most once a minute; force skips the gap", async () => {
  const h = harness([{ ...CURRENT }]);
  await h.c.check();
  assert.equal(h.fetches(), 0, "the page just loaded this build");
  h.tick(CHECK_GAP_MS);
  await h.c.check();
  await h.c.check();
  assert.equal(h.fetches(), 1);
  await h.c.check(true);
  assert.equal(h.fetches(), 2);
  assert.deepEqual(h.found, [], "same build: no notice");
});

test("check: a different deployed build shows the notice once; Close hides it for that build; a newer one shows again", async () => {
  const next = { version: "0.8.0", commit: "bbbbbbb", date: "2026-11-18" };
  const h = harness([next, next, next, { version: "0.9.0", commit: "ccccccc" }]);
  await h.c.check(true);
  assert.deepEqual(h.found, [{ version: "0.8.0", commit: "bbbbbbb" }]);
  assert.equal(h.c.showing, "0.8.0+bbbbbbb");
  await h.c.check(true);
  assert.equal(h.found.length, 1, "still showing: not again");
  h.c.dismiss();
  assert.equal(h.c.showing, null);
  await h.c.check(true);
  assert.equal(h.found.length, 1, "closed for this build");
  await h.c.check(true);
  assert.deepEqual(h.found.at(-1), { version: "0.9.0", commit: "ccccccc" });
});

test("check: offline, an error status or a junk body says nothing, and the next trigger tries again", async () => {
  const h = harness([new Error("offline"), null, "x", { version: "0.8.0" }, { version: 1, commit: "b" }, { version: "0.8.0", commit: "bbbbbbb" }]);
  for (let i = 0; i < 5; i++) await h.c.check(true);
  assert.deepEqual(h.found, []);
  await h.c.check(true);
  assert.equal(h.found.length, 1);
  assert.equal(readBuild({ version: "", commit: "x" }), null);
});

test("check: one request at a time", async () => {
  let release!: (v: unknown) => void;
  let fetches = 0;
  const c = updateChecker({ current: CURRENT, fetchBuild: () => { fetches++; return new Promise((r) => { release = r; }); }, onNew: () => {} });
  const first = c.check(true);
  await c.check(true);
  release({ ...CURRENT });
  await first;
  assert.equal(fetches, 1);
});

// ─── the toast (D138, D140) ─────────────────────────────────────────────────

test("toast: one dry line, Reload with an icon, a Close button with a label", () => {
  const form = toastHtml();
  assert.match(form, /^<span class="um">A new version of dndpaste is out\.<\/span>/);
  assert.match(form, /data-act="reload"><svg class="i i-rotate-cw"[^]*<\/svg>Reload<\/button>/);
  assert.match(form, /data-act="close" aria-label="Close"><svg class="i i-x"/);
  assert.ok(readFileSync(new URL("../public/assets/icons.svg", import.meta.url), "utf8").includes(`<symbol id="rotate-cw"`));
  assert.doesNotMatch(form, /[↻⟳✕×]/, "icons, never glyphs (D89)");
});

// ─── the draft over the reload (D139) ───────────────────────────────────────

const memStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
};
const EMPTY = { title: "", author: "", paste: "" };

test("hand-over: the text in the form is kept for the reloaded form to put back", () => {
  const s = memStorage();
  const st = draftStore(() => s);
  const k = draftKeeper(st, "new", EMPTY, null);
  assert.equal(k.handOver({ ...EMPTY, paste: "Vice\nSpecies: Elf" }), true);
  const back = draftKeeper(st, "new", EMPTY, null);
  assert.equal(back.offered?.paste, "Vice\nSpecies: Elf");
});

test("hand-over: newer typing replaces an offer still standing; nothing typed leaves the offer for its bar", () => {
  const s = memStorage();
  const st = draftStore(() => s);
  draftKeeper(st, "new", EMPTY, null).keep({ ...EMPTY, paste: "Old" });
  const idle = draftKeeper(st, "new", EMPTY, null);
  assert.ok(idle.offered);
  assert.equal(idle.handOver(EMPTY), false);
  assert.equal(st.get("new")?.paste, "Old", "the old draft stays for the bar");
  const typed = draftKeeper(st, "new", EMPTY, null);
  assert.equal(typed.handOver({ ...EMPTY, paste: "Newer" }), true);
  assert.equal(typed.offered, null);
  assert.equal(st.get("new")?.paste, "Newer");
});

test("hand-over: nothing after a save, and false where storage is blocked", () => {
  const s = memStorage();
  const st = draftStore(() => s);
  const k = draftKeeper(st, "edit:AbCdEfGhIj", EMPTY, 2);
  k.saved();
  assert.equal(k.handOver({ ...EMPTY, paste: "x" }), false);
  assert.equal(st.get("edit:AbCdEfGhIj"), null);
  const blocked = draftStore(() => { throw new Error("SecurityError"); });
  assert.equal(draftKeeper(blocked, "new", EMPTY, null).handOver({ ...EMPTY, paste: "x" }), false);
});

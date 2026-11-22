// D173: the Suggestions switch is remembered in this browser only; on unless turned off. DOM-free; the switch itself
// is clicked through in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gearPref, suggestPref } from "../src/client/prefs.ts";

test("D173: Suggestions is on by default, kept as dndpaste.suggest=off when turned off, read back on a later visit", () => {
  const data = new Map<string, string>();
  const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
  const p = suggestPref(() => s);
  assert.equal(p.get(), true);
  p.set(false);
  assert.equal(data.get("dndpaste.suggest"), "off");
  assert.equal(suggestPref(() => s).get(), false, "a later visit");
  p.set(true);
  assert.equal(data.has("dndpaste.suggest"), false);
  assert.equal(p.get(), true);
});

test("D173: blocked storage never throws; the choice lives in memory for the visit", () => {
  const p = suggestPref(() => { throw new Error("blocked"); });
  assert.equal(p.get(), true);
  p.set(false);
  assert.equal(p.get(), false);
  assert.equal(suggestPref(() => null).get(), true);
});

test("D362: the Gear list's half is Mundane by default, kept as dndpaste.gear=magic, and survives blocked storage", () => {
  const data = new Map<string, string>();
  const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
  const p = gearPref(() => s);
  assert.equal(p.get(), "mundane");
  p.set("magic");
  assert.equal(data.get("dndpaste.gear"), "magic");
  assert.equal(gearPref(() => s).get(), "magic", "a later visit");
  p.set("mundane");
  assert.equal(data.has("dndpaste.gear"), false);
  const blocked = gearPref(() => { throw new Error("blocked"); });
  assert.equal(blocked.get(), "mundane");
  blocked.set("magic");
  assert.equal(blocked.get(), "magic", "in memory for the visit");
});

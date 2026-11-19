// D150: the form remembers the author you last saved with, in this browser only, and fills a new build's Author
// field with it. DOM-free; the form wiring (src/client/form.ts) is clicked through in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { authorStore, openingAuthor } from "../src/client/author.ts";
import { draftKeeper, draftStore } from "../src/client/drafts.ts";
import { LIMITS } from "../src/store.ts";

const memStorage = () => {
  const data = new Map<string, string>();
  const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } } as unknown as Storage;
  return { s, data };
};

test("D150: the last saved author is kept under dndpaste.author, trimmed and capped; an empty one forgets it", () => {
  const { s, data } = memStorage();
  const a = authorStore(() => s);
  assert.equal(a.get(), "");
  a.set("  Vex   the  Bold ");
  assert.equal(data.get("dndpaste.author"), "Vex the Bold");
  assert.equal(authorStore(() => s).get(), "Vex the Bold", "a later visit reads it back");
  a.set("x".repeat(LIMITS.author + 20));
  assert.equal(a.get().length, LIMITS.author);
  a.set("   ");
  assert.equal(data.has("dndpaste.author"), false);
  assert.equal(a.get(), "");
});

test("D150: blocked, full or missing storage never throws; the author lives in memory for the visit", () => {
  const blocked = authorStore(() => { throw new DOMException("denied", "SecurityError"); });
  assert.equal(blocked.get(), "");
  assert.doesNotThrow(() => blocked.set("Vex"));
  assert.equal(blocked.get(), "Vex");
  const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => {} } as unknown as Storage;
  const f = authorStore(() => full);
  f.set("Vex");
  assert.equal(f.get(), "Vex");
  const none = authorStore(() => null);
  none.set("Vex");
  assert.equal(none.get(), "Vex");
  const throwsOnRead = { getItem: () => { throw new Error("broken"); } } as unknown as Storage;
  assert.equal(authorStore(() => throwsOnRead).get(), "");
});

test("D150: a new, empty form opens with the remembered author; an edit or a prefilled form keeps its own", () => {
  assert.equal(openingAuthor("", false, "Vex"), "Vex", "a new build");
  assert.equal(openingAuthor("", false, ""), "", "nothing remembered");
  assert.equal(openingAuthor("Mira", false, "Vex"), "Mira", "Duplicate and edit, or a failed save, keeps the form's author");
  assert.equal(openingAuthor("Mira", true, "Vex"), "Mira", "an edit keeps the share's author");
  assert.equal(openingAuthor("", true, "Vex"), "", "an edit of an anonymous share stays anonymous");
});

test("D150: the fill alone is never a draft, and a restored draft keeps its own author (D102)", () => {
  const { s } = memStorage();
  const store = draftStore(() => s);
  const loaded = { title: "", author: openingAuthor("", false, "Vex"), paste: "" };
  const k = draftKeeper(store, "new", loaded, null);
  k.keep(loaded);
  assert.equal(store.get("new"), null, "the filled author on an empty form leaves no draft");

  store.set("new", { title: "", author: "", paste: "Name: A\n", rev: null, saved: "2026-11-19T10:00:00.000Z" });
  const next = draftKeeper(store, "new", loaded, null);
  assert.ok(next.offered);
  assert.equal(next.restore()?.author, "", "the draft's own (empty) author, not the remembered one");
});

test("D150: SITE.md lists the key with what this browser keeps", () => {
  const site = readFileSync(new URL("../../SITE.md", import.meta.url), "utf8");
  assert.match(site, /What this browser keeps[\s\S]*`dndpaste\.author`/);
});

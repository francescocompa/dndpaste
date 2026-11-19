// Display settings (D82): theme and the two colour switches, saved in this browser, working with storage blocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDisplay, DEFAULT_DISPLAY, displayMenuHtml, displayStore } from "../src/client/display.ts";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k),
    clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; },
  };
}

test("display: defaults to Auto with both colour switches on", () => {
  assert.deepEqual(displayStore(() => memStorage()).get(), { theme: "auto", kind: true, abilities: true });
  assert.deepEqual(DEFAULT_DISPLAY, { theme: "auto", kind: true, abilities: true });
});

test("display: saves and reads back; ignores junk and unknown values", () => {
  const s = memStorage();
  const st = displayStore(() => s);
  st.set({ theme: "dark", kind: false, abilities: true });
  assert.deepEqual(displayStore(() => s).get(), { theme: "dark", kind: false, abilities: true });
  assert.equal(st.persistent(), true);
  s.setItem("dndpaste.display", "{not json");
  assert.deepEqual(st.get(), DEFAULT_DISPLAY);
  s.setItem("dndpaste.display", JSON.stringify({ theme: "<script>", kind: "yes", abilities: false }));
  assert.deepEqual(st.get(), { theme: "auto", kind: true, abilities: false });
});

test("display: storage blocked or full keeps the settings for the visit", () => {
  const blocked = displayStore(() => { throw new Error("SecurityError"); });
  assert.deepEqual(blocked.get(), DEFAULT_DISPLAY);
  blocked.set({ theme: "light", kind: true, abilities: false });
  assert.deepEqual(blocked.get(), { theme: "light", kind: true, abilities: false });
  assert.equal(blocked.persistent(), false);
  assert.ok(displayMenuHtml(blocked.get(), blocked.persistent()).includes("last for this visit only"));
  const full = memStorage();
  full.setItem = () => { throw new Error("QuotaExceededError"); };
  const f = displayStore(() => full);
  f.set({ theme: "dark", kind: false, abilities: false });
  assert.deepEqual(f.get(), { theme: "dark", kind: false, abilities: false });
});

test("display: apply sets data-theme (none for Auto) and the .ck / .ca switches", () => {
  const attrs = new Map<string, string>();
  const cls = new Set<string>(["ck", "ca"]);
  const root = {
    classList: { toggle: (c: string, on: boolean) => (on ? cls.add(c) : cls.delete(c)) },
    setAttribute: (n: string, v: string) => void attrs.set(n, v), removeAttribute: (n: string) => void attrs.delete(n),
  };
  applyDisplay(root, { theme: "dark", kind: false, abilities: true });
  assert.equal(attrs.get("data-theme"), "dark");
  assert.deepEqual([...cls], ["ca"]);
  applyDisplay(root, { theme: "auto", kind: true, abilities: false });
  assert.equal(attrs.has("data-theme"), false);
  assert.deepEqual([...cls], ["ck"]);
});

test("display: the menu marks the current theme and switches (frame view-display-desk)", () => {
  const html = displayMenuHtml({ theme: "light", kind: true, abilities: false });
  assert.match(html, /<button type="button" role="radio" aria-checked="true" data-theme-set="light" class="on"><svg class="i i-sun"[^>]*>.*?<\/svg>Light<\/button>/);
  assert.match(html, /role="radio" aria-checked="false" data-theme-set="dark"><svg class="i i-moon"[^>]*>.*?<\/svg>Dark<\/button>/);
  assert.match(html, /role="radio" aria-checked="false" data-theme-set="auto"><svg class="i i-contrast"[^>]*>.*?<\/svg>Auto<\/button>/);
  assert.ok(html.includes(`role="switch" aria-checked="true" data-switch="kind"><span class="swl">Colour by kind</span><span class="tog on"`));
  assert.ok(html.includes(`role="switch" aria-checked="false" data-switch="abilities"><span class="swl">Colour abilities</span><span class="tog"`));
  assert.ok(html.includes("Class, subclass, species, background, feat, spell, item"));
  assert.equal((html.match(/<i class="sw-/g) ?? []).length, 7);
  assert.ok(!html.includes("Saved in this browser."), "round 2: no saved line while storage works");
  assert.ok(!/style=/.test(html), "no inline styles (CSP)");
});

test("D173 (review): the menu is Settings and carries the editor's Suggestions switch, after the display settings", () => {
  const on = displayMenuHtml({ theme: "auto", kind: true, abilities: true });
  assert.ok(on.startsWith(`<div class="h" id="dmenu-h">Settings</div>`));
  assert.ok(on.includes(`<hr><button type="button" class="sw" role="switch" aria-checked="true" data-switch="suggest"><span class="swl">Suggestions</span><span class="tog on"`));
  assert.ok(on.indexOf('data-switch="suggest"') > on.indexOf('data-switch="abilities"'));
  const off = displayMenuHtml({ theme: "auto", kind: true, abilities: true }, true, false);
  assert.ok(off.includes(`aria-checked="false" data-switch="suggest"><span class="swl">Suggestions</span><span class="tog"`));
});

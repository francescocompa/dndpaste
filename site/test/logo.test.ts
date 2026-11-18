// The temp logo (2026-11-18): in the header of every page, inline in currentColor, and the favicon as a static asset.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOGO, LOGO_PATHS } from "../src/pages.ts";
import { call, makeEnv } from "./helpers.ts";

const pathsOf = (svg: string) => [...svg.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
const file = (p: string) => readFileSync(new URL(`../public/${p}`, import.meta.url), "utf8");

test("logo: every page's header carries the logo inside the wordmark link, hidden from screen readers", async () => {
  const env = makeEnv();
  for (const route of ["/", "/about", "/guide"]) {
    const html = await (await call(env, "GET", route)).text();
    const wm = /<a class="wm" href="\/">(<svg class="logo"[^>]*>.*?<\/svg>)dndpaste<span class="dot">\.<\/span><\/a>/.exec(html);
    assert.ok(wm, `${route}: the logo sits before the wordmark text`);
    assert.equal(wm[1], LOGO);
    assert.match(wm[1]!, /fill="currentColor"/);
    assert.match(wm[1]!, /aria-hidden="true"/);
    assert.deepEqual(pathsOf(wm[1]!), LOGO_PATHS, `${route}: the header logo is the drawn geometry`);
    assert.match(html, /<link rel="icon" href="\/favicon\.svg\?v=2" type="image\/svg\+xml">/, `${route}: favicon link`);
    // Narrow phones hide the label visually (site.css), never from the accessible name.
    assert.match(html, /<button type="button" class="dbtn njs"[^>]*><svg class="i i-contrast"[^>]*>.*?<\/svg><span class="dl">Display<\/span><\/button>/, `${route}: Display label`);
  }
});

test("logo: the favicon and the asset copy share the header's geometry", () => {
  assert.equal(LOGO_PATHS.length, 2);
  assert.deepEqual(pathsOf(file("favicon.svg")), LOGO_PATHS);
  assert.deepEqual(pathsOf(file("assets/logo.svg")), LOGO_PATHS);
  assert.match(file("assets/logo.svg"), /fill="currentColor"/);
  assert.match(file("favicon.svg"), /viewBox="0 0 697 738"/);
  assert.match(file("favicon.svg"), /fill="#d6336c"/, "one fixed colour that reads on light and dark tab strips (review 2026-11-18)");
});

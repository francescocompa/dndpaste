// The autocomplete's names module (D158): generated from the committed SRD table, names only, its own bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as N from "../src/names.gen.ts";

test("D158: src/names.gen.ts matches what scripts/names.mjs writes", () => {
  const out = join(mkdtempSync(join(tmpdir(), "names-")), "names.gen.ts");
  execFileSync(process.execPath, [new URL("../scripts/names.mjs", import.meta.url).pathname, out]);
  assert.equal(readFileSync(out, "utf8"), readFileSync(new URL("../src/names.gen.ts", import.meta.url), "utf8"), "run node site/scripts/names.mjs");
});

test("D158: names only, no rules text", () => {
  const all = [N.SPELLS, N.FEATS, N.OPTIONS, N.ITEMS, N.SPECIES, N.BACKGROUNDS, N.SUBCLASSES, N.CLASS_ROWS].flatMap((rows) => rows.map((r) => r[0]));
  all.push(...N.SKILLS, ...N.LANGUAGES, ...N.TOOLS, ...N.LINEAGES.flatMap((l) => [l[0], ...l[2]]), ...N.FEATS.flatMap((f) => f[4]));
  // A sentence (a capital after a full stop), a 5etools tag or a long run of words would be text, not a name.
  for (const name of all) assert.ok(name.length <= 60 && name.split(" ").length <= 8 && !/\.\s+[A-Z]|\{@/.test(name), `not a name: ${name}`);
  assert.ok(N.SPELLS.length > 300 && N.ITEMS.length > 500, "the SRD lists are there");
});

test("D158: the names ship as their own client bundle, loaded on focus, not inside form.js", () => {
  assert.match(readFileSync(new URL("../scripts/build-client.mjs", import.meta.url), "utf8"), /src\/names\.gen\.ts"\)\], format: "esm", out: "names\.js"/);
  const form = readFileSync(new URL("../src/client/form.ts", import.meta.url), "utf8");
  assert.ok(!/from "\.\.\/names\.gen\.ts"/.test(form.replace(/import type[^;]+;/g, "")), "form.ts imports the names at run time only");
  assert.match(form, /\/assets\/names\.js/);
});

test("D165: MASTERY_WEAPONS lists mundane weapons from the 2024 books only", () => {
  const mundane = new Set(N.ITEMS.filter((i) => i[2]).map((i) => i[0]));
  assert.ok(N.MASTERY_WEAPONS.length >= 30);
  for (const [name, books] of N.MASTERY_WEAPONS) {
    assert.ok(mundane.has(name), `${name} is a mundane item`);
    assert.equal(books & 5, 0, `${name}: 2014 books have no weapon mastery`);
  }
  const names = N.MASTERY_WEAPONS.map((w) => w[0]);
  assert.ok(names.includes("Longsword") && !names.includes("Shield") && !names.includes("Rope"));
});

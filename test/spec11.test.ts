// SPEC 0.11 (D320, D323, D326): the base Scores line named with `/`, the method marker, scoreKind. One describe per decision.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, tidy, applyFix, scopeLines, lineOfValue, methodWords, scoreKind, STANDARD_ARRAY, POINT_BUY_COST, POINT_BUY_BUDGET, SPEC_VERSION, type Paste } from "../src/dndpaste.js";
import * as checkModule from "../src/check.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const fixtures = join(root, "fixtures");

const codes = (p: Paste) => p.diagnostics.map((d) => d.code);
const canon = (t: string) => emit(parse(t));
const scores = (t: string) => { const v = parse(t).header.get("Scores"); return v?.type === "scores" ? v : null; };

test("the library implements SPEC 0.11", () => assert.equal(SPEC_VERSION, "0.11"));

describe("D320: the base Scores line is named, `/`-separated, full or partial", () => {
  test("six numbers, named with commas and named with slashes all read the same, with no diagnostic", () => {
    const forms = ["Scores: 8/14/13/12/10/15", "Scores: STR 8, DEX 14, CON 13, INT 12, WIS 10, CHA 15", "Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15", "Scores: cha 15/wis 10/int 12/con 13/dex 14/str 8"];
    for (const t of forms) {
      assert.deepEqual(codes(parse(t)), [], t);
      assert.deepEqual(scores(t)?.values, [8, 14, 13, 12, 10, 15], t);
      assert.equal(canon(t), "Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\n", t);
    }
  });
  test("a partial base writes the known abilities only, in STR…CHA order", () => {
    assert.equal(canon("Scores: CHA 17, DEX 16"), "Scores: DEX 16/CHA 17\n");
    assert.equal(canon("Scores: CHA 17/DEX 16"), "Scores: DEX 16/CHA 17\n");
  });
  test("the increase line keeps its commas", () => {
    assert.equal(canon("Scores: 8/14/13/12/10/15\nScores: +2 WIS, +1 DEX"), "Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\nScores: +2 WIS, +1 DEX\n");
  });
  test("the canonical form is stable", () => {
    const once = canon("Scores: 8/14/13/12/10/15\nScores: +2 CHA");
    assert.equal(canon(once), once);
  });
  test("Tidy rewrites the bare and the comma forms", () => {
    assert.equal(tidy("Scores: 8/14/13/12/10/15\nClasses: Fighter 1"), "Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\nClasses: Fighter 1\n");
    assert.equal(tidy("Scores: DEX 16, CHA 17"), "Scores: DEX 16/CHA 17\n");
  });
  test("the 0.10 fixtures (bare six numbers) read clean and convert to their 0.11 siblings", () => {
    const dir = join(fixtures, "v0.10");
    const files = readdirSync(dir).filter((n) => n.endsWith(".dndpaste"));
    assert.ok(files.length >= 2);
    for (const f of files) {
      const old = readFileSync(join(dir, f), "utf8");
      assert.match(old, /^Scores: \d+(\/\d+){5}$/m, `${f} keeps the bare form`);
      assert.deepEqual(codes(parse(old)), [], f);
      assert.equal(canon(old), readFileSync(join(fixtures, f), "utf8"), f);
      assert.equal(tidy(old), readFileSync(join(fixtures, f), "utf8"), f);
    }
  });
  test("every canonical fixture writes its base in the named form", () => {
    for (const f of readdirSync(fixtures).filter((n) => n.endsWith(".dndpaste"))) {
      const base = readFileSync(join(fixtures, f), "utf8").split("\n").filter((l) => l.startsWith("Scores") && !l.includes("+"));
      for (const l of base) assert.match(l, /^Scores: [A-Z]{3} \d+(\/[A-Z]{3} \d+)*$/, f);
    }
  });
});

describe("D323: the optional method marker on a base Scores line", () => {
  test("each method reads, in any case, and is written in lower case", () => {
    const cases: [string, string, string][] = [
      ["Scores (standard array): 8/14/13/12/10/15", "standard-array", "Scores (standard array): STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\n"],
      ["Scores (Point Buy): STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15", "point-buy", "Scores (point buy): STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\n"],
      ["Scores (CUSTOM): DEX 18", "custom", "Scores (custom): DEX 18\n"],
      ["Scores (point  buy): DEX 15, CHA 14", "point-buy", "Scores (point buy): DEX 15/CHA 14\n"],
    ];
    for (const [t, kind, out] of cases) {
      assert.deepEqual(codes(parse(t)), [], t);
      assert.equal(scores(t)?.method, kind, t);
      assert.equal(canon(t), out, t);
      assert.equal(tidy(t), out, t);
      assert.equal(canon(out), out, t);
    }
  });
  test("no marker, no method: nothing is written by default", () => {
    assert.equal(scores("Scores: 8/14/13/12/10/15")?.method, undefined);
    assert.equal(canon("Scores: 15/14/13/12/10/8"), "Scores: STR 15/DEX 14/CON 13/INT 12/WIS 10/CHA 8\n");
  });
  test("an empty marked line keeps its marker, a to-do (D112)", () => {
    const t = "Scores (point buy):\nClasses: Fighter 1";
    assert.deepEqual(codes(parse(t)), ["W004"]);
    assert.equal(scores(t)?.method, "point-buy");
    assert.equal(canon(t), "Scores (point buy):\nClasses: Fighter 1\n");
  });
  test("the marker stays on the base line when an increase follows", () => {
    const t = "Scores: +2 CHA\nScores (standard array): 8/14/13/12/10/15";
    assert.deepEqual(codes(parse(t)), []);
    assert.equal(canon(t), "Scores (standard array): STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\nScores: +2 CHA\n");
    assert.deepEqual(scopeLines(parse(t).header).map(([k]) => k), ["Scores", "Scores"], "the scope key stays Scores");
  });
  test("a marker the numbers break reads with no diagnostic (no checker, D66)", () => {
    const t = "Scores (standard array): 18/18/18/18/18/18";
    assert.deepEqual(codes(parse(t)), []);
    assert.equal(scores(t)?.method, "standard-array");
  });
  test("an unknown method is E002", () => {
    const p = parse("Scores (rolled): 8/14/13/12/10/15");
    assert.deepEqual(codes(p), ["E002"]);
    assert.match(p.diagnostics[0].message, /standard array, point buy or custom/);
    assert.deepEqual(codes(parse("Scores (): 8/14/13/12/10/15")), ["E002"]);
  });
  test("a marker on an increase is E012, and its safe fix drops the marker", () => {
    const t = "Scores (point buy): +2 CHA";
    const p = parse(t);
    assert.deepEqual(codes(p), ["E012"]);
    assert.equal(p.diagnostics[0].fix?.safe, true);
    assert.equal(applyFix(t, p.diagnostics[0].fix!), "Scores: +2 CHA");
    assert.equal(tidy(t), "Scores: +2 CHA\n");
    assert.equal(tidy("Species: Elf\nScores (point buy): +2 DEX"), "Species: Elf\nScores: +2 DEX\n", "fixed where it stands");
  });
  test("a marker outside the header is E005, like a base", () => {
    assert.deepEqual(codes(parse("Species: Elf\nScores (point buy):")), ["E005"]);
  });
  test("two base lines with markers are E003, as any second base", () => {
    assert.deepEqual(codes(parse("Scores (point buy): 8/14/13/12/10/15\nScores (custom): DEX 15")), ["E003"]);
  });
  test("lineOfValue writes the marker; methodWords names each kind", () => {
    const v = scores("Scores (point buy): DEX 15");
    assert.ok(v);
    assert.equal(lineOfValue("Scores", v), "Scores (point buy): DEX 15");
    assert.deepEqual((["standard-array", "point-buy", "custom"] as const).map(methodWords), ["standard array", "point buy", "custom"]);
  });
});

describe("D326: scoreKind, data-free, beside finalScores", () => {
  test("the constants are numbers only", () => {
    assert.deepEqual(STANDARD_ARRAY, [15, 14, 13, 12, 10, 8]);
    assert.equal(POINT_BUY_BUDGET, 27);
    assert.equal(STANDARD_ARRAY.reduce((s, x) => s + POINT_BUY_COST[x], 0), 27, "the standard array costs the whole budget");
    assert.deepEqual(Object.keys(POINT_BUY_COST).map(Number), [8, 9, 10, 11, 12, 13, 14, 15]);
  });
  test("the standard array in any order is the narrower kind, with 0 points left", () => {
    assert.deepEqual(scoreKind([8, 14, 13, 12, 10, 15]), { kind: "standard-array", left: 0 });
    assert.deepEqual(scoreKind([15, 14, 13, 12, 10, 8]), { kind: "standard-array", left: 0 });
  });
  test("point buy: 8–15 within 27, with the points left", () => {
    assert.deepEqual(scoreKind([15, 15, 15, 8, 8, 8]), { kind: "point-buy", left: 0 });
    assert.deepEqual(scoreKind([8, 8, 8, 8, 8, 8]), { kind: "point-buy", left: 27 });
    assert.deepEqual(scoreKind([15, 14, 13, 10, 10, 8]), { kind: "point-buy", left: 2 });
  });
  test("custom: over budget, out of range, or no known number", () => {
    assert.deepEqual(scoreKind([15, 15, 15, 15, 8, 8]), { kind: "custom", left: null });
    assert.deepEqual(scoreKind([16, 8, 8, 8, 8, 8]), { kind: "custom", left: null });
    assert.deepEqual(scoreKind([7, 8, 8, 8, 8, 8]), { kind: "custom", left: null });
    assert.deepEqual(scoreKind([null, null, null, null, null, null]), { kind: "custom", left: null });
  });
  test("a partial base is read on its known numbers", () => {
    assert.deepEqual(scoreKind([null, 15, 14, null, null, null]), { kind: "standard-array", left: 11 });
    assert.deepEqual(scoreKind([null, 15, 15, null, null, null]), { kind: "point-buy", left: 9 });
    assert.deepEqual(scoreKind([null, 18, null, null, null, null]), { kind: "custom", left: null });
  });
  test("it takes a parsed base as is, and the checker module exports it too", () => {
    assert.deepEqual(scoreKind(scores("Scores: DEX 15/CON 14")?.values ?? []), { kind: "standard-array", left: 11 });
    assert.equal(checkModule.scoreKind, scoreKind);
    assert.equal(checkModule.STANDARD_ARRAY, STANDARD_ARRAY);
    assert.equal(checkModule.POINT_BUY_COST, POINT_BUY_COST);
    assert.equal(checkModule.POINT_BUY_BUDGET, POINT_BUY_BUDGET);
  });
});

test("the UMD build loads and carries scoreKind and the method marker", () => {
  const umd = createRequire(import.meta.url)(join(root, "dist", "dndpaste.umd.cjs")) as typeof import("../src/dndpaste.js");
  assert.equal(umd.SPEC_VERSION, "0.11");
  assert.deepEqual(umd.scoreKind([8, 14, 13, 12, 10, 15]), { kind: "standard-array", left: 0 });
  assert.equal(umd.tidy("Scores (Point Buy): 8/14/13/12/10/15"), "Scores (point buy): STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15\n");
  assert.equal(typeof umd.shortLineage, "function");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, isClean, type Paste } from "../src/dndpaste.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "..", "..", "fixtures");

function codes(p: Paste): string[] {
  return p.diagnostics.map((d) => d.code);
}
function items(p: Paste, scope: Map<string, unknown>, key: string): string[] {
  const v = scope.get(key) as { type: string; items: { ref: { name: string } }[] } | undefined;
  assert.ok(v && v.type === "items", `${key} missing`);
  return v.items.map((i) => i.ref.name);
}

test("empty document is valid", () => {
  const p = parse("");
  assert.deepEqual(codes(p), []);
  assert.equal(emit(p), "");
});

test("sparse paste: a class alone", () => {
  const p = parse("Classes: Warlock");
  assert.deepEqual(codes(p), []);
  const c = p.header.get("Classes");
  assert.ok(c && c.type === "classes");
  assert.equal(c.entries[0].levels, null);
});

test("identifier only on the first line", () => {
  const p = parse("Vice\nClasses: Warlock 2\nSecond name");
  assert.equal(p.identifier, "Vice");
  assert.deepEqual(codes(p), ["E001"]);
});

test("real fixtures parse clean and round-trip byte-for-byte", () => {
  for (const f of readdirSync(fixtures).filter((n) => n.endsWith(".dndpaste"))) {
    const text = readFileSync(join(fixtures, f), "utf8");
    const p = parse(text);
    assert.deepEqual(codes(p), [], `${f}: ${JSON.stringify(p.diagnostics)}`);
    assert.ok(isClean(p));
    const once = emit(p);
    assert.equal(once, text, `${f} is not canonical`);
    assert.equal(emit(parse(once)), once, `${f} round-trip`);
  }
});

test("non-canonical originals canonicalise to their fixture", () => {
  const dir = join(fixtures, "noncanonical");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".dndpaste"))) {
    const raw = readFileSync(join(dir, f), "utf8");
    const canon = readFileSync(join(fixtures, f), "utf8");
    assert.notEqual(raw, canon, `${f} should differ from its canonical form`);
    assert.equal(emit(parse(raw)), canon, f);
  }
});

test("shigen: structure", () => {
  const p = parse(readFileSync(join(fixtures, "shigen.dndpaste"), "utf8"));
  assert.equal(p.identifier, "Shigen");
  assert.equal(p.entities.length, 2);
  assert.equal(p.entities[0].key, "Species");
  assert.equal(p.entities[1].item.ref.source, "HB");
  assert.deepEqual(items(p, p.entities[1].lines, "Feat"), ["Mark of Making"]);
  assert.deepEqual(p.levels.map((l) => l.n), [1, 2, 3, 4, 5, 6]);
  const opts = p.levels[1].lines.get("Options");
  assert.ok(opts && opts.type === "items");
  assert.deepEqual(opts.items[0].details, [[{ ref: { name: "True Strike", source: null }, at: null }]]);
  const asi = p.entities[1].lines.get("ASI");
  assert.ok(asi && asi.type === "asi");
  assert.deepEqual(asi.bonuses, [{ amount: 2, ability: "CHA" }, { amount: 1, ability: "DEX" }]);
});

test("items: quoting, quantity, drop, empty groups, @n", () => {
  const p = parse([
    "L1 Fighter",
    'Equipment: "Bag of Tricks, Gray", Arrows (20) x2, Longsword|XPHB',
    "Feat: Skilled [; Arcana, History]",
    "L4 Fighter",
    "Spells: Misty Step, -Hex",
    "Feat: Magic Initiate [WIS; Cleric; Guidance, Sacred Flame @5; Bless]",
  ].join("\n"));
  assert.deepEqual(codes(p), []);
  const eq = p.levels[0].lines.get("Equipment");
  assert.ok(eq && eq.type === "items");
  assert.equal(eq.items[0].ref.name, "Bag of Tricks, Gray");
  assert.equal(eq.items[1].ref.name, "Arrows (20)");
  assert.equal(eq.items[1].qty, 2);
  assert.equal(eq.items[2].ref.source, "XPHB");
  const sk = p.levels[0].lines.get("Feat");
  assert.ok(sk && sk.type === "items");
  assert.deepEqual(sk.items[0].details.map((g) => g.length), [0, 2]);
  const sp = p.levels[1].lines.get("Spells");
  assert.ok(sp && sp.type === "items");
  assert.equal(sp.items[1].drop, true);
  const mi = p.levels[1].lines.get("Feat");
  assert.ok(mi && mi.type === "items");
  assert.equal(mi.items[0].details[2][1].at, 5);
  assert.equal(emit(p).split("\n")[2], 'Equipment: "Bag of Tricks, Gray", Arrows (20) x2, Longsword|XPHB');
});

test("case-insensitive keys, canonical case on emit", () => {
  const p = parse("rules: 2024\nclasses: fighter 1\n\nl1 Fighter\nfighting style: Archery");
  assert.deepEqual(codes(p), []);
  assert.equal(emit(p), "Rules: 2024\nClasses: fighter 1\n\nL1 Fighter\nFighting Style: Archery\n");
});

test("extension keys are kept with W001", () => {
  const p = parse("X-Portrait: foo\nClasses: Bard 1");
  assert.deepEqual(codes(p), ["W001"]);
  assert.ok(isClean(p));
  assert.equal(emit(p), "Classes: Bard 1\nX-portrait: foo\n");
});

const errorCases: [string, string, string[]][] = [
  ["E001 malformed", "Classes: Bard 1\nwhat is this", ["E001"]],
  ["E002 unknown key", "Pact: Blade", ["E002"]],
  ["E003 duplicate key", "Skills: Arcana\nSkills: History", ["E003"]],
  ["E004 non-increasing", "L3 Bard\nL2 Bard", ["E004"]],
  ["E004 out of range", "L21 Bard", ["E004"]],
  ["E005 wrong scope", "Ability: WIS", ["E005"]],
  ["E005 header-only in block", "L1 Bard\nRules: 2024", ["E005"]],
  ["E006 empty value", "Skills:", ["E006"]],
  ["E007 list on item key", "Species: Elf, Human", ["E007"]],
  ["E007 items¹ in level", "L1 Bard\nSubclass: Lore, Valor", ["E007"]],
  ["E008 drop in header", "Spells: -Hex", ["E008"]],
  ["E009 qty elsewhere", "Spells: Hex x2", ["E009"]],
  ["E010 reserved", "---", ["E010"]],
  ["E011 unbalanced", "Feat: Resilient [CON", ["E011"]],
  ["E011 nested", "Feat: Resilient [CON [x]]", ["E011"]],
  ["E011 colon in bare name", "L1 Cleric\nFeature: Channel Divinity: Turn Undead", ["E011"]],
  ["E012 scores", "Scores: 8/13/14", ["E012"]],
  ["E012 asi", "ASI: 2 CHA", ["E012"]],
  ["E012 rules", "Rules: 2020", ["E012"]],
  ["E012 bare class with blocks", "Classes: Bard\n\nL1 Bard\nSkills: Arcana", ["E012"]],
  ["E013 stamp on item", "Spells: Hex @3", ["E013"]],
  ["E014 entity after level", "L1 Bard\nSpecies: Elf", ["E014"]],
  ["E014 repeated entity", "Species: Elf\nSpecies: Human", ["E014"]],
  ["E015 version", "Paste: 2", ["E015"]],
];
for (const [name, text, expected] of errorCases) {
  test(`error: ${name}`, () => {
    assert.deepEqual(codes(parse(text)), expected, text);
  });
}

test("errors skip the line, rest still parses", () => {
  const p = parse("Classes: Bard 1\nPact: Blade\nSkills: Arcana");
  assert.deepEqual(codes(p), ["E002"]);
  assert.deepEqual(items(p, p.header, "Skills"), ["Arcana"]);
});

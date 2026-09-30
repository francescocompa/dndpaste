import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, isClean, classSequence, classTotals, type Paste } from "../src/dndpaste.js";

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
    assert.deepEqual(codes(p).filter((c) => c.startsWith("E")), [], `${f}: ${JSON.stringify(p.diagnostics)}`);
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
  assert.equal(emit(p), "Classes: Bard 1\nX-Portrait: foo\n");
});

test("extension keys: the name is written back as authored, the prefix as X- (C3, D56)", () => {
  const p = parse("Classes: Fighter 11\nX-Plan-B: Spear, Longsword\nx-campaign: Foglie Silenti");
  assert.deepEqual(codes(p), ["W001", "W001"]);
  assert.equal(emit(p), "Classes: Fighter 11\nX-campaign: Foglie Silenti\nX-Plan-B: Spear, Longsword\n");
  assert.equal(emit(parse(emit(p))), emit(p));
});

test("extension keys: the same name in another case is a duplicate", () => {
  assert.deepEqual(codes(parse("X-Plan-B: Spear\nx-plan-b: Longsword")), ["W001", "W001", "E003"]);
});

test("Scores: the named partial form (F1, D46)", () => {
  const p = parse("Scores: cha 17, DEX 16\nClasses: Sorcerer 5");
  assert.deepEqual(codes(p), []);
  const s = p.header.get("Scores");
  assert.ok(s && s.type === "scores");
  assert.deepEqual(s.values, [null, 16, null, null, null, 17]);
  // Canonical: named form in STR…CHA order while any ability is missing.
  assert.equal(emit(p), "Scores: DEX 16, CHA 17\nClasses: Sorcerer 5\n");
  assert.equal(emit(parse(emit(p))), emit(p));
});

test("Scores: all six named is the six-number form in canonical emit", () => {
  const p = parse("Scores: CHA 12, WIS 14, INT 10, CON 13, DEX 15, STR 8");
  assert.deepEqual(codes(p), []);
  assert.equal(emit(p), "Scores: 8/15/13/10/14/12\n");
  const q = parse("Scores: 8/15/13/10/14/12");
  assert.deepEqual(q.header.get("Scores"), p.header.get("Scores"), "the two forms give the same AST");
});

// ─── F4: Classes runs, the reading rule, switch-point headers (D49) ─────────

const seqNames = (p: Paste) => classSequence(p).levels.map((r) => (r ? r.name.toLowerCase()[0] : "-")).join("");

test("Classes runs: cumulative class levels in the order taken", () => {
  const p = parse("Classes: Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14");
  assert.deepEqual(codes(p), []);
  const c = p.header.get("Classes");
  assert.ok(c && c.type === "classes");
  assert.equal(c.entries.length, 4, "the AST keeps the runs as written");
  assert.deepEqual(classTotals(p).map((e) => [e.ref.name, e.levels]), [["Fighter", 6], ["Rogue", 14]]);
  const s = classSequence(p);
  assert.equal(s.played, 20, "runs are cumulative: 6 + 14, not 1 + 3 + 6 + 14");
  assert.equal(seqNames(p), "frrrfffffrrrrrrrrrrr");
});

test("Classes runs: canonical emit prints totals and a header at each class change", () => {
  const p = parse("Classes: Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14");
  const once = emit(p);
  assert.equal(once, "Classes: Fighter 6 / Rogue 14\n\nL2 Rogue\n\nL5 Fighter\n\nL10 Rogue\n");
  const q = parse(once);
  assert.deepEqual(codes(q), []);
  assert.equal(seqNames(q), seqNames(p), "the order survives the fold");
  assert.equal(emit(q), once, "idempotent");
});

test("Classes runs: existing blocks are kept, missing switch points get an empty block", () => {
  const p = parse("Classes: Rogue 1 / Fighter 5 / Rogue 14 / Fighter 6\n\nL2 Fighter\nFighting Style: Two-Weapon Fighting\n\nL8 Rogue\nSubclass: Thief");
  assert.deepEqual(codes(p), []);
  const once = emit(p);
  assert.equal(once, "Classes: Rogue 14 / Fighter 6\n\nL2 Fighter\nFighting Style: Two-Weapon Fighting\n\nL7 Rogue\n\nL8 Rogue\nSubclass: Thief\n\nL20 Fighter\n");
  assert.equal(emit(parse(once)), once);
  assert.equal(seqNames(parse(once)), seqNames(p));
});

test("Classes runs: planned levels and 0 entries keep their meaning", () => {
  const p = parse("Classes: Fighter 1 / Rogue 2 / Fighter 3 / Wizard 0\n\nL7 Wizard\nSubclass: Evoker");
  assert.deepEqual(codes(p), []);
  assert.equal(classSequence(p).played, 5);
  assert.equal(seqNames(p), "frrfffw", "L6 is planned and unheadered: it carries on from L5 until L7's header");
  const once = emit(p);
  assert.equal(once, "Classes: Fighter 3 / Rogue 2 / Wizard 0\n\nL2 Rogue\n\nL4 Fighter\n\nL7 Wizard\nSubclass: Evoker\n");
  assert.equal(emit(parse(once)), once);
});

test("reading rule: a flat paste stays flat, and its order is Classes order", () => {
  const p = parse("Classes: Fighter 3 / Warlock 3\nSkills: Athletics");
  assert.equal(seqNames(p), "fffwww");
  assert.equal(emit(p), "Classes: Fighter 3 / Warlock 3\nSkills: Athletics\n", "no headers are added to a paste with no level blocks");
});

test("reading rule: once a paste has level blocks, an unheadered class change gets a header", () => {
  const p = parse("Classes: Fighter 1 / Warlock 5\n\nL1 Fighter\nFighting Style: Archery\n\nL4 Warlock\nSubclass: Fiend Patron");
  assert.equal(seqNames(p), "fwwwww");
  assert.equal(emit(p), "Classes: Fighter 1 / Warlock 5\n\nL1 Fighter\nFighting Style: Archery\n\nL2 Warlock\n\nL4 Warlock\nSubclass: Fiend Patron\n");
});

test("reading rule: an unheadered level continues the current class, keeping levels a later header claims", () => {
  // A Warlock dip at L2; the Warlock's other two levels are headered at L11 and L12, so L3 returns to Fighter.
  const p = parse("Classes: Fighter 9 / Warlock 3\n\nL2 Warlock\nCantrips: Eldritch Blast\n\nL11 Warlock\nSubclass: Fiend Patron\n\nL12 Warlock");
  assert.deepEqual(codes(p), []);
  assert.equal(seqNames(p), "fwffffffffww");
  // Without later headers, the dip continues while the class has levels left.
  const q = parse("Classes: Fighter 3 / Warlock 3\n\nL1 Warlock\nCantrips: Eldritch Blast");
  assert.equal(seqNames(q), "wwwfff");
});

test("W003: a header whose class has no levels left (totals form) is kept and flagged", () => {
  const p = parse("Classes: Fighter 1 / Warlock 5\n\nL1 Fighter\n\nL2 Fighter\nFighting Style: Archery");
  assert.deepEqual(codes(p), ["W003"]);
  assert.equal(p.diagnostics[0].line, 5);
  assert.ok(isClean(p));
  assert.equal(seqNames(p), "ffwwww", "the header still fixes its level");
  assert.equal(emit(parse(emit(p))), emit(p));
});

test("E016: a header that contradicts the Classes runs", () => {
  const p = parse("Classes: Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14\n\nL3 Fighter\nFeat: Alert");
  assert.deepEqual(codes(p), ["E016"]);
  assert.equal(p.diagnostics[0].line, 3);
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
  ["E012 scores named twice", "Scores: DEX 15, dex 14", ["E012"]],
  ["E012 scores unknown ability", "Scores: DEX 15, LCK 12", ["E012"]],
  ["E012 scores placeholder", "Scores: ?/15/13/?/?/?", ["E012"]],
  ["E012 scores bare number", "Scores: 15", ["E012"]],
  ["E012 scores mixed forms", "Scores: DEX 15/CON 13", ["E012"]],
  ["E012 asi", "ASI: 2 CHA", ["E012"]],
  ["E012 rules", "Rules: 2020", ["E012"]],
  ["E012 bare class with blocks", "Classes: Bard\n\nL1 Bard\nSkills: Arcana", ["E012"]],
  ["E012 runs not increasing", "Classes: Fighter 5 / Rogue 3 / Fighter 4", ["E012"]],
  ["E012 runs equal", "Classes: Fighter 5 / Rogue 3 / Fighter 5", ["E012"]],
  ["E012 runs without a count", "Classes: Fighter / Rogue 3 / Fighter 6", ["E012"]],
  ["E012 runs with 0", "Classes: Fighter 0 / Rogue 3 / Fighter 2", ["E012"]],
  ["E012 runs with two sources", "Classes: Fighter|XPHB 1 / Rogue 3 / Fighter|PHB 6", ["E012"]],
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

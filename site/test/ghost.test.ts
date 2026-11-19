// Ghost pick counts (T3.9, D129–D133): what each counted line of a level block expects, and where the ghost sits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../src/dndpaste.ts";
import { PRESETS } from "../src/presets.ts";
import { presetText } from "../src/preset.ts";
import type { Edition } from "../src/preset.ts";
import { ghostCounts, ghostHtml, ghostPads, ghostText, keepCount } from "../src/ghost.ts";
import type { Ghost } from "../src/ghost.ts";
import { highlightRows } from "../src/client/highlight.ts";

const ghosts = (text: string): Ghost[] => ghostCounts(parse(text), text);
/** The ghosts as `line text → "have of"`, for short assertions. */
function byLine(text: string): Record<string, string> {
  const lines = text.split("\n");
  return Object.fromEntries(ghosts(text).map((g) => [`L${g.n} ${lines[g.line - 1].trim()}`, `${g.have} of ${g.of}`]));
}

test("single class, 2024: gains per line, the wizard's spellbook, Prepared as the loadout total", () => {
  const text = `Rules: 2024
Classes: Wizard 2

L1 Wizard
Skills: Arcana
Cantrips: Light, Mage Hand, Prestidigitation
Spells: Shield, Sleep, Magic Missile, Detect Magic, Mage Armor, Find Familiar
Prepared: Shield, Sleep

L2 Wizard
Spells: Grease, Fog Cloud
Expertise:
`;
  assert.deepEqual(byLine(text), {
    "L1 Skills: Arcana": "1 of 2",
    "L1 Cantrips: Light, Mage Hand, Prestidigitation": "3 of 3",
    "L1 Spells: Shield, Sleep, Magic Missile, Detect Magic, Mage Armor, Find Familiar": "6 of 6",
    "L1 Prepared: Shield, Sleep": "2 of 4",
    "L2 Spells: Grease, Fog Cloud": "2 of 2",
    "L2 Expertise:": "0 of 1",
  });
});

test("2014: known casters count the gain; Prepared gets no ghost (it needs the modifier)", () => {
  const text = `Rules: 2014
Classes: Sorcerer 2 / Cleric 1

L1 Sorcerer
Cantrips: Light
Spells: Shield, Sleep

L2 Sorcerer
Spells:

L3 Cleric
Cantrips:
Prepared: Bless
`;
  assert.deepEqual(byLine(text), {
    "L1 Cantrips: Light": "1 of 4",
    "L1 Spells: Shield, Sleep": "2 of 2",
    "L2 Spells:": "0 of 1",
    "L3 Cantrips:": "0 of 3",
  });
});

test("multiclass: each level reads its class and class level from the Classes runs (D49)", () => {
  const text = `Rules: 2024
Classes: Fighter 1 / Wizard 1 / Fighter 4

L1 Fighter
Skills: Athletics, Perception
Masteries: Longsword, Shortbow, Handaxe

L2 Wizard
Skills:
Cantrips:
Spells:

L5 Fighter
Masteries: Longsword, Shortbow, Handaxe, Greatsword
`;
  assert.deepEqual(byLine(text), {
    "L1 Skills: Athletics, Perception": "2 of 2",
    "L1 Masteries: Longsword, Shortbow, Handaxe": "3 of 3",
    // A wizard taken later owes no skills: an empty Skills line has no ghost (D131).
    "L2 Cantrips:": "0 of 3",
    "L2 Spells:": "0 of 6",
    // L5 is Fighter class level 4: the loadout grows to 4.
    "L5 Masteries: Longsword, Shortbow, Handaxe, Greatsword": "4 of 4",
  });
});

test("multiclass skills: a later class asks for its multiclass skills at its class level 1", () => {
  const text = `Rules: 2024
Classes: Fighter 1 / Rogue 1

L2 Rogue
Skills:
`;
  assert.deepEqual(byLine(text), { "L2 Skills:": "0 of 1" });
});

test("over the count is a quiet note, a drop lets one more pick in (owed + dropped)", () => {
  const text = `Rules: 2014
Classes: Sorcerer 4

L1 Sorcerer
Cantrips: Light, Mage Hand, Prestidigitation, Fire Bolt, Ray of Frost

L4 Sorcerer
Spells: -Shield, Fireball, Counterspell
`;
  const gs = ghosts(text);
  assert.deepEqual(byLine(text), { "L1 Cantrips: Light, Mage Hand, Prestidigitation, Fire Bolt, Ray of Frost": "5 of 4", "L4 Spells: -Shield, Fireball, Counterspell": "2 of 2" });
  assert.equal(ghostText(gs[0]), "5/4");
  assert.equal(ghostText(gs[1]), "2/2");
  // Over is the alert icon on the tag, not words (T3.9 review); a met count has none.
  assert.match(ghostHtml(gs[0], 2), /^<span class="gh"><span class="gp">  <\/span><span class="gc over">5\/4<svg class="i i-alert"[^]*<\/svg><\/span><\/span>$/);
  assert.equal(ghostHtml(gs[1], 1), '<span class="gh"><span class="gp"> </span><span class="gc">2/2</span></span>');
});

test("zero owed: no ghost while empty, the over form once it has picks (D131)", () => {
  const text = `Rules: 2024
Classes: Barbarian 2

L2 Barbarian
Spells:
Cantrips: Light
`;
  assert.deepEqual(byLine(text), { "L2 Cantrips: Light": "1 of 0" });
  assert.match(ghostHtml(ghosts(text)[0], 1), /class="gc over">1\/0<svg/);
});

const none2014 = (text: string) => assert.deepEqual(ghosts(text), [], "2014 classes have no masteries");

test("no ghost: Other class, an unknown edition or source, a count the table lacks, header and entity blocks", () => {
  const none = (text: string, what: string) => assert.deepEqual(ghosts(text), [], what);
  none("Rules: 2024\nClasses: Artificer 1\n\nL1 Artificer\nCantrips:\nSpells:\n", "Other class (D127)");
  none("Classes: Wizard 1\n\nL1 Wizard\nCantrips:\n", "no source and no Rules");
  none("Rules: 2024\nClasses: Wizard|TCE 1\n\nL1 Wizard|TCE\nCantrips:\n", "a source not in the table");
  none("Rules: 2014\nClasses: Cleric 1\n\nL1 Cleric\nPrepared:\n", "2014 prepared: the count needs the ability modifier");
  none("Rules: 2024\nClasses: Wizard 1\nSpells: Shield\n\nBackground: Sage|XPHB\nSkills:\n", "header and Background lines");
  none("", "an empty editor");
});

test("2024 Paladin, Ranger and Rogue masteries: the supplement's fixed count, a loadout at every level", () => {
  for (const cls of ["Paladin", "Ranger", "Rogue"]) {
    assert.deepEqual(byLine(`Rules: 2024\nClasses: ${cls} 3\n\nL1 ${cls}\nMasteries: Longsword\n\nL3 ${cls}\nMasteries:\n`),
      { "L1 Masteries: Longsword": "1 of 2", "L3 Masteries:": "0 of 2" }, cls);
  }
  none2014("Rules: 2014\nClasses: Rogue 1\n\nL1 Rogue\nMasteries:\n");
});

test("Rules picks the table for an unsourced class; a source on the class wins", () => {
  assert.deepEqual(byLine("Rules: 2014\nClasses: Wizard 1\n\nL1 Wizard\nPrepared:\nCantrips:\n"), { "L1 Cantrips:": "0 of 3" });
  assert.deepEqual(byLine("Rules: 2014\nClasses: Wizard|XPHB 1\n\nL1 Wizard|XPHB\nPrepared:\n"), { "L1 Prepared:": "0 of 4" });
});

test("a second line of a key (E003) and lines under a skipped header get no ghost of their own", () => {
  const text = `Rules: 2024
Classes: Wizard 2

L2 Wizard
Spells: Grease
Spells: Fog Cloud
L1 Wizard
Cantrips:
`;
  // L1 after L2 is E004: the parser skips the header, so Cantrips stays in L2, where a wizard gains none.
  assert.deepEqual(ghosts(text).map((g) => g.line), [5]);
});

test("every preset's counted lines get a ghost with a count, both editions (the table agrees with the layout)", () => {
  for (const edition of ["2014", "2024"] as Edition[]) {
    for (const p of PRESETS.filter((q) => q.source === (edition === "2014" ? "PHB" : "XPHB"))) {
      const text = presetText(edition, [{ cls: p.name, levels: 20 }]);
      const lines = text.split("\n");
      const gs = new Map(ghosts(text).map((g) => [g.line, g]));
      let level = 0;
      lines.forEach((line, i) => {
        const lv = /^L(\d+) /.exec(line);
        if (lv) { level = Number(lv[1]); return; }
        const key = line.replace(/:.*/, "");
        if (!level || !p.counted.includes(key)) return;
        const g = gs.get(i + 1);
        assert.ok(g && g.of > 0 && g.have === 0, `${p.name} ${edition} L${level} ${key}: a ghost expecting picks`);
      });
    }
  }
});

test("ghostPads: one column per level block, two past its longest counted line; a line that won't fit keeps one space", () => {
  const text = `Rules: 2024
Classes: Wizard 4

L1 Wizard
Skills: Arcana, History
Cantrips: Light
Spells:

L4 Wizard
Cantrips: Mage Hand
Spells: Shield, Sleep
`;
  const lines = text.split("\n");
  const gs = ghosts(text);
  const pads = ghostPads(lines, gs);
  const starts = (p: Map<number, number>) => gs.map((g) => lines[g.line - 1].length + (p.get(g.line) ?? 0));
  // L1's column is 25 ("Skills: Arcana, History" + 2), L4's is 23 ("Spells: Shield, Sleep" + 2).
  assert.deepEqual(starts(pads), [25, 25, 25, 23, 23]);
  // 27 columns and the lane: every ghost still fits its block's column, running into the lane.
  assert.deepEqual(starts(ghostPads(lines, gs, 27)), [25, 25, 25, 23, 23]);
  // 27 columns, no lane: a ghost takes 4 ("1/2" and the tag's padding), so the Skills line (23 + 2 + 4) no longer
  // fits a column: it keeps one space, and L1 aligns on the lines that do (at 17).
  const narrow = ghostPads(lines, gs, 27, 0);
  assert.deepEqual(gs.map((g) => narrow.get(g.line)), [1, 2, 10, 4, 2]);
  // 20 columns: the Skills and Spells lines wrap, so their ghosts follow their last row, out of the column.
  const wrapped = ghostPads(lines, gs, 20);
  assert.equal(wrapped.get(gs[0].line), 1);
  assert.equal(wrapped.get(gs[4].line), 1);
});

test("the ghost lives in the highlight layer only: a row's text is the line, the ghost after it, display only", () => {
  const text = "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: Light\n";
  const gs = ghosts(text);
  const rows = highlightRows(text, parse(text).diagnostics, new Map(gs.map((g) => [g.line, ghostHtml(g, 2)])));
  const row = rows[4];
  assert.match(row, /<span class="gh"><span class="gp">  <\/span><span class="gc">1\/3<\/span><\/span><\/span><\/div>$/);
  const plain = (h: string) => h.replace(/<span class="gh">.*?<\/span><\/span>/, "").replace(/<[^>]+>/g, "");
  assert.equal(plain(row), "Cantrips: Light");
  // Without ghosts the rows are as before.
  assert.deepEqual(highlightRows(text, parse(text).diagnostics), highlightRows(text, parse(text).diagnostics, new Map()));
});

test("D175: the count on the line being typed keeps its last value while the line doesn't read", () => {
  const text = "Vice\nRules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: ";
  const g1 = ghosts(text + "Guidance");
  assert.deepEqual(g1.map((g) => ghostText(g)), ["1/3"]);
  let k = keepCount(g1, 6, false, null);
  assert.equal(k.kept?.have, 1, "a line that reads is kept");
  const broken = ghosts(text + "Guidance, ");
  assert.deepEqual(broken.map((g) => ghostText(g)), ["0/3"], "the parser reads no items after an open comma");
  k = keepCount(broken, 6, true, k.kept);
  assert.deepEqual(k.ghosts.map((g) => ghostText(g)), ["1/3"], "so the chip keeps 1/3");
  k = keepCount(ghosts(text + "Guidance, \"Li"), 6, true, k.kept);
  assert.deepEqual(k.ghosts.map((g) => ghostText(g)), ["1/3"], "an open quote too");
  k = keepCount(ghosts(text + "Guidance, Light"), 6, false, k.kept);
  assert.deepEqual(k.ghosts.map((g) => ghostText(g)), ["2/3"], "it follows the line once it reads");
  assert.deepEqual(keepCount(broken, 0, false, k.kept).ghosts.map((g) => ghostText(g)), ["0/3"], "the cursor left the line");
  assert.deepEqual(keepCount(broken, 6, true, null).ghosts.map((g) => ghostText(g)), ["0/3"], "nothing kept: shown as it reads");
  assert.deepEqual(keepCount(broken, 6, true, { ...g1[0], line: 9 }).ghosts.map((g) => ghostText(g)), ["0/3"], "a count kept for another line");
});

test("D174: the ghost text sits over the ghost's padding; the chip steps right when the word needs the room", () => {
  const g: Ghost = { line: 6, n: 1, have: 1, of: 3 };
  const pad = (html: string) => /<span class="gp">( *)<\/span>/.exec(html)?.[1].length;
  assert.match(ghostHtml(g, 12, "cantrip"), /^<span class="gh"><span class="gt">cantrip<\/span><span class="gp">/);
  assert.equal(pad(ghostHtml(g, 12, "cantrip")), 12);
  assert.equal(pad(ghostHtml(g, 2, "cantrip")), 9);
  assert.equal(pad(ghostHtml(g, 2)), 2);
  assert.ok(!ghostHtml(g, 2).includes('class="gt"'));
});

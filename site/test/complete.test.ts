// Name autocomplete (D151, D154–D159): the spot under the cursor, the names offered there, and the text a pick writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as N from "../src/names.gen.ts";
import { OPEN_EVERY_SPOT, afterPick, alternatives, bracketTrim, ghostWord, inEmptyBrackets, isKnown, keySpotAt, minTyped, opensDetails, opensOnClick, slotHint, sourceFor, spellCap, spotAt, suggest, suggestKeys, swapAt, written, writtenKey } from "../src/client/complete.ts";
import type { Spot } from "../src/client/complete.ts";
import { presetText } from "../src/preset.ts";
import { EXAMPLE } from "../src/example.ts";
import { emit, parse } from "../../src/dndpaste.ts";

/** `¦` marks the cursor. */
function spot(src: string): Spot | null {
  const pos = src.indexOf("¦");
  return spotAt(src.replace("¦", ""), pos);
}
const names = (src: string, limit = 8) => { const s = spot(src); return s ? suggest(N, s, limit).map((x) => x.name) : null; };
const first = (src: string) => { const s = spot(src); return s ? suggest(N, s)[0] : undefined; };
/** The text after taking the top suggestion. */
function take(src: string, i = 0): string {
  const text = src.replace("¦", "");
  const s = spot(src);
  assert.ok(s, `a spot in ${src}`);
  const pick = suggest(N, s)[i];
  assert.ok(pick, `a suggestion in ${src}`);
  return text.slice(0, s.start) + written(s, pick) + text.slice(s.end);
}

test("D164: the letters before the list opens follow the list's size; never where no name goes", () => {
  // With the D172 trial switched off: the sizes D164 settled.
  const sized = (src: string) => { const s = spot(src); return s ? suggest(N, s, 8, false).map((x) => x.name) : null; };
  assert.deepEqual([2, 12, 13, 40, 41, 300].map((n) => minTyped(n, false)), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(sized("Spells: F¦"), [], "hundreds of spells: 2 letters");
  assert.ok(sized("Spells: Fi¦")?.includes("Fireball"));
  assert.deepEqual(sized("Skills: a¦"), ["Acrobatics", "Animal Handling", "Arcana", "Athletics"], "18 skills: 1 letter");
  assert.deepEqual(sized("Skills: ¦"), [], "but not 0");
  assert.deepEqual(names("Feat: Magic Initiate [¦"), ["CHA", "INT", "WIS"], "3 abilities: on the empty spot");
  assert.deepEqual(names("Feature: Divine Order [¦"), ["Protector", "Thaumaturge"]);
  assert.equal(spot("Spe¦lls: Fireball"), null, "typing the key");
  assert.equal(spot("Scores: 8/1¦"), null, "a score");
  assert.deepEqual(names("Rules: 20¦"), ["2014", "2024"], "an enum lists its values (D304)");
  assert.equal(spot("HP: Fi¦"), null);
  assert.equal(spot("Producer: ch¦"), null, "free text");
  assert.equal(spot("Spells: Fireball|XP¦"), null, "typing a source");
  assert.equal(spot("Gear: Rope x2¦"), null, "a quantity");
  assert.equal(spot("Classes: Fighter 1¦"), null, "a level count");
  assert.equal(spot("Feat: Skilled [Arcana]¦"), null, "after the details");
});

test("D154: a name already written exactly closes the list; another case still offers the fix", () => {
  assert.deepEqual(names("Spells: Fireball¦"), []);
  assert.deepEqual(names("Spells: fireball¦")?.[0], "Fireball");
  assert.deepEqual(names("Spells: Shield¦"), [], "Shield is a name, even though Shield of Faith starts with it");
  assert.deepEqual(names("Spells: Shield o¦"), ["Shield of Faith"]);
});

test("D151: unknown names get no list and nothing in the text changes", () => {
  assert.deepEqual(names("Spells: Zzyzx Blast¦"), []);
  assert.deepEqual(names("Feat: Tavern Brawl¦"), []);
});

test("matching: name start, then word start, apostrophes ignored, substring from 3 letters", () => {
  const fire = names("Spells: fire¦", 20) ?? [];
  assert.ok(fire.indexOf("Fireball") < fire.indexOf("Delayed Blast Fireball"), "name start before word start");
  assert.ok(fire.includes("Wall of Fire"));
  assert.ok(!names("Spells: th¦", 50)?.includes("Find the Path"), "small words don't count as word starts");
  assert.ok(names("Gear: thieves¦")?.includes("Thieves' Tools"));
  assert.ok(names("Spells: ball¦", 20)?.includes("Fireball"), "inside the name, 3+ letters");
  assert.deepEqual(names("Spells: ll¦", 50)?.filter((n) => !/(^| )ll/i.test(n)), [], "no substring under 3 letters");
});

test("D156: each key offers its own kind", () => {
  assert.ok(names("Cantrips: fi¦")?.includes("Fire Bolt"));
  assert.ok(!names("Cantrips: fi¦")?.includes("Fireball"), "no levelled spells as cantrips");
  assert.ok(!names("Spells: fire b¦")?.includes("Fire Bolt"), "no cantrips as spells");
  assert.ok(names("Prepared: bl¦")?.includes("Bless"));
  assert.ok(names("Feat: al¦")?.includes("Alert"));
  assert.ok(names("Options: ag¦")?.includes("Agonizing Blast"));
  assert.ok(names("Species: el¦")?.includes("Elf"));
  assert.ok(names("Background: ac¦")?.includes("Acolyte"));
  assert.ok(names("Subclass: li¦")?.includes("Life Domain"));
  assert.ok(names("Subclass: berse¦")?.includes("Path of the Berserker"), "short names find the printed name");
  assert.ok(names("Classes: Fighter 1 / wa¦")?.includes("Warlock"));
  assert.ok(names("L3 Wiz¦")?.includes("Wizard"), "the level header's class");
  assert.ok(names("Gear: long¦")?.includes("Longsword"));
  assert.ok(names("Gear: flame t¦")?.includes("Flame Tongue"), "magic items");
  assert.ok(names("Gear: +1 ar¦")?.includes("+1 Armor"), "magic variants");
  assert.ok(names("Masteries: long¦")?.includes("Longsword"));
  assert.ok(!names("Masteries: flame t¦")?.length, "weapons only");
  assert.ok(names("Skills: ar¦")?.includes("Arcana"));
  assert.ok(names("Expertise: st¦")?.includes("Stealth"));
  assert.ok(names("Languages: dr¦")?.includes("Draconic"));
  assert.ok(names("Tools: thi¦")?.includes("Thieves' Tools"));
  assert.ok(names("Feature: elv¦")?.includes("Elven Lineage"), "D298: a lineage trait is still a Feature name (the 0.9 form reads, W006)");
  assert.ok(names("Equipment: long¦")?.includes("Longsword"), "a 0.7 alias reads as its 0.8 key");
});

test("D156: Feat (…) markers narrow to that category; fighting styles include the 2014 options", () => {
  assert.deepEqual(names("Feat (Origin): ma¦"), ["Magic Initiate"]);
  assert.ok(!names("Feat (Origin): bo¦")?.length, "no epic boons as origin feats");
  assert.ok(names("Feat (Epic Boon): bo¦")?.includes("Boon of Fate"));
  assert.ok(names("Feat (Fighting Style): de¦")?.includes("Defense"));
  assert.ok(names("Feat (Fighting Style): pro¦")?.includes("Protection"), "a 2014 fighting style (optional feature)");
  assert.ok(names("Fighting Style: pro¦")?.includes("Protection"), "the 0.7 key");
});

test("D156: a level block's class leads, nothing is hidden", () => {
  const wiz = names("Classes: Wizard 5\n\nL5 Wizard\nSpells: fireb¦", 20) ?? [];
  const cle = names("Classes: Cleric 5\n\nL5 Cleric\nSpells: fi¦", 20) ?? [];
  assert.equal(wiz[0], "Fireball");
  assert.ok(cle.includes("Fireball"), "a non-cleric spell is still offered");
  assert.ok(cle.indexOf("Find Traps") < cle.indexOf("Fireball"), "cleric spells first");
  assert.ok(cle.indexOf("Fireball") < cle.indexOf("Fire Storm"), "a cleric spell above the cleric's level comes last (D162)");
  assert.ok(names("Classes: Warlock 2\n\nL2 Warlock\nOptions: ar¦")?.[0].startsWith("Armor of Shadows"));
  assert.equal(names("Classes: Cleric 3\nSubclass: o¦")?.[0], "Oath of Devotion", "16 subclasses: 1 letter (D164)");
  assert.deepEqual(names("Classes: Cleric 3\nSubclass: do¦"), ["Life Domain"], "a word start");
  const sub = names("Classes: Cleric 3\nSubclass: li¦") ?? [];
  assert.equal(sub[0], "Life Domain");
  assert.equal(names("Classes: Fighter 3 / Cleric 1\n\nL1 Fighter\nL2 Cleric\nSpells: cu¦")?.[0], "Cure Wounds", "the cursor's block, not the last header");
});

test("D156: inside [ ] the list follows the slot the table knows", () => {
  assert.deepEqual(names("Feat: Magic Initiate [wi¦"), ["WIS"], "the feat's ability slot");
  assert.deepEqual(names("Feat: Magic Initiate [st¦"), [], "STR isn't one Magic Initiate takes");
  assert.deepEqual(names("Feat: Magic Initiate [WIS; cl¦"), ["Cleric"], "the class versions");
  const cantrips = names("Feat: Magic Initiate [WIS; Cleric; gu¦") ?? [];
  assert.deepEqual(cantrips, ["Guidance"], "that class's cantrips");
  assert.deepEqual(names("Feat: Magic Initiate [WIS; Wizard; gu¦"), [], "Guidance isn't a wizard cantrip");
  assert.ok(names("Feat: Magic Initiate [WIS; Cleric; Guidance, sa¦")?.includes("Sacred Flame"));
  assert.ok(!names("Feat: Magic Initiate [WIS; Cleric; Guidance, gu¦")?.length, "names already in the group aren't offered");
  assert.deepEqual(names("Feat: Magic Initiate [WIS; Cleric; Guidance; bl¦"), ["Bless"], "1st-level spells of that class");
  assert.deepEqual(names("Feat: Ability Score Improvement [+2 ch¦"), ["CHA"], "an ASI's ability after the amount");
  assert.deepEqual(names("Feat: Boon of Irresistible Offense [de¦"), ["DEX"]);
  assert.deepEqual(names("Rules: 2024\nSpecies: Elf [hi¦"), ["High"], "D291: the lineage first, short (D289)");
  assert.deepEqual(names("Rules: 2024\nSpecies: Elf [High; in¦"), ["INT"], "then its ability");
  assert.deepEqual(names("Species: Dragonborn [re¦"), ["Red"]);
  assert.deepEqual(names("Rules: 2014\nSpecies: Elf [¦"), ["High", "Wood"], "D291: a 2014 elf's subraces");
  assert.deepEqual(names("Rules: 2024\nSpecies: Elf|PHB [¦"), ["High", "Wood"], "the book the source names");
  assert.deepEqual(names("Rules: 2014\nSpecies: Elf|XPHB [¦"), ["Drow", "High", "Wood"]);
  assert.deepEqual(names("Rules: 2024\nSpecies: Gnome [Rock; ¦"), ["CHA", "INT", "WIS"], "D290: the supplement's ability");
  assert.deepEqual(names("Species: Half-Orc [¦") ?? [], [], "a species with no lineage offers nothing");
  assert.deepEqual(names("Rules: 2024\nSpecies: Elf\nFeature: Elven Lineage [in¦"), ["INT"], "D298: a 0.9 lineage line, ability first");
  assert.deepEqual(names("Rules: 2024\nSpecies: Elf\nFeature: Elven Lineage [WIS; ¦"), ["Drow", "High", "Wood"], "then the lineage");
  assert.deepEqual(names("Species: Dragonborn\nFeature: Draconic Ancestry [re¦"), ["Red"], "no ability: the lineage first");
  assert.deepEqual(names("Feature: Spellcasting [ch¦"), ["CHA"]);
  assert.ok(names("Options: Agonizing Blast [el¦")?.includes("Eldritch Blast"), "an option's picks are cantrips");
  assert.ok(!names("Options: Agonizing Blast [fireb¦")?.length);
});

test("D156, D266: an unknown feat's slot gets the general list; an unknown feature's brackets offer nothing", () => {
  assert.deepEqual(names("Feat: Homebrew Thing [co¦")?.slice(0, 1), ["CON"]);
  const g = names("Feat: Homebrew Thing [ar¦", 20) ?? [];
  assert.ok(g.includes("Arcana"));
  assert.ok(g.includes("Arcane Eye") || g.includes("Arcane Lock"));
  assert.deepEqual(names("Feature: Homebrew Gift [ar¦", 20) ?? [], []);
  assert.deepEqual(names("Feature: Elf Lineage [¦", 20) ?? [], [], "the trait is Elven Lineage");
});

test("D155: sources follow Rules", () => {
  assert.equal(sourceFor(1 | 2, null), null, "no Rules: bare");
  assert.equal(sourceFor(1 | 2, "2024"), null, "in the Rules edition: bare");
  assert.equal(sourceFor(1, "2024"), "PHB", "only in 2014");
  assert.equal(sourceFor(4, "2024"), "DMG");
  assert.equal(sourceFor(8, "2014"), "XDMG");
  assert.equal(sourceFor(0, "2024"), null, "skills and abilities have no book");
  assert.deepEqual(first("Rules: 2024\nSpells: fireb¦"), { name: "Fireball", source: null, tag: "3rd" });
  const old = N.SPELLS.find((s) => s[1] === 1 && s[2] > 0);   // a 2014-only spell
  assert.ok(old, "the table has a 2014-only spell");
  const s = spot(`Rules: 2024\nSpells: ${old[0].slice(0, 6)}¦`);
  assert.ok(s);
  assert.ok(suggest(N, s, 50).some((x) => x.name === old[0] && x.source === "PHB"));
  assert.equal(take("Rules: 2024\nSpells: Fireball, mag¦ic"), "Rules: 2024\nSpells: Fireball, Mage Armor");
  assert.equal(take("Spells: fireb¦|PHB"), "Spells: Fireball|PHB", "a written source stays and none is added");
});

test("D159: no names from books other than PHB, XPHB, DMG, XDMG", () => {
  assert.ok(!names("Species: tiefling (a¦")?.some((n) => /Asmodeus/.test(n)));
  for (const rows of [N.SPELLS, N.FEATS, N.OPTIONS, N.ITEMS, N.SPECIES, N.BACKGROUNDS, N.SUBCLASSES, N.CLASS_ROWS]) {
    for (const r of rows) assert.ok(r[1] >= 1 && r[1] < 16, `${r[0]}: books ${r[1]}`);
  }
});

test("insertion: the name under the cursor is replaced whole, its drop, quotes and details kept", () => {
  assert.equal(take("Spells: Fireball, misty¦"), "Spells: Fireball, Misty Step");
  assert.equal(take("Spells: misty¦ st, Fireball"), "Spells: Misty Step, Fireball", "the rest of the word goes too");
  assert.equal(take("L5 Wizard\nSpells: -mag¦"), "L5 Wizard\nSpells: -Mage Armor", "a drop keeps its -");
  assert.equal(take("Feat: magic i¦ [WIS; Cleric]"), "Feat: Magic Initiate [WIS; Cleric]");
  assert.equal(take("Gear: rop¦ x2"), "Gear: Rope x2".replace("Rope", names("Gear: rop¦")?.[0] ?? ""));
  assert.equal(take("Feat: Magic Initiate [WIS; Cleric; gu¦]"), "Feat: Magic Initiate [WIS; Cleric; Guidance]");
  assert.equal(take("Feat: Ability Score Improvement [+2 ch¦]"), "Feat: Ability Score Improvement [+2 CHA]");
  assert.equal(take("Classes: Fighter 1 / wa¦ 2"), "Classes: Fighter 1 / Warlock 2");
  assert.equal(take("L3 Wiz¦"), "L3 Wizard");
});

test("insertion: names that need quotes get them (SPEC §3.1)", () => {
  const bag = N.ITEMS.find((i) => i[0].includes(","));
  assert.ok(bag, "an item name with a comma");
  const typed = bag[0].split(",")[0];
  const s = spot(`Gear: ${typed}¦`);
  assert.ok(s);
  const pick = suggest(N, s, 50).find((x) => x.name === bag[0]);
  assert.ok(pick);
  assert.equal(written(s, pick), `"${bag[0]}"`);
  assert.equal(take('Gear: "bag of tr¦'), `Gear: ${written(spot('Gear: "bag of tr¦') as Spot, suggest(N, spot('Gear: "bag of tr¦') as Spot)[0])}`);
});

test("D162: spell rows show their level; above the class's level they rank last, dimmed, still offered", () => {
  const sp = spot("Rules: 2024\nClasses: Wizard 5\n\nL5 Wizard\nSpells: mi¦");
  assert.ok(sp);
  assert.equal(spellCap(N, sp), 3, "a 5th-level wizard picks up to 3rd");
  const rows = suggest(N, sp, 20);
  const misty = rows.find((r) => r.name === "Misty Step");
  const blank = rows.find((r) => r.name === "Mind Blank");
  assert.deepEqual(misty, { name: "Misty Step", source: null, tag: "2nd" });
  assert.deepEqual(blank, { name: "Mind Blank", source: null, tag: "8th", dim: true });
  assert.ok(rows.indexOf(misty) < rows.indexOf(blank));
  assert.ok(rows.slice(rows.indexOf(blank)).every((r) => r.dim), "the dimmed rows come last");
  // The block's own class level, by the reading rule: L3 of a Fighter 2 / Wizard 1 build is wizard level 1.
  const mc = spot("Classes: Fighter 2 / Wizard 3\n\nL1 Fighter\nL3 Wizard\nSpells: ¦");
  assert.ok(mc);
  assert.equal(spellCap(N, mc), 1);
  // Half casters by edition: a 2014 paladin has no spells at 1, a 2024 one has 1st.
  assert.equal(spellCap(N, spot("Rules: 2014\nClasses: Paladin 1\n\nL1 Paladin\nSpells: ¦")!), 0);
  assert.equal(spellCap(N, spot("Rules: 2024\nClasses: Paladin 1\n\nL1 Paladin\nSpells: ¦")!), 1);
  assert.equal(spellCap(N, spot("Classes: Warlock 11\n\nL11 Warlock\nSpells: ¦")!), 6, "Mystic Arcanum");
  assert.equal(spellCap(N, spot("Classes: Fighter 5\n\nL5 Fighter\nSpells: ¦")!), null, "no table: nothing dimmed");
  assert.ok(!suggest(N, spot("Spells: mi¦")!, 50).some((r) => r.dim), "no class: nothing dimmed");
  assert.equal(names("Cantrips: fi¦")?.[0], "Fire Bolt");
  assert.ok(!suggest(N, spot("Cantrips: fi¦")!).some((r) => r.tag), "a list of cantrips doesn't say cantrip");
  assert.ok(suggest(N, spot("Feat: Homebrew Gift [fire¦")!, 20).some((r) => r.name === "Fire Bolt" && r.tag === "cantrip"));
});

test("D163: inside [ ] the hint names each ; group the table knows, the cursor's group marked", () => {
  const hint = (src: string) => { const s = spot(src); const h = s ? slotHint(N, s) : null; return h && { slots: h.slots, at: h.at }; };
  assert.deepEqual(hint("Feat: Magic Initiate [¦"), { slots: ["ability", "class", "2 cantrips", "1st-level spell"], at: 0 });
  assert.deepEqual(hint("Feat: Magic Initiate [WIS; Cleric; ¦")?.at, 2);
  assert.deepEqual(hint("Feature: Divine Order [¦"), { slots: ["option"], at: 0 });
  assert.deepEqual(hint("Rules: 2024\nSpecies: Elf [Drow; ¦"), { slots: ["lineage", "ability"], at: 1 }, "D291: lineage, then ability");
  assert.deepEqual(hint("Species: Tiefling|XPHB [¦"), { slots: ["legacy", "ability"], at: 0 });
  assert.deepEqual(hint("Species: Goliath [¦"), { slots: ["ancestry"], at: 0 });
  assert.deepEqual(hint("Rules: 2014\nSpecies: Dwarf [¦"), { slots: ["subrace"], at: 0 });
  assert.deepEqual(hint("Feat: Ability Score Improvement [¦")?.slots, ["+2 ability, or +1 and +1"]);
  assert.equal(hint("Feat: Homebrew Gift [¦"), null, "an unknown slot has no hint");
  assert.equal(hint("Spells: Fire¦"), null, "outside [ ]");
  assert.ok(names("Classes: Cleric 1\n\nL1 Cleric\nFeature: di¦")?.includes("Divine Order"), "Feature offers the class features with a choice");
});

test("D163 review: a pick inside [ ] starts the next name or group; Thaumaturge and Magician add a cantrip group", () => {
  const after = (src: string, picked: string) => { const s = spot(src); assert.ok(s); return afterPick(N, s, picked); };
  assert.equal(after("Feat: Magic Initiate [¦]", "WIS"), "; ", "one ability, then the class");
  assert.equal(after("Feat: Magic Initiate [WIS; Cleric; ¦]", "Guidance"), ", ", "2 cantrips: the second next");
  assert.equal(after("Feat: Magic Initiate [WIS; Cleric; Guidance, ¦]", "Light"), "; ", "full: the spell group");
  assert.equal(after("Feat: Magic Initiate [WIS; Cleric; Guidance, Light; ¦]", "Bless"), "", "the last group");
  assert.equal(after("Feature: Divine Order [¦]", "Protector"), "", "Protector has no second group");
  assert.equal(after("Feature: Divine Order [¦]", "Thaumaturge"), "; ");
  assert.equal(after("Feat: Homebrew Gift [¦]", "Arcana"), "", "an unknown slot isn't counted");
  assert.deepEqual(slotHint(N, spot("Feature: Divine Order [Thaumaturge; ¦]")!)?.slots, ["option", "cantrip"]);
  assert.deepEqual(names("Feature: Divine Order [Thaumaturge; gu¦]"), ["Guidance"]);
  assert.deepEqual(names("Feature: Primal Order [Magician; dr¦]"), ["Druidcraft"]);
  assert.deepEqual(names("Feature: Divine Order [Protector; gu¦]"), [], "no cantrip group after Protector");
});

test("D172 (trial): every empty name spot opens its list, after `: `, after `, ` and inside `[ ]`, whatever its size", () => {
  assert.equal(OPEN_EVERY_SPOT, true);
  assert.equal(minTyped(300), 0);
  assert.equal(names("Spells: ¦")?.length, 8, "hundreds of spells, before a letter");
  assert.equal(names("Skills: ¦")?.length, 8);
  assert.ok(names("Species: ¦")?.length, "a one-pick key");
  const after = names("Rules: 2024\nClasses: Cleric 1\n\nL1 Cleric\nCantrips: Guidance, ¦");
  assert.ok(after?.length && !after.includes("Guidance"), "after a comma, the names already there left out");
  assert.equal(spot("Spe¦"), null, "still nothing where no name goes");
});

/** The keys offered at `¦` (D170), or null where no key is being typed. */
function keysAt(src: string): string[] | null {
  const text = src.replace("¦", "");
  const ks = keySpotAt(text, src.indexOf("¦"));
  return ks ? suggestKeys(text, ks) : null;
}

test("D170: a letter at a line's start suggests the keys its block allows, from the hint strip; never on an empty line or the name line", () => {
  assert.deepEqual(keysAt("Vice\nRules: 2024\nSpe¦"), ["Species", "Spells"]);
  assert.deepEqual(keysAt("Vice\nRules: 2024\nspec¦"), ["Species"], "any case");
  assert.deepEqual(keysAt("Vice\nRules: 2024\nrul¦"), [], "Rules is already there");
  assert.ok(keysAt("Vice\nRules: 2024\n\nL1 Cleric\nC¦")?.includes("Cantrips"), "a level block's keys");
  assert.deepEqual(keysAt("Vice\nRules: 2024\n\nL1 Wizard\nSpe¦"), ["Spells"], "a level block opens no Species block");
  assert.deepEqual(keysAt("Vice\nZz¦"), [], "nothing fits");
  assert.equal(keysAt("Vice\n¦"), null, "an empty line opens nothing");
  assert.equal(keysAt("Vic¦"), null, "the first line is the build's name");
  assert.equal(keysAt("Vice\nSpe¦cies"), null, "the cursor inside a word");
  assert.equal(keysAt("Vice\nL5 Wiz¦"), null, "a level header");
  assert.equal(keysAt("Vice\nSpecies: E¦"), null, "a value");
  const text = "Vice\n  Spe  ";
  const ks = keySpotAt(text, text.length - 2);
  assert.deepEqual(ks && [text.slice(ks.start, ks.end), ks.typed], ["Spe  ", "Spe"], "a pick replaces from the key's first letter to the line's end");
});

test("D171: a key pick writes `Key: ` with the cursor after it; `Feat (…)` puts it in the parentheses", () => {
  assert.deepEqual(writtenKey("Species"), { text: "Species: ", cursor: 9 });
  const f = writtenKey("Feat (…)");
  assert.equal(f.text, "Feat (): ");
  assert.equal(f.text.slice(0, f.cursor), "Feat (");
  // The value list opens on the written key's empty spot.
  assert.ok(names("Vice\nSpecies: ¦")?.length);
});

test("D174: the ghost text names the kind of name a short counted line still wants, at its end, outside `[ ]`", () => {
  const base = "Vice\nRules: 2024\nClasses: Cleric 1\n\nL1 Cleric\n";
  const at = (src: string, short = new Set([6])) => ghostWord((base + src).replace("¦", ""), base.length + src.indexOf("¦"), short);
  assert.deepEqual(at("Cantrips: Guidance, ¦"), { line: 6, word: "cantrip" });
  assert.deepEqual(at("Cantrips: Guidance,¦"), { line: 6, word: " cantrip" }, "a space when the line doesn't end in one");
  assert.deepEqual(at("Cantrips: ¦"), { line: 6, word: "cantrip" }, "an empty line still owed");
  assert.deepEqual(at("Spells: Bless, ¦")?.word, "spell");
  assert.deepEqual(at("Skills: ¦")?.word, "skill");
  assert.equal(at("Cantrips: Guidance, ¦", new Set()), null, "the count is met");
  assert.equal(at("Cantrips: Guidance, L¦"), null, "gone at the first letter");
  assert.equal(at("Cantrips: ¦, Guidance"), null, "not at the line's end");
  assert.equal(at("Feat: Magic Initiate [¦]"), null, "inside [ ]");
  assert.equal(at("Gear: Rope, ¦"), null, "a line with no count");
});

test("D165: Masteries offers weapons with a mastery property, never other gear", () => {
  const sh = names("Masteries: sh¦") ?? [];
  assert.ok(sh.includes("Shortsword") && sh.includes("Shortbow"), "weapons");
  for (const gear of ["Shovel", "Shield", "Shawm"]) assert.ok(!sh.includes(gear), `${gear} is not a weapon`);
  assert.ok(!names("Masteries: rope¦")?.length && !names("Masteries: back¦")?.length, "no adventuring gear");
});

test("D186: a family line offers its family only; an Options (<marker>) line filters by its marker; plain Options all", () => {
  const meta = names("Classes: Sorcerer 3\nMetamagic: ¦", 50) ?? [];
  assert.ok(meta.length >= 8 && meta.includes("Twinned Spell"));
  assert.ok(!meta.includes("Agonizing Blast") && !meta.includes("Archery"), "no invocation, no fighting style");
  const inv = names("Invocations: ¦", 80) ?? [];
  assert.ok(inv.includes("Agonizing Blast") && !inv.includes("Twinned Spell"));
  assert.deepEqual(names("Options (Invocation): ¦", 80), inv, "a folded marker reads as its family key");
  assert.deepEqual(names("Options (Eldritch Invocations): ¦", 80), inv, "an open marker matched to the table's family names");
  const fs = names("Options (Fighting Style): ¦", 20) ?? [];
  assert.ok(fs.includes("Archery") && !fs.includes("Agonizing Blast"));
  assert.ok((names("Options (Zzz): ¦", 80) ?? []).includes("Twinned Spell"), "an unknown marker takes any option");
  assert.ok((names("Options: ¦", 80) ?? []).includes("Twinned Spell") && (names("Options: ¦", 80) ?? []).includes("Agonizing Blast"));
  assert.deepEqual(names("Maneuvers: ¦"), [], "a family the loaded data lacks: nothing to offer");
});

test("D186: the pacts follow the edition: Pact Boon in 2014, invocations in 2024; without Rules, both", () => {
  const pacts = (xs: string[] | null) => (xs ?? []).filter((x) => x.startsWith("Pact of"));
  assert.deepEqual(pacts(names("Rules: 2014\nPact Boon: ¦")), ["Pact of the Blade", "Pact of the Chain", "Pact of the Tome"]);
  assert.deepEqual(pacts(names("Rules: 2024\nPact Boon: ¦")), [], "2024 has no pact boons: none offered under a PHB source");
  assert.deepEqual(pacts(names("Rules: 2024\nInvocations: Pact¦")), ["Pact of the Blade", "Pact of the Chain", "Pact of the Tome"]);
  assert.deepEqual(pacts(names("Rules: 2014\nInvocations: Pact¦")), [], "2014 pacts are boons, not invocations");
  assert.equal(first("Rules: 2024\nInvocations: Pact of the T¦")?.source, null, "the 2024 row: no source to write");
  assert.deepEqual(pacts(names("Pact Boon: ¦")).length, 3);
  assert.deepEqual(pacts(names("Invocations: Pact¦")).length, 3);
  // The Book of Shadows' cantrips: both editions' Pact of the Tome, on either key.
  assert.deepEqual(slotHint(N, spot("Rules: 2014\nPact Boon: Pact of the Tome [¦")!)?.slots, ["3 cantrips"]);
  assert.deepEqual(slotHint(N, spot("Rules: 2024\nInvocations: Pact of the Tome [¦")!)?.slots, ["3 cantrips"]);
  assert.ok((names("Invocations: Agonizing Blast [¦") ?? []).includes("Eldritch Blast"), "the bracket branch reads the family key as Options");
});

test("D184: a capped line's own cap dims the spells above it, in place of the class's (D162)", () => {
  const rows = (src: string) => { const s = spot(src); return s ? suggest(N, s, 400) : []; };
  const at11 = "Rules: 2024\nClasses: Warlock 11\n";
  assert.equal(spot(at11 + "Spells (3rd): ¦")?.cap, 3);
  assert.equal(spot(at11 + "Spells: ¦")?.cap, null);
  // D243: off-list spells are dimmed now, so the cap is checked on Warlock spells (Counterspell 3rd, Banishment 4th).
  assert.equal(rows(at11 + "Spells (3rd): counter¦").find((r) => r.name === "Counterspell")?.dim, undefined, "3rd: under the cap");
  assert.equal(rows(at11 + "Spells (3rd): banis¦").find((r) => r.name === "Banishment")?.dim, true, "4th: above the line's cap though the warlock casts it");
  assert.equal(rows(at11 + "Spells: banis¦").find((r) => r.name === "Banishment")?.dim, undefined, "uncapped: the class's cap (D162)");
  assert.equal(rows("Rules: 2024\nClasses: Wizard 1\nPrepared (6th): fire¦").find((r) => r.name === "Fireball")?.dim, undefined,
    "the line's cap wins over the class's too");
});

test("D186: family lines get the ghost text of their kind", () => {
  assert.deepEqual(ghostWord("Invocations: Agonizing Blast,", 29, new Set([1])), { line: 1, word: " invocation" });
  assert.deepEqual(ghostWord("Pact Boon: ", 11, new Set([1])), { line: 1, word: "pact boon" });
  assert.deepEqual(ghostWord("Spells (6th): ", 14, new Set([1])), { line: 1, word: "spell" });
  const sg = (t: string) => ghostWord(t, t.length, new Set(), N)?.word;
  assert.equal(sg("Rules: 2024\nSpecies: Tiefling"), " [legacy]", "D291: the trait's word");
  assert.equal(sg("Rules: 2014\nSpecies: Dwarf"), " [subrace]", "D296: a 2014 species with subraces");
  assert.equal(sg("Rules: 2024\nSpecies: Dwarf"), undefined, "the 2024 dwarf has none");
});

test("D190, D212: a whole-list preparer's block offers no Spells key, 2014 too; a Wizard's does", () => {
  assert.deepEqual(keysAt("Vice\nRules: 2024\n\nL1 Cleric\nSpe¦"), [], "Cleric prepares from its list");
  assert.deepEqual(keysAt("Vice\nRules: 2024\n\nL1 Cleric\nPre¦"), ["Prepared"]);
  assert.deepEqual(keysAt("Vice\n\nL1 Paladin|XPHB\nSpe¦"), [], "the class's own source picks the table");
  assert.deepEqual(keysAt("Vice\nRules: 2024\n\nL1 Wizard\nSpe¦"), ["Spells"]);
  assert.deepEqual(keysAt("Vice\nRules: 2014\n\nL1 Cleric\nSpe¦"), [], "D212 (T09): a 2014 Cleric as in 2024");
  assert.deepEqual(keysAt("Vice\nRules: 2014\n\nL2 Ranger\nSpe¦"), ["Spells"], "a 2014 Ranger knows its spells");
  assert.deepEqual(keysAt("Vice\n\nL1 Cleric\nSpe¦"), ["Spells"], "no edition: no table to go by");
});

test("D219 (T29, review): under Rules, the edition's own names rank first; the other edition's are dimmed", () => {
  const s = spot("Vice\nRules: 2024\n\nSpecies: E¦");
  const rows = s ? suggest(N, s, 8) : [];
  assert.deepEqual(rows.map((r) => [r.name, r.source, Boolean(r.dim)]),
    [["Elf", null, false], ["Half-Elf", "PHB", true]]);
  const old = spot("Vice\nRules: 2014\n\nSpecies: G¦");
  assert.deepEqual((old ? suggest(N, old, 8) : []).map((r) => [r.name, Boolean(r.dim)]).slice(0, 2),
    [["Gnome", false], ["Goliath", true]], "D291: no 2014 subrace is a species name");
  const none = spot("Vice\n\nSpecies: E¦");
  assert.ok((none ? suggest(N, none, 8) : []).every((r) => !r.dim), "no Rules: no edition to go by");
});

test("D227: a species' or class's short skill list leads; the skills it can't take are dimmed, last, still offered", () => {
  const rows = (src: string) => { const s = spot(src); return s ? suggest(N, s, 18) : []; };
  const elf = rows("Rules: 2024\nClasses: Wizard 5\n\nSpecies: Elf\nSkills: ¦");
  assert.deepEqual(elf.filter((r) => !r.dim).map((r) => r.name), ["Insight", "Perception", "Survival"]);
  assert.equal(elf.length, 18, "every skill still offered");
  for (const sp of ["Elf [Drow; WIS]", "Elf|XPHB [Drow]"]) {
    const drow = rows(`Rules: 2024\nClasses: Wizard 5\n\nSpecies: ${sp}\nSkills: ¦`);
    assert.deepEqual(drow.filter((r) => !r.dim).map((r) => r.name), ["Insight", "Perception", "Survival"], `D292 review: ${sp} keeps its species' list`);
  }
  assert.ok(elf.slice(3).every((r) => r.dim), "the rest last, dimmed");
  const wiz = rows("Rules: 2024\nClasses: Wizard 5\n\nL1 Wizard\nSkills: ¦");
  assert.ok(wiz.find((r) => r.name === "Arcana" && !r.dim) && wiz.find((r) => r.name === "Stealth")?.dim, "the class's list at the build's L1");
  const multi = rows("Rules: 2024\nClasses: Wizard 1 / Rogue 1\n\nL1 Wizard\n\nL2 Rogue\nSkills: ¦");
  assert.equal(multi.find((r) => r.name === "Arcana")?.dim, true, "a Rogue joining later: its multiclass list");
  assert.equal(multi.find((r) => r.name === "Stealth")?.dim, undefined);
  assert.ok(rows("Rules: 2014\nClasses: Wizard 5\n\nSpecies: Elf\nSkills: ¦").every((r) => !r.dim), "a 2014 Elf chooses no skill: no short list");
  assert.ok(rows("Rules: 2024\nClasses: Wizard 5\nSkills: ¦").every((r) => !r.dim), "a header line: no short list");
  assert.ok(rows("Rules: 2024\nClasses: Wizard 1 / Bard 1\n\nL1 Wizard\n\nL2 Bard\nSkills: ¦").every((r) => !r.dim), "a list of every skill dims none");
});

test("D229: a click into an empty [ ] opens the list; a filled or closed one doesn't", () => {
  const at = (src: string) => inEmptyBrackets(src.replace("¦", ""), src.indexOf("¦"));
  assert.ok(at("Feature: Elven Lineage [¦]"));
  assert.ok(at("Feature: Elven Lineage [ ¦ ]\nSkills:"));
  assert.ok(!at("Feature: Elven Lineage [Drow¦]"));
  assert.ok(!at("Feature: Elven Lineage [Drow; ¦]"), "a later group: the list opens as you type");
  assert.ok(!at("Feature: Elven Lineage¦ [ ]"));
});

test("D229 (review): the last pick in [ ] leaves no stray spaces inside the brackets", () => {
  const t = "Feature: Elven Lineage [ Dr  ]";
  const [a, b] = bracketTrim(t, t.indexOf("Dr"), t.indexOf("Dr") + 2);
  assert.equal(t.slice(0, a) + "Drow" + t.slice(b), "Feature: Elven Lineage [Drow]");
  const u = "Feature: Elven Lineage [INT; Dr ]";
  const [c, d] = bracketTrim(u, u.indexOf("Dr"), u.indexOf("Dr") + 2);
  assert.equal(u.slice(0, c) + "Drow" + u.slice(d), "Feature: Elven Lineage [INT; Drow]", "the space after ; stays");
});

test("D241: a Subclass line lists its class's subclasses first; the others follow dimmed, still pickable", () => {
  const rows = (src: string) => { const s = spot(src); return s ? suggest(N, s, 40).map((x) => `${x.name}${x.dim ? "~" : ""}`) : null; };
  // The header: the Classes classes lead. The 2014 printing of the class's own comes before another class's.
  const head = rows("Rules: 2024\nClasses: Wizard 3\nSubclass: ¦")!;
  assert.deepEqual(head.slice(0, 2), ["Evoker", "School of Evocation~"]);
  assert.ok(head.slice(2).every((x) => x.endsWith("~")), "every other class's subclass is dimmed");
  assert.ok(head.includes("Champion~"), "still offered");
  // A level block: that block's class, not the header's other classes.
  const block = rows("Rules: 2024\nClasses: Wizard 3 / Fighter 3\n\nL3 Fighter\nSubclass: ¦")!;
  assert.equal(block[0], "Champion");
  assert.ok(block.includes("Evoker~"));
  // Two classes in the header: both lead.
  const both = rows("Rules: 2024\nClasses: Wizard 3 / Fighter 3\nSubclass: ¦")!;
  assert.deepEqual(new Set(both.slice(0, 2)), new Set(["Champion", "Evoker"]));
  // Typed letters still find another class's subclass, dimmed.
  assert.deepEqual(rows("Rules: 2024\nClasses: Wizard 3\nSubclass: Cham¦"), ["Champion~"]);
  // No class known: nothing dimmed.
  assert.ok(rows("Subclass: ¦")!.every((x) => !x.endsWith("~")));
});

test("D242: a pick that asks a detail opens its brackets; one that takes none doesn't", () => {
  const opens = (src: string, name: string, rest = "") => {
    const s = spot(src);
    assert.ok(s, `a spot in ${src}`);
    const pick = suggest(N, s, 40).find((x) => x.name === name) ?? { name, source: null };
    return opensDetails(N, s, pick, rest);
  };
  // Feats with an ability, versions or spells to pick; the printing follows Rules.
  assert.equal(opens("Rules: 2024\nFeat: Magic Ini¦", "Magic Initiate"), true);
  assert.equal(opens("Rules: 2024\nFeat: Grap¦", "Grappler"), true);
  assert.equal(opens("Rules: 2014\nFeat: Grap¦", "Grappler"), false, "the 2014 Grappler asks nothing");
  assert.equal(opens("Rules: 2024\nFeat: Ale¦", "Alert"), false);
  // Options with picks: the 2024 invocation asks its cantrip, the 2014 one doesn't; a pact boon in both.
  assert.equal(opens("Rules: 2024\nInvocations: Agoniz¦", "Agonizing Blast"), true);
  assert.equal(opens("Rules: 2014\nInvocations: Agoniz¦", "Agonizing Blast"), false);
  assert.equal(opens("Rules: 2014\nPact Boon: Pact of the T¦", "Pact of the Tome"), true);
  // Chosen forms (D195), class feature options, a species that owes its lineage (D291).
  assert.equal(opens("Rules: 2024\nInvocations: Pact of the Ch¦", "Pact of the Chain"), true);
  assert.equal(opens("Rules: 2024\nSpells: Find Fam¦", "Find Familiar"), true);
  assert.equal(opens("Feature: Divine Or¦", "Divine Order"), true);
  assert.equal(opens("Feature: Elven Lin¦", "Elven Lineage"), true, "D298: a 0.9 lineage line opens its brackets");
  assert.equal(opens("Rules: 2024\nSpecies: El¦", "Elf"), true);
  assert.equal(opens("Rules: 2014\nSpecies: El¦", "Elf"), true, "D296: a 2014 species with subraces opens them too");
  assert.equal(opens("Rules: 2024\nSpecies: Dwa¦", "Dwarf"), false, "D296: the 2024 dwarf has no lineage");
  assert.equal(opens("Rules: 2014\nSpecies: Dragon¦", "Dragonborn", ""), false);
  assert.equal(opens("Rules: 2024\nSpecies: Hum¦", "Human"), false);
  // None: a plain spell, a name inside brackets, brackets already there, a source already there.
  assert.equal(opens("Rules: 2024\nSpells: Magic Miss¦", "Magic Missile"), false);
  assert.equal(opens("Options: Lessons of the First Ones [Magic Ini¦", "Magic Initiate"), false, "details don't nest");
  assert.equal(opens("Rules: 2024\nFeat: Magic Ini¦", "Magic Initiate", " [INT]"), false);
  assert.equal(opens("Rules: 2024\nFeat: Magic Ini¦|XPHB", "Magic Initiate"), false);
  // A form's brackets offer no names: the list has no forms.
  assert.deepEqual(names("Spells: Find Familiar [¦]"), []);
});

test("D243: where the line's class is clear, its spells, features and options lead; the rest is dimmed, still offered", () => {
  const rows = (src: string, limit = 400) => { const s = spot(src); return s ? suggest(N, s, limit) : []; };
  const dim = (src: string, name: string) => rows(src).find((r) => r.name === name)?.dim;
  // Spells in a level block: the class's list leads; another class's spell is dimmed; over-level class spells stay last (D162).
  const cle = rows("Classes: Cleric 5\n\nL5 Cleric\nSpells: fi¦", 40).map((r) => r.name);
  assert.equal(dim("Classes: Cleric 5\n\nL5 Cleric\nSpells: fi¦", "Fireball"), true);
  assert.equal(dim("Classes: Cleric 5\n\nL5 Cleric\nSpells: fi¦", "Find Traps"), undefined);
  assert.ok(cle.indexOf("Find Traps") < cle.indexOf("Fireball") && cle.indexOf("Fireball") < cle.indexOf("Fire Storm"));
  assert.equal(dim("Classes: Wizard 1\n\nL1 Wizard\nCantrips: guid¦", "Guidance"), true, "cantrips too");
  // The header with Classes counts; a Species block has no class filter (a species spell may come from any list).
  assert.equal(dim("Classes: Wizard 5\nSpells: cure¦", "Cure Wounds"), true);
  assert.equal(dim("Classes: Wizard 5\n\nSpecies: Elf\nCantrips: guid¦", "Guidance"), undefined);
  assert.equal(dim("Spells: cure¦", "Cure Wounds"), undefined, "no class: nothing dimmed");
  // Class features: the block's class leads.
  assert.equal(dim("Classes: Cleric 1\n\nL1 Cleric\nFeature: ¦", "Divine Order"), undefined);
  assert.equal(dim("Classes: Cleric 1\n\nL1 Cleric\nFeature: ¦", "Primal Order"), true);
  // Review: a Species block dims every class feature. D298: the lineage traits are offered, not dimmed.
  assert.equal(dim("Classes: Cleric 1\n\nSpecies: Elf\nFeature: ¦", "Divine Order"), true);
  assert.equal(dim("Classes: Cleric 1\n\nSpecies: Elf\nFeature: ¦", "Elven Lineage"), undefined);
  assert.equal(dim("Feature: ¦", "Divine Order"), undefined, "the header: no placement filter");
  // A plain Options line: the class's families lead; a family key is already filtered, so nothing is dimmed there.
  assert.equal(dim("Classes: Warlock 2\n\nL2 Warlock\nOptions: ¦", "Agonizing Blast"), undefined);
  assert.equal(dim("Classes: Warlock 2\n\nL2 Warlock\nOptions: ¦", "Quickened Spell"), true);
  assert.ok(rows("Classes: Warlock 2\n\nL2 Warlock\nInvocations: ¦").every((r) => !r.dim || r.source));
});

test("D302: the list opens on an empty key line however it got there (wizard, paste, Tidy, template, menu)", () => {
  const LIST = /^(Skills|Cantrips|Spells|Feat|Gear|Tools|Masteries|Options|Expertise|Feature|Subclass|Species|Background|Prepared)\b[^:]*:/;
  /** Every list key line in `text`: a click at its end opens the list, and a name typed there (glued to the `:`, as
   *  after a click on `Spells:`) is offered and written with its space. */
  const check = (text: string, what: string) => {
    let pos = 0, seen = 0;
    for (const line of text.split("\n")) {
      const end = pos + line.length;
      pos = end + 1;
      if (!LIST.test(line) || line.slice(line.indexOf(":") + 1).trim()) continue;
      seen++;
      assert.ok(opensOnClick(text, end), `${what}: a click at the end of "${line}" opens the list`);
      const sp = spotAt(text, end);
      assert.ok(sp && sp.typed === "", `${what}: "${line}" is a spot`);
    }
    return seen;
  };
  // The wizard's text (D121): `emit` writes an empty key as `Spells:`, with no space after the colon.
  const wizard = presetText("2024", [{ cls: "Wizard", levels: 3 }]);
  assert.match(wizard, /^Spells:$/m, "the wizard writes a bare Spells:");
  assert.ok(check(wizard, "wizard") >= 5);
  // A paste in the same canonical form, and one with the spaces kept; Tidy's output of it.
  const pasted = "Rules: 2024\nClasses: Wizard|XPHB 1\n\nL1 Wizard|XPHB\nCantrips:\nSpells: \nFeat:\n";
  assert.equal(check(pasted, "paste"), 3);
  assert.equal(check(emit(parse(pasted)), "Tidy"), 3);
  // The menu writes `Spells: ` (D171): still opens.
  const menu = "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells: ";
  assert.ok(opensOnClick(menu, menu.length));

  // Typed right after the colon of a bare key: still the Spells list, and the pick writes the space.
  assert.ok(names("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells:mag¦")?.includes("Mage Armor"));
  assert.equal(take("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells:¦"), "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells: " + first("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells: ¦")?.name);
  assert.match(take("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips:fire bo¦"), /\nCantrips: Fire Bolt$/);
  assert.equal(take("Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nCantrips: fire bo¦").endsWith("Cantrips: Fire Bolt"), true, "no double space");

  // The template: after a list's `, ` the next name opens; on a written name or the key, a click only updates.
  const at = EXAMPLE.indexOf("Spells: Armor of Agathys, Hex") + "Spells: Armor of Agathys, Hex".length;
  const more = EXAMPLE.slice(0, at) + ", " + EXAMPLE.slice(at);
  assert.ok(opensOnClick(more, at + 2), "after `, ` in the template");
  assert.ok(!opensOnClick(EXAMPLE, at), "at the end of a written name");
  assert.ok(!opensOnClick(EXAMPLE, EXAMPLE.indexOf("Spells: Armor") + 3), "inside the key");
  const glued = "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\nSpells:Shield";
  assert.ok(!opensOnClick(glued, glued.indexOf("Shield")), "before a name glued to the colon");
  assert.ok(!opensOnClick("Feature: Elven Lineage [Drow; ]", 30), "a later [ ] group still opens as you type (D229)");

  // Typing the `:` itself opens the list (the input is typing): every key with a value list is a spot right there.
  for (const k of ["Classes", "Species", "Background", "Spells", "Cantrips", "Feat", "Subclass", "Skills", "Feat (Fighting Style)"]) {
    const t = `Vesk\nRules: 2024\nClasses: Wizard 3\n\nL1 Wizard\n${k}:`;
    assert.ok(spotAt(t, t.length), `${k}: a spot at its colon`);
  }

  // A level header with no class yet, `L2` or `L2 `: the classes, the build's own first; the pick writes the space.
  const lvl = "Rules: 2024\nClasses: Wizard 3 / Fighter 1\n\nL1 Wizard\nSpells: Shield\n\nL2";
  assert.deepEqual(names(lvl + "¦", 2), ["Fighter", "Wizard"]);
  assert.deepEqual(names(lvl + " ¦", 2), ["Fighter", "Wizard"]);
  assert.ok(opensOnClick(lvl, lvl.length) && opensOnClick(lvl + " ", lvl.length + 1));
  assert.ok(take(lvl + "¦").endsWith("\nL2 Fighter"));
  assert.ok(take(lvl + " ¦").endsWith("\nL2 Fighter"));
  assert.deepEqual(names("Rules: 2024\nClasses: Wizard 3 / Fighter 1\n\nL1 W¦"), ["Wizard", "Warlock"], "a written class keeps its match order");
  assert.equal(spot("Rules: 2024\nL¦"), null, "a lone L is a key being typed (Languages), not a level");
});

test("D303: a name written in full gives no rows and is not \"no matches\" (D256): the list closes there", () => {
  const known = (src: string) => { const s = spot(src); assert.ok(s, src); return isKnown(N, s); };
  const pre = "Rules: 2024\nClasses: Wizard 1\n\nL1 Wizard\n";
  assert.deepEqual(names(pre + "Spells: Shield¦"), [], "nothing left to complete");
  assert.ok(known(pre + "Spells: Shield¦"));
  assert.ok(known(pre + "Spells: Magic Missile, shield¦"), "any case, a later item");
  assert.ok(known(pre + "Cantrips: Fire Bolt¦"));
  assert.ok(known(pre + "Feat: Alert¦"));
  assert.ok(!known(pre + "Spells: Shiel¦"), "a part of a name is still being typed");
  assert.ok(!known(pre + "Spells: Xyzzy¦"), "an unknown name keeps the D256 line");
  assert.ok(!known(pre + "Spells: ¦"));
});

test("D304: a click in a written name lists what it can be swapped for; a pick replaces the whole name", () => {
  const T = "Vesk\nRules: 2024\nClasses: Wizard 3\n\nSpecies: Elf|XPHB [Drow; WIS]\n\nL1 Wizard|XPHB\nSpells: Shield, Magic Missile\n";
  const swap = (needle: string, off: number) => {
    const s = swapAt(T, T.indexOf(needle) + off);
    if (!s) return null;
    const alts = alternatives(N, s, T, 40);
    return { name: T.slice(s.start, s.end), alts: alts.map((a) => a.name), swapped: alts[0] ? T.slice(0, s.start) + written(s, alts[0]) + T.slice(s.end) : T };
  };
  assert.deepEqual(swap("2024", 4)?.alts, ["2014"], "Rules: the other edition");
  assert.ok(swap("2024", 4)?.swapped.includes("\nRules: 2014\n"));
  const cls = swap("Wizard 3", 2);
  assert.equal(cls?.name, "Wizard", "mid-name: the whole name");
  assert.ok(cls?.alts.includes("Fighter") && !cls.alts.includes("Wizard"), "the other classes, not itself");
  assert.ok(swap("L1 Wizard", 5)?.alts.includes("Cleric"), "a level header's class");
  assert.ok(swap("Elf", 3)?.alts.includes("Dwarf"), "a species");
  assert.ok(swap("Drow", 4)?.alts.includes("High"), "a lineage in [ ]");
  const sp = swap("Magic Missile", 13);
  assert.equal(sp?.name, "Magic Missile");
  assert.ok(sp && !sp.alts.includes("Shield") && !sp.alts.includes("Magic Missile"), "names on the line are not offered");
  assert.ok(sp?.swapped.includes("Spells: Shield, " + sp.alts[0] + "\n"), "the rest of the line stays");
  assert.ok(swap("Wizard|XPHB", 6)?.swapped.includes("\nL1 Barbarian|XPHB\n"), "a written source stays");
  assert.equal(swapAt(T, T.indexOf("Spells:") + 3), null, "inside the key: no swap");
  const at0 = swapAt(T, T.indexOf("Spells: ") + 8);
  assert.equal(at0 && T.slice(at0.start, at0.end), "Shield", "at a name's first letter: that name");
  assert.equal(swapAt(T, T.indexOf("Shield,") + 7), null, "after the comma, before the next name's space");
  assert.deepEqual(names("Rules: 2¦"), ["2014", "2024"], "typing an edition lists both");
});

// Name autocomplete (D151, D154–D159): the spot under the cursor, the names offered there, and the text a pick writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as N from "../src/names.gen.ts";
import { OPEN_EVERY_SPOT, afterPick, ghostWord, keySpotAt, minTyped, slotHint, sourceFor, spellCap, spotAt, suggest, suggestKeys, written, writtenKey } from "../src/client/complete.ts";
import type { Spot } from "../src/client/complete.ts";

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
  assert.equal(spot("Rules: 20¦"), null, "an enum");
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
  assert.ok(!names("Masteries: flame t¦")?.length, "mundane items only");
  assert.ok(names("Skills: ar¦")?.includes("Arcana"));
  assert.ok(names("Expertise: st¦")?.includes("Stealth"));
  assert.ok(names("Languages: dr¦")?.includes("Draconic"));
  assert.ok(names("Tools: thi¦")?.includes("Thieves' Tools"));
  assert.ok(names("Feature: elv¦")?.includes("Elven Lineage"));
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
  assert.deepEqual(names("Feature: Elven Lineage [in¦"), ["INT"]);
  assert.deepEqual(names("Feature: Elven Lineage [INT; hi¦"), ["High Elf"]);
  assert.deepEqual(names("Feature: Draconic Ancestry [re¦"), ["Red"]);
  assert.deepEqual(names("Feature: Spellcasting [ch¦"), ["CHA"]);
  assert.ok(names("Options: Agonizing Blast [el¦")?.includes("Eldritch Blast"), "an option's picks are cantrips");
  assert.ok(!names("Options: Agonizing Blast [fireb¦")?.length);
  assert.deepEqual(spot("Species: Elf [hi¦") && names("Species: Elf [hi¦"), [], "Species carries no details");
});

test("D156: an unknown slot gets the general list: abilities, skills and spells", () => {
  const g = names("Feature: Homebrew Gift [ar¦", 20) ?? [];
  assert.ok(g.includes("Arcana"));
  assert.ok(g.includes("Arcane Eye") || g.includes("Arcane Lock"));
  assert.deepEqual(names("Feat: Homebrew Thing [co¦")?.slice(0, 1), ["CON"]);
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
  assert.deepEqual(hint("Feature: Elven Lineage [INT; ¦"), { slots: ["ability", "lineage"], at: 1 });
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
  assert.deepEqual(keysAt("Vice\nRules: 2024\nr¦"), [], "Rules is already there");
  assert.ok(keysAt("Vice\nRules: 2024\n\nL1 Cleric\nC¦")?.includes("Cantrips"), "a level block's keys");
  assert.deepEqual(keysAt("Vice\nRules: 2024\n\nL1 Cleric\nSpe¦"), ["Spells"], "a level block opens no Species block");
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

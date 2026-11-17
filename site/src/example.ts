/** The form's way to the format guide (D99), in the server's side column and in the one form.js draws. */
export const GUIDE_LINK = `<p class="muted glink"><a href="/guide">Format guide</a>: how a build is laid out, and every key.</p>`;

/**
 * The one example build (D99, D104: a multiclass with an option line, a marked feat and an inline ability, in 0.8
 * keys): `/guide` walks it. The empty paste form offers "Start a build" instead (D121).
 * Names only, never rules text (content boundary). It must parse with no diagnostics and already be in canonical
 * form, so Tidy leaves it as it is (test/guide.test.ts).
 */
export const EXAMPLE = `Vesk
Rules: 2024
Scores: 15/10/13/8/10/15
Classes: Fighter 1 / Warlock 4

Species: Tiefling|XPHB
Feature: Fiendish Legacy [CHA; Infernal]

Background: Soldier|XPHB
Scores: +2 STR, +1 CON
Tools: Dice Set

L1 Fighter
Skills: Perception, Survival
Feat (Fighting Style): Defense
Masteries: Greatsword, Javelin, Longsword
Gear: A

L2 Warlock
Options: Pact of the Blade
Cantrips: Eldritch Blast, Minor Illusion
Spells: Armor of Agathys, Hex

L3 Warlock
Options: Agonizing Blast [Eldritch Blast], Devil's Sight
Spells: Hellish Rebuke

L4 Warlock
Subclass: Fiend Patron
Spells: Misty Step

L5 Warlock
Feat: Ability Score Improvement [+2 CHA]
Cantrips: Mage Hand
Spells: Hold Person
Gear: Cloak of Protection
`;

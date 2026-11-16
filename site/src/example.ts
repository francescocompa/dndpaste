/** The form's way to the format guide (D99), in the server's side column and in the one form.js draws. */
export const GUIDE_LINK = `<p class="muted glink"><a href="/guide">Format guide</a>: how a build is laid out, and every key.</p>`;

/**
 * The one example build (D99): `/guide` walks it and the empty paste form offers it ("Start from an example").
 * Names only, never rules text (content boundary). It must parse with no diagnostics and already be in canonical
 * form, so Tidy leaves it as it is (test/guide.test.ts).
 */
export const EXAMPLE = `Briar
Rules: 2024
Scores: 10/14/13/8/16/12
Classes: Druid 4

Species: Elf|XPHB
Ability: WIS
Skills: Perception
Feature: Elven Lineage [Wood]

Background: Custom
ASI: +2 WIS, +1 DEX
Skills: Insight, Stealth
Tools: Herbalism Kit
Feat: Magic Initiate [WIS; Druid; Guidance, Shillelagh; Goodberry]

L1 Druid
Skills: Nature, Survival
Feature: Primal Order [Warden]
Cantrips: Produce Flame, Thorn Whip
Equipment: A

L3 Druid
Subclass: Circle of the Moon

L4 Druid
Feat: Resilient [CON]
Items: Cloak of Protection
`;

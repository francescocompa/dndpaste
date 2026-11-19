/**
 * What each key holds and where it goes, in the site's words: one source for the guide's key table (guide.ts) and
 * the form's Keys popover (client/form.ts). SPEC §5.1 has the full meaning. Names only, never rules text. Copy is
 * dry and plain (D88 c, /humanize). Pure strings, no DOM: it ships in both the Worker and form.js.
 */
import { KEYS } from "../../src/dndpaste.ts";
import type { KeyDef, ScopeKind, ValueType } from "../../src/dndpaste.ts";
import { esc } from "./render.ts";

export const SCOPE_LABEL: Readonly<Record<ScopeKind, string>> = { H: "Header", S: "Species", B: "Background", L: "Level" };

const c = (s: string) => `<code>${esc(s)}</code>`;

/** The shape of each value type, in words (HTML). A new type in the library fails the typecheck until it has a line here. */
export const TYPE_LABEL: Readonly<Record<ValueType, (d: KeyDef) => string>> = {
  items: () => "a list of names, separated by commas",
  item: () => "one name",
  "items¹": () => "a list of names, or one name in a level block",
  enum: (d) => (d.enumValues ?? []).map(c).join(" or "),
  int: () => "a whole number",
  classes: () => `${c("Fighter 1 / Warlock 4")}, in the order taken`,
  scores: () => `six numbers in ${c("STR/DEX/CON/INT/WIS/CHA")} order, ${c("15/10/13/8/10/15")}, or only the known ones, ` +
    `${c("DEX 15, CON 13")} or ${c("DEX 15/CON 13")}, or an increase, ${c("+2 CHA")}`,
  asi: () => `${c("+2 CHA")} or ${c("+1 INT, +1 CON")}`,
  hp: () => `${c("Fixed")} or ${c("Rolled")}, and in a level block also the number rolled`,
  text: () => "one line of text",
};

/**
 * What each key holds (plain text). test/guide.test.ts fails when this list and the library's `KEYS` differ by a
 * single key.
 */
export const KEY_HOLDS: Readonly<Record<string, string>> = {
  Paste: "The version of the format. Leave it out for version 1.",
  Producer: "The app and version that wrote the text.",
  Rules: "The edition for names that have no book code.",
  Scores: "Without a plus sign, the base ability scores, in the header only. With a plus sign, an increase: " +
    "in the species or background block, at a level, or in the header.",
  Classes: "Each class and its levels.",
  HP: "How the build gains hit points.",
  Species: "The species. Its choices follow in its block.",
  Background: "The background. Its choices follow in its block.",
  Subclass: "The subclass.",
  Skills: "Skill proficiencies chosen.",
  Tools: "Tool proficiencies chosen.",
  Languages: "Languages chosen.",
  Expertise: "Skills chosen for expertise.",
  Feat: "Feats, with their choices in brackets. An ability score improvement is the feat Ability Score Improvement. " +
    "To name the slot that a feat fills, put it in parentheses after the key: Feat (Fighting Style), Feat (Origin).",
  Masteries: "Weapon masteries.",
  Invocations: "Eldritch invocations.",
  Metamagic: "Metamagic options.",
  Maneuvers: "Battle Master maneuvers.",
  Infusions: "Artificer infusions.",
  "Arcane Shots": "Arcane Archer shots.",
  Runes: "Rune Knight runes.",
  Disciplines: "Elemental disciplines.",
  "Pact Boon": "The pact boon, under 2014 rules. Under 2024 rules a pact is an invocation.",
  Options: "Optional features of any family. A family with no key of its own goes in parentheses after the key: " +
    "Options (Soul Techniques).",
  Feature: "A named feature and its choices, or an optional class feature taken.",
  Cantrips: "Cantrips chosen.",
  Spells: "Spells added to the build at that level. To cap the spell level the line picks from, put it in " +
    "parentheses after the key: Spells (3rd).",
  Prepared: "The spells prepared by default, for a caster who knows more spells than it prepares.",
  Gear: "In the background block or at level 1, the starting gear or its option letter. At a later level, gear gained " +
    "in play. In the header, gear carried.",
  Note: "A note in your own words: a plan, a second version, a reminder. One line per block. It is not part of the build.",
};

/** The `Feat (…)` key hint (D110): a marked feat, written `Feat (<slot>): <name>`. */
export const MARKED_FEAT = "Feat (…)";

/** Where a key may go, in words: "Header, Level"; a block-opening key says so. */
export function whereLabel(d: KeyDef): string {
  const where = d.scopes.map((s) => SCOPE_LABEL[s]).join(", ");
  return d.opensBlock ? `${where}, opens a block` : where;
}

/** One key's description for the form's Keys popover: what it holds, where it goes, the value's shape (HTML). */
export function keyDoc(key: string): string {
  const d = KEYS.find((k) => k.key === (key === MARKED_FEAT ? "Feat" : key));
  if (!d) return "";
  return `<b class="kdk">${esc(key === MARKED_FEAT ? MARKED_FEAT : d.key)}:</b> ${esc(KEY_HOLDS[d.key] ?? "")}` +
    `<small>Goes in: ${esc(whereLabel(d))}. Value: ${TYPE_LABEL[d.type](d)}.</small>`;
}

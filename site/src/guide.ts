/**
 * `/guide` (D99): how a paste is laid out, one annotated example (the form's "Start from an example"), and the key
 * table built from the library's profile table (`KEYS`) when the Worker is bundled, so it cannot drift from the
 * parser. SPEC.md stays the authority and the page links it. Copy is dry and plain (D88 c, /humanize). Names only,
 * never rules text (content boundary). No inline scripts or styles (CSP); reads the same without JavaScript.
 */
import { KEYS } from "../../src/dndpaste.ts";
import type { KeyDef, ScopeKind, ValueType } from "../../src/dndpaste.ts";
import { highlightRows } from "./client/highlight.ts";
import { EXAMPLE } from "./example.ts";
import { layout } from "./pages.ts";
import { esc } from "./render.ts";

/** The format's authority (D99). Resolves once the repository is public. */
export const SPEC_URL = "https://github.com/francescocompa/dndpaste/blob/main/SPEC.md";

export const SCOPE_LABEL: Readonly<Record<ScopeKind, string>> = { H: "Header", S: "Species", B: "Background", L: "Level" };

const c = (s: string) => `<code>${esc(s)}</code>`;

/** The shape of each value type, in words. A new type in the library fails the typecheck until it has a line here. */
export const TYPE_LABEL: Readonly<Record<ValueType, (d: KeyDef) => string>> = {
  items: () => "a list of names, separated by commas",
  item: () => "one name",
  "items¹": () => "a list of names, or one name in a level block",
  enum: (d) => (d.enumValues ?? []).map(c).join(" or "),
  int: () => "a whole number",
  classes: () => `${c("Fighter 1 / Warlock 5")}, in the order taken`,
  scores: () => `${c("8/13/14/12/10/15")}, or only the known ones: ${c("DEX 15, CON 13")}`,
  asi: () => `${c("+2 CHA")} or ${c("+1 INT, +1 CON")}`,
  hp: () => `${c("Fixed")} or ${c("Rolled")}, and in a level block also the number rolled`,
  text: () => "one line of text",
};

/**
 * What each key holds, in the site's words (SPEC §5.1 has the full meaning). test/guide.test.ts fails when this
 * list and the library's `KEYS` differ by a single key.
 */
export const KEY_HOLDS: Readonly<Record<string, string>> = {
  Paste: "The version of the format. Leave it out for version 1.",
  Producer: "The app and version that wrote the text.",
  Rules: "The edition for names that have no source code.",
  Scores: "Base ability scores, before any bonus.",
  Classes: "Each class and its levels.",
  HP: "How the build gains hit points.",
  Species: "The species. Its choices follow in its block.",
  Background: "The background. Its choices follow in its block.",
  Subclass: "The subclass.",
  ASI: "Ability score increases.",
  Ability: "A spellcasting ability chosen for a trait or feature.",
  Skills: "Skill proficiencies chosen.",
  Tools: "Tool proficiencies chosen.",
  Languages: "Languages chosen.",
  Expertise: "Skills chosen for expertise.",
  Feat: "Feats, with their choices in brackets.",
  "Fighting Style": "Fighting styles.",
  Masteries: "Weapon masteries.",
  Options: "Optional features: invocations, metamagic, maneuvers and others.",
  Feature: "A named feature and its choice, or an optional class feature taken.",
  Cantrips: "Cantrips chosen.",
  Spells: "Spells added to the build at that level.",
  Prepared: "The usual prepared spells, for a caster who knows more spells than it prepares.",
  Equipment: "Starting gear, or the letter of a starting gear option.",
  Items: "Magic items and other gear gained in play.",
};

/** Where a key may go, in words: "Header, Level"; a block-opening key says so. */
export function whereLabel(d: KeyDef): string {
  const where = d.scopes.map((s) => SCOPE_LABEL[s]).join(", ");
  return d.opensBlock ? `${where}, opens a block` : where;
}

/** The key table, one row per key of the profile, in canonical order. */
export function keyTable(): string {
  const rows = KEYS.map((d) => `<tr><th scope="row" class="kk">${esc(d.key)}</th><td class="kw">${esc(whereLabel(d))}</td>` +
    `<td class="kh">${esc(KEY_HOLDS[d.key] ?? "")}<small>Value: ${TYPE_LABEL[d.type](d)}</small></td></tr>`).join("");
  return `<table class="ktab"><thead><tr><th scope="col" class="kk">Key</th><th scope="col">Goes in</th><th scope="col">Holds</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`;
}

/** Source text drawn as the editor draws it (same highlight, same classes), read-only. */
function code(text: string, label: string, numbers = false): string {
  return `<figure class="pane ex${numbers ? "" : " nog"}" aria-label="${esc(label)}"><div class="ed"><div class="hl">` +
    `${highlightRows(text.replace(/\n$/, ""), []).join("")}</div></div></figure>`;
}

/** The example's parts: the header, then each block (blank lines separate them in canonical form). */
export function exampleParts(): { header: string; entities: string; levels: string } {
  const parts = EXAMPLE.trimEnd().split("\n\n");
  const levels = parts.findIndex((p) => /^L\d/.test(p));
  return { header: parts[0], entities: parts.slice(1, levels).join("\n\n"), levels: parts.slice(levels).join("\n\n") };
}

const spec = (anchor: string, text: string) => `<a href="${SPEC_URL}${anchor}">${text}</a>`;

export function guidePage(): string {
  const ex = exampleParts();
  const main = `<div class="prose gd"><h1>Format guide</h1>
<p>A dndpaste is a character build written as plain text. Each line records a choice the player made. This page shows how the lines fit together, with one example build. The ${spec("", "specification")} has the full rules. Where this page and the specification differ, the specification is correct.</p>
<h2 id="example">The example</h2>
<p>Briar is a level 4 druid. To open this build in the editor, start a <a href="/">new paste</a> and choose Start from an example.</p>
${code(EXAMPLE, "The example build", true)}
<h2 id="header">The header</h2>
${code(ex.header, "The header of the example")}
<p>The first line is the build's name. It is optional, and it cannot contain a colon.</p>
<p>Every other line is a key line: a key, a colon, a space and a value. The key lines before the first block are the header. In this build they give the edition, the base ability scores and the class levels.</p>
<p>A choice in the header, such as ${c("Feat: Alert")}, is not tied to a level. The text does not say at which level the player made it.</p>
<h2 id="blocks">Species and background blocks</h2>
${code(ex.entities, "The species and background blocks of the example")}
<p>${c("Species:")} and ${c("Background:")} each open a block. The lines under the key, up to the next block, are the choices that the species or background asks for. Here the elf has a spellcasting ability, a skill and a lineage.</p>
<p>A custom or homebrew background lists everything it gives, as this one does. An official background lists only the choices it asks for. Both blocks come before the first level block.</p>
<h2 id="levels">Level blocks</h2>
${code(ex.levels, "The level blocks of the example")}
<p>${c("L1 Druid")} opens the block for character level 1, taken in Druid. Its lines are the choices made at that level. Level blocks go up in order. A level with no choices has no block: this build has no block for level 2.</p>
<p>In a level block, a minus sign before a name removes it from the build at that level. ${c("Spells: -Hex, Hold Person")} drops Hex and adds Hold Person.</p>
<h2 id="names">Names, sources and details</h2>
<p>A value gives names only. It never copies rules text.</p>
<ul>
<li>${c("Elf|XPHB")}: a name, then ${c("|")} and the short code of the book it comes from, such as ${c("PHB")}, ${c("XPHB")} and ${c("TCE")}. The code is optional. Without one, the edition in ${c("Rules:")} applies.</li>
<li>${c("Magic Initiate [WIS; Druid; Guidance, Shillelagh; Goodberry]")}: the choices that a feat or feature asks for go in brackets. A semicolon separates one choice from the next. A comma separates the names inside one choice. Each key has a fixed order for these choices (${spec("#53-detail-slot-orders", "specification, section 5.3")}).</li>
<li>${c(`"Bag of Tricks, Gray"`)}: a name that contains a comma, a semicolon, a colon or a bracket goes in double quotes.</li>
<li>${c("Arrows (20) x2")}: a quantity of 2 or more, on ${c("Equipment")} and ${c("Items")} only.</li>
</ul>
<h2 id="short">Short builds</h2>
<p>No key is required. ${c("Classes: Warlock")} alone is a valid build. Write what you know and leave out the rest. The site saves a build when it has at least one line besides the name.</p>
<h2 id="canonical">Canonical form and Tidy</h2>
<p>Each build has one canonical form. Keys follow the order of the key table, one blank line comes before each block, and each key has the spelling in the table. ${c("Classes")} gives one total for each class. In a build with level blocks, a level header marks each change of class.</p>
<p>Tidy, in the editor's toolbar, rewrites the text in canonical form. It changes the layout, not the choices. Tidy works when the text has no errors. The ${c("/<id>/canon")} address of a saved build gives the same text.</p>
<h2 id="keys">Keys</h2>
<p>These are all the keys, in canonical order. Keys are not case-sensitive. A key that starts with ${c("X-")} is an extension for apps: the site keeps it and shows the warning W001.</p>
${keyTable()}
<h2 id="problems">Problems</h2>
<p>The editor checks the text as you type and lists each problem with its line. A code that starts with E is an error: fix it before you save. A code that starts with W is a warning: the build saves as it is. ${spec("#7-diagnostics", "Section 7 of the specification")} lists every code.</p></div>`;
  return layout({ title: "Format guide · dndpaste", main, page: "guide" });
}

/**
 * `/guide` (D99): how a paste is laid out, one annotated example, and the key
 * table built from the library's profile table (`KEYS`) when the Worker is bundled, so it cannot drift from the
 * parser. SPEC.md stays the authority and the page links it. Copy is dry and plain (D88 c, /humanize). Names only,
 * never rules text (content boundary). No inline scripts or styles (CSP); reads the same without JavaScript.
 */
import { KEYS } from "../../src/dndpaste.ts";
import { highlightRows } from "./client/highlight.ts";
import { EXAMPLE } from "./example.ts";
import { KEY_HOLDS, TYPE_LABEL, whereLabel } from "./keydocs.ts";
import { FEEDBACK_LINE, RELEASES_URL } from "./links.ts";
import { layout } from "./pages.ts";
import { esc } from "./render.ts";

const c = (s: string) => `<code>${esc(s)}</code>`;

/** The format's authority (D99). Resolves once the repository is public. */
export const SPEC_URL = "https://github.com/francescocompa/dndpaste/blob/main/SPEC.md";

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
<p>Vesk is a level 5 character: one level in Fighter, then four in Warlock. To start your own, open a <a href="/">new paste</a> and use Start a build. It writes the lines your classes need, ready for you to fill in.</p>
${code(EXAMPLE, "The example build", true)}
<h2 id="header">The header</h2>
${code(ex.header, "The header of the example")}
<p>The first line is the build's name. It is optional, and it cannot contain a colon.</p>
<p>Every other line is a key line: a key, a colon, a space and a value. The key lines before the first block are the header. In this build they give the edition, the base ability scores and the classes.</p>
<p>The six base scores are in ${c("STR/DEX/CON/INT/WIS/CHA")} order. They are the scores before any increase from a species, a background or a feat. A final score such as INT 20 is not a base score: write the base and the increases, or put the final score in a ${c("Note")}. If you know only some of the base scores, name each one: ${c("STR 15/CON 13")} or ${c("STR 15, CON 13")}. ${c("Classes")} gives each class with its levels, in the order the character took them.</p>
<p>A choice in the header, such as ${c("Feat: Alert")}, is not tied to a level. The text does not say at which level the player made it. A header choice belongs to the whole build. In a level block, a choice belongs to that level's class.</p>
<p>${c("Species:")} and ${c("Background:")} come last in the header, because each one opens a block. A header key written under them ends up in their block. The editor offers to move it above ${c("Species:")}, and Tidy moves it.</p>
<h2 id="blocks">Species and background blocks</h2>
${code(ex.entities, "The species and background blocks of the example")}
<p>${c("Species:")} and ${c("Background:")} each open a block. The lines under the key, up to the next block, are the choices that the species or background asks for. Here the tiefling has a legacy, and the soldier has score increases and a gaming set.</p>
<p>When a choice asks for an ability, the ability comes first in the brackets: ${c("Fiendish Legacy [CHA; Infernal]")}. A ${c("Scores")} line with a plus sign is an increase, not a base score.</p>
<p>An official background lists only the choices it asks for, as this one does. A custom or homebrew background lists everything it gives. Both blocks come before the first level block.</p>
<h2 id="levels">Level blocks</h2>
${code(ex.levels, "The level blocks of the example")}
<p>${c("L1 Fighter")} opens the block for character level 1, taken in Fighter. Its lines are the choices made at that level. ${c("L2 Warlock")} is the first level in Warlock. Level blocks go up in order, and each one names its class, so the text shows where each class starts. A level with no choices needs no block.</p>
<p>${c("Feat (Fighting Style): Defense")} names the slot that the feat fills, in parentheses after the key. ${c("Options")} lists optional features, here the warlock's invocations. At level 5 the ability score improvement is a feat: ${c("Ability Score Improvement [+2 CHA]")}.</p>
<p>A ${c("Subclass")} line goes in the level block where the class gains its subclass, or in the header when the build has no level blocks or has not reached that level yet. Write the subclass's name, its short name, or the short name before the class: ${c("Subclass: Diviner Wizard")}.</p>
<p>In a level block, a minus sign before a name removes it from the build at that level. ${c("Spells: -Hex, Hold Person")} drops Hex and adds Hold Person.</p>
<p>A class feature that asks for a choice goes on a ${c("Feature")} line, with the choice in brackets: ${c("Feature: Hunter's Prey [Colossus Slayer]")}. An artificer's plans go the same way: ${c("Feature: Replicate Magic Item [Bag of Holding]")}. Plans are not infusions. ${c("Infusions")} holds the infusions of the 2014 artificer.</p>
<p>A familiar, a steed, a summoned creature or a pact weapon can name its form in brackets: ${c("Invocations: Pact of the Chain [Imp]")}, ${c("Pact of the Blade [Glaive]")}, ${c("Spells: Find Familiar [Owl]")}, ${c("Summon Fey [Fuming]")}. The brackets are optional.</p>
<h3 id="multiclass">Leaving a class and coming back</h3>
${code("Classes: Paladin 9 / Rogue 1\n\nL9 Rogue\n\nL10 Paladin", "A build that leaves Paladin for one Rogue level and comes back")}
<p>This paladin takes Rogue at level 9 and returns to Paladin at level 10. ${c("Classes")} gives the totals, and a level header marks each change of class. A level block with no lines is enough to mark one.</p>
<h3 id="granted">What the build gets anyway</h3>
<p>A dndpaste records choices. A feature or spell that the build gets without a choice is not written: a domain's always-prepared spells, a subclass feature, a species trait. To point out one that the build relies on, write it in the level block where it arrives: ${c("Feature: Portent")} at the level the Diviner gets it, or ${c("Prepared: Bless")} for a Life cleric. It is a highlight, not a choice.</p>
<h2 id="names">Names, sources and details</h2>
<p>A value gives names only. It never copies rules text.</p>
<ul>
<li>${c("Tiefling|XPHB")}: a name, then ${c("|")} and the short code of the book it comes from, such as ${c("PHB")}, ${c("XPHB")} and ${c("TCE")} (<a href="/codes">all book codes</a>). The code is optional. Without one, the name means its newest printing in the edition of ${c("Rules:")}, or in either edition when there is no ${c("Rules:")}. A core book comes before a setting book.</li>
<li>${c("Magic Initiate [WIS; Druid; Guidance, Shillelagh; Goodberry]")}: the choices that a feat or feature asks for go in brackets. A semicolon separates one choice from the next. A comma separates the names inside one choice. Each key has a fixed order for these choices (${spec("#53-detail-slot-orders", "specification, section 5.3")}).</li>
<li>${c(`"Bag of Tricks, Gray"`)}: a name that contains a comma, a semicolon, a colon or a bracket goes in double quotes.</li>
<li>${c("Arrows (20) x2")}: a quantity of 2 or more, on ${c("Gear")} only. Write ${c("Shortsword x2")}, not the name twice. Brackets on gear hold a choice the item asks for, not a note: ${c("Headband of Intellect")} needs nothing after it.</li>
<li>${c("Human (Mark of Making)|ERLW")}: parentheses in a name are part of the name. Under 2014 rules this dragonmark is a species. Under 2024 rules it is a feat: ${c("Feat (Dragonmark): Mark of Making|EFA")}. Parentheses after a key are different: they name a slot, such as ${c("Feat (Origin)")}.</li>
</ul>
<h3 id="homebrew">Unearthed Arcana and homebrew</h3>
<p>Any name can come from Unearthed Arcana or from homebrew, and the build still saves.</p>
<ul>
<li>Unearthed Arcana: always write its code, such as ${c("Psion|XUA2025Psion")}. The <a href="/codes">book codes</a> page lists the codes.</li>
<li>Homebrew: write the code its file gives, or ${c("|HB")} if it has none: ${c("Feat: Fey Pact|HB [CHA]")}. A name with no code works too.</li>
<li>A homebrew background lists everything it gives in its block, so the build is complete without the homebrew file.</li>
</ul>
<p>Optional features have a key for each known family: ${KEYS.filter((d) => d.family).map((d) => c(d.key)).join(", ")}. A family from another book goes in ${c("Options")}, with its name in parentheses: ${c("Options (Psionic Discipline): Telekinetic Propel")}.</p>
<h2 id="short">Short builds</h2>
<p>No key is required. ${c("Classes: Warlock")} alone is a valid build. Write what you know and leave out the rest. The site saves a build when it has at least one line besides the name.</p>
<p>A note for people goes on a ${c("Note")} line, in any block: ${c("Note: Eldritch Knight at level 3, or Sharpshooter in version B")}. A block takes one ${c("Note")} line, so a second thought goes on the same line. A note is not part of the build.</p>
<p>A key with no value, such as ${c("Spells:")}, means not chosen yet. The editor shows the warning W004, the site saves the build, and Tidy keeps the line as a reminder.</p>
<p>In a level block, the editor also shows a small count after lines such as ${c("Spells")}. A count of 2/4 means two picks of the four that the class gets at that level. The count is a note in the editor. It is not part of the build.</p>
<h2 id="canonical">Canonical form and Tidy</h2>
<p>Each build has one canonical form. Keys follow the order of the key table, one blank line comes before each block, and each key has the spelling in the table. ${c("Classes")} gives one total for each class. In a build with level blocks, a level header marks each change of class.</p>
<p>Tidy, in the editor's toolbar, rewrites the text in canonical form. It changes the layout, not the choices. Tidy also fixes the errors it can fix without a guess: it moves a header key out of a block, joins two lines of the same key with commas, and puts ${c("/")} between classes. It keeps any other line with an error as you wrote it. A badge on the Tidy button counts its changes. Click the badge to see them, and click a change to leave it out. Undo takes back a whole Tidy. The ${c("/<id>/canon")} address of a saved build gives the same text.</p>
<h2 id="keys">Keys</h2>
<p>These are all the keys, in canonical order. Keys are not case-sensitive. A key that starts with ${c("X-")} is an extension for apps: the site keeps it and shows the warning W001.</p>
<p>Some keys were renamed in version 0.8 of the format. The old keys still work until version 1: ${c("ASI")}, ${c("Ability")}, ${c("Fighting Style")}, ${c("Equipment")} and ${c("Items")}. The editor shows the warning W005, and Tidy writes the new form.</p>
${keyTable()}
<h2 id="problems">Problems</h2>
<p>The editor checks the text as you type and lists each problem with its line and a short fix, such as Move above Species. A code that starts with E is an error: fix it before you save. A code that starts with W is a warning: the build saves as it is. ${spec("#7-diagnostics", "Section 7 of the specification")} lists every code.</p>
<p>Lines with no value yet, such as an empty ${c("Spells:")}, are not problems. The editor lists them under To choose, with a button for each line.</p>
<h2 id="changes">Format changes</h2>
<p>The format can still change. Each <a href="${RELEASES_URL}">release</a> lists what changed and how to update a build.</p>
${FEEDBACK_LINE}</div>`;
  return layout({ title: "Format guide · dndpaste", main, page: "guide" });
}

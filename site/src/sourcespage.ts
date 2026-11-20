/**
 * `/sources` (D247, D252–D257): your own sources, kept in this browser. The page is one column, like /guide: the intro,
 * the storage note, the Add bar, the list (client/sources.ts draws it, with its three lenses) and the names format
 * folded at the bottom. The server sends the parts that need no data; the list is the browser's, since the sources
 * never leave it (D245). The page names, links and suggests no data source (D160, D248).
 */
import { layout } from "./pages.ts";
import { esc, icon } from "./render.ts";

const c = (s: string) => `<code>${esc(s)}</code>`;
const pre = (s: string, label: string) => `<pre class="code" tabindex="0" aria-label="${esc(label)}">${esc(s)}</pre>`;

const PLAIN_EXAMPLE = `Spell: Moonbeam Lance|MYHB [2; Druid, Ranger]
Spell: Ember Ward|MYHB [cantrip; Wizard]
Feat: Lucky Streak|MYHB [Origin; CHA, WIS]
Feature: Ember Gift|MYHB [Spark, Flare]
Subclass: Oath of Ash|MYHB [Paladin]
Item: Lantern of Echoes|MYHB`;

const JSON_EXAMPLE = `{
  "spell": [
    { "name": "Moonbeam Lance", "source": "MYHB", "level": 2, "classes": ["Druid", "Ranger"] }
  ],
  "feat": [{ "name": "Lucky Streak", "source": "MYHB" }],
  "subclass": [{ "name": "Oath of Ash", "source": "MYHB", "className": "Paladin" }]
}`;

/** The names format, folded (D247: the docs live on this page). */
export function namesFormatHtml(): string {
  const fold = (id: string, title: string, sub: string, body: string, open = false) =>
    `<details class="fold" id="${id}"${open ? " open" : ""}><summary class="fh">${icon("chevron-right")}<b>${esc(title)}</b><span class="muted">${esc(sub)}</span></summary><div class="fb">${body}</div></details>`;
  return `<details class="fold docsall" id="names-format"><summary class="fh">${icon("chevron-right")}<b>Names format</b><span class="muted">Plain names, or JSON with a name and a book per entry</span></summary><div class="fin">` +
    fold("format-plain", "Plain names", "One name per line", `<p>Each line is a kind, a colon and a name. ${c("|BOOK")} after the name gives its book. A name with no book is homebrew, ${c("HB")}. A line that starts with ${c("#")} is a note.</p>` +
      pre(PLAIN_EXAMPLE, "A names file in the plain format") +
      `<p>Kinds: ${["Class", "Subclass", "Species", "Background", "Feat", "Spell", "Item", "Option", "Feature"].map(c).join(", ")}.</p>` +
      `<p>Brackets are optional. What they hold:</p><ul class="brk">` +
      `<li>${c("Spell")}: its level (${c("0")} or ${c("cantrip")}), then its classes</li>` +
      `<li>${c("Subclass")}: its class</li>` +
      `<li>${c("Option")}: its family</li>` +
      `<li>${c("Feat")}: its category, then the abilities its pick takes</li>` +
      `<li>${c("Feature")}: the options it offers inside ${c("[ ]")}</li></ul>`, true) +
    fold("format-json", "JSON", "Arrays per kind, each entry a name and a source", `<p>One array per kind, at the top level. Each entry needs a ${c("name")} and a ${c("source")}, its book's code. Other fields help where they are there: a spell's ${c("level")} and ${c("classes")}, a subclass's ${c("className")}, a feat's ${c("category")}.</p>` +
      pre(JSON_EXAMPLE, "A names file in JSON") +
      `<p>Arrays: ${["class", "subclass", "race", "background", "feat", "spell", "item", "baseitem", "magicvariant", "optionalfeature"].map(c).join(", ")}. A ${c("race")} is a species. An ${c("optionalfeature")} is an option.</p>`) +
    fold("format-more", "Classes and folders", "What else is read", `<p>A class with its features also gives the options a feature offers inside ${c("[ ]")} and the editor's pick counts, such as cantrips and spells at each level.</p>` +
      `<p>A folder gives every .json file at its top, and the .json files in subfolders whose path names a kind, such as ${c("spells/")} or ${c("class/")}.</p>` +
      `<p>Limits: 80 MB a folder. A GitHub folder reads up to 1,000 files. A folder from this computer has no file limit.</p>` +
      `<p>A species written as ${c("Dragonborn (Black)")} is left out when ${c("Dragonborn")} is there too.</p>` +
      `<p>Everything else in a file is dropped as it is read, descriptions and rules text included.</p>`) +
    `</div></details>`;
}

export function sourcesPage(): string {
  const main = `<div class="srcp">
<div class="prose intro"><h1>Your sources</h1><p>Add names from more books to the editor's suggestions. Only names, book codes and counts are kept.</p></div>
<p class="store">${icon("info")}<span>Kept in this browser only, never uploaded. Clearing site data removes them.</span></p>
<noscript><p class="ferr">This page needs JavaScript: your sources are read and kept by this browser.</p></noscript>
<section class="add njs" aria-labelledby="add-h">
<div class="addh"><span class="lbl" id="add-h">Add a source</span><div class="seg" role="radiogroup" aria-label="Add a source from"><button type="button" role="radio" aria-checked="true" class="on" data-way="file">${icon("upload")}File</button><button type="button" role="radio" aria-checked="false" data-way="link">${icon("link")}GitHub link</button></div></div>
<div class="way-file"><div class="drop">${icon("upload")}<span class="grow">Drop a names file or a folder here.</span><button type="button" class="bt pick">${icon("file")}Choose a file</button><button type="button" class="bt pickdir">${icon("folder")}Choose a folder</button><input type="file" class="vh" accept=".txt,.json,text/plain,application/json" tabindex="-1" aria-hidden="true"><input type="file" class="vh dir" webkitdirectory tabindex="-1" aria-hidden="true"></div>
<p class="hint">A .txt or .json file, or a folder of .json files. See <a class="lk" href="#names-format">Names format</a>.</p></div>
<form class="way-link" hidden><div class="lrow"><label class="vh" for="src-link">GitHub link</label><input class="in mono" id="src-link" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste a GitHub link to a file or a folder"><button type="submit" class="bt pri">${icon("plus")}Add link</button></div>
<p class="hint">This browser reads it from GitHub and checks it again on later visits.</p></form>
<div class="addout" aria-live="polite"></div>
</section>
<div class="list njs" aria-live="polite"></div>
<div class="docs">${namesFormatHtml()}</div>
</div>`;
  return layout({ title: "Your sources · dndpaste", main, page: "sources", head: `<script type="module" src="/assets/sources.js"></script>\n` });
}

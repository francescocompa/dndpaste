/** Server-rendered pages. No inline scripts or styles (CSP); every user value through `esc`. */
import { emit, isClean, parse } from "../../src/dndpaste.ts";
import type { Diagnostic, Paste } from "../../src/dndpaste.ts";
import { esc, icon, renderPaste } from "./render.ts";
import type { PasteRecord, Rendered } from "./store.ts";
import { LIMITS } from "./store.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Nov 2026", in UTC, locale-free. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

interface Layout { title: string; main: string; head?: string; page: string }

/**
 * Every page: the header (wordmark, New paste, About, the Display button) and /assets/site.js, a classic script in
 * <head> that applies the saved Display settings before the first paint (D82) and wires the chrome. Controls that
 * need JavaScript carry `njs` and stay hidden without it.
 */
export function layout(o: Layout): string {
  return `<!doctype html>
<html lang="en" class="ck ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/fonts.css">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js"></script>
${o.head ?? ""}</head>
<body class="${esc(o.page)}">
<div class="wrap">
<header class="top"><a class="wm" href="/">dndpaste<span class="dot">.</span></a><nav class="navs"><a class="nav" href="/">New paste</a><a class="nav" href="/about">About</a></nav><button type="button" class="dbtn njs" aria-haspopup="dialog" aria-expanded="false">${icon("contrast")}Display</button></header>
<main>
${o.main}
</main>
</div>
</body>
</html>
`;
}

export const UNTITLED = "Untitled build";

export interface ViewState {
  /** A report was just sent (the no-JS form's 303 lands here). */
  reported?: boolean;
  /** The report form failed: reopen it with this message and the values sent. */
  reportError?: string;
  reportReason?: string;
  reportContact?: string;
}

/**
 * Bump when the view body or the canonical text a record caches would change (renderer, library parse or emit).
 * test/cache.test.ts holds a hash of every fixture's output and fails until this moves with it.
 */
export const RENDER_VERSION = 1;

/** Everything the view and /canon derive from the paste, computed once at save (free-plan CPU, T3.3). */
export function prerender(paste: Paste): Rendered {
  return {
    v: RENDER_VERSION,
    body: renderPaste(paste),
    clean: isClean(paste),
    folds: paste.levels.some((l) => l.lines.size),
    canon: emit(paste),
  };
}

/** The record's cached render when it is current; otherwise rendered now (a renderer change re-renders on read). */
export const rendered = (rec: PasteRecord): Rendered => rec.r?.v === RENDER_VERSION ? rec.r : prerender(parse(rec.paste));

export function viewPage(id: string, rec: PasteRecord, origin: string, s: ViewState = {}): string {
  const r = rendered(rec);
  const title = rec.title || UNTITLED;
  const date = fmtDate(rec.created);
  const by = rec.author ? `by ${esc(rec.author)}` : "Anonymous";
  const url = `${origin}/${id}`;
  const head = [
    `<meta name="description" content="a D&amp;D build on dndpaste">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="dndpaste">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="a D&amp;D build on dndpaste">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<link rel="alternate" type="text/plain" href="/${id}/raw">`,
  ].join("\n") + "\n";

  const unclean = r.clean ? "" :
    `<p class="note">Some lines of this build did not parse and are not shown. <a href="/${id}/raw">See the text as written</a>.</p>`;

  // Fold all / expand all over the level blocks' <details> (D87): shown only when a level block has lines to fold.
  const folds = r.folds
    ? `<div class="fold njs"><button type="button" class="b" data-fold="close">Fold all levels</button> · <button type="button" class="b" data-fold="open">Expand all</button></div>\n`
    : "";
  const report = s.reported
    ? `<p class="report done">${icon("check")}Thanks. Your report went to the site's maintainer.</p>`
    : `<details class="report"${s.reportError ? " open" : ""}><summary>Something wrong with this build? <span class="u">Report it</span></summary>
<form class="rform" method="post" action="/${id}/report"><b>Report this build</b>
${s.reportError ? `<p class="ferr" role="alert">${icon("alert")}${esc(s.reportError)}</p>` : ""}<label class="fld"><span class="lbl">Reason</span><textarea class="in ta" name="reason" required maxlength="${LIMITS.reason}" placeholder="What's wrong? For example: it copies rules text, or it's spam.">${esc(s.reportReason ?? "")}</textarea><small>Required, up to ${LIMITS.reason} characters.</small></label>
<label class="fld"><span class="lbl">Contact (optional)</span><input class="in" name="contact" maxlength="${LIMITS.contact}" autocomplete="off" placeholder="An email or handle, if you want an answer" value="${esc(s.reportContact ?? "")}"></label>
<div class="actrow"><button class="bt pri" type="submit">${icon("flag")}Send report</button><button class="bt ghost njs" type="button" data-act="cancel-report">Cancel</button></div>
<small>Reports go to the site's maintainer and are never shown on this page.</small>
</form></details>`;

  const main = `<div class="meta"><h1 class="ttl${rec.title ? "" : " none"}">${esc(title)}</h1><div class="by">${by}${date ? ` · <time datetime="${esc(rec.created)}">${date}</time>` : ""}</div></div>
<div class="actrow acts" data-id="${id}"><span class="splitb njs"><button type="button" class="bt pri cpy" data-copy="link">${icon("link")}<span class="cl">Copy link</span></button>` +
    `<button type="button" class="bt pri caret icon" aria-label="More ways to copy" aria-haspopup="menu" aria-expanded="false">${icon("chevron-down")}</button></span>` +
    `<span class="grow"></span><a class="bt" href="/?from=${id}">${icon("pencil")}Duplicate and edit</a><noscript><span class="alt"><a href="/${id}/raw">Text as written</a> · <a href="/${id}/canon">Canonical text</a></span></noscript></div>
${folds}${unclean}${r.body}
${report}`;
  return layout({ title: `${title} · dndpaste`, main, head, page: "view" });
}

export interface FormState {
  title?: string;
  author?: string;
  paste?: string;
  /** A field-level refusal (empty, too large, too long, rate limit). */
  error?: string;
  diagnostics?: Diagnostic[];
  /** A `?from=` id that matched nothing. */
  missingFrom?: string;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function diagList(list: Diagnostic[]): string {
  return `<div class="diag">${list.map((d) => `<div class="dg ${d.code.startsWith("E") ? "e" : "w"}"><span class="code">${esc(d.code)}</span>` +
    `<span class="at">${d.line ? `line ${d.line}` : ""}</span><span>${esc(cap(d.message))}</span></div>`).join("")}</div>`;
}

export function formPage(s: FormState = {}): string {
  const diags = s.diagnostics ?? [];
  const errors = diags.filter((d) => d.code.startsWith("E")).length;
  const sum = errors ? `<span class="dsum"><b>${errors} error${errors === 1 ? "" : "s"}</b> · fix ${errors === 1 ? "it" : "them"} to save</span>` : "";
  const problems = diags.length ? diagList(diags) : `<p class="muted">Checked when you save.</p>`;
  const notes = [
    s.missingFrom ? `<p class="note">There is no build with the id ${esc(s.missingFrom)}. The form starts empty.</p>` : "",
    s.error ? `<p class="ferr" role="alert">${icon("alert")}${esc(s.error)}</p>` : "",
  ].join("");
  const main = `<form class="pform stack" method="post" action="/">
${notes}<div class="stack sm"><label class="fld"><span class="lbl">Title</span><textarea class="in fit" name="title" rows="1" maxlength="${LIMITS.title}" autocomplete="off" spellcheck="false" placeholder="Untitled build">${esc(s.title ?? "")}</textarea></label>
<label class="fld"><span class="lbl">Author</span><textarea class="in fit" name="author" rows="1" maxlength="${LIMITS.author}" autocomplete="off" spellcheck="false" placeholder="Anonymous">${esc(s.author ?? "")}</textarea></label></div>
<div class="tb"><span class="grow"></span>${sum}<button class="bt pri" type="submit">${icon("link")}Save and get link</button></div>
<div class="fgrid"><div class="pane"><textarea class="src" name="paste" aria-label="Build" spellcheck="false" autocapitalize="off" autocomplete="off" rows="24" placeholder="Paste or type a build">${esc(s.paste ?? "")}</textarea></div>
<aside class="aside"><div class="stack sm"><span class="lbl">Problems</span>${problems}</div></aside></div>
</form>`;
  // The editor, hints, Tidy, Open file and recent shares come from /assets/form.js (src/client/); without it this form
  // still saves, and the server answers with its diagnostics.
  const head = `<script type="module" src="/assets/form.js"></script>\n`;
  return layout({ title: "New paste · dndpaste", main, head, page: "new" });
}

/**
 * What the site is, the names-only rule, the app addresses and the report route (D71). Copy is dry and plain (D88 c),
 * run through /humanize; one unaffiliated sentence and no footer disclaimer (D89 c, ⚑ closed 2026-11-15).
 */
export function aboutPage(): string {
  const main = `<div class="prose"><h1>About</h1>
<p>dndpaste is a site for sharing Dungeons &amp; Dragons character builds as plain text. You paste a build and save it, and the site gives you a short link. Anyone with the link can read the build, copy its text, or open a copy in the editor.</p>
<h2>What a build holds</h2>
<p>A build names the choices a character makes, level by level: species, background, classes, feats, spells and items. It holds names only, never rules text. The site checks that the text follows the dndpaste format. It does not check the build against the rules.</p>
<h2>Saved builds</h2>
<p>You cannot edit or delete a saved build. To change one, open it, choose Duplicate and edit, and save the copy. The copy gets a new link.</p>
<p>There are no accounts. The site stores the title, the author and the text that you save. My recent shares and the Display settings stay in your browser.</p>
<h2>For apps</h2>
<p>Each build has three plain-text addresses. Any site can fetch them.</p>
<ul><li><code>/&lt;id&gt;/raw</code>: the text as written</li><li><code>/&lt;id&gt;/canon</code>: the text in canonical form, as Tidy writes it</li><li><code>/&lt;id&gt;/json</code>: the title, the author, the text and the date</li></ul>
<h2>Reports</h2>
<p>Under each build there is a line: "Something wrong with this build? Report it". Give a reason, and a contact if you want an answer. The report goes to the site&#39;s maintainer and never shows on the page. The maintainer can remove a build that copies rules text or is spam.</p>
<p>dndpaste is not affiliated with Wizards of the Coast.</p></div>`;
  return layout({ title: "About · dndpaste", main, page: "about" });
}

/** A short refusal or outage page: a heading, one sentence and a way back. */
export function messagePage(heading: string, text: string): string {
  const main = `<div class="prose"><h1>${esc(heading)}</h1>
<p>${esc(text)}</p>
<p><a href="/">New paste</a></p></div>`;
  return layout({ title: `${heading} · dndpaste`, main, page: "missing" });
}

export function notFoundPage(): string {
  const main = `<div class="prose"><h1>Not found</h1>
<p>There is nothing at this address. Links are case-sensitive: check the letters.</p>
<p><a href="/">New paste</a></p></div>`;
  return layout({ title: "Not found · dndpaste", main, page: "missing" });
}

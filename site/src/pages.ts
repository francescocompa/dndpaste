/** Server-rendered pages. No inline scripts or styles (CSP); every user value through `esc`. */
import { isClean, parse } from "../../src/dndpaste.ts";
import type { Diagnostic } from "../../src/dndpaste.ts";
import { esc, icon, renderPaste } from "./render.ts";
import type { PasteRecord } from "./store.ts";
import { LIMITS } from "./store.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15 Nov 2026", in UTC, locale-free. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

interface Layout { title: string; main: string; head?: string; page: string }

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
${o.head ?? ""}</head>
<body class="${esc(o.page)}">
<div class="wrap">
<header class="top"><a class="wm" href="/">dndpaste<span class="dot">.</span></a><nav class="navs"><a class="nav" href="/">New paste</a><a class="nav" href="/about">About</a></nav></header>
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

export function viewPage(id: string, rec: PasteRecord, origin: string, s: ViewState = {}): string {
  const paste = parse(rec.paste);
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

  const unclean = isClean(paste) ? "" :
    `<p class="note">Some lines of this build did not parse and are not shown. <a href="/${id}/raw">See the text as written</a>.</p>`;

  const report = s.reported
    ? `<p class="report done">${icon("check")}Thanks. Your report went to the site's maintainer.</p>`
    : `<details class="report"${s.reportError ? " open" : ""}><summary>Something wrong with this build? <span class="u">Report it</span></summary>
<form class="rform" method="post" action="/${id}/report"><b>Report this build</b>
${s.reportError ? `<p class="ferr" role="alert">${icon("alert")}${esc(s.reportError)}</p>` : ""}<label class="fld"><span class="lbl">Reason</span><textarea class="in ta" name="reason" required maxlength="${LIMITS.reason}" placeholder="What's wrong? For example: it copies rules text, or it's spam.">${esc(s.reportReason ?? "")}</textarea><small>Required, up to ${LIMITS.reason} characters.</small></label>
<label class="fld"><span class="lbl">Contact (optional)</span><input class="in" name="contact" maxlength="${LIMITS.contact}" autocomplete="off" placeholder="An email or handle, if you want an answer" value="${esc(s.reportContact ?? "")}"></label>
<div class="actrow"><button class="bt pri" type="submit">${icon("flag")}Send report</button></div>
<small>Reports go to the site's maintainer and are never shown on this page.</small>
</form></details>`;

  const main = `<div class="meta"><h1 class="ttl${rec.title ? "" : " none"}">${esc(title)}</h1><div class="by">${by}${date ? ` · <time datetime="${esc(rec.created)}">${date}</time>` : ""}</div></div>
<div class="actrow acts"><a class="bt" href="/?from=${id}">${icon("pencil")}Duplicate and edit</a><noscript><span class="alt"><a href="/${id}/raw">Text as written</a> · <a href="/${id}/canon">Canonical text</a></span></noscript></div>
${unclean}${renderPaste(paste)}
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

/** A stub: slice 3 writes the copy (D88 c). The unaffiliated sentence stays (D89 ⚑ closed 2026-11-15). */
export function aboutPage(): string {
  const main = `<div class="prose"><h1>About</h1>
<p>dndpaste shares D&amp;D character builds as plain text. A build names its choices; it never holds rules text.</p>
<p>dndpaste is not affiliated with Wizards of the Coast.</p></div>`;
  return layout({ title: "About · dndpaste", main, page: "about" });
}

export function notFoundPage(): string {
  const main = `<div class="prose"><h1>Not found</h1>
<p>There is nothing at this address. Links are case-sensitive: check the letters.</p>
<p><a href="/">New paste</a></p></div>`;
  return layout({ title: "Not found · dndpaste", main, page: "missing" });
}

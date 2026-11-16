/**
 * The form's live state, DOM-free: diagnostics, size, whether Save and Tidy are on, and the HTML for the problem
 * summary, the Problems list, the phone dock's problem line and the link-import bar (D83–D86, D88 d).
 */
import { emit, parse } from "../../../src/dndpaste.ts";
import type { Diagnostic } from "../../../src/dndpaste.ts";
import { esc, icon } from "../render.ts";
import { ID_RE, LIMITS, isBare } from "../store.ts";

export interface Status {
  diagnostics: Diagnostic[];
  errors: number;
  warnings: number;
  bytes: number;
  empty: boolean;
  /** D95: no errors, but nothing besides the name; Save stays off. */
  bare: boolean;
  over: boolean;
  canSave: boolean;
  /** `emit(parse(text))` when the text has no errors, else null. */
  canon: string | null;
  /** Tidy changes something: no errors and the text is not already canonical. */
  canTidy: boolean;
  /** D90: E001s held back on the line being typed. Not in `diagnostics` or `errors`; Save still blocks on them. */
  held: number;
}

const enc = new TextEncoder();

/**
 * `holdLine` (1-based, D90): the line being typed. Its E001 (a key line without its separator yet, such as a
 * half-typed `Spe`) is held out of the shown diagnostics until the form lets go (the cursor leaves the line or
 * typing pauses); `canSave` stays false while one is held.
 */
export function status(text: string, holdLine = 0): Status {
  const t = text.replace(/\r\n?/g, "\n");
  const paste = parse(t);
  const isHeld = (d: Diagnostic) => holdLine > 0 && d.code === "E001" && d.line === holdLine;
  const held = paste.diagnostics.filter(isHeld).length;
  const diagnostics = held ? paste.diagnostics.filter((d) => !isHeld(d)) : paste.diagnostics;
  const errors = diagnostics.filter((d) => d.code.startsWith("E")).length;
  const bytes = enc.encode(t).byteLength;
  const empty = !t.trim();
  const over = bytes > LIMITS.pasteBytes;
  const bare = !empty && !errors && !held && isBare(paste);
  const canon = errors || held ? null : emit(paste);
  return {
    diagnostics, errors, warnings: diagnostics.length - errors, bytes, empty, bare, over,
    canSave: !empty && !over && !errors && !held && !bare,
    canon,
    canTidy: !empty && canon !== null && canon.trimEnd() !== t.trimEnd(),
    held,
  };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The toolbar's one-line summary, beside Save. */
export function summaryHtml(s: Status): string {
  if (s.empty) return "Nothing to save yet";
  if (s.over) return `<b>Over ${LIMITS.pasteBytes / 1024} KB</b> · shorten it to save`;
  if (s.errors) return `<b>${plural(s.errors, "error")}</b> · fix ${s.errors === 1 ? "it" : "them"} to save`;
  if (s.bare) return `<b>Only a name</b> · add a key to save`;
  if (s.warnings) return `<span class="okc">No errors</span> · ${plural(s.warnings, "warning")}, ready to save`;
  return `<span class="okc">No problems</span> · ready to save`;
}

/** The Problems list shows this many; a hostile or very broken paste can carry a thousand. */
export const PROBLEMS_SHOWN = 100;

/** The Problems list: errors first (amber + E-code), then warnings; each line number jumps to its line. */
export function problemsHtml(s: Status): string {
  const size = s.over
    ? `<div class="dg e"><span class="code">Size</span><span class="at">${(s.bytes / 1024).toFixed(1)} KB</span><span>Over the ${LIMITS.pasteBytes / 1024} KB limit</span></div>`
    : s.bare
      ? `<div class="dg e"><span class="code">Keys</span><span class="at"></span><span>Add at least one key besides the name, such as Species:</span></div>`
      : "";
  if (!s.diagnostics.length && !size) {
    return `<div class="dsum"><span class="okc">No problems.</span> Warnings show here; they don't block saving.</div>`;
  }
  const list = [...s.diagnostics].sort((a, b) => Number(b.code.startsWith("E")) - Number(a.code.startsWith("E")) || a.line - b.line);
  const rest = list.length - PROBLEMS_SHOWN;
  const more = rest > 0 ? `<div class="dg w"><span class="code"></span><span class="at"></span><span>${plural(rest, "more problem")} not listed</span></div>` : "";
  return `<div class="diag">${size}${list.slice(0, PROBLEMS_SHOWN).map((d) => `<div class="dg ${d.code.startsWith("E") ? "e" : "w"}"><span class="code">${esc(d.code)}</span>` +
    (d.line ? `<button type="button" class="at" data-line="${d.line}">line ${d.line}</button>` : `<span class="at"></span>`) +
    `<span>${esc(cap(d.message))}</span></div>`).join("")}${more}</div>`;
}

/** The phone dock's problem line: the first error, or the all-clear (D86). */
export function dockLineHtml(s: Status): string {
  if (s.empty) return `<span class="dsum">Nothing to save yet</span>`;
  if (s.over) return `<span class="dsum perr">${icon("alert")}<b>Over ${LIMITS.pasteBytes / 1024} KB</b></span>`;
  const e = s.diagnostics.find((d) => d.code.startsWith("E"));
  if (e) {
    const more = s.errors > 1 ? ` <span class="more">+${s.errors - 1}</span>` : "";
    const inner = `${icon("alert")}<b>${esc(e.code)}</b>${e.line ? ` line ${e.line}` : ""}${more}<span class="pmsg">${esc(cap(e.message))}</span>`;
    return e.line ? `<button type="button" class="dsum perr" data-line="${e.line}">${inner}</button>` : `<span class="dsum perr">${inner}</span>`;
  }
  if (s.bare) return `<span class="dsum perr">${icon("alert")}<b>Only a name</b><span class="pmsg">Add a key, such as Species:</span></span>`;
  if (s.warnings) return `<span class="dsum"><span class="okc">No errors</span> · ${plural(s.warnings, "warning")}</span>`;
  return `<span class="dsum"><span class="okc">No problems</span></span>`;
}

/**
 * D85: the id when the whole text is one of this site's links (`host`, with or without a scheme, optionally
 * ending in /raw, /canon or /json) or a bare 10-character id; null otherwise.
 */
export function linkedId(text: string, host: string): string | null {
  const t = text.trim();
  if (ID_RE.test(t)) return t;
  const m = /^(?:https?:\/\/)?([^/\s]+)\/([0-9A-Za-z]{10})(?:\/(?:raw|canon|json))?\/?(?:[?#]\S*)?$/i.exec(t);
  if (!m || m[1].toLowerCase() !== host.toLowerCase()) return null;
  return ID_RE.test(m[2]) ? m[2] : null;
}

export type Import =
  | { kind: "found"; id: string; title: string; author: string }
  | { kind: "missing"; id: string }
  | { kind: "failed"; id: string };

/** The import bar above the editor (D85). */
export function importBarHtml(r: Import): string {
  const keep = `<button type="button" class="bt" data-act="keep">Keep as text</button>`;
  if (r.kind === "missing") {
    return `<span>That looks like a dndpaste link, but there is no build with the id <b>${esc(r.id)}</b>.</span><span class="grow"></span>${keep}`;
  }
  if (r.kind === "failed") {
    return `<span>That looks like a dndpaste link, but the build could not be loaded.</span><span class="grow"></span>` +
      `<button type="button" class="bt" data-act="retry">Try again</button>${keep}`;
  }
  const by = r.author ? ` by ${esc(r.author)}` : "";
  return `<span>That's a dndpaste link. Open <b>${esc(r.title || "Untitled build")}</b>${by} in the editor?</span><span class="grow"></span>` +
    `<button type="button" class="bt pri" data-act="import">${icon("import")}Open it</button>${keep}`;
}

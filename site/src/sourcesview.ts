/**
 * The /sources list (D252–D256, D266–D267), as HTML from the page's state: grouped by book or by source, each row
 * split by kind on demand, and the empty state. Pure, so node tests can read it; client/sources.ts wires it. Titles, codes and counts
 * come from the visitor's own data and the site's book list only (D257): nothing here names a data source.
 */
import { allCodes } from "./codelist.ts";
import type { Book, BookType } from "./books.ts";
import { esc, icon } from "./render.ts";
import { BUILTIN_BOOKS, KINDS, bookKinds, bookPair, categoryState, counts, srcPair } from "./yours.ts";
import type { Kind, SourceRec, Switches } from "./yours.ts";

/** Group the list by book or by source (D267); `split` shows each row's kinds, with a switch each. */
export type Lens = "book" | "source";
export interface View {
  sources: readonly SourceRec[];
  sw: Switches;
  lens: Lens;
  split: boolean;
  /** The SRD names per book and kind (yours.ts `builtinBookKinds`); null while they load. */
  builtin: ReadonlyMap<string, ReadonlyMap<Kind, number>> | null;
  /** Total SRD names. */
  builtinNames: number;
  /** Book categories opened in By book. */
  open: ReadonlySet<string>;
  /** Sources being checked now. */
  busy: ReadonlySet<string>;
  /** The source whose Remove asks to be confirmed. */
  confirm: string | null;
  now: Date;
}

/** Book categories, in this order (D253): the site's book types, then codes the site doesn't list. */
export const CATEGORIES: readonly string[] = ["Core", "Supplement", "Setting", "Adventure", "Extra", "Unearthed Arcana", "Homebrew", "Other books"];

const n = (x: number) => x.toLocaleString("en-US");
const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** `today 10:15`, else `18 Nov` (with the year when it isn't this year). */
export function when(iso: string | null | undefined, now: Date, time = true): string {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const same = d.toDateString() === now.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (same) return time ? `today ${hm}` : "today";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

let byCode: Map<string, Book> | null = null;
export function bookOf(code: string): Book | undefined {
  byCode ??= new Map(allCodes().map((b) => [b.code.toLowerCase(), b]));
  return byCode.get(code.toLowerCase());
}
export const categoryOf = (code: string): string => (bookOf(code)?.type as BookType | undefined) ?? "Other books";

const sw = (attrs: string, on: boolean | "mixed", label: string) =>
  `<button type="button" class="tgb" role="switch" aria-checked="${on}" aria-label="${esc(label)}" ${attrs}><span class="tog${on === true ? " on" : on === "mixed" ? " on mix" : ""}" aria-hidden="true"></span></button>`;

const kindLabel = (k: Kind) => KINDS.find((x) => x.kind === k)?.label ?? k;
const lower = (k: Kind) => kindLabel(k).toLowerCase();

/** Per book: your names (sources that are on), the built-in names, and which built-in kinds yours stand in for. */
interface BookRow { code: string; title: string; date: string; y2014: boolean; yours: number; built: number; replaced: Kind[]; builtKinds: Kind[]; names: number; kinds: Map<Kind, number> }
function bookRows(v: View): BookRow[] {
  const mine = bookKinds(v.sources.filter((s) => s.on).map((s) => s.table));
  const codes = new Set([...mine.keys(), ...(v.sw.builtin && v.builtin ? [...v.builtin.keys()] : [])]);
  const rows: BookRow[] = [];
  for (const code of codes) {
    const b = bookOf(code);
    const m = mine.get(code) ?? new Map<Kind, number>();
    const bk = (v.sw.builtin && v.builtin?.get(code)) || new Map<Kind, number>();
    const replaced = [...bk.keys()].filter((k) => m.has(k));
    const yours = [...m.values()].reduce((a, x) => a + x, 0);
    const built = [...bk.entries()].filter(([k]) => !m.has(k)).reduce((a, [, x]) => a + x, 0);
    const kinds = new Map<Kind, number>([...bk.entries()].filter(([k]) => !m.has(k)));
    for (const [k, x] of m) kinds.set(k, x);
    rows.push({ code, title: b?.title ?? code, date: b?.date ?? "", y2014: b?.y2014 ?? false, yours, built, replaced, builtKinds: [...bk.keys()], names: yours + built, kinds });
  }
  // Newest first, as the frames show the core books (2024 before 2014), then by code.
  return rows.sort((a, b) => (a.date === b.date ? a.code.localeCompare(b.code) : a.date < b.date ? 1 : -1));
}

function bookSmall(r: BookRow): string {
  const bits = [r.code];
  if (r.y2014) bits.push("2014");
  if (r.builtKinds.length && r.replaced.length === r.builtKinds.length) bits.push("yours replace the SRD");
  else if (r.replaced.length) bits.push(`yours replace the SRD ${r.replaced.map(lower).join(", ")}`);
  else if (r.builtKinds.length && !r.yours) bits.push("SRD");
  bits.push(plural(r.names, "name"));
  return bits.join(" · ");
}

/** The list's head: Group by Book | Source, and Kinds, which splits every row by kind (D267). */
function lensHead(v: View, title: string): string {
  const failed = v.sources.some((s) => s.link?.failed);
  const b = (l: Lens, ic: string, label: string) =>
    `<button type="button" role="radio" aria-checked="${v.lens === l}" data-lens="${l}"${v.lens === l ? ` class="on"` : ""}>${icon(ic)}${label}` +
    `${l === "source" && failed ? `<span class="wdot" role="img" aria-label="a check failed"></span>` : ""}</button>`;
  return `<div class="sh"><h2>${title}</h2><span class="grow"></span><span class="gby">Group by</span><div class="seg" role="radiogroup" aria-label="Group by">` +
    `${b("book", "book-open", "Book")}${b("source", "database", "Source")}</div>` +
    `<button type="button" class="kbtn${v.split ? " on" : ""}" aria-pressed="${v.split}" data-split="1">${icon("settings")}Kinds</button></div>`;
}

/** A row's kinds, each with its switch (D267): `key` makes the `offPairs` key of a kind. */
function kindRows(kinds: ReadonlyMap<Kind, number>, key: (k: Kind) => string, on: Switches, whose: string): string {
  const rows = KINDS.filter((k) => (kinds.get(k.kind) ?? 0) > 0).map((k) => {
    const off = on.offPairs.includes(key(k.kind));
    return `<div class="kd${off ? " off" : ""}"><span class="t">${k.label}</span><small>${n(kinds.get(k.kind) ?? 0)}</small>${sw(`data-pair="${esc(key(k.kind))}"`, !off, `${k.label} in ${whose}`)}</div>`;
  });
  return rows.length ? `<div class="kds">${rows.join("")}</div>` : "";
}

function byBook(v: View): string {
  const rows = bookRows(v);
  const groups = CATEGORIES.map((c) => ({ c, rows: rows.filter((r) => categoryOf(r.code) === c) })).filter((g) => g.rows.length);
  const body = groups.map(({ c, rows: rs }) => {
    const codes = rs.map((r) => r.code);
    const st = categoryState(codes, v.sw);
    const names = rs.reduce((a, r) => a + r.names, 0);
    const offN = rs.filter((r) => v.sw.offBooks.includes(r.code)).length;
    const stat = st === "off" ? `off · ${plural(names, "name")}` : st === "mix" ? `${n(rs.length - offN)} of ${n(rs.length)} on · ${plural(names, "name")}` : `${plural(rs.length, "book")} · ${plural(names, "name")}`;
    const open = v.open.has(c);
    const inner = open ? `<div class="bks">${rs.map((r) => {
      const off = v.sw.offBooks.includes(r.code);
      return `<div class="brow${off ? " off" : ""}"><span class="t">${esc(r.title)}</span>${sw(`data-book="${esc(r.code)}"`, !off, r.title)}<small>${esc(bookSmall(r))}</small>` +
        `${v.split && !off ? kindRows(r.kinds, (k) => bookPair(r.code, k), v.sw, r.code) : ""}</div>`;
    }).join("")}</div>` : "";
    return `<div class="bgrp"><div class="gh"><button type="button" class="ghb" aria-expanded="${open}" data-cat="${esc(c)}"><span class="chev">${icon(open ? "chevron-down" : "chevron-right")}</span>` +
      `<span><b>${esc(c)}</b><span class="st">${esc(stat)}</span></span></button>${sw(`data-catsw="${esc(c)}"`, st === "on" ? true : st === "off" ? false : "mixed", `${c} books`)}` +
      `${open ? "" : `<small>${esc(codes.join(" "))}</small>`}</div>${inner}</div>`;
  }).join("");
  return lensHead(v, "Books") + `<div class="c3">${body}</div>`;
}

/** A row's lines not read (D266): a quiet alert in the meta line that opens the reason. */
function unread(k: number, id: string): string {
  if (!k) return "";
  return `<details class="pop" data-pop="${esc(id)}"><summary>${icon("warning")}${plural(k, "line")} not read</summary>` +
    `<div class="popb">${k === 1 ? "This line doesn't" : "These lines don't"} start with a kind, such as <code>Spell:</code> or <code>Feat:</code>. Fix the file and add it again.</div></details>`;
}

function sourceRow(v: View, s: SourceRec): string {
  const c = counts(s.table);
  const l = s.link;
  const what = s.type === "file" ? `File · added ${when(s.added, v.now, false)}`
    : s.type === "folder" ? `Folder · ${plural(s.files, "file")} · added ${when(s.added, v.now, false)}`
    : l?.kind === "folder" ? `GitHub folder · ${plural(s.files, "file")}` : "GitHub file";
  const meta = [what, `<b>${n(c.names)}</b> ${c.names === 1 ? "name" : "names"}`, plural(c.books.size, "book")].join(" · ");
  const busy = v.busy.has(s.id);
  const stat = !l ? "" : l.failed
    ? `<p class="ferr">${icon("warning")}<span>Check failed ${esc(when(l.failed.at, v.now))}: ${esc(l.failed.message)} Still using the copy from ${esc(when(l.copy, v.now, false))}.</span></p>`
    : `<div class="stat">${busy ? `${icon("refresh")}Checking…` : `<span class="ok">${icon("check")}</span>Checked ${esc(when(l.checked, v.now))}${l.checked && l.copy === l.checked && l.checked !== s.added ? ", names updated" : ""}`}</div>`;
  const confirming = v.confirm === s.id;
  const act = `${l ? `<button type="button" class="bt ghost sm" data-check="${esc(s.id)}"${busy ? " disabled" : ""}>${icon("refresh")}Check now</button>` : ""}` +
    (confirming
      ? `<button type="button" class="bt sm warn" data-remove-yes="${esc(s.id)}">${icon("trash")}Remove for good</button><button type="button" class="bt ghost sm" data-remove-no="${esc(s.id)}">Keep</button>`
      : `<button type="button" class="bt ghost sm" data-remove="${esc(s.id)}">${icon("trash")}Remove</button>`);
  const ic = s.type === "file" ? "file" : s.type === "folder" || l?.kind === "folder" ? "folder" : "link";
  return `<div class="srow${s.on ? "" : " off"}"><div class="nm">${icon(ic)}<span class="t" title="${esc(s.name)}">${esc(s.name)}</span></div>` +
    `<div class="act">${act}</div>${sw(`data-source="${esc(s.id)}"`, s.on, s.name)}` +
    `<div class="meta"><span>${meta}</span>${unread(s.skipped, s.id)}</div>${stat}` +
    `${v.split && s.on ? kindRows(new Map(Object.entries(c.kinds) as [Kind, number][]), (k) => srcPair(s.id, k), v.sw, s.name) : ""}</div>`;
}

/** The SRD names per kind, as shown (D255): a kind your sources bring for a book drops that book's SRD names. */
function srdKinds(v: View): Map<Kind, number> {
  const out = new Map<Kind, number>();
  if (!v.builtin) return out;
  for (const [, m] of v.builtin) for (const [k, x] of m) out.set(k, (out.get(k) ?? 0) + x);
  return out;
}

function bySource(v: View): string {
  const mine = bookKinds(v.sources.filter((s) => s.on).map((s) => s.table));
  const partly = BUILTIN_BOOKS.some(([code]) => [...(v.builtin?.get(code)?.keys() ?? [])].some((k) => mine.get(code)?.has(k)));
  const srd = `<div class="srow${v.sw.builtin ? "" : " off"}"><div class="nm">${icon("database")}<span class="t">SRD names</span></div><div class="act"></div>` +
    `${sw(`data-builtin="1"`, v.sw.builtin, "SRD names")}<div class="meta"><span>Comes with the site · <b>${n(v.builtinNames)}</b> names${partly && v.sw.builtin ? " · partly replaced by yours" : ""}</span></div>` +
    `${v.split && v.sw.builtin ? kindRows(srdKinds(v), (k) => srcPair("srd", k), v.sw, "the SRD names") : ""}</div>`;
  return lensHead(v, "Sources") + v.sources.map((s) => sourceRow(v, s)).join("") + srd;
}

/** No source added yet (D252): what a source is, and the built-in names. */
function empty(v: View): string {
  const books = BUILTIN_BOOKS.filter(([c]) => v.builtin?.has(c)).map(([c]) =>
    `<span class="hc">${c}</span><span>${v.sw.offBooks.includes(c) ? "Off" : "Shown"}</span>`).join("");
  return `<section><div class="lh"><span class="lbl">Your sources</span><span class="muted">None yet</span></div>` +
    `<div class="empty"><b>No sources yet.</b> Add a file, a folder or a GitHub link above.</div></section>` +
    `<section class="sec"><div class="lh"><span class="lbl">SRD</span><span class="muted">Always here</span></div>` +
    `<div class="srow"><div class="nm">${icon("database")}<span class="t">SRD names</span></div><div class="act"></div><span></span>` +
    `<div class="meta"><span><b>${n(v.builtinNames)} names</b> · comes with the site</span></div>${books ? `<div class="bkst">${books}</div>` : ""}` +
    `<p class="hint">Your names for a book and kind hide the SRD names for them.</p></div></section>`;
}

export function listHtml(v: View): string {
  if (!v.sources.length) return empty(v);
  return v.lens === "source" ? bySource(v) : byBook(v);
}

/** The books a category switch turns on or off: on → all off; off or partly on → all on. */
export function categoryToggle(v: View, cat: string): Switches {
  const codes = bookRows(v).filter((r) => categoryOf(r.code) === cat).map((r) => r.code);
  const st = categoryState(codes, v.sw);
  const off = new Set(v.sw.offBooks);
  for (const c of codes) { if (st === "on") off.add(c); else off.delete(c); }
  return { ...v.sw, offBooks: [...off].sort() };
}

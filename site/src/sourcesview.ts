/**
 * The /sources list (D252–D256), as HTML from the page's state: the three lenses By book | By kind | By source on one
 * switch, and the empty state. Pure, so node tests can read it; client/sources.ts wires it. Titles, codes and counts
 * come from the visitor's own data and the site's book list only (D257): nothing here names a data source.
 */
import { allCodes } from "./codelist.ts";
import type { Book, BookType } from "./books.ts";
import { esc, icon } from "./render.ts";
import { BUILTIN_BOOKS, KINDS, bookKinds, categoryState, counts } from "./yours.ts";
import type { Kind, SourceRec, Switches } from "./yours.ts";

export type Lens = "book" | "kind" | "source";
export interface View {
  sources: readonly SourceRec[];
  sw: Switches;
  lens: Lens;
  /** The built-in names per book and kind (yours.ts `builtinBookKinds`); null while they load. */
  builtin: ReadonlyMap<string, ReadonlyMap<Kind, number>> | null;
  /** Total built-in names. */
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
export const CATEGORIES: readonly string[] = ["Core", "Supplement", "Setting", "Adventure", "Extra", "Unearthed Arcana", "Homebrew", "Your own codes"];

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
export const categoryOf = (code: string): string => (bookOf(code)?.type as BookType | undefined) ?? "Your own codes";

const sw = (attrs: string, on: boolean | "mixed", label: string) =>
  `<button type="button" class="tgb" role="switch" aria-checked="${on}" aria-label="${esc(label)}" ${attrs}><span class="tog${on === true ? " on" : on === "mixed" ? " on mix" : ""}" aria-hidden="true"></span></button>`;

const kindLabel = (k: Kind) => KINDS.find((x) => x.kind === k)?.label ?? k;
const lower = (k: Kind) => kindLabel(k).toLowerCase();

/** Per book: your names (sources that are on), the built-in names, and which built-in kinds yours stand in for. */
interface BookRow { code: string; title: string; date: string; y2014: boolean; yours: number; built: number; replaced: Kind[]; builtKinds: Kind[]; names: number }
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
    rows.push({ code, title: b?.title ?? code, date: b?.date ?? "", y2014: b?.y2014 ?? false, yours, built, replaced, builtKinds: [...bk.keys()], names: yours + built });
  }
  // Newest first, as the frames show the core books (2024 before 2014), then by code.
  return rows.sort((a, b) => (a.date === b.date ? a.code.localeCompare(b.code) : a.date < b.date ? 1 : -1));
}

function bookSmall(r: BookRow): string {
  const bits = [r.code];
  if (r.y2014) bits.push("2014");
  if (r.builtKinds.length && r.replaced.length === r.builtKinds.length) bits.push("replaces the built-in names");
  else if (r.replaced.length) bits.push(`replaces the built-in ${r.replaced.map(lower).join(", ")}`);
  else if (r.builtKinds.length && !r.yours) bits.push("built in");
  bits.push(plural(r.names, "name"));
  return bits.join(" · ");
}

function lensHead(v: View, title: string, hint: string): string {
  const failed = v.sources.some((s) => s.link?.failed);
  const b = (l: Lens, ic: string, label: string) =>
    `<button type="button" role="radio" aria-checked="${v.lens === l}" data-lens="${l}"${v.lens === l ? ` class="on"` : ""}>${icon(ic)}${label}` +
    `${l === "source" && failed ? `<span class="wdot" role="img" aria-label="a check failed"></span>` : ""}</button>`;
  return `<div class="sh"><h2>${title}</h2><span class="grow"></span><div class="seg" role="radiogroup" aria-label="Show the list">` +
    `${b("book", "book-open", "By book")}${b("kind", "settings", "By kind")}${b("source", "database", "By source")}</div></div><p class="hint lens">${hint}</p>`;
}

function byBook(v: View): string {
  const rows = bookRows(v);
  const groups = CATEGORIES.map((c) => ({ c, rows: rows.filter((r) => categoryOf(r.code) === c) })).filter((g) => g.rows.length);
  const on = rows.filter((r) => !v.sw.offBooks.includes(r.code)).length;
  const srcOn = v.sources.filter((s) => s.on).length;
  const failed = v.sources.filter((s) => s.link?.failed).length;
  const from = `from ${plural(srcOn, "source")}${v.sw.builtin ? " and the built-in names" : ""}`;
  const hint = `${plural(rows.length, "book")}, ${n(on)} on · ${from}${failed ? ` · ${plural(failed, "source needs", "sources need")} attention` : ""}`;
  const body = groups.map(({ c, rows: rs }) => {
    const codes = rs.map((r) => r.code);
    const st = categoryState(codes, v.sw);
    const names = rs.reduce((a, r) => a + r.names, 0);
    const offN = rs.filter((r) => v.sw.offBooks.includes(r.code)).length;
    const stat = st === "off" ? `off · ${plural(names, "name")}` : st === "mix" ? `${n(rs.length - offN)} of ${n(rs.length)} on · ${plural(names, "name")}` : `${plural(rs.length, "book")} · ${plural(names, "name")}`;
    const open = v.open.has(c);
    const inner = open ? `<div class="bks">${rs.map((r) => {
      const off = v.sw.offBooks.includes(r.code);
      return `<div class="brow${off ? " off" : ""}"><span class="t">${esc(r.title)}</span>${sw(`data-book="${esc(r.code)}"`, !off, r.title)}<small>${esc(bookSmall(r))}</small></div>`;
    }).join("")}</div>` : "";
    return `<div class="grp"><div class="gh"><button type="button" class="ghb" aria-expanded="${open}" data-cat="${esc(c)}"><span class="chev">${icon(open ? "chevron-down" : "chevron-right")}</span>` +
      `<span><b>${esc(c)}</b><span class="st">${esc(stat)}</span></span></button>${sw(`data-catsw="${esc(c)}"`, st === "on" ? true : st === "off" ? false : "mixed", `${c} books`)}` +
      `${open ? "" : `<small>${esc(codes.join(" "))}</small>`}</div>${inner}</div>`;
  }).join("");
  return lensHead(v, "Books", hint) + `<div class="c3">${body}</div>`;
}

function byKind(v: View): string {
  const mine = bookKinds(v.sources.filter((s) => s.on).map((s) => s.table));
  const total = (k: Kind) => {
    let x = 0;
    for (const m of mine.values()) x += m.get(k) ?? 0;
    if (v.sw.builtin && v.builtin) for (const [code, m] of v.builtin) if (!mine.get(code)?.has(k)) x += m.get(k) ?? 0;
    return x;
  };
  const on = KINDS.filter((k) => !v.sw.offKinds.includes(k.kind)).length;
  const hint = `${KINDS.length} kinds, ${on} on · a name shows when its book and its kind are both on`;
  const body = KINDS.map((k) => {
    const off = v.sw.offKinds.includes(k.kind);
    return `<div class="krow${off ? " off" : ""}"><b>${k.label}</b>${sw(`data-kind="${k.kind}"`, !off, k.label)}<small>${plural(total(k.kind), "name")}${off ? " · off in every book" : ""}</small></div>`;
  }).join("");
  return lensHead(v, "Kinds", hint) + `<div class="c3">${body}</div>`;
}

function sourceRow(v: View, s: SourceRec): string {
  const c = counts(s.table);
  const l = s.link;
  const what = s.type === "file" ? `File · added ${when(s.added, v.now, false)}`
    : l?.kind === "folder" ? `GitHub folder · ${plural(s.files, "file")}` : `GitHub file · ${esc((l?.path ?? "").split("/").pop() ?? "")}`;
  const meta = [what, `<b>${n(c.names)}</b> ${c.names === 1 ? "name" : "names"}`, ...(c.options ? [plural(c.options, "option")] : []), plural(c.books.size, "book"), ...(s.on ? [] : ["off"])].join(" · ");
  const busy = v.busy.has(s.id);
  const stat = !l ? "" : l.failed
    ? `<p class="ferr">${icon("warning")}<span>Check failed ${esc(when(l.failed.at, v.now))}: ${esc(l.failed.message)} Still using the copy from ${esc(when(l.copy, v.now, false))}.</span></p>`
    : `<div class="stat">${busy ? `${icon("refresh")}Checking…` : `<span class="ok">${icon("check")}</span>Checked ${esc(when(l.checked, v.now))}${l.checked && l.copy === l.checked && l.checked !== s.added ? ", names updated" : l.checked !== s.added ? ", no changes" : ""}`}</div>`;
  const skipped = s.skipped ? `<div class="stat">${plural(s.skipped, "line")} not read: ${s.skipped === 1 ? "it doesn't" : "they don't"} start with a kind.</div>` : "";
  const confirming = v.confirm === s.id;
  const act = `${l ? `<button type="button" class="bt ghost sm" data-check="${esc(s.id)}"${busy ? " disabled" : ""}>${icon("refresh")}Check now</button>` : ""}` +
    (confirming
      ? `<button type="button" class="bt sm warn" data-remove-yes="${esc(s.id)}">${icon("trash")}Remove for good</button><button type="button" class="bt ghost sm" data-remove-no="${esc(s.id)}">Keep</button>`
      : `<button type="button" class="bt ghost sm" data-remove="${esc(s.id)}">${icon("trash")}Remove</button>`);
  return `<div class="srow${s.on ? "" : " off"}">${sw(`data-source="${esc(s.id)}"`, s.on, s.name)}<div class="body">` +
    `<div class="nm">${icon(s.type === "file" ? "file" : l?.kind === "folder" ? "folder" : "link")}<span class="t" title="${esc(s.name)}">${esc(s.name)}</span></div>` +
    `<div class="meta">${meta}</div>${stat}${skipped}</div><div class="act">${act}</div></div>`;
}

/** The built-in names' state per book (D255): shown, replaced by yours for some kinds, or off. */
function builtinState(v: View): string {
  if (!v.builtin) return "";
  const mine = bookKinds(v.sources.filter((s) => s.on).map((s) => s.table));
  const shown: string[] = [], off: string[] = [], replaced: string[] = [];
  for (const [code] of BUILTIN_BOOKS) {
    const bk = v.builtin.get(code);
    if (!bk) continue;
    if (v.sw.offBooks.includes(code)) { off.push(code); continue; }
    const rep = [...bk.keys()].filter((k) => mine.get(code)?.has(k));
    if (!rep.length) shown.push(code);
    else replaced.push(rep.length === bk.size ? `${code} replaced by yours` : `${code} replaced by yours for ${rep.map(lower).join(", ")}`);
  }
  return [...replaced, ...(shown.length ? [`${shown.join(", ")} shown`] : []), ...(off.length ? [`${off.join(", ")} off`] : [])].join("; ");
}

function bySource(v: View): string {
  const on = v.sources.filter((s) => s.on).length;
  const books = bookRows(v).length;
  const hint = `${plural(v.sources.length, "source")}, ${n(on)} on · ${plural(books, "book")} in all`;
  const builtin = `<div class="srow${v.sw.builtin ? "" : " off"}">${sw(`data-builtin="1"`, v.sw.builtin, "Built-in names")}<div class="body"><div class="nm">${icon("database")}<span class="t">Built-in names</span></div>` +
    `<div class="meta">Comes with the site · <b>${n(v.builtinNames)}</b> names${builtinState(v) ? ` · ${esc(builtinState(v))}` : ""}${v.sw.builtin ? "" : " · off"}</div></div><div class="act"></div></div>`;
  return lensHead(v, "Sources", hint) + v.sources.map((s) => sourceRow(v, s)).join("") + builtin;
}

/** No source added yet (D252): what a source is, and the built-in names. */
function empty(v: View): string {
  const books = BUILTIN_BOOKS.filter(([c]) => v.builtin?.has(c)).map(([c]) =>
    `<span class="hc">${c}</span><span>${v.sw.offBooks.includes(c) ? "Off" : "Shown"}</span>`).join("");
  return `<section><div class="lh"><span class="lbl">Your sources</span><span class="muted">None yet</span></div>` +
    `<div class="empty"><b>No sources yet.</b> Add a names file above, or switch to GitHub link and paste a link to a file or a folder. Each source shows up here with its counts and books, and you can turn it off or remove it at any time.</div></section>` +
    `<section class="sec"><div class="lh"><span class="lbl">Built in</span><span class="muted">Always here, cannot be removed</span></div>` +
    `<div class="srow"><span class="gi">${icon("database")}</span><div class="body"><div class="nm"><span class="t">Built-in names</span></div>` +
    `<div class="meta"><b>${n(v.builtinNames)} names</b> · comes with the site</div>${books ? `<div class="bkst">${books}</div>` : ""}` +
    `<p class="hint">When one of your sources brings names from a book, the built-in names of that book and kind are hidden. Turn the source off to bring them back.</p></div></div></section>`;
}

export function listHtml(v: View): string {
  if (!v.sources.length) return empty(v);
  return v.lens === "kind" ? byKind(v) : v.lens === "source" ? bySource(v) : byBook(v);
}

/** The books a category switch turns on or off: on → all off; off or partly on → all on. */
export function categoryToggle(v: View, cat: string): Switches {
  const codes = bookRows(v).filter((r) => categoryOf(r.code) === cat).map((r) => r.code);
  const st = categoryState(codes, v.sw);
  const off = new Set(v.sw.offBooks);
  for (const c of codes) { if (st === "on") off.add(c); else off.delete(c); }
  return { ...v.sw, offBooks: [...off].sort() };
}

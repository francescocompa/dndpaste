/**
 * The paste form with JavaScript (M3 T3.2b): it upgrades the server's no-JS form in place. The textarea stays the
 * source of truth (accessibility, undo, phone keyboards); a highlight layer under it draws the colours (D82, D84).
 * Adds the Problems list, key hints (D83), Tidy, Open file and drop, the link-import bar (D85), My recent shares and
 * the phone dock (D86). Bundled to /assets/form.js by scripts/build-client.mjs; CSP `script-src 'self'`, so no
 * inline scripts, no inline style attributes (CSSOM properties set from here are allowed).
 */
import { esc, icon, scoreMark } from "../render.ts";
import { fillScore, finalFoot, finalOf, finalTitle, pickScore, scoreLineAt, scoreRows } from "../scores.ts";
import type { ScoreLine, ScoreRow } from "../scores.ts";
import { highlightRows } from "./highlight.ts";
import { LANE, ghostHtml, ghostPads, ghostWordHtml, keepCount, useYourPresets } from "../ghost.ts";
import { readSummary } from "./summary.ts";
import type * as Yours from "./sync.ts";
import { ADDS, fixCursor, markFixes, nameFixes, tidyPlan } from "../fixes.ts";
import { nextOpen } from "../preset.ts";
import { ABILITIES, methodWords, resolveKey, scoreKind } from "../../../src/dndpaste.ts";
import type { ScoreKind } from "../../../src/dndpaste.ts";
import type { Fix } from "../fixes.ts";
import type { Ghost } from "../ghost.ts";
import { keyHints } from "./hints.ts";
import type { Hints } from "./hints.ts";
import { dockLineHtml, importBarHtml, linkedId, problemsHtml, status, summaryHtml, toChooseHtml } from "./status.ts";
import type { Import, Status } from "./status.ts";
import { recentHtml, recentStore } from "./recent.ts";
import { editKeys as keysToTry, keyFromHash, keyStore, sendEdit } from "./keys.ts";
import type { EditReply } from "./keys.ts";
import { ID_RE, REV_RE } from "../store.ts";
import { draftBarHtml, draftKeeper, draftSlot, draftStore } from "./drafts.ts";
import type { Draft, Fields } from "./drafts.ts";
import { BEFORE_RELOAD, RELOAD_FLAG } from "./update.ts";
import { GUIDE_LINK } from "../example.ts";
import { lensOffer, levelUp, matchLevels, nextLevel } from "../levelup.ts";
import { mountStarter } from "./starter.ts";
import { authorStore, openingAuthor } from "./author.ts";
import { keyDoc, MARKED_FEAT } from "../keydocs.ts";
import { LIST_LIMIT, afterPick, alternativeList, bracketTrim, ghostWord, isKnown, keySpotAt, opensDetails, opensOnClick, slotHint, spotAt, suggestList, suggestKeys, swapAt, written, writtenKey } from "./complete.ts";
import type { KeySpot, Names, Spot, Suggestion } from "./complete.ts";
import { suggestPref } from "./prefs.ts";

/** D152 round 2: the drop zone names the undo shortcut of the visitor's system (it only shows on desktop). */
const UNDO_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘Z" : "Ctrl+Z";

const recent = recentStore(() => window.localStorage);
const authors = authorStore(() => window.localStorage);
const keys = keyStore(() => window.localStorage);
/** D173: the Suggestions switch, set in the header's Settings menu (site.ts); read on every keystroke. */
const suggestOn = suggestPref(() => window.localStorage);
const MAX_FILE = 1024 * 1024;
/** The autocomplete's SRD names (D158), its own bundle: a variable, so esbuild leaves the import to the browser. */
const NAMES_JS = "/assets/names.js";
/** Your own sources for the editor (D246): a variable as well, loaded after the names when a source exists. */
const YOURS_JS = "/assets/yours.js";


function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}
/** Keeps focus (and the phone keyboard) in the editor when a control is tapped. */
const keepFocus = (e: Element) => e.addEventListener("mousedown", (ev) => ev.preventDefault());

function init(): void {
  const form = document.querySelector<HTMLFormElement>("form.pform");
  const found = form?.querySelector<HTMLTextAreaElement>("textarea.src");
  const pane = found?.closest<HTMLElement>(".pane");
  const tb = form?.querySelector<HTMLElement>(".tb");
  const aside = form?.querySelector<HTMLElement>(".aside");
  const title = form?.querySelector<HTMLTextAreaElement | HTMLInputElement>("[name=title]");
  const author = form?.querySelector<HTMLTextAreaElement | HTMLInputElement>("[name=author]");
  if (!form || !found || !pane || !tb || !aside || !title || !author) return;
  /** The editor's textarea. A long replace swaps in a fresh one (see `replaceAll`), so listeners sit on `.ed`. */
  let ta: HTMLTextAreaElement = found;
  document.documentElement.classList.add("js");

  // ---- editing a share (D97): the key from the edit link's fragment, then the one this browser kept ----
  const editId = form.dataset.edit && ID_RE.test(form.dataset.edit) ? form.dataset.edit : null;
  let editKeys: string[] = [];
  let fromLink: string | null = null;
  if (editId) {
    fromLink = keyFromHash(location.hash, "k");
    // Out of the address bar and history at once; the fragment never reached the server.
    if (location.hash) window.history.replaceState(null, "", location.pathname + location.search);
    // The link's key stays in memory: sendEdit keeps it only once the server takes it.
    editKeys = keysToTry(fromLink, keys.get(editId));
  }
  const base = form.querySelector<HTMLInputElement>("input[name=base]")?.value ?? "";

  // ---- the editor: highlight layer + textarea, inside the pane ----
  const ed = el("div", "ed");
  const hl = el("div", "hl");
  hl.setAttribute("aria-hidden", "true");
  pane.insertBefore(ed, ta);
  ed.append(hl, ta);
  ta.removeAttribute("rows");
  // Ghost pick counts (D129–D133) align to a column only while it fits on a row: measure how many characters do.
  const probe = el("span", "gprobe");
  probe.setAttribute("aria-hidden", "true");
  probe.textContent = "0".repeat(40);
  ed.append(probe);
  let cols = Infinity;
  let laneOn = false;
  const measure = (): boolean => {
    const t = hl.querySelector<HTMLElement>(".row .t");
    const cw = probe.getBoundingClientRect().width / 40;
    if (!t || !cw) return false;
    const next = Math.max(1, Math.floor((t.clientWidth - parseFloat(getComputedStyle(t).paddingRight || "0")) / cw));
    if (next === cols) return false;
    cols = next;
    return true;
  };
  const dropz = el("div", "dropz", `<b>Drop to open the file</b><small>Replaces the editor text. ${UNDO_KEY} brings it back.</small>`);
  dropz.hidden = true;
  pane.append(dropz);
  // D121: a new, empty form offers "Start a build". Only while the editor is empty, never on an edit or on Duplicate
  // and edit (the server marks the form with data-start only for a plain new paste). Mounted below, once replaceAll
  // exists.
  const offers = form.dataset.start === "1" && !editId;
  const offer = el("div", "sb");
  offer.hidden = true;
  ed.append(offer);
  /** The builder sits over the empty editor; the editor grows to hold it. */
  const fitOffer = () => { ed.style.minHeight = offer.hidden ? "" : `${offer.offsetTop + offer.offsetHeight + 12}px`; };
  if (offers) new ResizeObserver(fitOffer).observe(offer);

  // ---- toolbar: Open file · Tidy · summary · Save ----
  const file = el("input", "");
  file.type = "file";
  file.accept = ".txt,.dndpaste,text/plain";
  file.hidden = true;
  const openBtn = el("button", "bt", `${icon("folder")}Open file`);
  const tidyBtn = el("button", "bt", `${icon("tidy")}Tidy`);
  // D229 (review): Tidy tidies at once; its badge counts the changes and opens their list.
  const tidyBadge = el("button", "tbadge");
  tidyBadge.hidden = true;
  const tidyW = el("span", "tidyw");
  tidyW.append(tidyBtn, tidyBadge);
  openBtn.type = tidyBtn.type = tidyBadge.type = "button";
  tb.prepend(openBtn, tidyW, file);
  let sum = tb.querySelector<HTMLElement>(".dsum");
  if (!sum) { sum = el("span", "dsum"); tb.querySelector(".bt.pri")?.before(sum); }
  sum.setAttribute("aria-live", "polite");

  // ---- notices: the server's error line, or a slot for ours ----
  let ferr = form.querySelector<HTMLElement>(".ferr");
  if (!ferr) { ferr = el("p", "ferr"); ferr.setAttribute("role", "alert"); ferr.hidden = true; form.prepend(ferr); }
  const errBox = ferr;
  const showErr = (msg: string | null) => {
    errBox.hidden = !msg;
    errBox.innerHTML = msg ? `${icon("alert")}${esc(msg)}` : "";
  };
  if (editId && !editKeys.length) {
    const nokey = el("p", "ferr nokey", `${icon("alert")}<span>This browser has no edit key for this build. Open the private edit link ` +
      `from when you saved it, or use <a href="/?from=${editId}">Duplicate and edit</a>.</span>`);
    nokey.setAttribute("role", "alert");
    form.prepend(nokey);
  }

  // ---- import bar (D85), between the toolbar and the editor ----
  const lbar = el("div", "lbar");
  lbar.hidden = true;
  lbar.setAttribute("role", "status");
  tb.after(lbar);

  // ---- side column: Problems · To choose (D149) · Keys you can add · My recent shares ----
  aside.innerHTML = `<div class="stack sm"><span class="lbl">Problems</span><div class="probs"></div></div>` +
    `<div class="stack sm tochoose" hidden></div>` +
    `<div class="stack sm keys"><span class="lbl klbl">Keys you can add</span><div class="chips"></div></div>` + GUIDE_LINK +
    `<div class="stack sm"><span class="lbl">Saved builds</span><div class="rlist"></div></div>`;
  const probs = aside.querySelector<HTMLElement>(".probs") as HTMLElement;
  const tochoose = aside.querySelector<HTMLElement>(".tochoose") as HTMLElement;
  const klbl = aside.querySelector<HTMLElement>(".klbl") as HTMLElement;
  const chips = aside.querySelector<HTMLElement>(".chips") as HTMLElement;
  const rlist = aside.querySelector<HTMLElement>(".rlist") as HTMLElement;
  const showRecent = () => { rlist.innerHTML = recentHtml(recent.list(), new Date()); };
  showRecent();

  // ---- phone dock (D86): Keys toggle + chip row, problem line, Save ----
  const dock = el("div", "pdock",
    `<div class="prow"></div><div class="srow"><button type="button" class="bt ktog" aria-expanded="false">` +
    `${icon("keyboard")}Keys <span class="kn"></span>${icon("chevron-up")}${icon("chevron-down")}</button>` +
    `<span class="grow"></span><button type="submit" class="bt pri dsave">${editId ? `${icon("check")}Save changes` : `${icon("link")}Save and get link`}</button></div>` +
    `<div class="krow chips" hidden></div>`);
  form.append(dock);
  const krow = dock.querySelector<HTMLElement>(".krow") as HTMLElement;
  const ktog = dock.querySelector<HTMLButtonElement>(".ktog") as HTMLButtonElement;
  const kn = dock.querySelector<HTMLElement>(".kn") as HTMLElement;
  const prow = dock.querySelector<HTMLElement>(".prow") as HTMLElement;
  const saves = [...form.querySelectorAll<HTMLButtonElement>("button[type=submit]")];
  keepFocus(ktog);
  keepFocus(krow);
  keepFocus(chips);
  ktog.addEventListener("click", () => {
    // The names stand in for the Keys row while they show (D157): Keys puts the row back and closes them.
    if (dock.classList.contains("ac-on")) {
      acClose();
      if (!krow.hidden) return;
    }
    const open = krow.hidden;
    krow.hidden = !open;
    dock.classList.toggle("open", open);
    ktog.setAttribute("aria-expanded", String(open));
  });

  // ---- state ----
  let st: Status = status(ta.value);
  let hints: Hints = keyHints(ta.value, 0);
  let saving = false;
  /** D149: "+N" was pressed; the To choose row shows every line until the form reloads. */
  let allChoose = false;
  /** D175: the count of the line being typed, kept while that line doesn't read; the line it's frozen on (0: none). */
  let kept: Ghost | null = null;
  let frozeLine = 0;
  /** D196 T12: the names table once loaded (D158), for the fixes that need it; the fixes on show now. */
  let fixNames: Names | null = null;
  let fixes: Fix[] = [];
  /** D314, D319: the Classes: mismatch, an alert chip at its line's end beside any add chip; its panel holds the fix. */
  let alert: Fix | null = null;
  /** D323: the method picked for this draft (Start a build, the chip's chevron): it steers the score lists and the
   *  chip and writes nothing; a marker on the line wins over it. */
  let scoreMethod: ScoreKind | null = null;
  /** Review r1: the last kind the numbers read as (standard array or point buy) in this draft. When they then break it,
   *  the chip keeps that kind with its alert instead of turning to Custom. */
  let scoreSeen: ScoreKind | null = null;
  /** The base Scores line the method chip sits on (D324), as of the last redraw. */
  let scoreChip: ScoreLine | null = null;
  /** Set once the draft autosave (D102) is wired: every redraw of the editor may queue a draft write. */
  let changed = () => {};

  const cursorLine = () => ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
  const refreshHints = () => {
    hints = keyHints(ta.value, cursorLine());
    klbl.textContent = `Keys you can add to ${hints.label}`;
    const html = hints.keys.map((k) => `<button type="button" class="hc" data-key="${esc(k)}">${esc(k)}:</button>`).join("");
    put(chips, html || `<span class="muted">No keys left for this block.</span>`);
    put(krow, html || `<span class="muted">No keys left for this block.</span>`);
    kn.textContent = String(hints.keys.length);
    // D149 review: the To choose chip of the line the cursor is on.
    const here = String(cursorLine() + 1);
    for (const c of tochoose.querySelectorAll<HTMLElement>("[data-line]")) c.classList.toggle("cur", document.activeElement === ta && c.dataset.line === here);
    if (tipFor && !tipFor.isConnected) hideTip();
  };
  /**
   * D90, D176: the line being typed (1-based; 0 = none) holds its errors until the cursor leaves it or typing pauses
   * for HOLD_MS. Save looks ready meanwhile (as in frame form-keys-dark-phone) but still blocks: pressing it lets go of
   * the hold and shows the error.
   */
  const HOLD_MS = 3000;
  let holdLine = 0;
  let holdTimer = 0;
  const release = () => {
    clearTimeout(holdTimer);
    if (!holdLine) return;
    holdLine = 0;
    refresh();
  };
  let badgeTimer: ReturnType<typeof setTimeout> | undefined;
  /** Changes struck through in the badge's list (D229 review): Tidy leaves them out until they're clicked again. */
  const tidySkip = new Set<string>();
  /** D295: a change only the names table finds (`Wood Elf` → `Elf [Wood]`, D293): the status has no names, so the
   *  plan after the typing pause turns Tidy on. Kept until the next plan; a click plans again from the text. */
  let tidyByName = false;
  const canTidy = () => st.canTidy || (tidyByName && !st.empty && !st.held);
  const setTidyBtn = () => { tidyBtn.disabled = !canTidy(); tidyBtn.classList.toggle("off", !canTidy()); };
  const setSaveState = () => {
    const on = (st.canSave || (st.held > 0 && !st.errors && !st.empty && !st.over)) && !saving && !(editId && !editKeys.length);
    for (const b of saves) { b.disabled = !on; b.classList.toggle("off", !on); }
    setTidyBtn();
    // The badge's count waits for a pause in typing: a plan reads the text several times.
    clearTimeout(badgeTimer);
    if (st.empty || st.held || (!st.canTidy && !fixNames)) { tidyByName = false; setTidyBtn(); tidyBadge.hidden = true; return; }
    badgeTimer = setTimeout(() => {
      const plan = tidyPlan(ta.value, fixNames, tidySkip);
      tidyByName = !!plan;
      setTidyBtn();
      const n = canTidy() ? plan?.changes.filter((c) => !c.off).length ?? 0 : 0;
      tidyBadge.hidden = !n;
      tidyBadge.textContent = String(n);
      tidyBadge.setAttribute("aria-label", n === 1 ? "1 change Tidy will make" : `${n} changes Tidy will make`);
    }, 250);
  };
  /**
   * Redraws only the rows that changed (common head and tail kept): a keystroke in a long paste touches a row or
   * two, not the whole layer.
   */
  let rows: string[] = [];
  const draw = (next: string[]) => {
    let a = 0;
    while (a < rows.length && a < next.length && rows[a] === next[a]) a++;
    let b = 0;
    while (b < rows.length - a && b < next.length - a && rows[rows.length - 1 - b] === next[next.length - 1 - b]) b++;
    const kids = hl.children;
    for (let i = rows.length - b - 1; i >= a; i--) kids[i].remove();
    if (a < next.length - b) {
      const tpl = document.createElement("template");
      tpl.innerHTML = next.slice(a, next.length - b).join("");
      hl.insertBefore(tpl.content, kids[a] ?? null);
    }
    rows = next;
  };
  /** The ghost text at the cursor (D174): the kind of name its short counted line still wants. */
  const wordNow = () => document.activeElement === ta && ta.selectionStart === ta.selectionEnd
    ? ghostWord(ta.value, ta.selectionStart, new Set(st.ghosts.filter((g) => g.have < g.of).flatMap((g) => [g.line, ...(g.also ?? [])])), names)
    : null;
  let wordShown = "";
  /** The highlight rows, with the ghost pick counts after their lines (D130): display only, never in the text. */
  const drawRows = () => {
    const gs = st.ghosts;
    // The lane is there only while a ghost shows: a paste with none keeps the full width.
    if (ed.classList.toggle("gl", gs.length > 0) !== laneOn) { laneOn = gs.length > 0; measure(); }
    const pads = ghostPads(ta.value.split(/\r?\n/), gs, cols, LANE);
    const w = wordNow();
    wordShown = w ? `${w.line}:${w.word}` : "";
    const after = new Map(gs.filter((g) => !g.note).map((g) => [g.line, ghostHtml(g, pads.get(g.line) ?? 1, g.line === w?.line ? w.word : "")]));
    // A group's other line (D178) has no chip: its ghost text stands alone.
    if (w && !after.has(w.line)) after.set(w.line, ghostWordHtml(w.word));
    fixes = fixNames
      // D295: `Wood Elf` → `Elf [Wood]` (D293) is Tidy's alone: a valid name gets no mark on its line.
      ? [...st.fixes, ...nameFixes(fixNames, ta.value, st.paste, new Set(st.fixes.map((f) => f.line))).filter((f) => f.kind !== "lineage")].sort((a, b) => a.line - b.line)
      : st.fixes;
    // D314, D319: when the headers prove Classes: too low, an alert chip on Classes:, next to `+ Add Species,
    // Background` (D311) when that is owed too; `Match the levels` is in its panel.
    const cl = ta.value.split("\n").findIndex((x) => /^Classes:/.test(x)) + 1;
    alert = cl > 0 && matchLevels(ta.value) !== null
      ? { line: cl, at: "key", kind: "classes-match", why: "Classes: counts fewer levels than the headers.", act: "Match the levels", apply: (x: string) => matchLevels(x) }
      : null;
    draw(markFixes(highlightRows(ta.value, st.diagnostics, after), fixes));
    placeNotes();
  };
  // ---- D190 review, D196 T12: a key or level header with a one-click fix gets the hint underline and a button over
  // it that opens one action. The highlight layer sits under the textarea, so it can't take a click: the buttons sit
  // over it. ----
  const wls = el("div", "wls");
  ed.append(wls);
  const wlPop = el("div", "pop wlpop");
  wlPop.hidden = true;
  wlPop.setAttribute("role", "dialog");
  document.body.append(wlPop);
  /** The popover's line; 0 when closed. */
  let wlLine = 0;
  /** The fix the open panel holds: the line's underline fix, or the alert chip's (D319). */
  let wlFix: Fix | null = null;
  const wlClose = () => { wlPop.hidden = true; wlLine = 0; wlFix = null; };
  /** Writes only the part of the text that changed, through insert, so Undo brings the old text back. */
  const writeChange = (next: string) => {
    const before = ta.value;
    let a = 0;
    while (a < before.length && a < next.length && before[a] === next[a]) a++;
    let b = 0;
    while (b < before.length - a && b < next.length - a && before[before.length - 1 - b] === next[next.length - 1 - b]) b++;
    insert(next.slice(a, next.length - b), a, before.length - b);
  };
  const fixAt = (line: number) => fixes.find((f) => f.line === line);
  function placeNotes() {
    const marks = [...hl.querySelectorAll<HTMLElement>(".wl[data-line], .wa[data-line]")];
    scoreChip = chipLine();
    if (!marks.length && !alert && !scoreChip && !wls.firstChild) return;
    const box = ed.getBoundingClientRect();
    const range = document.createRange();
    // D240: positions through CSSOM, never a style="" attribute: the live CSP (`style-src 'self'`) drops those, which
    // left every button 0x0 and the fix unclickable (the /ui-review dev CSP allows them, so review never saw it).
    wls.replaceChildren(...marks.map((m) => {
      const r = m.getBoundingClientRect();
      const line = Number(m.dataset.line);
      if (m.classList.contains("wa")) return addButton(m, line, box, range);
      const b = el("button", "wlb");
      b.type = "button";
      b.dataset.line = String(line);
      b.setAttribute("aria-label", fixAt(line)?.why ?? "");
      Object.assign(b.style, { left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      return b;
    }));
    if (alert) alertButton(alert, box, range);
    if (scoreChip) methodButton(scoreChip, box, range);
    if (wlLine && !marks.some((m) => Number(m.dataset.line) === wlLine) && wlLine !== alert?.line) wlClose();
  }
  /** Where a row's text ends, on its last wrapped row: the rect of its last piece (a text node or a span). */
  function textEnd(t: HTMLElement, range: Range): DOMRect {
    const last = t.lastChild ?? t;
    range.selectNodeContents(last);
    const rects = [...(last.nodeType === Node.TEXT_NODE ? range : (last as Element)).getClientRects()];
    return rects.length ? rects[rects.length - 1] : t.getBoundingClientRect();
  }
  /** D319: an alert chip at the end of its line, before the line's add chip if it has one (the add chip moves after it
   *  and shortens to `Add N lines` where it no longer fits); a click opens its panel. */
  function alertButton(f: Fix, box: DOMRect, range: Range): void {
    const row = hl.children[f.line - 1] as HTMLElement | undefined;
    const t = row?.querySelector<HTMLElement>(".t") ?? row;
    if (!t) return;
    const end = textEnd(t, range);
    const add = [...wls.querySelectorAll<HTMLElement>(".wla")].find((x) => Number(x.dataset.line) === f.line);
    const left = end.right - box.left + 10;
    const b = el("button", "wlx");
    b.type = "button";
    b.dataset.line = String(f.line);
    b.setAttribute("aria-label", f.why);
    b.setAttribute("aria-haspopup", "dialog");
    // Round 5: the icon only; its label says it.
    b.innerHTML = icon("alert");
    const right = t.getBoundingClientRect().right - box.left;
    Object.assign(b.style, { left: `${left}px`, top: `${end.top - box.top + 1}px`, height: `${Math.max(0, end.height - 2)}px`, maxWidth: `${Math.max(0, right - left)}px` });
    wls.append(b);
    if (!add) return;
    const after = left + b.offsetWidth + 6;
    Object.assign(add.style, { left: `${after}px`, maxWidth: `${Math.max(0, right - after)}px` });
    const label = add.querySelector("span");
    const n = (fixAt(f.line)?.act ?? "").replace(/^Add /, "").split(",").length;
    if (label && label.scrollWidth > label.clientWidth && n > 1) label.textContent = `Add ${n} lines`;
  }
  /** D324: the header's base Scores line, when the chip has something to say (numbers, a marker or the draft's pick). */
  function chipLine(): ScoreLine | null {
    const text = ta.value;
    let at = 0;
    for (const line of text.split("\n")) {
      if (/^\s*(L\d+\b|Species\s*:|Background\s*:)/i.test(line)) return null;
      if (/^\s*Scores\b/i.test(line)) {
        const sl = scoreLineAt(text, at);
        const read = sl && sl.values.some((x) => x !== null) ? scoreKind(sl.values).kind : "custom";
        if (read !== "custom") scoreSeen = read;
        if (sl && (sl.marker || scoreMethod || sl.values.some((x) => x !== null))) return sl;
      }
      at += line.length + 1;
    }
    return null;
  }
  /** The method a list and chip follow (D323): the marker's, else the draft's pick, else the numbers' kind; numbers
   *  that break the kind they read as before keep it (review r1), so the chip alerts rather than say Custom. */
  const effMethod = (sl: Pick<ScoreLine, "marker" | "values">): ScoreKind | null => {
    if (sl.marker ?? scoreMethod) return sl.marker ?? scoreMethod;
    if (!sl.values.some((x) => x !== null)) return null;
    const read = scoreKind(sl.values).kind;
    return read === "custom" && scoreSeen ? scoreSeen : read;
  };
  /** The chip's words (D324): the method and, for point buy, the points left. Numbers that break the method keep the
   *  count (below zero past the budget) and the alert icon takes the chevron's place, same click (D323, review r1). */
  const chipHtml = (sl: ScoreLine): { html: string; clash: boolean; label: string } => {
    const kind = effMethod(sl) ?? "custom";
    const m = scoreMark({ type: "scores", values: sl.values, increase: null, method: kind });
    return {
      html: `<span>${esc(m.words)}</span>${icon(m.clash ? "alert" : "chevron-down")}`, clash: m.clash,
      label: `Ability scores: ${m.words}${m.clash ? ", the numbers don't fit it" : ""}. Choose the method`,
    };
  };
  /** D324: the method chip at the end of the base Scores line; its chevron opens the method list (D323). */
  function methodButton(sl: ScoreLine, box: DOMRect, range: Range): void {
    const line = ta.value.slice(0, sl.start).split("\n").length;
    const row = hl.children[line - 1] as HTMLElement | undefined;
    const t = row?.querySelector<HTMLElement>(".t") ?? row;
    if (!t) return;
    const end = textEnd(t, range);
    const right = t.getBoundingClientRect().right - box.left;
    // Review r5: no room even for the icon: the icon sits over the line's end, at the row's edge, on a solid fill.
    const tight = right - (end.right - box.left + 10) < 24;
    const left = tight ? right - 24 : end.right - box.left + 10;
    const c = chipHtml(sl);
    const b = el("button", `wla wsm${c.clash ? " clash" : ""}${tight ? " ico over" : ""}`);
    b.type = "button";
    b.dataset.review = "score-chip";
    b.setAttribute("aria-label", c.label);
    b.setAttribute("aria-haspopup", "listbox");
    b.innerHTML = c.html;
    Object.assign(b.style, { left: `${left}px`, top: `${end.top - box.top + 1}px`, height: `${Math.max(0, end.height - 2)}px`, maxWidth: `${Math.max(0, right - left)}px` });
    wls.append(b);
    // Review r2–r6: only where the words don't fit after the line does the chip keep its icon alone (its label still
    // says it); a face that loads later places the chips again (the fonts' loadingdone, below).
    const words = b.querySelector("span");
    if (words && words.scrollWidth > words.clientWidth) b.classList.add("ico");
  }
  /** D308: an add fix is a faint `+ Add Subclass, Spells` at the end of its line (the level-up lens's look); one click
   *  writes the lines. Where the full label doesn't fit, it says how many (`+ Add 3 lines`). */
  function addButton(m: HTMLElement, line: number, box: DOMRect, range: Range): HTMLElement {
    const f = fixAt(line);
    const b = el("button", "wla");
    b.type = "button";
    b.dataset.line = String(line);
    b.dataset.add = "";
    const t = m.closest<HTMLElement>(".t");
    const end = textEnd(t ?? m, range);
    const right = (t ?? m).getBoundingClientRect().right - box.left;
    const left = end.right - box.left + 10;
    const act = f?.act ?? "";
    const n = act.replace(/^Add /, "").split(",").length;
    // D309: a chip says it short: `Feat (Fighting Style)` is `Fighting Style`.
    b.innerHTML = `${icon("plus")}<span>${esc(act.replace(/\b[A-Z][\w ]*? \(([^)]+)\)/g, "$1"))}</span>`;
    b.setAttribute("aria-label", `${f?.why ?? ""} ${act}`.trim());
    Object.assign(b.style, { left: `${left}px`, top: `${end.top - box.top + 1}px`, height: `${Math.max(0, end.height - 2)}px`, maxWidth: `${Math.max(0, right - left)}px` });
    wls.append(b);
    const label = b.querySelector("span")!;
    if (label.scrollWidth > label.clientWidth && n > 1) label.textContent = `Add ${n} lines`;
    return b;
  }
  const applyFix = (line: number, f = fixAt(line)) => {
    const before = ta.value;
    const next = f ? f.apply(before) : null;
    wlClose();
    if (next === null || next === before) return;
    writeChange(next);
    // D270: a fix that writes empty brackets leaves the cursor inside the first ones, their list open. D310: an add fix
    // leaves it on the first open choice from its line down.
    const at = f && ADDS.has(f.kind) ? nextOpen(next, next.split("\n").slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0)) : fixCursor(before, next);
    if (at !== null) { ta.focus(); ta.setSelectionRange(at, at); complete(true); }
  };
  wls.addEventListener("mousedown", (e) => { if ((e.target as Element).closest(".wla")) e.preventDefault(); });
  wls.addEventListener("click", (e) => {
    const sm = (e.target as Element).closest<HTMLElement>(".wsm");
    if (sm) { e.stopPropagation(); openMethods(sm); return; }
    const a = (e.target as Element).closest<HTMLElement>(".wla");
    // The chip carries data-line: the form's jump-to-line click would put the caret back on the chip's line (D310).
    if (a) { e.stopPropagation(); applyFix(Number(a.dataset.line)); return; }
    const b = (e.target as Element).closest<HTMLElement>(".wlb, .wlx");
    if (!b) return;
    const isAlert = b.classList.contains("wlx");
    if (isAlert) e.stopPropagation();   // its data-line: the form's jump-to-line click would take the focus from the panel
    const line = Number(b.dataset.line);
    if (wlLine === line && !wlPop.hidden) { wlClose(); return; }
    const f = isAlert ? alert : fixAt(line);
    if (!f) return;
    wlPop.setAttribute("aria-label", f.why);
    // D319: the alert's panel says what is wrong above its fix.
    wlPop.innerHTML = isAlert
      ? `<p class="wlw">${esc(f.why)}</p><button type="button" class="it" data-go>${esc(f.act)}</button>`
      : `<button type="button" class="it" data-go>${esc(f.act)}</button>`;
    wlLine = line;
    wlFix = f;
    wlPop.hidden = false;
    // T35: anchored to its key: the popover's left edge at the key's, kept inside the window.
    const r = b.getBoundingClientRect();
    const w = wlPop.offsetWidth;
    wlPop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    const h = wlPop.offsetHeight;
    wlPop.style.top = `${r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8 ? r.top - 6 - h : r.bottom + 6}px`;
    wlPop.querySelector<HTMLElement>("[data-go]")?.focus();
  });
  wlPop.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("[data-go]")) return;
    applyFix(wlLine, wlFix ?? undefined);
  });
  document.addEventListener("pointerdown", (e) => {
    if (!wlPop.hidden && !wlPop.contains(e.target as Node) && !(e.target as Element).closest?.(".wlb, .wlx")) wlClose();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !wlPop.hidden) { wlClose(); ta.focus(); } });
  /** A cursor move: redraw when the ghost text comes, goes or moves. */
  const redrawWord = () => {
    const w = wordNow();
    if ((w ? `${w.line}:${w.word}` : "") !== wordShown) drawRows();
  };
  // A wider or narrower row changes which ghosts fit their block's column: redraw when it does.
  // D240: the fix buttons follow their marks through any reflow (a width change, the web font arriving).
  // T8.4 review r3: the editor too, since a window resize can leave the layer's box as it was while the rows move.
  const reflow = new ResizeObserver(() => { if (measure()) drawRows(); else placeNotes(); });
  reflow.observe(hl);
  reflow.observe(ed);
  void document.fonts?.ready.then(() => placeNotes());
  // T8.4 review r4: a face first used by a chip loads after `ready`; place the chips again when it arrives.
  document.fonts?.addEventListener?.("loadingdone", () => placeNotes());
  /** Sets innerHTML only when it changed: most keystrokes leave the summary, Problems and hints as they were. */
  const shown = new WeakMap<Element, string>();
  const put = (e: Element, html: string) => {
    if (shown.get(e) === html) return;
    shown.set(e, html);
    e.innerHTML = html;
  };
  /** While a replace runs, Chrome fires one input event per line it inserts; redraw once, after. */
  let bulk = false;
  // ---- T8.2 (D305, D316): the level-up lens, a line of faint chips after the last block (code editors' CodeLens): the
  // level after the last block, one action per class it offers (lensOffer), plus "Another class…" (the header and the
  // class list).
  // The editor grows with its text, so the highlight layer is padded while the lens shows and the lens sits in it. ----
  const lens = el("div", "lens");
  lens.hidden = true;
  ed.append(lens);
  const drawLens = () => {
    // A bare header on the last line (`L7 `) is the level being added already: its class list does the rest.
    const o = offer.hidden && !/(^|\n)L\d+[ \t]*\s*$/.test(ta.value) ? lensOffer(ta.value) : null;
    if (!o) { lens.hidden = true; ed.classList.remove("lv"); hl.style.paddingBottom = ""; return; }
    // D309: up to two classes; D316: inside the Classes: total, the classes its levels without a block read as.
    lens.innerHTML = `<span class="lh">${icon("plus")}L${o.level}</span>` + [...o.classes.map((c) => `<button type="button" class="lb" data-cls="${esc(c.ref)}" aria-label="Level ${o.level}: ${esc(c.name)} ${c.level}">${esc(c.name)} ${c.level}</button>`),
        `<button type="button" class="lb" data-new aria-label="Level ${o.level}: another class">Another class…</button>`].join("");
    ed.classList.add("lv");
    lens.hidden = false;
    const rowEls = hl.querySelectorAll<HTMLElement>(".row");
    const last = rowEls[rowEls.length - 1];
    lens.style.top = `${last ? last.offsetTop + last.offsetHeight + 2 : 8}px`;
    // The layer makes room for the lens, however many rows it wraps to.
    const pad = `${lens.offsetHeight + 12}px`;
    if (hl.style.paddingBottom !== pad) hl.style.paddingBottom = pad;
  };
  new ResizeObserver(() => drawLens()).observe(hl);
  // The textarea keeps focus: a mousedown on the lens would take it.
  lens.addEventListener("mousedown", (e) => e.preventDefault());
  lens.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button.lb");
    if (!b) return;
    if (b.dataset.cls !== undefined) {
      const up = levelUp(ta.value, b.dataset.cls);
      if (!up) return;
      writeChange(up.text);
      ta.setSelectionRange(up.cursor, up.cursor);
    } else {
      // The bare header opens the class list (D302); a pick there runs the level-up (acTake).
      const n = nextLevel(ta.value);
      if (n === null) return;
      const head = ta.value.replace(/\s+$/, "");
      writeChange(`${head}\n\nL${n} `);
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
    ta.focus();
    complete(true);
  });
  const refresh = () => {
    if (bulk) return;
    st = status(ta.value, holdLine);
    // D175: the line being typed keeps its count while it doesn't read.
    const cl = document.activeElement === ta ? cursorLine() + 1 : 0;
    const broken = cl > 0 && st.paste.diagnostics.some((d) => d.line === cl && d.code.startsWith("E"));
    const k = keepCount(st.ghosts, cl, broken, kept);
    kept = k.kept;
    frozeLine = broken && kept ? cl : 0;
    st = { ...st, ghosts: k.ghosts };
    drawRows();
    const n = rows.length;
    ed.classList.toggle("w3", n >= 100 && n < 1000);
    ed.classList.toggle("w4", n >= 1000);
    put(sum as HTMLElement, summaryHtml(st));
    put(probs, problemsHtml(st));
    const choose = toChooseHtml(st, allChoose);
    put(tochoose, choose);
    tochoose.hidden = !choose;
    // D94: every dock status (empty, all-clear, warnings, problems) takes its own row above Keys · Save.
    put(prow, dockLineHtml(st));
    setSaveState();
    refreshHints();
    offer.hidden = !offers || ta.value !== "";
    fitOffer();
    drawLens();
    changed();
  };

  /** Replaces a range through the browser's editing commands, so Undo brings the old text back. */
  const insert = (text: string, start: number, end: number) => {
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(start, end);
    let ok = false;
    bulk = true;
    try { ok = document.execCommand("insertText", false, text); } catch { ok = false; }
    bulk = false;
    if (!ok) ta.setRangeText(text, start, end, "end");
    refresh();
  };
  /**
   * Chrome's insertText slows with the number of lines (a 6 KB build: half a second), and a value set from script
   * leaves its native undo stack pointing at text that is gone. So a replace past LONG lines swaps in a fresh
   * textarea (an empty undo stack) and keeps one step of its own: Undo while the text is still the replacement
   * brings the old text back, Redo the new. Shorter replaces go through insertText and the browser's own Undo.
   */
  const LONG = 400;
  let swap: { before: string; after: string } | null = null;
  const fresh = (text: string) => {
    const had = document.activeElement === ta;
    const n = ta.cloneNode(false) as HTMLTextAreaElement;
    n.value = text;
    ta.replaceWith(n);
    ta = n;
    if (had) ta.focus({ preventScroll: true });
    ta.setSelectionRange(0, 0);
    refresh();
  };
  const lineCount = (t: string) => t.split("\n").length;
  const replaceAll = (text: string) => {
    clearTimeout(holdTimer);
    holdLine = 0;
    const t = text.replace(/\r\n?/g, "\n");
    if (t === ta.value) return;
    if (lineCount(t) > LONG || lineCount(ta.value) > LONG) {
      swap = { before: ta.value, after: t };
      fresh(t);
      return;
    }
    swap = null;
    insert(t, 0, ta.value.length);
    ta.setSelectionRange(0, 0);
    refresh();
  };
  const history = (e: Event, redo: boolean) => {
    if (!swap || ta.value !== (redo ? swap.before : swap.after)) return;
    e.preventDefault();
    fresh(redo ? swap.after : swap.before);
  };
  ed.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") history(e, e.shiftKey);
    else if (e.ctrlKey && k === "y") history(e, true);
  });
  ed.addEventListener("beforeinput", (e) => {
    if (e.inputType === "historyUndo") history(e, false);
    else if (e.inputType === "historyRedo") history(e, true);
  });
  /** `atEnd`: the cursor goes after the line's text, where a To choose line's value is typed (D149). */
  const jump = (line: number, atEnd = false) => {
    const lines = ta.value.split("\n");
    const start = lines.slice(0, Math.max(0, line - 1)).reduce((a, l) => a + l.length + 1, 0);
    const pos = atEnd ? start + (lines[line - 1] ?? "").replace(/\r$/, "").trimEnd().length : start;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(pos, pos);
    const row = hl.children[line - 1];
    row?.scrollIntoView({ block: "center" });
    // D149 review: the row fills and fades, so the eye finds the line it jumped to.
    if (row) { row.classList.remove("flash"); void (row as HTMLElement).offsetWidth; row.classList.add("flash"); }
    refreshHints();
  };
  const insertKey = (key: string) => {
    const v = ta.value;
    const pos = ta.selectionStart;
    const ls = v.lastIndexOf("\n", pos - 1) + 1;
    let le = v.indexOf("\n", pos);
    if (le < 0) le = v.length;
    const line = v.slice(ls, le);
    // `Feat (…)` (D110) writes `Feat (): ` and puts the cursor between the parentheses, for the slot's name.
    const text = key === MARKED_FEAT ? "Feat (): " : `${key}: `;
    const back = key === MARKED_FEAT ? 3 : 0;
    if (hints.narrowed || !line.trim()) insert(text, ls, le);
    else insert(`\n${text}`, le, le);
    if (back) { const at = ta.selectionStart - back; ta.setSelectionRange(at, at); refreshHints(); }
  };

  // ---- name autocomplete (D151, D154–D159) ----
  // Desktop: a listbox under the cursor's line. Phone (the dock's width): the same listbox as a chip row in the dock,
  // in place of the Keys row (D157). The textarea keeps focus; the list is announced through aria-activedescendant.
  let names: Names | null = null;
  let loading = false;
  const phone = window.matchMedia("(max-width: 600px)");
  const ac = el("div", "ac");
  ac.id = "ac-names";
  ac.setAttribute("role", "listbox");
  ac.setAttribute("aria-label", "Names");
  ac.hidden = true;
  ed.append(ac);
  keepFocus(ac);
  const acSays = el("span", "vh");
  acSays.setAttribute("aria-live", "polite");
  ed.append(acSays);
  let acSpot: Spot | null = null;
  let acRows: Suggestion[] = [];
  /** D170: a key being typed at the line's start; its rows are keys (`Species:`), not names. */
  let acKey: KeySpot | null = null;
  /** The row an arrow picked; -1: none, so Enter keeps its new line (D154). */
  let acOn = -1;
  /** What goes in the `[ ]` the cursor is in, one entry per `;` group (D163); null outside one or where unknown. */
  let acHint: { slots: string[]; at: number } | null = null;
  /** D256: nothing matches a name of 3+ letters and no source is added yet: one line that links to /sources. */
  let acEmpty = false;
  /** D304: the list shows a clicked name's alternatives; a pick swaps the whole name. Mouse or tap only: any key closes
   *  it and does what it always does, so a click never takes over the arrows, Enter or Tab. */
  let acSwap = false;
  /** D306: how many more rows fit past the list's 60; its last row counts them. */
  let acMore = 0;
  /** T8.4: the list is a score list on the header's base Scores line: `fill`, the next ability's numbers while the line
   *  is written (D322); `pop`, a clicked score's options (D321); `method`, the method list (D323), reached from the
   *  line's chip (`back` null) or the list's corner chip (`back`: the list to go back to). */
  let acScore: { sl: ScoreLine; i: number; mode: "fill" | "pop" | "method"; rows: ScoreRow[]; back: "fill" | "pop" | null; pos: number; anchor: Element | null } | null = null;
  const acAria = () => {
    ta.setAttribute("aria-autocomplete", "list");
    ta.setAttribute("aria-controls", ac.id);
    ta.setAttribute("aria-expanded", String(!ac.hidden));
    if (!ac.hidden && acOn >= 0) ta.setAttribute("aria-activedescendant", `ac-${acOn}`);
    else ta.removeAttribute("aria-activedescendant");
  };
  const acClose = () => {
    if (ac.hidden && !acSpot && !acScore) return;
    ac.hidden = true;
    acScore = null;
    acSpot = null;
    acKey = null;
    acRows = [];
    acOn = -1;
    acSays.textContent = "";
    acHint = null;
    acEmpty = false;
    acSwap = false;
    acMore = 0;
    dock.classList.remove("ac-on");
    acAria();
  };
  /** The viewport box of the character at `pos`, from the highlight layer (its rows mirror the text, wrapping too). */
  const caretBox = (pos: number): DOMRect | null => {
    const before = ta.value.slice(0, pos);
    const t = hl.children[before.split("\n").length - 1]?.querySelector(".t");
    if (!t) return null;
    let left = pos - (before.lastIndexOf("\n") + 1);
    const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      if (left <= n.length) {
        const r = document.createRange();
        r.setStart(n, left);
        r.setEnd(n, Math.min(n.length, left + 1));
        return r.getBoundingClientRect();
      }
      left -= n.length;
    }
    return t.getBoundingClientRect();
  };
  const acPlace = () => {
    const from = acSpot?.start ?? acKey?.start ?? acScore?.pos;
    const at = acScore?.anchor?.isConnected ? acScore.anchor.getBoundingClientRect() : from === undefined ? null : caretBox(from);
    if (!at) return;
    const box = ed.getBoundingClientRect();
    // Below the line when the list fits in the window there (it may hang past the editor's edge), else on the
    // roomier side, cut to fit.
    const roomBelow = window.innerHeight - at.bottom - 4;
    const roomAbove = at.top - 4;
    ac.style.maxHeight = "";
    const full = ac.offsetHeight;
    const below = full <= roomBelow || roomBelow >= roomAbove;
    if (full > (below ? roomBelow : roomAbove)) ac.style.maxHeight = `${Math.max(0, Math.floor(below ? roomBelow : roomAbove))}px`;
    const h = ac.offsetHeight;
    ac.style.top = `${Math.round((below ? at.bottom + 2 : at.top - 2 - h) - box.top)}px`;
    ac.style.left = `${Math.round(Math.max(0, Math.min(at.left - box.left - 9, ed.clientWidth - ac.offsetWidth)))}px`;
  };
  const acDraw = () => {
    const onPhone = phone.matches;
    // Desktop: every group, the cursor's in bold. Phone: only the cursor's group and where it is (round 3: the full
    // line was cut and read as stale once a group was filled).
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    // D266: the slot title only where the brackets take two picks or more; one slot needs no title.
    // D304: a swap list says so, so it doesn't read as completion.
    const hint = acSwap ? `<div class="ah" aria-hidden="true">Swap for</div>` : !acHint || acHint.slots.length < 2 ? "" : onPhone
      ? `<div class="ah" aria-hidden="true"><b>${esc(cap(acHint.slots[acHint.at]))}</b>${acHint.slots.length > 1 ? ` ${acHint.at + 1}/${acHint.slots.length}` : ""}</div>`
      : `<div class="ah" aria-hidden="true">${acHint.slots.map((x, i) => (i === acHint?.at ? `<b>${esc(x)}</b>` : esc(x))).join("; ")}</div>`;
    // D266: two quiet rows, since it mostly follows a typo; D270: a rule between them.
    ac.innerHTML = acScore ? scoreListHtml(onPhone) : (acEmpty ? `<div class="ae"><span>No matches</span><a href="/sources">${icon("plus")}Add sources</a></div>` : "") +
      hint + acRows.map((r, i) => `<div role="option" id="ac-${i}" class="ao${i === acOn ? " on" : ""}${r.dim ? " dim" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
      `<span class="an">${esc(r.name)}</span>${r.source ? `<span class="as">|${esc(r.source)}</span>` : ""}${r.book ? `<span class="abk">${esc(r.book)}</span>` : ""}` +
      `${r.tag ? `<span class="al">${esc(r.tag)}</span>` : ""}` +
      `${!onPhone && i === 0 && acOn < 0 ? `<kbd>Tab</kbd>` : ""}</div>`).join("") +
      // D306: a list past 60 says how many it leaves out; typing narrows it.
      (acMore > 0 ? `<div class="am" aria-hidden="true">${acMore} more · keep typing</div>` : "");
    // Phone: the dock's last row, right on the keyboard (D157 amended).
    const home = onPhone ? dock : ed;
    if (ac.parentElement !== home) { if (onPhone) dock.append(ac); else ed.append(ac); }
    dock.classList.toggle("ac-on", onPhone);
    if (ac.hidden) {
      const what = acHint ? `${acHint.slots[acHint.at]}. ` : "";
      const kind = acKey ? "key" : "name";
      acSays.textContent = acScore ? scoreSays() : acEmpty ? "No matches. Add sources for more books." : acSwap ? `${acRows.length} to swap for. Click one, or keep typing.` : acRows.length ? `${what}${acRows.length === 1 ? `1 ${kind}` : `${acRows.length} ${kind}s`}${acMore > 0 ? `, ${acMore} more` : ""}${onPhone ? "" : ". Tab takes the first"}.` : what;
    }
    ac.setAttribute("aria-label", acKey ? "Keys" : acScore ? "Ability scores" : "Names");
    ac.hidden = false;
    if (!onPhone) acPlace();
    ac.querySelector(".on")?.scrollIntoView({ block: "nearest" });
    acAria();
  };
  /** `typing`: the text changed by a keystroke. Only typing opens the list; a cursor move updates or closes it (D154). */
  const complete = (typing: boolean) => {
    // The editor may have had focus before this ran (a restored draft, the browser's own focus): load on first use too.
    if (!names) { if (typing) loadNames(); return; }
    if (!typing && ac.hidden) return;
    // The method list (D323) stays open while its arrows move: it is not a list for the caret's spot.
    if (!typing && acScore?.mode === "method") return;
    if (!suggestOn.get() || document.activeElement !== ta || ta.selectionStart !== ta.selectionEnd) { acClose(); return; }
    if (scoreFill()) return;
    // A key at the line's start (D170): the hint strip's keys, narrowed by what was typed.
    const ks = keySpotAt(ta.value, ta.selectionStart);
    const kk = ks ? suggestKeys(ta.value, ks) : [];
    if (ks && kk.length) {
      const rows = kk.slice(0, LIST_LIMIT).map((k): Suggestion => ({ name: `${k}:`, source: null }));
      const same = acKey?.start === ks.start && rows.length === acRows.length && rows.every((r, i) => r.name === acRows[i].name);
      if (!same) acOn = -1;
      acSpot = null;
      acKey = ks;
      acRows = rows;
      acMore = kk.length - rows.length;
      acHint = null;
      acDraw();
      return;
    }
    acKey = null;
    const sp = spotAt(ta.value, ta.selectionStart);
    const got = sp ? suggestList(names, sp) : { rows: [], more: 0 };
    const rows = got.rows;
    // An empty `[ ]` group the table knows shows what goes there, even before a name fits (D163).
    const hint = sp ? slotHint(names, sp) : null;
    // D256: while no source is added, a name of 3+ letters that matches nothing keeps one line open, linking to /sources.
    // D303: a name already written in full is not "no matches": the list closes there.
    const none = Boolean(sp && !rows.length && !hint && sp.typed.replace(/\s/g, "").length >= 3 && !readSummary().n && !isKnown(names, sp));
    if (!sp || !(rows.length || (hint && !sp.typed.trim()) || none)) { acClose(); return; }
    acEmpty = none;
    const same = acSpot?.start === sp.start && rows.length === acRows.length && rows.every((r, i) => r.name === acRows[i].name);
    if (!same) acOn = -1;
    acSpot = sp;
    acRows = rows;
    acMore = got.more;
    acHint = hint;
    acDraw();
  };
  // ---- T8.4: the base Scores line's lists (D321–D324) ----
  const METHODS: readonly ScoreKind[] = ["standard-array", "point-buy", "custom"];
  const METHOD_NAMES: Readonly<Record<ScoreKind, string>> = { "standard-array": "Standard array", "point-buy": "Point buy", custom: "Custom" };
  const scoreRowName = (r: ScoreRow) => String(r.n);
  /** Opens a score list: its rows become the list's, so the arrows, Tab and Enter work on them as on names. */
  const showScore = (next: NonNullable<typeof acScore>) => {
    const same = acScore?.mode === next.mode && acScore.i === next.i && acScore.rows.length === next.rows.length;
    acKey = null;
    acSpot = null;
    acHint = null;
    acEmpty = false;
    acMore = 0;
    acScore = next;
    acRows = next.mode === "method" ? METHODS.map((k) => ({ name: METHOD_NAMES[k], source: null }))
      : next.rows.map((r) => ({ name: scoreRowName(r), source: null }));
    if (!same) acOn = -1;
    acDraw();
  };
  /** D322: the caret at the end of a base line being filled: the next ability's numbers by the method. */
  const scoreFill = (): boolean => {
    const sl = scoreLineAt(ta.value, ta.selectionStart);
    const m = sl?.fill ? effMethod(sl) : null;
    if (!sl?.fill || !m) return false;
    const f = sl.fill;
    const rows = scoreRows(m, sl.values, f.i, true).filter((r) => String(r.n).startsWith(f.typed));
    if (!rows.length) { acClose(); return true; }
    acSwap = false;
    showScore({ sl, i: f.i, mode: "fill", rows, back: null, pos: ta.selectionStart, anchor: null });
    return true;
  };
  /** D321: a click on a written score opens its options, mouse or tap only (any key closes it, as the swap list). */
  const scorePop = (): boolean => {
    const sl = scoreLineAt(ta.value, ta.selectionStart);
    if (!sl || sl.at === null) return false;
    if (!names) loadNames();
    const m = effMethod(sl) ?? "custom";
    acSwap = true;
    showScore({ sl, i: sl.at, mode: "pop", rows: scoreRows(m, sl.values, sl.at), back: null, pos: ta.selectionStart, anchor: null });
    return true;
  };
  /** D323, D324: the method list, from the line's chip; a pick steers the lists and the chip and writes nothing. */
  function openMethods(chip: Element) {
    if (acScore?.mode === "method" && !ac.hidden) { acClose(); return; }
    const sl = scoreChip;
    if (!sl) return;
    if (document.activeElement !== ta) ta.focus({ preventScroll: true });
    acSwap = false;
    showScore({ sl, i: -1, mode: "method", rows: [], back: null, pos: sl.end, anchor: chip });
  }
  const scoreKindNow = (sl: ScoreLine): ScoreKind => effMethod(sl) ?? "custom";
  /** The list's head: the final (`WIS 15 → 19 (+4)`, D321) or the ability being filled, and the method chip at its right. */
  const scoreListHtml = (onPhone: boolean): string => {
    const s = acScore!;
    const c = chipHtml(s.sl);
    const chip = `<button type="button" class="acm${c.clash ? " clash" : ""}" data-m tabindex="-1" aria-label="${esc(c.label)}">${c.html}</button>`;
    const fin = names && st.paste && s.mode !== "method" ? finalOf(st.paste, names)[s.i] : null;
    let title: string;
    // Review r1: the method list reached from a score's list has a way back before its title.
    if (s.mode === "method") title = `${s.back ? `<button type="button" class="acb" data-back tabindex="-1" aria-label="Back">${icon("chevron-left")}</button>` : ""}<span>Ability scores</span>`;
    else if (s.mode === "fill") title = `<b>${ABILITIES[s.i]}</b>`;
    else if (fin) { const t = finalTitle(s.i, fin); title = `<span>${esc(t.from)}</span>${icon("arrow-right")}<b>${esc(t.to)}</b>`; }
    else title = `<b>${ABILITIES[s.i]} ${s.sl.values[s.i] ?? ""}</b>`;
    const foot = s.mode === "pop" && fin?.parts.length ? `<div class="af${s.rows.length ? "" : " solo"}">${esc(finalFoot(fin))}</div>` : "";
    // Review r1: no rows and no foot, no divider under the head.
    const bare = s.mode !== "method" && !s.rows.length && !foot;
    const head = `<div class="ah acs${bare ? " bare" : ""}" aria-hidden="true"><span class="acst">${title}</span>${s.mode === "method" ? "" : chip}</div>`;
    const now = scoreKindNow(s.sl);
    const rows = s.mode === "method"
      ? METHODS.map((k, i) => `<div role="option" id="ac-${i}" class="ao${i === acOn ? " on" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
        `<span class="an">${esc(METHOD_NAMES[k])}</span>${k === now ? `<span class="al">${icon("check")}</span>` : ""}</div>`).join("")
      : s.rows.map((r, i) => `<div role="option" id="ac-${i}" class="ao asr${i === acOn ? " on" : ""}${r.over ? " dim" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
        `<span class="an">${r.n}</span>` +
        (r.swap !== null ? `<span class="al">${icon("arrow-left-right")}${ABILITIES[r.swap]}</span>` : "") +
        (r.cost !== null ? `<span class="al">${r.cost} pt${r.cost === 1 ? "" : "s"}</span>` : "") +
        `${!onPhone && i === 0 && acOn < 0 && s.mode === "fill" ? `<kbd>Tab</kbd>` : ""}</div>`).join("");
    return head + rows + foot;
  };
  const scoreSays = (): string => {
    const s = acScore!;
    if (s.mode === "method") return `Ability score method, ${METHOD_NAMES[scoreKindNow(s.sl)]}. Pick one.`;
    const n = s.rows.length;
    return `${ABILITIES[s.i]}: ${n ? `${n} number${n === 1 ? "" : "s"}.` : "no numbers to pick."}${s.mode === "fill" && !phone.matches ? " Tab takes the first." : ""}`;
  };
  /** A pick in a score list: the method (writes nothing), a clicked score's swap or number, or the next fill number. */
  const takeScore = (i: number) => {
    const s = acScore!;
    if (s.mode === "method") {
      const k = METHODS[i];
      if (!k) return;
      scoreMethod = k;
      // Review r1 (amends D323): a method written in parentheses follows the pick; with none, nothing is written.
      const now = scoreLineAt(ta.value, s.sl.start);
      if (now?.marker && now.marker !== k) {
        const colon = ta.value.indexOf(":", now.start);
        writeChange(ta.value.slice(0, now.start) + `Scores (${methodWords(k)})` + ta.value.slice(colon));
      }
      const sl = scoreLineAt(ta.value, s.sl.start) ?? s.sl;
      if (s.back === "pop") showScore({ ...s, sl, mode: "pop", back: null, rows: scoreRows(scoreKindNow(sl), sl.values, s.i), anchor: null });
      else if (s.back === "fill") { acClose(); complete(true); }
      else acClose();
      drawRows();
      changed();
      return;
    }
    const r = s.rows[i];
    if (!r) return;
    acClose();
    if (s.mode === "pop") {
      const next = pickScore(ta.value, s.sl, s.i, r);
      writeChange(next.text);
      ta.setSelectionRange(next.cursor, next.cursor);
      return;
    }
    const next = fillScore(ta.value, s.sl, r.n);
    // Review r1: the line is still being written (`STR 15/DEX `): hold its error, as typing does (D176).
    if (!next.done) { holdLine = ta.value.slice(0, s.sl.start).split("\n").length; clearTimeout(holdTimer); holdTimer = window.setTimeout(release, HOLD_MS); }
    writeChange(next.text);
    ta.setSelectionRange(next.cursor, next.cursor);
    // D322, D307: the next ability's list at once; after CHA, on to the next open choice (D310).
    if (!next.done) complete(true);
    else toNextOpen(lineEnd(next.cursor) + 1);
  };
  /** D304: a click in or at the end of a written name lists what it can be swapped for. */
  const swapList = (): boolean => {
    const sw = names ? swapAt(ta.value, ta.selectionStart) : null;
    const got = sw && names ? alternativeList(names, sw, ta.value) : { rows: [], more: 0 };
    const rows = got.rows;
    if (!sw || !rows.length) return false;
    acKey = null;
    acOn = -1;
    acSpot = sw;
    acRows = rows;
    acMore = got.more;
    acHint = null;
    acEmpty = false;
    acSwap = true;
    acDraw();
    return true;
  };
  const loadNames = () => {
    if (names || loading) return;
    loading = true;
    // Typed before the names arrived: show what fits now.
    (import(NAMES_JS) as Promise<Names>).then((m) => {
      names = m; fixNames = m; drawRows();
      // D321: an open score popover gets its final now; anything else is what typing showed.
      if (acScore && acScore.mode !== "fill" && !ac.hidden) acDraw(); else complete(true);
      loadYours(m);
    }, () => { loading = false; });
  };
  /** D246: your own sources join the names, and your classes the ghost counts; the links are checked on this visit (D248). */
  const loadYours = (base: Names) => {
    if (!readSummary().n) return;
    (import(YOURS_JS) as Promise<typeof Yours>).then((y) => y.editorVisit(base, (m) => {
      names = m ? (m.names as Names) : base;
      fixNames = names;
      useYourPresets(m?.presets ?? [], m?.species ?? []);
      refresh();
    })).catch(() => { /* the built-in names stay */ });
  };
  const acTake = (i: number) => {
    if (acScore) { takeScore(i); return; }
    const sp = acSpot;
    const r = acRows[i];
    const ks = acKey;
    if (ks && r) {
      // D171: the key, then its value list at once (Feat (…): the cursor in the parentheses, for the slot's name).
      acClose();
      const w = writtenKey(r.name.slice(0, -1));
      insert(w.text, ks.start, ks.end);
      ta.setSelectionRange(ks.start + w.cursor, ks.start + w.cursor);
      refreshHints();
      complete(true);
      return;
    }
    if (!sp || !r) return;
    const swapping = acSwap;
    acClose();
    // Inside [ ], the next group or name starts at once (D163 review), unless a separator is already there.
    const nx = ta.value[sp.end];
    const sep = names && !swapping && nx !== ";" && nx !== "," ? afterPick(names, sp, r.name) : "";
    // Review (D229): the last pick in `[ ]` leaves no stray spaces inside the brackets: `[ Drow ]` → `[Drow]`.
    const [a, b] = sep || sp.parent === null ? [sp.start, sp.end] : bracketTrim(ta.value, sp.start, sp.end);
    // D242: a pick that asks a detail comes with its brackets, the cursor inside, and the list for its first group.
    const le = ta.value.indexOf("\n", sp.end);
    const br = Boolean(names) && opensDetails(names as Names, sp, r, ta.value.slice(sp.end, le < 0 ? undefined : le));
    const w = written(sp, r);
    // T8.2 (D305): a class picked on the bare header of the build's next level, the last block, is a level-up: the
    // block gets its owed keys and Classes: goes up by one.
    const ls = ta.value.lastIndexOf("\n", sp.start - 1) + 1;
    const hm = /^L(\d+)\s*$/.exec(ta.value.slice(ls, sp.start));
    if (sp.key === "L" && !swapping && hm && !ta.value.slice(le < 0 ? ta.value.length : le).trim() && Number(hm[1]) === nextLevel(ta.value)) {
      const up = levelUp(ta.value.slice(0, ls), w);
      if (up) {
        writeChange(up.text);
        ta.setSelectionRange(up.cursor, up.cursor);
        complete(true);
        return;
      }
    }
    insert(w + (br ? " []" : "") + sep, a, b);
    if (br) {
      ta.setSelectionRange(a + w.length + 2, a + w.length + 2);
      complete(true);
    } else if (sep) complete(true);
    else if (!swapping && sp.parent === null) {
      // D307: a pick at the end of a line that still owes picks writes `, ` and opens the list for the next one.
      const at = a + w.length;
      const end = ta.value.indexOf("\n", at);
      const line = ta.value.slice(0, at).split("\n").length;
      const g = st.ghosts.find((x) => !x.note && (x.line === line || x.also?.includes(line)));
      const rest = ta.value.slice(at, end < 0 ? undefined : end).trim();
      if (g && g.have < g.of && !rest) {
        insert(", ", at, end < 0 ? ta.value.length : end);
        complete(true);
      } else if (!rest && (g ? g.have >= g.of : onePick(ta.value.slice(ta.value.lastIndexOf("\n", at - 1) + 1, at)))) {
        // D310: the line is complete (its count met, or a one-pick key): on to the next open choice below.
        toNextOpen(lineEnd(at) + 1);
      }
    } else if (!swapping) {
      // D310: the last pick in `[ ]` completes it: on to the next open choice, when nothing follows the brackets.
      const at = a + w.length;
      if (/^\s*\]\s*$/.test(ta.value.slice(at, lineEnd(at)))) toNextOpen(lineEnd(at) + 1);
    }
  };
  /** D310: the caret goes to the next open choice from `from` down, its list open; it stays when there is none. */
  const toNextOpen = (from: number) => {
    const at = from <= ta.value.length ? nextOpen(ta.value, from) : null;
    if (at === null) return;
    ta.setSelectionRange(at, at);
    complete(true);
  };
  const lineEnd = (at: number) => { const e = ta.value.indexOf("\n", at); return e < 0 ? ta.value.length : e; };
  /** D310: a key that takes one pick (`Subclass`, `Background`, `Rules`, each `Feat` line), from the line up to the pick. */
  const onePick = (line: string) => {
    const k = /^\s*([^:]+):/.exec(line)?.[1];
    const d = k ? resolveKey(k).def : null;
    return Boolean(d && (d.type === "item" || d.type === "items¹" || d.type === "enum" || d.key === "Feat"));
  };
  ed.addEventListener("keydown", (e) => {
    if (acSwap && !ac.hidden && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) acClose();
    // D297: Tab on a Species line's ghost text (`Dwarf [subrace]`) writes the brackets and opens their list, when the
    // list has no row to take.
    if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing && (ac.hidden || !acRows.length)) {
      const w = wordNow();
      if (w && /^\s*\[/.test(w.word)) {
        e.preventDefault();
        const at = ta.selectionStart;
        const add = /\s$/.test(ta.value.slice(0, at)) ? "[]" : " []";
        insert(add, at, at);
        ta.setSelectionRange(at + add.length - 1, at + add.length - 1);
        complete(true);
        return;
      }
    }
    if (ac.hidden || e.isComposing || !acRows.length) {
      if (e.key === "Escape" && !ac.hidden) { e.preventDefault(); acClose(); }
      return;
    }
    const plain = !e.altKey && !e.ctrlKey && !e.metaKey;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && plain && !e.shiftKey) {
      e.preventDefault();
      const n = acRows.length;
      acOn = e.key === "ArrowDown" ? (acOn + 1) % n : acOn <= 0 ? n - 1 : acOn - 1;
      acDraw();
    } else if (e.key === "Tab" && plain && !e.shiftKey) {
      e.preventDefault();
      acTake(Math.max(0, acOn));
    } else if (e.key === "Enter" && plain && !e.shiftKey && acOn >= 0) {
      e.preventDefault();
      acTake(acOn);
    } else if (e.key === "Escape") {
      e.preventDefault();
      acClose();
    }
  }, true);
  // Brackets (D163): `[` writes its `]` when nothing follows it on the line but a separator; `]` steps over the one
  // already there; deleting back between an empty pair takes both. Then the list shows what goes in the first group.
  // On beforeinput, not keydown: phone keyboards send no usable key.
  ed.addEventListener("beforeinput", (e) => {
    const ie = e as InputEvent;
    if (ie.target !== ta || ie.isComposing || ta.selectionStart !== ta.selectionEnd) return;
    const pos = ta.selectionStart;
    const next = ta.value[pos] ?? "\n";
    if (ie.inputType === "insertText" && ie.data === "[" && /[\s,;\]]/.test(next)) {
      e.preventDefault();
      insert("[]", pos, pos);
      ta.setSelectionRange(pos + 1, pos + 1);
      complete(true);
    } else if (ie.inputType === "insertText" && ie.data === "]" && next === "]") {
      e.preventDefault();
      ta.setSelectionRange(pos + 1, pos + 1);
      complete(false);
    } else if (ie.inputType === "deleteContentBackward" && ta.value[pos - 1] === "[" && next === "]") {
      e.preventDefault();
      insert("", pos - 1, pos + 1);
      complete(false);
    }
  });
  ac.addEventListener("click", (e) => {
    // D321: the list's corner chip turns it into the method list; a pick there comes back to the same list.
    if ((e.target as Element).closest("[data-back]") && acScore?.back) {
      const s = acScore;
      const sl = scoreLineAt(ta.value, s.sl.start) ?? s.sl;
      if (s.back === "fill") { acClose(); complete(true); } else showScore({ ...s, sl, mode: "pop", back: null, rows: scoreRows(scoreKindNow(sl), sl.values, s.i), anchor: null });
      return;
    }
    if ((e.target as Element).closest("[data-m]") && acScore && acScore.mode !== "method") {
      showScore({ ...acScore, mode: "method", back: acScore.mode, anchor: null });
      return;
    }
    const o = (e.target as Element).closest<HTMLElement>("[data-i]");
    if (o) acTake(Number(o.dataset.i));
  });
  acAria();
  ed.addEventListener("focusin", loadNames);
  if (ed.contains(document.activeElement)) loadNames();
  // Your classes' ghost counts show before the editor is used (D246): with a source added, load at once.
  else if (readSummary().n) loadNames();
  ed.addEventListener("focusout", acClose);
  // D229, D302: a click where a name goes and none is written yet (an empty `[ ]`, an empty key, after a list's `, `)
  // opens the list, as typing would, on any line however it got there; any other click only updates or closes it.
  ed.addEventListener("keyup", (e) => { if (!ac.contains(e.target as Node)) complete(false); });
  ed.addEventListener("click", (e) => {
    // A click in the list, even on a row its redraw just took out (the corner chip, a method pick, D321).
    if (ac.contains(e.target as Node) || !(e.target as Node).isConnected) return;
    const here = e.target === ta && ta.selectionStart === ta.selectionEnd;
    if (here && suggestOn.get() && scorePop()) return;
    if (here && names && suggestOn.get() && !opensOnClick(ta.value, ta.selectionStart) && swapList()) return;
    complete(here && (opensOnClick(ta.value, ta.selectionStart) || Boolean(scoreLineAt(ta.value, ta.selectionStart)?.fill)));
  });
  phone.addEventListener("change", acClose);
  window.addEventListener("resize", () => { if (!ac.hidden && !phone.matches) acPlace(); });

  // ---- link import (D85) ----
  let importReq = 0;
  let pending: Import | null = null;
  const hideBar = () => { lbar.hidden = true; pending = null; importReq++; };
  const checkLink = async () => {
    const id = linkedId(ta.value, location.host);
    if (!id) { hideBar(); return; }
    const req = ++importReq;
    const text = ta.value;
    let r: Import;
    try {
      const res = await fetch(`/${id}/json`, { headers: { Accept: "application/json" } });
      if (res.status === 404) r = { kind: "missing", id };
      else if (!res.ok) r = { kind: "failed", id };
      else {
        const d = (await res.json()) as { title?: unknown; author?: unknown; paste?: unknown };
        r = typeof d.paste === "string"
          ? { kind: "found", id, title: typeof d.title === "string" ? d.title : "", author: typeof d.author === "string" ? d.author : "" }
          : { kind: "failed", id };
        if (r.kind === "found") importText = d.paste as string;
      }
    } catch {
      r = { kind: "failed", id };
    }
    if (req !== importReq || ta.value !== text) return;
    pending = r;
    lbar.innerHTML = importBarHtml(r);
    lbar.hidden = false;
  };
  let importText = "";
  lbar.addEventListener("click", (e) => {
    const act = (e.target as Element).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "keep") { hideBar(); ta.focus(); }
    else if (act === "retry") void checkLink();
    else if (act === "import" && pending?.kind === "found") {
      title.value = pending.title;
      author.value = pending.author;
      fit(title);
      fit(author);
      hideBar();
      replaceAll(importText);
      ta.focus();
    }
  });

  // ---- events ----
  ed.addEventListener("input", (e) => {
    if (bulk) return;
    // D323: the method pick belongs to this draft; an emptied editor is a new one.
    if (!ta.value.trim()) { scoreMethod = null; scoreSeen = null; }
    const kind = (e as InputEvent).inputType;
    if (/^(insertText|insertCompositionText|insertReplacementText|deleteContent)/.test(kind ?? "")) {
      holdLine = cursorLine() + 1;
      clearTimeout(holdTimer);
      holdTimer = window.setTimeout(release, HOLD_MS);
    } else {
      clearTimeout(holdTimer);
      holdLine = 0;
    }
    refresh();
    complete(/^(insertText|insertCompositionText|insertReplacementText|deleteContent)/.test(kind ?? ""));
    showErr(null);
    if (kind === "insertFromPaste" || kind === "insertFromDrop") void checkLink();
    else if (!lbar.hidden && !linkedId(ta.value, location.host)) hideBar();
  });
  for (const ev of ["keyup", "click", "focusin", "focusout"]) ed.addEventListener(ev, refreshHints);
  // D90: the cursor left the held line (arrows, a click, a jump), or the editor lost focus.
  document.addEventListener("selectionchange", () => {
    if (document.activeElement !== ta) return;
    const here = cursorLine() + 1;
    if (holdLine && here !== holdLine) release();
    else if (frozeLine && here !== frozeLine) refresh();   // D175: the count follows the line once the cursor leaves
    else redrawWord();
  });
  ed.addEventListener("focusout", () => {
    release();
    // After the focus has moved: the frozen count (D175) and the ghost text (D174) belong to the focused editor only.
    setTimeout(() => { if (document.activeElement === ta) return; if (frozeLine) refresh(); else redrawWord(); });
  });
  ed.addEventListener("focusin", redrawWord);
  form.addEventListener("click", (e) => {
    const t = e.target as Element;
    const at = t.closest<HTMLElement>("[data-line]");
    if (at) { jump(Number(at.dataset.line), "end" in at.dataset); return; }
    if (t.closest(".tochoose [data-act=more]")) { allChoose = true; refresh(); return; }
    const chip = t.closest<HTMLElement>(".hc[data-key]");
    if (!chip?.dataset.key) return;
    if (pressed === chip) { pressed = null; return; }   // a long press showed the description: it does not insert
    hideTip();
    insertKey(chip.dataset.key);
    complete(true);   // D171: the key's value list opens at once
  });

  // ---- Keys popover: a key's description from the guide's key table (keydocs.ts), on hover or keyboard focus of
  // its chip; on a touch screen, a long press shows it and a tap still adds the key. ----
  const tip = document.createElement("div");
  tip.className = "pop ktip";
  tip.id = "ktip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let tipFor: HTMLElement | null = null;
  let pressed: HTMLElement | null = null;
  let pressTimer = 0;
  const showTip = (chip: HTMLElement) => {
    const html = keyDoc(chip.dataset.key ?? "");
    if (!html) return;
    if (tipFor && tipFor !== chip) tipFor.removeAttribute("aria-describedby");
    tip.innerHTML = html;
    tip.hidden = false;
    tipFor = chip;
    chip.setAttribute("aria-describedby", tip.id);
    tip.style.left = "0px";
    tip.style.top = "0px";
    const a = chip.getBoundingClientRect();
    const p = tip.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    tip.style.left = `${Math.round(Math.max(8, Math.min(a.left, vw - 8 - p.width)))}px`;
    const below = a.bottom + 6;
    tip.style.top = `${Math.round(below + p.height <= window.innerHeight - 8 ? below : Math.max(8, a.top - 6 - p.height))}px`;
  };
  const hideTip = () => {
    tipFor?.removeAttribute("aria-describedby");
    tipFor = null;
    tip.hidden = true;
  };
  for (const box of [chips, krow]) {
    box.addEventListener("pointerover", (e) => {
      const chip = (e.target as Element).closest<HTMLElement>(".hc[data-key]");
      if (e.pointerType === "mouse" && chip && chip !== tipFor) showTip(chip);
    });
    box.addEventListener("pointerout", (e) => {
      const to = e.relatedTarget as Element | null;
      if (e.pointerType === "mouse" && tipFor && !tipFor.contains(to)) hideTip();
    });
    box.addEventListener("focusin", (e) => {
      const chip = (e.target as Element).closest<HTMLElement>(".hc[data-key]");
      if (chip) showTip(chip);
    });
    box.addEventListener("focusout", hideTip);
    box.addEventListener("pointerdown", (e) => {
      const chip = (e.target as Element).closest<HTMLElement>(".hc[data-key]");
      clearTimeout(pressTimer);
      pressed = null;
      if (e.pointerType === "mouse" || !chip) return;
      pressTimer = window.setTimeout(() => { pressed = chip; showTip(chip); }, 450);
    });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) box.addEventListener(ev, () => clearTimeout(pressTimer));
    box.addEventListener("contextmenu", (e) => { if ((e.target as Element).closest(".hc")) e.preventDefault(); });
  }
  document.addEventListener("pointerdown", (e) => {
    if (tipFor && !tipFor.contains(e.target as Node)) hideTip();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tipFor) hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });
  if (offers) mountStarter(offer, (text, method) => {
    // D322: the method chosen in the builder steers the Scores line's lists; it writes nothing (D323).
    scoreMethod = method;
    replaceAll(text);
    // D310: the caret waits on the first open choice (the Scores line when the wizard left it empty), its list open.
    const at = nextOpen(text, 0);
    ta.focus({ preventScroll: true });
    if (at !== null) ta.setSelectionRange(at, at);
    refreshHints();
    complete(true);
    ed.scrollIntoView({ block: "nearest" });
  });
  // D229 (review): Tidy makes its changes at once (one Undo takes them back); the badge lists them first if you ask.
  const tidyPop = el("div", "pop tidypop");
  tidyPop.hidden = true;
  tidyPop.setAttribute("role", "dialog");
  tidyPop.setAttribute("aria-label", "What Tidy will change");
  document.body.append(tidyPop);
  const tidyClose = (back = false) => { tidyPop.hidden = true; if (back) tidyBadge.focus(); };
  tidyBtn.addEventListener("click", () => {
    tidyClose();
    const next = canTidy() ? tidyPlan(ta.value, fixNames, tidySkip)?.text : undefined;
    tidySkip.clear();
    if (next !== undefined && next !== ta.value) writeChange(next);
    else setSaveState();
  });
  const drawTidyList = (): boolean => {
    const plan = canTidy() ? tidyPlan(ta.value, fixNames, tidySkip) : null;
    if (!plan) return false;
    tidyPop.innerHTML = `<p class="tph">Tidy will:</p><ul class="tpl">${plan.changes.map((c) =>
      `<li><button type="button" class="tpi" aria-pressed="${!c.off}" data-label="${esc(c.label)}">${esc(c.label)}</button></li>`).join("")}</ul>` +
      `<p class="muted tpu">Select a change to leave it out.</p>`;
    return true;
  };
  tidyBadge.addEventListener("click", () => {
    if (!tidyPop.hidden) { tidyClose(); return; }
    if (!drawTidyList()) return;
    tidyPop.hidden = false;
    tidyW.scrollIntoView({ block: "nearest" });
    const r = tidyW.getBoundingClientRect();
    const w = tidyPop.offsetWidth;
    tidyPop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    tidyPop.style.top = `${r.bottom + 6 + scrollY}px`;   // placed in the page (.tidypop is absolute): it scrolls with its button
  });
  // Review: a click strikes a change through (Tidy leaves it out); another click brings it back.
  tidyPop.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>(".tpi");
    const label = b?.dataset.label;
    if (!label) return;
    if (tidySkip.has(label)) tidySkip.delete(label); else tidySkip.add(label);
    drawTidyList();
    tidyPop.querySelector<HTMLElement>(`.tpi[data-label="${CSS.escape(label)}"]`)?.focus();
    setSaveState();
  });
  document.addEventListener("pointerdown", (e) => {
    if (!tidyPop.hidden && !tidyPop.contains(e.target as Node) && !tidyBadge.contains(e.target as Node)) tidyClose();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !tidyPop.hidden) tidyClose(true); });

  // ---- Open file and drop ----
  const openFile = async (f: File) => {
    if (!/\.(txt|dndpaste)$/i.test(f.name) && f.type && !f.type.startsWith("text/")) {
      showErr("Only .txt and .dndpaste files open here.");
      return;
    }
    if (f.size > MAX_FILE) { showErr("That file is too large to be a build."); return; }
    try {
      replaceAll(await f.text());
      hideBar();
    } catch {
      showErr("The site couldn't read that file.");
    }
  };
  openBtn.addEventListener("click", () => file.click());
  file.addEventListener("change", () => {
    const f = file.files?.[0];
    if (f) void openFile(f);
    file.value = "";
  });
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  let depth = 0;
  pane.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; dropz.hidden = false; });
  pane.addEventListener("dragover", (e) => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
  pane.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) dropz.hidden = true; });
  pane.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    dropz.hidden = true;
    const f = e.dataTransfer?.files[0];
    if (f) void openFile(f);
  });
  // A file dropped beside the editor must not navigate away from the form.
  for (const ev of ["dragover", "drop"]) window.addEventListener(ev, (e) => { if (hasFiles(e as DragEvent)) e.preventDefault(); });

  // D150: a new build opens with the author you last saved with. Before the draft keeper takes the loaded fields, so
  // the fill alone is never a draft; an edit keeps its share's author, and a restored draft puts back its own.
  author.value = openingAuthor(author.value, !!editId, authors.get());

  // ---- title and author: one paragraph each, grown to fit (D86: long entries wrap) ----
  const fit = (f: HTMLTextAreaElement | HTMLInputElement) => {
    if (!(f instanceof HTMLTextAreaElement)) return;
    f.style.height = "auto";
    f.style.height = `${f.scrollHeight + f.offsetHeight - f.clientHeight}px`;
  };
  for (const f of [title, author]) {
    fit(f);
    f.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") e.preventDefault(); });
    f.addEventListener("input", () => {
      if (/[\r\n]/.test(f.value)) f.value = f.value.replace(/[\r\n]+/g, " ");
      fit(f);
    });
  }
  window.addEventListener("resize", () => { fit(title); fit(author); });

  // ---- unsaved draft (D102): kept in this browser as you type, offered back when the form opens ----
  const openRev = editId && REV_RE.test(base) ? Number(base) : null;
  const current = (): Fields => ({ title: title.value, author: author.value, paste: ta.value });
  const draft = draftKeeper(draftStore(() => window.localStorage), draftSlot(editId), current(), openRev);
  let draftTimer = 0;
  const keepDraft = () => { clearTimeout(draftTimer); draft.keep(current()); };
  const queueDraft = () => { clearTimeout(draftTimer); draftTimer = window.setTimeout(keepDraft, 600); };
  const dbar = el("div", "lbar dbar");
  dbar.setAttribute("role", "status");
  dbar.hidden = !draft.offered;
  if (draft.offered) dbar.innerHTML = draftBarHtml(draft.offered, new Date(), openRev);
  tb.after(dbar);
  const putBack = (d: Draft) => {
    title.value = d.title;
    author.value = d.author;
    fit(title);
    fit(author);
    replaceAll(d.paste);
  };
  dbar.addEventListener("click", (e) => {
    const act = (e.target as Element).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!draft.offered || (act !== "restore" && act !== "discard")) return;
    dbar.hidden = true;
    if (act === "discard") draft.discard();
    else putBack(draft.restore() as Draft);
    keepDraft();
    ta.focus({ preventScroll: true });
  });
  // D139: a reload from the update notice puts the text back without the bar. site.js fires BEFORE_RELOAD; the flag
  // names this page, so another page's form never takes it.
  const here = location.pathname + location.search;
  const session = (): Storage | null => { try { return window.sessionStorage; } catch { return null; } };
  try {
    const flag = session()?.getItem(RELOAD_FLAG);
    session()?.removeItem(RELOAD_FLAG);
    if (flag === here && draft.offered) {
      dbar.hidden = true;
      putBack(draft.restore() as Draft);
    }
  } catch { /* storage blocked: no flag, the bar offers the draft as usual */ }
  window.addEventListener(BEFORE_RELOAD, () => {
    clearTimeout(draftTimer);
    if (draft.handOver(current())) {
      try { session()?.setItem(RELOAD_FLAG, here); } catch { /* the bar offers it instead */ }
    }
    // An edit link's key not yet taken by the server lives only in memory: put it back in the address for the reload.
    if (editId && fromLink && keys.get(editId) !== fromLink) {
      window.history.replaceState(null, "", `${here}#k=${fromLink}`);
    }
  });
  changed = queueDraft;
  for (const f of [title, author]) f.addEventListener("input", queueDraft);
  window.addEventListener("pagehide", keepDraft);

  // ---- save: JSON, so the share can join My recent shares; the no-JS path posts the form as before ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    release();
    st = status(ta.value);
    if (!st.canSave || saving || (editId && !editKeys.length)) { setSaveState(); return; }
    saving = true;
    setSaveState();
    const fields = { title: title.value, author: author.value, paste: ta.value };
    try {
      const post = async (key: string | null): Promise<EditReply> => {
        const res = await fetch(editId ? `/${editId}/edit` : "/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(editId ? { ...fields, key, base } : fields),
        });
        const body: unknown = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data: body && typeof body === "object" ? body as Record<string, unknown> : {} };
      };
      let reply: EditReply;
      if (editId) ({ reply, keys: editKeys } = await sendEdit(editId, editKeys, post, keys));
      else reply = await post(null);
      const data = reply.data;
      if (reply.ok && typeof data.id === "string" && ID_RE.test(data.id)) {
        const id = data.id;
        const name = title.value.replace(/\s+/g, " ").trim();
        clearTimeout(draftTimer);
        draft.saved();
        authors.set(fields.author);
        if (editId) {
          // The share's pages cache for 5 minutes (D97): refresh this browser's copies so it shows the edit at once.
          await Promise.all(["", "/raw", "/canon", "/json"].map((s) => fetch(`/${id}${s}`, { cache: "reload" }).catch(() => null)));
          recent.add({ id, title: name, created: recent.list().find((r) => r.id === id)?.created ?? new Date().toISOString() });
          location.assign(`/${id}`);
          return;
        }
        recent.add({ id, title: name, created: new Date().toISOString() });
        // The view takes the key from the fragment only when this browser can keep none (D301); site.js clears it from the address.
        const key = typeof data.key === "string" ? data.key : null;
        if (key) keys.set(id, key);
        location.assign(key ? `/${id}#new=${key}` : `/${id}`);
        return;
      }
      showErr(typeof data.error === "string" ? data.error : "Couldn't save the build. Try again.");
    } catch {
      showErr("Can't reach the site. Your text is still here. Try again.");
    }
    saving = false;
    setSaveState();
  });

  // ---- the dock rides above the phone keyboard (visualViewport) ----
  const vv = window.visualViewport;
  if (vv) {
    const place = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", `${Math.round(kb)}px`);
    };
    vv.addEventListener("resize", place);
    vv.addEventListener("scroll", place);
    place();
  }

  // Back/forward can restore the textarea's text after load: draw what is there.
  window.addEventListener("pageshow", () => { refresh(); showRecent(); });
  refresh();
}

init();

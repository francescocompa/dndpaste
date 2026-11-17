/**
 * The paste form with JavaScript (M3 T3.2b): it upgrades the server's no-JS form in place. The textarea stays the
 * source of truth (accessibility, undo, phone keyboards); a highlight layer under it draws the colours (D82, D84).
 * Adds the Problems list, key hints (D83), Tidy, Open file and drop, the link-import bar (D85), My recent shares and
 * the phone dock (D86). Bundled to /assets/form.js by scripts/build-client.mjs; CSP `script-src 'self'`, so no
 * inline scripts, no inline style attributes (CSSOM properties set from here are allowed).
 */
import { esc, icon } from "../render.ts";
import { highlightRows } from "./highlight.ts";
import { LANE, ghostCounts, ghostHtml, ghostPads } from "../ghost.ts";
import { keyHints } from "./hints.ts";
import type { Hints } from "./hints.ts";
import { dockLineHtml, importBarHtml, linkedId, problemsHtml, status, summaryHtml } from "./status.ts";
import type { Import, Status } from "./status.ts";
import { recentHtml, recentStore } from "./recent.ts";
import { editKeys as keysToTry, keyFromHash, keyStore, sendEdit } from "./keys.ts";
import type { EditReply } from "./keys.ts";
import { ID_RE, REV_RE } from "../store.ts";
import { draftBarHtml, draftKeeper, draftSlot, draftStore } from "./drafts.ts";
import type { Draft, Fields } from "./drafts.ts";
import { GUIDE_LINK } from "../example.ts";
import { mountStarter } from "./starter.ts";
import { keyDoc, MARKED_FEAT } from "../keydocs.ts";

const recent = recentStore(() => window.localStorage);
const keys = keyStore(() => window.localStorage);
const MAX_FILE = 1024 * 1024;

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
  if (editId) {
    const fromLink = keyFromHash(location.hash, "k");
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
  const dropz = el("div", "dropz", `<b>Drop to open the file</b><small>Replaces the text in the editor. Undo brings it back.</small>`);
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
  openBtn.type = tidyBtn.type = "button";
  tb.prepend(openBtn, tidyBtn, file);
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
      `from when you saved it, or <a href="/?from=${editId}">duplicate and edit</a> it.</span>`);
    nokey.setAttribute("role", "alert");
    form.prepend(nokey);
  }

  // ---- import bar (D85), between the toolbar and the editor ----
  const lbar = el("div", "lbar");
  lbar.hidden = true;
  lbar.setAttribute("role", "status");
  tb.after(lbar);

  // ---- side column: Problems · Keys you can add · My recent shares ----
  aside.innerHTML = `<div class="stack sm"><span class="lbl">Problems</span><div class="probs"></div></div>` +
    `<div class="stack sm keys"><span class="lbl klbl">Keys you can add</span><div class="chips"></div></div>` + GUIDE_LINK +
    `<div class="stack sm"><span class="lbl">My recent shares</span><div class="rlist"></div></div>`;
  const probs = aside.querySelector<HTMLElement>(".probs") as HTMLElement;
  const klbl = aside.querySelector<HTMLElement>(".klbl") as HTMLElement;
  const chips = aside.querySelector<HTMLElement>(".chips") as HTMLElement;
  const rlist = aside.querySelector<HTMLElement>(".rlist") as HTMLElement;
  const showRecent = () => { rlist.innerHTML = recentHtml(recent.list(), new Date()); };
  showRecent();

  // ---- phone dock (D86): Keys toggle + chip row, problem line, Save ----
  const dock = el("div", "pdock",
    `<div class="krow chips" hidden></div><div class="prow"></div><div class="srow"><button type="button" class="bt ktog" aria-expanded="false">` +
    `${icon("keyboard")}Keys <span class="kn"></span>${icon("chevron-up")}${icon("chevron-down")}</button>` +
    `<span class="grow"></span><button type="submit" class="bt pri dsave">${editId ? `${icon("check")}Save changes` : `${icon("link")}Save and get link`}</button></div>`);
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
    const open = krow.hidden;
    krow.hidden = !open;
    dock.classList.toggle("open", open);
    ktog.setAttribute("aria-expanded", String(open));
  });

  // ---- state ----
  let st: Status = status(ta.value);
  let hints: Hints = keyHints(ta.value, 0);
  let saving = false;
  /** Set once the draft autosave (D102) is wired: every redraw of the editor may queue a draft write. */
  let changed = () => {};

  const cursorLine = () => ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
  const refreshHints = () => {
    hints = keyHints(ta.value, cursorLine());
    klbl.textContent = `Keys you can add to ${hints.label}`;
    const html = hints.keys.map((k) => `<button type="button" class="hc" data-key="${esc(k)}">${esc(k)}:</button>`).join("");
    put(chips, html || `<span class="muted">This block has every key it allows.</span>`);
    put(krow, html || `<span class="muted">No keys left for this block.</span>`);
    kn.textContent = String(hints.keys.length);
    if (tipFor && !tipFor.isConnected) hideTip();
  };
  /**
   * D90: the line being typed (1-based; 0 = none) holds its E001 until the cursor leaves it or typing pauses for
   * HOLD_MS. Save looks ready meanwhile (as in frame form-keys-dark-phone) but still blocks: pressing it lets go of
   * the hold and shows the error.
   */
  const HOLD_MS = 1500;
  let holdLine = 0;
  let holdTimer = 0;
  const release = () => {
    clearTimeout(holdTimer);
    if (!holdLine) return;
    holdLine = 0;
    refresh();
  };
  const setSaveState = () => {
    const on = (st.canSave || (st.held > 0 && !st.errors && !st.empty && !st.over)) && !saving && !(editId && !editKeys.length);
    for (const b of saves) { b.disabled = !on; b.classList.toggle("off", !on); }
    tidyBtn.disabled = !st.canTidy;
    tidyBtn.classList.toggle("off", !st.canTidy);
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
  /** The highlight rows, with the ghost pick counts after their lines (D130): display only, never in the text. */
  const drawRows = () => {
    const gs = ghostCounts(st.paste, ta.value);
    // The lane is there only while a ghost shows: a paste with none keeps the full width.
    if (ed.classList.toggle("gl", gs.length > 0) !== laneOn) { laneOn = gs.length > 0; measure(); }
    const pads = ghostPads(ta.value.split(/\r?\n/), gs, cols, LANE);
    draw(highlightRows(ta.value, st.diagnostics, new Map(gs.map((g) => [g.line, ghostHtml(g, pads.get(g.line) ?? 1)]))));
  };
  // A wider or narrower row changes which ghosts fit their block's column: redraw when it does.
  new ResizeObserver(() => { if (measure()) drawRows(); }).observe(hl);
  /** Sets innerHTML only when it changed: most keystrokes leave the summary, Problems and hints as they were. */
  const shown = new WeakMap<Element, string>();
  const put = (e: Element, html: string) => {
    if (shown.get(e) === html) return;
    shown.set(e, html);
    e.innerHTML = html;
  };
  /** While a replace runs, Chrome fires one input event per line it inserts; redraw once, after. */
  let bulk = false;
  const refresh = () => {
    if (bulk) return;
    st = status(ta.value, holdLine);
    drawRows();
    const n = rows.length;
    ed.classList.toggle("w3", n >= 100 && n < 1000);
    ed.classList.toggle("w4", n >= 1000);
    put(sum as HTMLElement, summaryHtml(st));
    put(probs, problemsHtml(st));
    // D94: every dock status (empty, all-clear, warnings, problems) takes its own row above Keys · Save.
    put(prow, dockLineHtml(st));
    setSaveState();
    refreshHints();
    offer.hidden = !offers || ta.value !== "";
    fitOffer();
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
  const jump = (line: number) => {
    const lines = ta.value.split("\n");
    const pos = lines.slice(0, Math.max(0, line - 1)).reduce((a, l) => a + l.length + 1, 0);
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(pos, pos);
    hl.children[line - 1]?.scrollIntoView({ block: "center" });
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
    showErr(null);
    if (kind === "insertFromPaste" || kind === "insertFromDrop") void checkLink();
    else if (!lbar.hidden && !linkedId(ta.value, location.host)) hideBar();
  });
  for (const ev of ["keyup", "click", "focusin"]) ed.addEventListener(ev, refreshHints);
  // D90: the cursor left the held line (arrows, a click, a jump), or the editor lost focus.
  document.addEventListener("selectionchange", () => {
    if (holdLine && document.activeElement === ta && cursorLine() + 1 !== holdLine) release();
  });
  ed.addEventListener("focusout", release);
  form.addEventListener("click", (e) => {
    const t = e.target as Element;
    const at = t.closest<HTMLElement>("[data-line]");
    if (at) { jump(Number(at.dataset.line)); return; }
    const chip = t.closest<HTMLElement>(".hc[data-key]");
    if (!chip?.dataset.key) return;
    if (pressed === chip) { pressed = null; return; }   // a long press showed the description: it does not insert
    hideTip();
    insertKey(chip.dataset.key);
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
  if (offers) mountStarter(offer, (text) => {
    replaceAll(text);
    // The caret waits at the end of the Scores line, the first thing to fill.
    const at = text.indexOf("\nScores:");
    ta.focus({ preventScroll: true });
    if (at >= 0) ta.setSelectionRange(at + 8, at + 8);
    refreshHints();
    ed.scrollIntoView({ block: "nearest" });
  });
  tidyBtn.addEventListener("click", () => {
    if (st.canTidy && st.canon !== null) replaceAll(st.canon);
  });

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
      showErr("That file could not be read.");
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
  dbar.addEventListener("click", (e) => {
    const act = (e.target as Element).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!draft.offered || (act !== "restore" && act !== "discard")) return;
    dbar.hidden = true;
    if (act === "discard") draft.discard();
    else {
      const d = draft.restore() as Draft;
      title.value = d.title;
      author.value = d.author;
      fit(title);
      fit(author);
      replaceAll(d.paste);
    }
    keepDraft();
    ta.focus({ preventScroll: true });
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
        if (editId) {
          // The share's pages cache for 5 minutes (D97): refresh this browser's copies so it shows the edit at once.
          await Promise.all(["", "/raw", "/canon", "/json"].map((s) => fetch(`/${id}${s}`, { cache: "reload" }).catch(() => null)));
          recent.add({ id, title: name, created: recent.list().find((r) => r.id === id)?.created ?? new Date().toISOString() });
          location.assign(`/${id}`);
          return;
        }
        recent.add({ id, title: name, created: new Date().toISOString() });
        // The view shows the private edit link once (D97), from the fragment; site.js clears it from the address.
        const key = typeof data.key === "string" ? data.key : null;
        if (key) keys.set(id, key);
        location.assign(key ? `/${id}#new=${key}` : `/${id}`);
        return;
      }
      showErr(typeof data.error === "string" ? data.error : "The build could not be saved. Try again.");
    } catch {
      showErr("The site could not be reached. Your text is still here; try again.");
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

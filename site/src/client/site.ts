/**
 * Site chrome and the view page's interactions (M3 T3.2c). A classic script in <head>, not deferred: the first lines
 * apply the saved Display settings to <html> before the first paint (D82), the rest waits for the DOM.
 *
 * - Header: the Settings menu (theme Auto/Light/Dark, Colour by kind, Colour abilities, Suggestions), saved in this browser.
 * - View: the split Copy link button and its ▾ menu (Copy text, Copy canonical) with a copied state (D87), fold all /
 *   expand all over the level blocks, the report form's Cancel, the phone dock (CSS) and sheets.
 * - Editing (D97): Edit on the latest revision when this browser keeps the share's edit key; after a save, the private
 *   edit link once, from the `#new=<key>` fragment (cleared from the address at once).
 * - Updates (D137–D140): the foot shows this script's build; a toast offers Reload once a newer build is deployed.
 * - Popovers (D89 b): on a wide screen a panel under its button, shifted or flipped to stay inside the viewport; on a
 *   phone a bottom sheet over a scrim. Escape, a tap outside or leaving with Tab closes; focus returns to the button.
 *
 * CSP `script-src 'self'`: no inline scripts; only CSSOM properties are set from here (positions), never style="".
 */
import { esc, icon } from "../render.ts";
import type { BookType } from "../books.ts";
import { letterOf, matches, passes, sortRows } from "./codes.ts";
import type { Col, Dir } from "./codes.ts";
import { applyDisplay, displayMenuHtml, displayStore } from "./display.ts";
import type { Display } from "./display.ts";
import { suggestPref } from "./prefs.ts";
import { readSummary } from "./summary.ts";
import { keyFromHash, keyStore } from "./keys.ts";
import { imageFileName } from "../shareimg.ts";
import { BUILD } from "../build.gen.ts";
import {
  BEFORE_RELOAD, CHECK_EVERY_MS, CHECK_NOW, DISMISSED_KEY, stampText, toastHtml, updateChecker,
} from "./update.ts";
import type { Layout } from "./share.ts";

const root = document.documentElement;
const store = displayStore(() => window.localStorage);
applyDisplay(root, store.get());
root.classList.add("hasjs");

const PHONE = "(max-width: 600px)";
const isPhone = () => window.matchMedia(PHONE).matches;
const MARGIN = 8;

// ---- popovers: one open at a time ----
/** `trigger` is the button (aria-expanded, focus comes back to it); `anchor` is what the panel lines up with. */
interface Open { panel: HTMLElement; trigger: HTMLElement; anchor: HTMLElement; align: "left" | "right"; scrim: HTMLElement | null }
let current: Open | null = null;

function place(o: Open): void {
  const { panel, anchor } = o;
  if (o.scrim) return;
  panel.style.maxHeight = "";
  panel.style.left = "0px";
  panel.style.top = "0px";
  const a = anchor.getBoundingClientRect();
  const vw = root.clientWidth;
  const vh = window.innerHeight;
  const p = panel.getBoundingClientRect();
  const w = Math.min(p.width, vw - 2 * MARGIN);
  let left = o.align === "right" ? a.right - w : a.left;
  left = Math.max(MARGIN, Math.min(left, vw - MARGIN - w));
  const below = vh - MARGIN - (a.bottom + 4);
  const above = a.top - 4 - MARGIN;
  let top: number;
  if (p.height <= below || below >= above) {
    top = a.bottom + 4;
    if (p.height > below) panel.style.maxHeight = `${Math.max(120, below)}px`;
  } else {
    const h = Math.min(p.height, above);
    if (p.height > above) panel.style.maxHeight = `${above}px`;
    top = a.top - 4 - h;
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(Math.max(MARGIN, top))}px`;
}

function close(refocus = true): void {
  const o = current;
  if (!o) return;
  current = null;
  o.panel.hidden = true;
  o.panel.classList.remove("sheet");
  o.scrim?.remove();
  o.trigger.setAttribute("aria-expanded", "false");
  if (refocus) o.trigger.focus({ preventScroll: true });
}

function open(panel: HTMLElement, trigger: HTMLElement, align: "left" | "right", anchor: HTMLElement = trigger): void {
  if (current?.panel === panel) { close(); return; }
  close(false);
  const sheet = isPhone();
  let scrim: HTMLElement | null = null;
  if (sheet) {
    scrim = document.createElement("div");
    scrim.className = "scrim";
    scrim.addEventListener("click", () => close());
    panel.before(scrim);
  }
  panel.classList.toggle("sheet", sheet);
  panel.hidden = false;
  trigger.setAttribute("aria-expanded", "true");
  current = { panel, trigger, anchor, align, scrim };
  place(current);
  panel.querySelector<HTMLElement>("[role=menuitem], [role=radio][aria-checked=true], button")?.focus({ preventScroll: true });
}

/** A panel at the end of <body> (out of any overflow or stacking context), hidden until opened. */
function panel(cls: string, html: string, label: string, role: "menu" | "dialog"): HTMLElement {
  const p = document.createElement("div");
  p.className = `pop ${cls}`;
  p.setAttribute("role", role);
  p.setAttribute("aria-label", label);
  p.hidden = true;
  p.innerHTML = html;
  document.body.append(p);
  return p;
}

function wirePopovers(): void {
  document.addEventListener("pointerdown", (e) => {
    if (!current) return;
    const t = e.target as Node;
    if (current.panel.contains(t) || current.anchor.contains(t) || current.trigger.contains(t)) return;
    if (current.scrim && t === current.scrim) return;
    close(false);
  });
  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const items = [...current.panel.querySelectorAll<HTMLElement>("[role=menuitem]")];
    if (!items.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[n].focus();
  });
  document.addEventListener("focusin", (e) => {
    if (!current) return;
    const t = e.target as Node;
    if (!current.panel.contains(t) && !current.anchor.contains(t)) close(false);
  });
  window.addEventListener("resize", () => {
    if (!current) return;
    if (!!current.scrim !== isPhone()) close(false);
    else place(current);
  });
  window.addEventListener("scroll", () => { if (current) place(current); }, { passive: true });
}

/** D93: on a phone sheet, a grab bar and a close × in the head (CSS puts it first; hidden off a sheet). */
const SHEET_HEAD = `<div class="shead"><span class="grab" aria-hidden="true"></span><button type="button" class="x shut" aria-label="Close">${icon("x")}</button></div>`;

// ---- Settings menu (D82; "Display" until the D173 review, which added Suggestions) ----
function wireDisplay(): void {
  const btn = document.querySelector<HTMLButtonElement>(".top .dbtn");
  if (!btn) return;
  let d: Display = store.get();
  const suggest = suggestPref(() => window.localStorage);
  const body = () => displayMenuHtml(d, store.persistent(), suggest.get(), readSummary()) + SHEET_HEAD;
  const p = panel("dmenu", body(), "Settings", "dialog");
  btn.setAttribute("aria-controls", (p.id = "dmenu"));
  const redraw = (focus: string) => {
    p.innerHTML = body();
    p.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  };
  btn.addEventListener("click", () => open(p, btn, "right"));
  p.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("button");
    if (!t) return;
    if (t.classList.contains("shut")) { close(); return; }
    const th = t.dataset.themeSet as Display["theme"] | undefined;
    const sw = t.dataset.switch as "kind" | "abilities" | "suggest" | undefined;
    if (sw === "suggest") { suggest.set(!suggest.get()); redraw(`[data-switch="suggest"]`); return; }
    if (th) d = { ...d, theme: th };
    else if (sw) d = { ...d, [sw]: !d[sw] };
    else return;
    store.set(d);
    applyDisplay(root, d);
    redraw(th ? `[data-theme-set="${th}"]` : `[data-switch="${sw}"]`);
  });
  // Arrow keys move the theme choice, as in a radio group.
  p.addEventListener("keydown", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("[data-theme-set]");
    if (!t || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const to = (e.key === "ArrowRight" ? t.nextElementSibling : t.previousElementSibling) as HTMLElement | null;
    to?.click();
  });
  // Another tab changed the settings: follow it.
  window.addEventListener("storage", (e) => {
    if (e.key !== "dndpaste.display") return;
    d = store.get();
    applyDisplay(root, d);
    if (!p.hidden) redraw("[aria-checked=true]");
  });
}

// ---- clipboard: the Clipboard API, then execCommand, then a panel with the text selected (SITE.md) ----
async function writeClip(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.className = "offscreen";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}

// ---- view page ----
function wireView(): void {
  const acts = document.querySelector<HTMLElement>(".view .acts[data-id]");
  if (!acts) return;
  const id = acts.dataset.id as string;
  const rev = acts.dataset.rev;
  /** The page's own path: `<id>`, or `<id>/<n>` on a pinned revision. */
  const path = rev ? `${id}/${rev}` : id;
  const main = acts.querySelector<HTMLButtonElement>(".cpy");
  const caret = acts.querySelector<HTMLButtonElement>(".caret");
  const reddit = acts.dataset.reddit ?? "";
  const tidySame = acts.dataset.tidy === "same";
  const label = main?.querySelector<HTMLElement>(".cl");
  if (!main || !caret || !label) return;
  const link = document.querySelector<HTMLLinkElement>("link[rel=canonical]")?.href || `${location.origin}/${id}`;

  // The texts are fetched once, early, so a copy needs no network wait (Safari drops a copy made after one).
  const texts: Partial<Record<"raw" | "canon", string>> = {};
  const pending: Partial<Record<"raw" | "canon", Promise<string | null>>> = {};
  const fetchText = (k: "raw" | "canon") => (pending[k] ??= fetch(`/${path}/${k}`)
    .then((r) => (r.ok ? r.text() : null)).then((t) => { if (t !== null) texts[k] = t; return t; }).catch(() => null));
  const warm = () => { void fetchText("raw"); if (!tidySame) void fetchText("canon"); };
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 300);

  const live = document.createElement("span");
  live.className = "sr";
  live.setAttribute("aria-live", "polite");
  acts.append(live);

  const DONE = { link: "Link copied", raw: "Text copied", canon: "Tidied text copied", edit: "Edit link copied" } as const;
  // Edit and the one-time panel; the private edit link when this browser keeps the share's key (D97).
  const editUrl = rev ? null : wireEdit(acts, id, link);
  let timer = 0;
  const copied = (k: keyof typeof DONE) => {
    main.innerHTML = `${icon("check")}<span class="cl">${DONE[k]}</span>`;
    main.classList.add("done");
    live.textContent = DONE[k];
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      main.innerHTML = `${icon("link")}<span class="cl">Copy link</span>`;
      main.classList.remove("done");
      live.textContent = "";
    }, 2000);
  };

  // Last resort: show the text selected, for the reader to copy by hand.
  const manual = panel("ovf manual", "", "Copy by hand", "dialog");
  const showManual = (text: string) => {
    manual.innerHTML = `<b>Select the text and copy it</b><textarea class="in" readonly spellcheck="false"></textarea>${SHEET_HEAD}`;
    const ta = manual.querySelector("textarea") as HTMLTextAreaElement;
    ta.value = text;
    open(manual, main, "left", (main.closest(".splitb") as HTMLElement | null) ?? main);
    ta.focus();
    ta.select();
  };
  manual.addEventListener("click", (e) => { if ((e.target as Element).closest(".shut")) close(); });

  const copy = async (k: "link" | "raw" | "canon" | "edit") => {
    const text = k === "link" ? link : k === "edit" ? editUrl : texts[k] ?? (await fetchText(k));
    if (text === null || text === undefined) { live.textContent = "The text didn't load. Try again."; return; }
    if (await writeClip(text)) copied(k);
    else showManual(text);
  };

  const menu = panel("ovf copym",
    `<button type="button" role="menuitem" class="it" data-copy="raw"><span class="il">${icon("copy")}Copy text</span><small>as written</small></button>` +
    (tidySame ? "" : `<button type="button" role="menuitem" class="it" data-copy="canon"><span class="il">${icon("tidy")}Copy tidied text</span><small>for apps</small></button>`) +
    (editUrl ? `<button type="button" role="menuitem" class="it" data-copy="edit"><span class="il">${icon("pencil")}Copy edit link</span><small>private, to edit elsewhere</small></button>` : "") +
    // D119 round 2: the share image and Post to Reddit live in this menu, not in the row.
    `<button type="button" role="menuitem" class="it" data-share="image"><span class="il">${icon("image")}Share image</span><small>a picture of the whole build</small></button>` +
    (reddit ? `<a role="menuitem" class="it" href="${esc(reddit)}" target="_blank" rel="noopener noreferrer"><span class="il">${icon("external-link")}Post to Reddit</span><small>link and title, in a new tab</small></a>` : "") +
    SHEET_HEAD,
    "More ways to copy and share", "menu");
  caret.setAttribute("aria-controls", (menu.id = "copym"));
  main.addEventListener("click", () => void copy("link"));
  // The menu lines up with the whole split button (frame view-copymenu-dark-desk); aria-expanded sits on the caret.
  caret.addEventListener("click", () => open(menu, caret, "left", (caret.closest(".splitb") as HTMLElement | null) ?? caret));
  const openShare = wireShare(caret, id, link, () => texts.raw ?? fetchText("raw"));
  menu.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("button, a");
    if (!t) return;
    if (t.tagName === "A") { close(false); return; }   // Post to Reddit: the link opens its tab
    const k = t.dataset.copy as "raw" | "canon" | "edit" | undefined;
    close();
    if (k) void copy(k);
    else if (t.dataset.share) openShare();
  });

  // Fold all / expand all (D87), over the level blocks' <details>.
  document.querySelector(".view .fold")?.addEventListener("click", (e) => {
    const f = (e.target as Element).closest<HTMLElement>("[data-fold]")?.dataset.fold;
    if (!f) return;
    for (const d of document.querySelectorAll<HTMLDetailsElement>("details.lvb")) d.open = f === "open";
  });

  // The report form opens in place (D87): focus its reason; Cancel closes it.
  const report = document.querySelector<HTMLDetailsElement>("details.report");
  report?.addEventListener("toggle", () => {
    if (report.open) report.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
  });
  report?.querySelector("[data-act=cancel-report]")?.addEventListener("click", () => {
    report.open = false;
    report.querySelector<HTMLElement>("summary")?.focus();
  });
}

// ---- share image and Post to Reddit (D119) ----
type ShareModule = typeof import("./share.ts");
/** /assets/share.js, an ES module with the parser and the painter, loaded the first time Share opens. */
let shareModule: Promise<ShareModule> | null = null;
const SHARE_JS = "/assets/share.js";
const loadShare = () => (shareModule ??= import(SHARE_JS) as Promise<ShareModule>);

/** Copy image needs ClipboardItem with PNG; Share needs the system sheet to take files. Hidden where missing. */
const canCopyImage = () => typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write &&
  (typeof ClipboardItem.supports !== "function" || ClipboardItem.supports("image/png"));
const canShareFiles = () => {
  try { return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }); }
  catch { return false; }
};

/** The Share image panel, opened from the Copy link menu; returns the function that opens it. */
function wireShare(btn: HTMLButtonElement, id: string, link: string, raw: () => string | Promise<string | null>): () => void {
  const title = document.querySelector<HTMLElement>(".view .meta .ttl");
  const meta = {
    title: title?.textContent ?? "", untitled: !!title?.classList.contains("none"),
    byline: document.querySelector<HTMLElement>(".view .meta .by")?.textContent?.trim() ?? "",
    books: document.querySelector<HTMLElement>(".view .meta .bks")?.textContent?.trim() ?? "", url: link,
  };
  const fileName = imageFileName(meta.untitled ? "" : meta.title, `dndpaste-${id}`);
  const copyOk = canCopyImage();
  const shareOk = canShareFiles();
  const p = panel("shp", `<div class="sh"><div class="hrow"><b class="h">Share image</b>` +
    `<span class="seg ic" role="radiogroup" aria-label="Image theme"><button type="button" role="radio" aria-checked="false" aria-label="Light" data-theme-img="light">${icon("sun")}</button>` +
    `<button type="button" role="radio" aria-checked="false" aria-label="Dark" data-theme-img="dark">${icon("moon")}</button></span></div>` +
    `<div class="seg lay" role="radiogroup" aria-label="Layout"><button type="button" role="radio" aria-checked="true" class="on" data-layout="tall">Tall</button><button type="button" role="radio" aria-checked="false" data-layout="wide">Wide</button></div>` +
    `<div class="prev" role="img"><span class="wait">Drawing the image…</span></div>` +
    `<div class="irow"><button type="button" class="bt pri" data-img="download" disabled>${icon("download")}<span>Download</span></button>` +
    (copyOk ? `<button type="button" class="bt" data-img="copy" disabled>${icon("copy")}<span>Copy image</span></button>` : "") +
    (shareOk ? `<button type="button" class="bt" data-img="share" disabled>${icon("share-box")}<span>Share image</span></button>` : "") + `</div>` +
    `<small class="msg" aria-live="polite"></small></div>` + SHEET_HEAD,
  "Share image", "dialog");
  p.id = "shp";
  // A build of one block draws the same in both layouts: no choice to make.
  if (document.querySelectorAll(".view .build > *").length < 2) p.querySelectorAll<HTMLElement>(".lay").forEach((el) => { el.hidden = true; });
  const prev = p.querySelector(".prev") as HTMLElement;
  const live = p.querySelector(".sh .msg") as HTMLElement;
  const imgBtns = () => [...p.querySelectorAll<HTMLButtonElement>("[data-img]")];

  let layout: Layout = "tall";
  // The image's own theme (round 2): it starts as the page's and changes only the image.
  const pageDark = () => root.dataset.theme === "dark" || (root.dataset.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  let theme: "light" | "dark" = pageDark() ? "dark" : "light";
  // One image per layout and look (theme, colour switches); the Display menu can change the look while open.
  const made = new Map<string, Promise<{ canvas: HTMLCanvasElement; blob: Blob }>>();
  let ready: { blob: Blob; file: File } | null = null;
  const lookKey = () => `${layout}|${theme}|${root.className}`;

  const draw = async () => {
    for (const b of p.querySelectorAll<HTMLElement>("[data-layout]")) b.setAttribute("aria-checked", String(b.dataset.layout === layout));
    for (const b of p.querySelectorAll<HTMLElement>("[data-layout]")) b.classList.toggle("on", b.dataset.layout === layout);
    for (const b of p.querySelectorAll<HTMLElement>("[data-theme-img]")) {
      b.setAttribute("aria-checked", String(b.dataset.themeImg === theme));
      b.classList.toggle("on", b.dataset.themeImg === theme);
    }
    const key = lookKey();
    ready = null;
    for (const b of imgBtns()) b.disabled = true;
    if (!made.has(key)) {
      prev.innerHTML = `<span class="wait">Drawing the image…</span>`;
      made.set(key, (async () => {
        const [mod, text] = await Promise.all([loadShare(), raw()]);
        if (text === null) throw new Error("no text");
        const canvas = await mod.drawShareImage(text, layout, meta, theme);
        return { canvas, blob: await mod.toPng(canvas) };
      })());
    }
    try {
      const { canvas, blob } = await (made.get(key) as Promise<{ canvas: HTMLCanvasElement; blob: Blob }>);
      if (key !== lookKey()) return;
      prev.replaceChildren(canvas);
      prev.setAttribute("aria-label", `The share image, ${layout} layout: ${meta.title}`);
      ready = { blob, file: new File([blob], fileName, { type: "image/png" }) };
      for (const b of imgBtns()) b.disabled = false;
    } catch {
      made.delete(key);
      prev.innerHTML = `<span class="wait">Couldn't draw the image. Close this panel and try again.</span>`;
    }
  };

  let timer = 0;
  const flash = (b: HTMLButtonElement, text: string) => {
    const was = b.innerHTML;
    b.innerHTML = `${icon("check")}<span>${text}</span>`;
    live.textContent = text;
    clearTimeout(timer);
    timer = window.setTimeout(() => { b.innerHTML = was; live.textContent = ""; }, 2000);
  };

  // A browser that refuses clipboard writes outright (Chromium reports it) gets no Copy image button.
  void navigator.permissions?.query({ name: "clipboard-write" as PermissionName })
    .then((st) => { if (st.state === "denied") p.querySelector("[data-img=copy]")?.remove(); }, () => { /* not reported: keep it */ });

  const show = () => {
    open(p, btn, "left", (btn.closest(".splitb") as HTMLElement | null) ?? btn);
    if (current?.panel === p) void draw();
  };
  p.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("button, a");
    if (!t) return;
    if (t.classList.contains("shut")) { close(); return; }
    const l = t.dataset.layout as Layout | undefined;
    if (l) { if (l !== layout) { layout = l; void draw(); } return; }
    const th = t.dataset.themeImg as "light" | "dark" | undefined;
    if (th) { if (th !== theme) { theme = th; void draw(); } return; }
    const act = t.dataset.img;
    if (!act || !ready) return;
    const b = t as HTMLButtonElement;
    const { blob, file } = ready;
    if (act === "download") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      flash(b, "Downloaded");
    } else if (act === "copy") {
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        .then(() => flash(b, "Image copied"), () => { live.textContent = "This browser can't copy images. Download it instead."; });
    } else if (act === "share") {
      navigator.share({ files: [file], title: meta.title }).catch(() => { /* closed by the reader */ });
    }
  });
  // Arrow keys move the layout choice, as in a radio group.
  p.addEventListener("keydown", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("[data-layout], [data-theme-img]");
    if (!t || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const to = (e.key === "ArrowRight" ? t.nextElementSibling : t.previousElementSibling) as HTMLElement | null;
    to?.click();
    to?.focus();
  });
  // The Display menu's colour switches changed: redraw if the panel is open.
  new MutationObserver(() => { if (!p.hidden) void draw(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
  return show;
}

// ---- editing (D97) ----
/** Adds Edit; returns the private edit link (copied from the Copy link menu only, D301), or null without a key. */
function wireEdit(acts: HTMLElement, id: string, link: string): string | null {
  const keys = keyStore(() => window.localStorage);
  const fresh = keyFromHash(location.hash, "new");
  if (location.hash.startsWith("#new=")) history.replaceState(null, "", location.pathname + location.search);
  const kept = keys.get(id);
  // A `#new=` fragment counts only when this browser can keep no key: then it lives in this page alone.
  const blocked = fresh !== null && kept === null && !keys.writable();
  const key = kept ?? (blocked ? fresh : null);
  if (!key) return null;

  const editUrl = `${new URL(link).origin}/${id}/edit#k=${key}`;
  const dup = acts.querySelector(".dup");
  const btn = document.createElement("a");
  btn.className = "bt edit";
  // Without storage the key lives only in this page, so Edit carries it in the fragment.
  btn.href = blocked ? editUrl : `/${id}/edit`;
  btn.innerHTML = `${icon("pencil")}Edit`;
  if (dup) dup.before(btn);
  else acts.append(btn);
  acts.classList.add("own");
  return editUrl;
}

// ---- /codes (D103, D228): find a code, a book or a year; filter by type and 2014 books; click a column head to sort,
// again to reverse; the A–Z strip jumps to the first row of a letter while the table is sorted by code or book ----
function wireCodes(): void {
  const table = document.querySelector<HTMLTableElement>("table.ctab");
  const q = document.querySelector<HTMLInputElement>("#cq");
  const count = document.querySelector<HTMLElement>(".cfind .cn");
  const none = document.querySelector<HTMLElement>(".cnone");
  const chips = document.querySelector<HTMLElement>(".cchips");
  const old = document.querySelector<HTMLInputElement>("#c14");
  const az = document.querySelector<HTMLElement>(".caz");
  const tbody = table?.tBodies[0];
  const heads = [...(table?.tHead?.rows[0]?.cells ?? [])];
  if (!table || !q || !count || !none || !chips || !old || !az || !tbody || !heads.length) return;
  const rows = [...tbody.rows].map((tr) => ({
    tr, code: tr.dataset.code ?? "", title: tr.dataset.title ?? "", type: (tr.dataset.type ?? "Extra") as BookType, y2014: tr.dataset.y2014 === "1",
    date: tr.dataset.date ?? "",
  }));
  let col: Col = "code";
  let dir: Dir = "asc";
  let type: BookType | null = null;
  for (const th of heads) {
    const info = th.querySelector(".tinfo");   // D218 review: the Type column's info button stays beside its sort button
    const label = th.querySelector(".tl")?.textContent ?? th.textContent ?? "";
    th.innerHTML = `<button type="button" class="srt">${esc(label)}${icon("chevron-up")}${icon("chevron-down")}</button>`;
    if (info) th.append(info);
  }
  const draw = () => {
    const shown = sortRows(rows, col, dir).filter((r) => passes(r, type, old.checked) && matches(r, q.value));
    tbody.replaceChildren(...shown.map((r) => r.tr));
    for (const th of heads) {
      if (th.dataset.col === col) th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    }
    const all = rows.length;
    count.textContent = shown.length < all ? `${shown.length} of ${all}` : "";
    none.hidden = shown.length > 0;
    // The A–Z strip: one link per letter the shown rows start with, in the sorted column (code or book only).
    for (const r of rows) r.tr.removeAttribute("id");
    const letters: string[] = [];
    if (col === "code" || col === "title") {
      for (const r of shown) {
        const l = letterOf(r, col);
        if (letters.includes(l)) continue;
        letters.push(l);
        r.tr.id = `c-${l}`;
      }
    }
    az.hidden = letters.length < 2;
    az.innerHTML = letters.map((l) => `<a href="#c-${l}">${l}</a>`).join("");
  };
  table.tHead?.addEventListener("click", (e) => {
    const th = (e.target as Element).closest<HTMLElement>("th[data-col]");
    if (!th || (e.target as Element).closest(".tinfo")) return;
    const c = th.dataset.col as Col;
    dir = c === col && dir === "asc" ? "desc" : "asc";
    col = c;
    draw();
  });
  chips.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button[data-type]");
    if (!b) return;
    type = (b.dataset.type || null) as BookType | null;
    for (const x of chips.querySelectorAll<HTMLButtonElement>("button[data-type]")) x.setAttribute("aria-pressed", String(x === b));
    draw();
  });
  old.addEventListener("change", draw);
  // A letter scrolls its row under the sticky bar, not behind it.
  az.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href^='#c-']");
    const row = a ? document.getElementById(a.hash.slice(1)) : null;
    if (!row) return;
    e.preventDefault();
    const bar = document.querySelector<HTMLElement>(".cbar")?.getBoundingClientRect().height ?? 0;
    row.style.scrollMarginTop = `${bar + 8}px`;
    row.scrollIntoView({ block: "start" });
  });
  q.addEventListener("input", draw);
  draw();
}

/** Session storage, or null where it is blocked. */
const session = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * D137–D140. The foot says which build this script is (a page from the browser cache can be older than its script);
 * GET /version says which build is deployed. A different one gets the toast: bottom centre, top on a phone (CSS).
 */
function wireUpdate(): void {
  const bld = document.querySelector<HTMLElement>(".foot .bld");
  if (bld && bld.textContent !== stampText(BUILD)) {
    bld.textContent = stampText(BUILD);
    bld.removeAttribute("title");
  }
  let toast: HTMLElement | null = null;
  const checker = updateChecker({
    current: BUILD,
    fetchBuild: async () => {
      const r = await fetch("/version", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`/version ${r.status}`);
      return r.json();
    },
    dismissed: {
      get: () => { try { return session()?.getItem(DISMISSED_KEY) ?? null; } catch { return null; } },
      set: (id) => { try { session()?.setItem(DISMISSED_KEY, id); } catch { /* storage blocked */ } },
    },
    onNew: () => {
      if (toast) return;
      toast = document.createElement("div");
      toast.className = "utoast";
      toast.setAttribute("role", "status");
      toast.innerHTML = toastHtml();
      toast.addEventListener("click", (e) => {
        const act = (e.target as Element).closest<HTMLElement>("[data-act]")?.dataset.act;
        if (act === "reload") {
          // The form keeps its draft and its edit-link key first (form.ts), then the page loads the new build.
          window.dispatchEvent(new Event(BEFORE_RELOAD));
          window.location.reload();
        } else if (act === "close") {
          checker.dismiss();
          toast?.remove();
          toast = null;
        }
      });
      document.body.append(toast);
    },
  });
  const check = () => { if (!document.hidden) void checker.check(); };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", (e) => { if (e.persisted) check(); });
  window.setInterval(check, CHECK_EVERY_MS);
  window.addEventListener(CHECK_NOW, () => void checker.check(true));
}

function init(): void {
  wireUpdate();
  wirePopovers();
  wireDisplay();
  wireView();
  wireCodes();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

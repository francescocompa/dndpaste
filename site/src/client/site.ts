/**
 * Site chrome and the view page's interactions (M3 T3.2c). A classic script in <head>, not deferred: the first lines
 * apply the saved Display settings to <html> before the first paint (D82), the rest waits for the DOM.
 *
 * - Header: the Display menu (theme Auto/Light/Dark, Colour by kind, Colour abilities), saved in this browser.
 * - View: the split Copy link button and its ▾ menu (Copy text, Copy canonical) with a copied state (D87), fold all /
 *   expand all over the level blocks, the report form's Cancel, the phone dock (CSS) and sheets.
 * - Popovers (D89 b): on a wide screen a panel under its button, shifted or flipped to stay inside the viewport; on a
 *   phone a bottom sheet over a scrim. Escape, a tap outside or leaving with Tab closes; focus returns to the button.
 *
 * CSP `script-src 'self'`: no inline scripts; only CSSOM properties are set from here (positions), never style="".
 */
import { icon } from "../render.ts";
import { applyDisplay, displayMenuHtml, displayStore } from "./display.ts";
import type { Display } from "./display.ts";

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

// ---- Display menu (D82) ----
function wireDisplay(): void {
  const btn = document.querySelector<HTMLButtonElement>(".top .dbtn");
  if (!btn) return;
  let d: Display = store.get();
  const body = () => `<span class="grab" aria-hidden="true"></span>${displayMenuHtml(d, store.persistent())}` +
    `<button type="button" class="it q shut">Close</button>`;
  const p = panel("dmenu", body(), "Display", "dialog");
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
    const sw = t.dataset.switch as "kind" | "abilities" | undefined;
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
  const main = acts.querySelector<HTMLButtonElement>(".cpy");
  const caret = acts.querySelector<HTMLButtonElement>(".caret");
  const label = main?.querySelector<HTMLElement>(".cl");
  if (!main || !caret || !label) return;
  const link = document.querySelector<HTMLLinkElement>("link[rel=canonical]")?.href || `${location.origin}/${id}`;

  // The texts are fetched once, early, so a copy needs no network wait (Safari drops a copy made after one).
  const texts: Partial<Record<"raw" | "canon", string>> = {};
  const pending: Partial<Record<"raw" | "canon", Promise<string | null>>> = {};
  const fetchText = (k: "raw" | "canon") => (pending[k] ??= fetch(`/${id}/${k}`)
    .then((r) => (r.ok ? r.text() : null)).then((t) => { if (t !== null) texts[k] = t; return t; }).catch(() => null));
  const warm = () => { void fetchText("raw"); void fetchText("canon"); };
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 300);

  const live = document.createElement("span");
  live.className = "sr";
  live.setAttribute("aria-live", "polite");
  acts.append(live);

  const DONE = { link: "Link copied", raw: "Text copied", canon: "Canonical copied" } as const;
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
    manual.innerHTML = `<span class="grab" aria-hidden="true"></span><b>Select the text and copy it</b>` +
      `<textarea class="in" readonly spellcheck="false"></textarea><button type="button" class="it q shut">Close</button>`;
    const ta = manual.querySelector("textarea") as HTMLTextAreaElement;
    ta.value = text;
    open(manual, main, "left", (main.closest(".splitb") as HTMLElement | null) ?? main);
    ta.focus();
    ta.select();
  };
  manual.addEventListener("click", (e) => { if ((e.target as Element).closest(".shut")) close(); });

  const copy = async (k: "link" | "raw" | "canon") => {
    const text = k === "link" ? link : texts[k] ?? (await fetchText(k));
    if (text === null || text === undefined) { live.textContent = "The text could not be loaded. Try again."; return; }
    if (await writeClip(text)) copied(k);
    else showManual(text);
  };

  const menu = panel("ovf copym",
    `<span class="grab" aria-hidden="true"></span>` +
    `<button type="button" role="menuitem" class="it" data-copy="raw"><span class="il">${icon("copy")}Copy text</span><small>as written</small></button>` +
    `<button type="button" role="menuitem" class="it" data-copy="canon"><span class="il">${icon("tidy")}Copy canonical</span><small>tidied, for apps</small></button>` +
    `<button type="button" class="it q shut">Cancel</button>`, "More ways to copy", "menu");
  caret.setAttribute("aria-controls", (menu.id = "copym"));
  main.addEventListener("click", () => void copy("link"));
  // The menu lines up with the whole split button (frame view-copymenu-dark-desk); aria-expanded sits on the caret.
  caret.addEventListener("click", () => open(menu, caret, "left", (caret.closest(".splitb") as HTMLElement | null) ?? caret));
  menu.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("button");
    if (!t) return;
    const k = t.dataset.copy as "raw" | "canon" | undefined;
    close();
    if (k) void copy(k);
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

function init(): void {
  wirePopovers();
  wireDisplay();
  wireView();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

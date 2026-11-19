/**
 * The Display settings (D82, SITE.md view page): theme Auto/Light/Dark, Colour by kind, Colour abilities, saved in
 * this browser. DOM-free apart from `applyDisplay`'s small root interface, so the tests run it in Node.
 * Every storage access is in try/catch; with storage blocked the settings live in memory for the visit.
 */
import { esc, icon } from "../render.ts";

export type Theme = "auto" | "light" | "dark";
export interface Display { theme: Theme; kind: boolean; abilities: boolean }
export const DEFAULT_DISPLAY: Readonly<Display> = { theme: "auto", kind: true, abilities: true };
const KEY = "dndpaste.display";
const THEMES: readonly Theme[] = ["auto", "light", "dark"];

export interface DisplayStore {
  get(): Display;
  set(d: Display): void;
  /** False once a write failed: the page then says the settings last for this visit only. */
  persistent(): boolean;
}

function read(raw: string | null | undefined): Display {
  try {
    const o = raw ? (JSON.parse(raw) as Partial<Display>) : {};
    return {
      theme: THEMES.includes(o.theme as Theme) ? (o.theme as Theme) : DEFAULT_DISPLAY.theme,
      kind: typeof o.kind === "boolean" ? o.kind : DEFAULT_DISPLAY.kind,
      abilities: typeof o.abilities === "boolean" ? o.abilities : DEFAULT_DISPLAY.abilities,
    };
  } catch {
    return { ...DEFAULT_DISPLAY };
  }
}

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function displayStore(storage: () => Storage | null): DisplayStore {
  let mem: Display | null = null;
  return {
    get() {
      if (mem) return { ...mem };
      try { return read(storage()?.getItem(KEY)); } catch { return { ...DEFAULT_DISPLAY }; }
    },
    set(d) {
      try {
        const s = storage();
        if (!s) throw new Error("no storage");
        s.setItem(KEY, JSON.stringify(d));
        mem = null;
      } catch {
        mem = { ...d };
      }
    },
    persistent: () => mem === null,
  };
}

/** The part of <html> the settings touch: `data-theme` (absent = follow the system) and the .ck / .ca switches. */
export interface DisplayRoot {
  classList: { toggle(c: string, on: boolean): unknown };
  setAttribute(n: string, v: string): void;
  removeAttribute(n: string): void;
}

export function applyDisplay(root: DisplayRoot, d: Display): void {
  if (d.theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", d.theme);
  root.classList.toggle("ck", d.kind);
  root.classList.toggle("ca", d.abilities);
}

const KINDS = ["class", "subclass", "species", "background", "feat", "spell", "item"] as const;
const ABS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const LABEL: Record<Theme, string> = { auto: "Auto", light: "Light", dark: "Dark" };
/** D173 review round 2: day and night icons on the theme choice. */
const THEME_ICON: Record<Theme, string> = { auto: "contrast", light: "sun", dark: "moon" };

/** The Settings menu's body (frame view-display-desk; "Display" until the D173 review). `persistent` false: storage is
 *  blocked. `suggest`: the editor's Suggestions switch (D173), stored on its own (prefs.ts). */
export function displayMenuHtml(d: Display, persistent = true, suggest = true): string {
  const seg = THEMES.map((t) =>
    `<button type="button" role="radio" aria-checked="${d.theme === t}" data-theme-set="${t}"${d.theme === t ? ` class="on"` : ""}>${icon(THEME_ICON[t])}${LABEL[t]}</button>`).join("");
  const sw = (key: "kind" | "abilities" | "suggest", label: string, small: string, on = key === "suggest" ? suggest : d[key]) =>
    `<button type="button" class="sw" role="switch" aria-checked="${on}" data-switch="${key}"><span class="swl">${esc(label)}</span>` +
    `<span class="tog${on ? " on" : ""}" aria-hidden="true"></span><small>${small}</small></button>`;
  return `<div class="h" id="dmenu-h">Settings</div>` +
    `<div class="seg" role="radiogroup" aria-label="Theme">${seg}</div>` +
    sw("kind", "Colour by kind", "Class, subclass, species, background, feat, spell, item") +
    `<div class="swatches" aria-hidden="true">${KINDS.map((k) => `<i class="sw-${k}"></i>`).join("")}</div>` +
    sw("abilities", "Colour abilities", ABS.map((a) => `<span class="ab ab-${a.toLowerCase()}">${a}</span>`).join(" ")) +
    // D173 (review): the editor's name and key lists, beside the display settings.
    `<hr>` + sw("suggest", "Suggestions", "Name and key lists in the editor") +
    // Round 2: no "Saved in this browser." line; only blocked storage says something.
    (persistent ? "" : `<small class="saved">This browser blocks storage, so these settings last for this visit only.</small>`);
}

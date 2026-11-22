/**
 * The editor's lists (D335): the name autocomplete (D151, D154–D159), the key list (D170), the swap list (D304) and the
 * base Scores line's lists and popover (D321–D324). Bundled on its own as /assets/ac.js and loaded by form.ts the first
 * time the editor gets focus, as names.js is (D158), so form.js stays under its 150 KB cap.
 *
 * form.ts owns the editor, its state and the listeners; it hands this module what the lists read and write through
 * `AcHost`, and calls the `Ac` it gets back from the same listeners it always had, in the same order.
 * Module state lives in one bundle only: your own presets are set in this bundle's copy of ghost.ts as well
 * (`useYourPresets`, re-exported below), so the key list and the level-up see your classes as form.js does.
 */
import { esc, icon } from "../render.ts";
import { fillScore, finalFoot, finalOf, finalTitle, listRows, pickScore, scoreLineAt, stepScore } from "../scores.ts";
import type { ScoreLine, ScoreRow } from "../scores.ts";
import { readSummary } from "./summary.ts";
import { nextOpen } from "../preset.ts";
import { ABILITIES, methodWords, resolveKey } from "../../../src/dndpaste.ts";
import type { ScoreKind } from "../../../src/dndpaste.ts";
import { levelUp, nextLevel } from "../levelup.ts";
import { gearPref } from "./prefs.ts";
import { LIST_LIMIT, afterPick, alternativeList, bracketTrim, getGearHalf, isKnown, setGearHalf, keySpotAt, opensDetails, opensOnClick, slotHint, spotAt, suggestList, suggestKeys, swapAt, swapWritten, written, writtenKey } from "./complete.ts";
import type { KeySpot, Names, Spot, Suggestion } from "./complete.ts";
import type { Status } from "./status.ts";
import { bonusSpotAt, fitBackground } from "../background.ts";
import type { BonusSpot } from "../background.ts";
export { useYourPresets } from "../ghost.ts";

/** What the lists read and write in the form (form.ts). Getters, since the form swaps its textarea and redraws its state. */
export interface AcHost {
  readonly ta: HTMLTextAreaElement;
  readonly ed: HTMLElement;
  readonly hl: HTMLElement;
  readonly dock: HTMLElement;
  readonly st: Status;
  readonly names: Names | null;
  readonly scoreChip: ScoreLine | null;
  /** D323: the method a pick in the method list sets for this draft. */
  scoreMethod: ScoreKind | null;
  suggestOn(): boolean;
  loadNames(): void;
  effMethod(sl: Pick<ScoreLine, "marker" | "values">): ScoreKind | null;
  chipHtml(sl: ScoreLine): { html: string; clash: boolean; label: string };
  writeChange(next: string): void;
  insert(text: string, start: number, end: number): void;
  refreshHints(): void;
  drawRows(): void;
  changed(): void;
  /** D176: hold the errors of a line still being written (1-based), as typing does. */
  hold(line: number): void;
  /** D297: Tab on a Species line's ghost text writes the brackets; true when it did. */
  tabGhost(e: KeyboardEvent): boolean;
}

/** What form.ts calls. */
export interface Ac {
  /** `typing`: the text changed by a keystroke. Only typing opens the list; a cursor move updates or closes it (D154). */
  complete(typing: boolean): void;
  close(): void;
  /** D323, D324: the method list, from the base Scores line's chip. */
  openMethods(chip: Element): void;
  /** The names table arrived: an open score popover gets its final, anything else shows what typing showed. */
  namesArrived(): void;
  keydown(e: KeyboardEvent): void;
  /** The 1-based line the list is open on (the caret's); 0 when closed. */
  openLine(): number;
  keyup(e: KeyboardEvent): void;
  click(e: MouseEvent): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

export function mountAc(h: AcHost): Ac {
  // ---- name autocomplete (D151, D154–D159) ----
  // Desktop: a listbox under the cursor's line. Phone (the dock's width): the same listbox as a chip row in the dock,
  // in place of the Keys row (D157). The textarea keeps focus; the list is announced through aria-activedescendant.
  const phone = window.matchMedia("(max-width: 600px)");
  const ac = el("div", "ac");
  ac.id = "ac-names";
  ac.setAttribute("role", "listbox");
  ac.setAttribute("aria-label", "Names");
  ac.hidden = true;
  h.ed.append(ac);
  ac.addEventListener("mousedown", (ev) => ev.preventDefault());   // keeps focus (and the phone keyboard) in the editor
  const acSays = el("span", "vh");
  acSays.setAttribute("aria-live", "polite");
  h.ed.append(acSays);
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
  /** D362: nothing typed matches in the Gear list's half, but this many do in the other one. */
  let acGearOther = 0;
  const gear = gearPref(() => window.localStorage);
  setGearHalf(gear.get());
  const GEAR_HALVES = [["mundane", "Mundane"], ["magic", "Magic"]] as const;
  /** D362 (D336): a Gear list's head holds the Mundane · Magic switch; it follows a swap's "Swap for". */
  const gearList = () => Boolean(acSpot && acSpot.key === "Gear" && acSpot.parent === null && !acKey && !acScore && !acBonus);
  /** T8.4: the list is a score list on the header's base Scores line: `fill`, the next ability's numbers while the line
   *  is written (D322); `pop`, a clicked score's options (D321); `method`, the method list (D323), reached from the
   *  line's chip (`back` null) or the list's corner chip (`back`: the list to go back to). */
  /** D352: the list is a Background block's Scores line's bonuses (`+2 INT`); a pick replaces what is typed. */
  let acBonus: BonusSpot | null = null;
  let acScore: { sl: ScoreLine; i: number; mode: "fill" | "pop" | "method"; rows: ScoreRow[]; back: "fill" | "pop" | null; pos: number; anchor: Element | null } | null = null;
  const acAria = () => {
    h.ta.setAttribute("aria-autocomplete", "list");
    h.ta.setAttribute("aria-controls", ac.id);
    h.ta.setAttribute("aria-expanded", String(!ac.hidden));
    if (!ac.hidden && acOn >= 0) h.ta.setAttribute("aria-activedescendant", `ac-${acOn}`);
    else h.ta.removeAttribute("aria-activedescendant");
  };
  const acClose = () => {
    if (ac.hidden && !acSpot && !acScore && !acBonus) return;
    ac.hidden = true;
    acScore = null;
    acBonus = null;
    acSpot = null;
    acKey = null;
    acRows = [];
    acOn = -1;
    acSays.textContent = "";
    acHint = null;
    acEmpty = false;
    acSwap = false;
    acMore = 0;
    acGearOther = 0;
    h.dock.classList.remove("ac-on");
    acAria();
  };
  /** The viewport box of the character at `pos`, from the highlight layer (its rows mirror the text, wrapping too). */
  const caretBox = (pos: number): DOMRect | null => {
    const before = h.ta.value.slice(0, pos);
    const t = h.hl.children[before.split("\n").length - 1]?.querySelector(".t");
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
    const from = acSpot?.start ?? acKey?.start ?? acBonus?.start ?? acScore?.pos;
    const at = acScore?.anchor?.isConnected ? acScore.anchor.getBoundingClientRect() : from === undefined ? null : caretBox(from);
    if (!at) return;
    const box = h.ed.getBoundingClientRect();
    // Below the line when the list fits in the window there (it may hang past the editor's edge), else on the
    // roomier side, cut to fit.
    const roomBelow = window.innerHeight - at.bottom - 4;
    const roomAbove = at.top - 4;
    ac.style.maxHeight = "";
    const full = ac.offsetHeight;
    const below = full <= roomBelow || roomBelow >= roomAbove;
    if (full > (below ? roomBelow : roomAbove)) ac.style.maxHeight = `${Math.max(0, Math.floor(below ? roomBelow : roomAbove))}px`;
    const lh = ac.offsetHeight;
    ac.style.top = `${Math.round((below ? at.bottom + 2 : at.top - 2 - lh) - box.top)}px`;
    ac.style.left = `${Math.round(Math.max(0, Math.min(at.left - box.left - 9, h.ed.clientWidth - ac.offsetWidth)))}px`;
  };
  const acDraw = () => {
    const onPhone = phone.matches;
    // Desktop: every group, the cursor's in bold. Phone: only the cursor's group and where it is (round 3: the full
    // line was cut and read as stale once a group was filled).
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    // D266: the slot title only where the brackets take two picks or more; one slot needs no title.
    // D304: a swap list says so, so it doesn't read as completion.
    // D351 review: Custom, first in a Background list, stands apart from the backgrounds by a rule under it.
    const sepAt = acSpot?.key === "Background" && acRows.length > 1 && acRows[0].name === "Custom" && !acRows[0].source ? 0 : -1;
    const half = getGearHalf();
    const gearHead = gearList()
      ? `<div class="ah acs agh">${acSwap ? `<span class="acst" aria-hidden="true">Swap for</span>` : ""}<span class="acg" role="group" aria-label="Which items">` +
        GEAR_HALVES.map(([k, label]) => `<button type="button" class="${k === half ? "on" : ""}" data-g="${k}" tabindex="-1" aria-pressed="${k === half}">${label}</button>`).join("") + `</span></div>`
      : "";
    const hint = gearHead ? gearHead : acBonus ? `<div class="ah" aria-hidden="true">${esc(bonusHead(acBonus))}</div>` : acSwap ? `<div class="ah" aria-hidden="true">Swap for</div>` : !acHint || acHint.slots.length < 2 ? "" : onPhone
      ? `<div class="ah" aria-hidden="true"><b>${esc(cap(acHint.slots[acHint.at]))}</b>${acHint.slots.length > 1 ? ` ${acHint.at + 1}/${acHint.slots.length}` : ""}</div>`
      : `<div class="ah" aria-hidden="true">${acHint.slots.map((x, i) => (i === acHint?.at ? `<b>${esc(x)}</b>` : esc(x))).join("; ")}</div>`;
    // D266: two quiet rows, since it mostly follows a typo; D270: a rule between them.
    ac.innerHTML = acScore ? scoreListHtml(onPhone) : (acEmpty ? `<div class="ae"><span>No matches</span><a href="/sources">${icon("plus")}Add sources</a></div>` : "") +
      hint + acRows.map((r, i) => `<div role="option" id="ac-${i}" class="ao${i === acOn ? " on" : ""}${r.dim ? " dim" : ""}${sepAt === i ? " sep" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
      `<span class="an">${esc(r.label ?? r.name)}</span>${r.plus ? `<span class="apl">${esc(r.plus)}</span>` : ""}${r.source ? `<span class="as">|${esc(r.source)}</span>` : ""}${r.book ? `<span class="abk">${esc(r.book)}</span>` : ""}` +
      `${r.tag ? `<span class="al">${esc(r.tag)}</span>` : ""}` +
      `${!onPhone && i === 0 && acOn < 0 ? `<kbd>Tab</kbd>` : ""}</div>`).join("") +
      // D306: a list past 60 says how many it leaves out; typing narrows it.
      (acMore > 0 ? `<div class="am" aria-hidden="true">${acMore} more · keep typing</div>` : "") +
      // D362: the half shown has no match, the other has some.
      (acGearOther > 0 ? `<div class="am" aria-hidden="true">None in ${half === "magic" ? "Magic" : "Mundane"} · ${acGearOther} in ${half === "magic" ? "Mundane" : "Magic"}</div>` : "");
    // Phone: the dock's last row, right on the keyboard (D157 amended).
    const home = onPhone ? h.dock : h.ed;
    if (ac.parentElement !== home) { if (onPhone) h.dock.append(ac); else h.ed.append(ac); }
    h.dock.classList.toggle("ac-on", onPhone);
    if (ac.hidden) {
      const what = acHint ? `${acHint.slots[acHint.at]}. ` : "";
      const kind = acKey ? "key" : acBonus ? "bonus" : "name";
      const items = gearList() ? `${half === "magic" ? "Magic" : "Mundane"} items. ` : "";
      acSays.textContent = acGearOther > 0 ? `${items}None match here, ${acGearOther} in ${half === "magic" ? "Mundane" : "Magic"}.` : items + (acScore ? scoreSays() : acEmpty ? "No matches. Add sources for more books." : acSwap ? `${acRows.length} to swap for. Click one, or keep typing.` : acRows.length ? `${what}${acRows.length === 1 ? `1 ${kind}` : `${acRows.length} ${kind}s`}${acMore > 0 ? `, ${acMore} more` : ""}${onPhone ? "" : ". Tab takes the first"}.` : what);
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
    if (!h.names) { if (typing) h.loadNames(); return; }
    if (!typing && ac.hidden) return;
    // The method list (D323) stays open while its arrows move: it is not a list for the caret's spot.
    if (!typing && acScore?.mode === "method") return;
    if (!h.suggestOn() || document.activeElement !== h.ta || h.ta.selectionStart !== h.ta.selectionEnd) { acClose(); return; }
    if (scoreFill()) return;
    if (bonusFill()) return;
    acBonus = null;
    // A key at the line's start (D170): the hint strip's keys, narrowed by what was typed.
    const ks = keySpotAt(h.ta.value, h.ta.selectionStart);
    const kk = ks ? suggestKeys(h.ta.value, ks) : [];
    if (ks && kk.length) {
      const rows = kk.slice(0, LIST_LIMIT).map((k): Suggestion => ({ name: `${k}:`, source: null }));
      const same = acKey?.start === ks.start && rows.length === acRows.length && rows.every((r, i) => r.name === acRows[i].name);
      if (!same) acOn = -1;
      acSpot = null;
      acKey = ks;
      acRows = rows;
      acMore = kk.length - rows.length;
      acGearOther = 0;
      acHint = null;
      acDraw();
      return;
    }
    acKey = null;
    const sp = spotAt(h.ta.value, h.ta.selectionStart);
    const got = sp ? suggestList(h.names, sp) : { rows: [], more: 0 };
    const rows = got.rows;
    // An empty `[ ]` group the table knows shows what goes there, even before a name fits (D163).
    const hint = sp ? slotHint(h.names, sp) : null;
    // D256: while no source is added, a name of 3+ letters that matches nothing keeps one line open, linking to /sources.
    // D303: a name already written in full is not "no matches": the list closes there.
    // D362: a Gear name that matches only in the other half says so, under the switch, rather than "no matches".
    let other = 0;
    if (sp && !rows.length && sp.key === "Gear" && sp.parent === null && sp.typed.trim()) {
      const was = getGearHalf();
      setGearHalf(was === "magic" ? "mundane" : "magic");
      const o = suggestList(h.names, sp);
      other = o.rows.length + o.more;
      setGearHalf(was);
    }
    const none = Boolean(sp && !rows.length && !other && !hint && sp.typed.replace(/\s/g, "").length >= 3 && !readSummary().n && !isKnown(h.names, sp));
    if (!sp || !(rows.length || (hint && !sp.typed.trim()) || none || other)) { acClose(); return; }
    acEmpty = none;
    acGearOther = other;
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
    acBonus = null;
    acKey = null;
    acSpot = null;
    acHint = null;
    acEmpty = false;
    acMore = 0;
    acGearOther = 0;
    acScore = next;
    acRows = next.mode === "method" ? METHODS.map((k) => ({ name: METHOD_NAMES[k], source: null }))
      : next.rows.map((r) => ({ name: scoreRowName(r), source: null }));
    if (!same) acOn = -1;
    acDraw();
  };
  /** D322: the caret at the end of a base line being filled: the next ability's numbers by the method. */
  const scoreFill = (): boolean => {
    const sl = scoreLineAt(h.ta.value, h.ta.selectionStart);
    const m = sl?.fill ? h.effMethod(sl) : null;
    if (!sl?.fill || !m) return false;
    const f = sl.fill;
    const rows = listRows(m, sl.values, f.i, true, f.typed);
    if (!rows.length) { acClose(); return true; }
    acSwap = false;
    showScore({ sl, i: f.i, mode: "fill", rows, back: null, pos: h.ta.selectionStart, anchor: null });
    return true;
  };
  /** D321: a click on a written score opens its options, mouse or tap only (any key closes it, as the swap list). */
  const scorePop = (): boolean => {
    const sl = scoreLineAt(h.ta.value, h.ta.selectionStart);
    if (!sl || sl.at === null) return false;
    if (!h.names) h.loadNames();
    const m = h.effMethod(sl) ?? "custom";
    acSwap = true;
    showScore({ sl, i: sl.at, mode: "pop", rows: listRows(m, sl.values, sl.at), back: null, pos: h.ta.selectionStart, anchor: null });
    return true;
  };
  /** D323, D324: the method list, from the line's chip; a pick steers the lists and the chip and writes nothing. */
  function openMethods(chip: Element) {
    if (acScore?.mode === "method" && !ac.hidden) { acClose(); return; }
    const sl = h.scoreChip;
    if (!sl) return;
    if (document.activeElement !== h.ta) h.ta.focus({ preventScroll: true });
    acSwap = false;
    showScore({ sl, i: -1, mode: "method", rows: [], back: null, pos: sl.end, anchor: chip });
  }
  const scoreKindNow = (sl: ScoreLine): ScoreKind => h.effMethod(sl) ?? "custom";
  /** The list's head: the final (`WIS 15 → 19 (+4)`, D321) or the ability being filled, and the method chip at its right. */
  const scoreListHtml = (onPhone: boolean): string => {
    const s = acScore!;
    const c = h.chipHtml(s.sl);
    const chip = `<button type="button" class="acm${c.clash ? " clash" : ""}" data-m tabindex="-1" aria-label="${esc(c.label)}">${c.html}</button>`;
    const fin = h.names && h.st.paste && s.mode !== "method" ? finalOf(h.st.paste, h.names)[s.i] : null;
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
      : now === "custom" ? s.rows.map((r, i) => stepperHtml(r, i, onPhone)).join("")
      : s.rows.map((r, i) => `<div role="option" id="ac-${i}" class="ao asr${i === acOn ? " on" : ""}${r.over ? " dim" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
        `<span class="an">${r.n}</span>` +
        (r.swap !== null ? `<span class="al">${icon("arrow-left-right")}${ABILITIES[r.swap]}</span>` : "") +
        (r.cost !== null ? `<span class="al">${r.cost} pt${r.cost === 1 ? "" : "s"}</span>` : "") +
        `${!onPhone && i === 0 && acOn < 0 && s.mode === "fill" ? `<kbd>Tab</kbd>` : ""}</div>`).join("");
    return head + rows + foot;
  };
  /** D360: a Custom score's stepper, one row: less, the number, more. Arrow keys step it; Tab or a click on the number
   *  writes it. */
  const stepperHtml = (r: ScoreRow, i: number, onPhone: boolean): string =>
    `<div role="option" id="ac-${i}" class="ao asr ast${i === acOn ? " on" : ""}" aria-selected="${i === acOn}" data-i="${i}">` +
    `<button type="button" class="asb" data-st="-1" tabindex="-1" aria-label="One less"${r.n <= 1 ? " disabled" : ""}>${icon("minus")}</button>` +
    `<span class="an">${r.n}</span>` +
    `<button type="button" class="asb" data-st="1" tabindex="-1" aria-label="One more"${r.n >= 30 ? " disabled" : ""}>${icon("plus")}</button>` +
    `${onPhone ? "" : `<span class="al">↑↓</span><kbd>Tab</kbd>`}</div>`;
  /** D360: the stepper's value moves by `by`; the row is then the one Enter takes. */
  const stepCustom = (by: number) => {
    const s = acScore;
    const r = s?.rows[0];
    if (!s || !r) return;
    s.rows = [{ ...r, n: stepScore(r.n, by) }];
    acRows = [{ name: String(s.rows[0].n), source: null }];
    acOn = 0;
    acDraw();
  };
  const isStepper = () => Boolean(acScore && acScore.mode !== "method" && scoreKindNow(acScore.sl) === "custom" && acScore.rows.length);
  const scoreSays = (): string => {
    const s = acScore!;
    if (s.mode === "method") return `Ability score method, ${METHOD_NAMES[scoreKindNow(s.sl)]}. Pick one.`;
    if (isStepper()) return `${ABILITIES[s.i]} ${s.rows[0].n}. Arrow keys change it, ${phone.matches ? "tap it to write it" : "Tab writes it"}.`;
    const n = s.rows.length;
    return `${ABILITIES[s.i]}: ${n ? `${n} number${n === 1 ? "" : "s"}.` : "no numbers to pick."}${s.mode === "fill" && !phone.matches ? " Tab takes the first." : ""}`;
  };
  /** A pick in a score list: the method (writes nothing), a clicked score's swap or number, or the next fill number. */
  const takeScore = (i: number) => {
    const s = acScore!;
    if (s.mode === "method") {
      const k = METHODS[i];
      if (!k) return;
      h.scoreMethod = k;
      // Review r1 (amends D323): a method written in parentheses follows the pick; with none, nothing is written.
      const now = scoreLineAt(h.ta.value, s.sl.start);
      if (now?.marker && now.marker !== k) {
        const colon = h.ta.value.indexOf(":", now.start);
        h.writeChange(h.ta.value.slice(0, now.start) + `Scores (${methodWords(k)})` + h.ta.value.slice(colon));
      }
      const sl = scoreLineAt(h.ta.value, s.sl.start) ?? s.sl;
      if (s.back === "pop") showScore({ ...s, sl, mode: "pop", back: null, rows: listRows(scoreKindNow(sl), sl.values, s.i), anchor: null });
      else if (s.back === "fill") { acClose(); complete(true); }
      else acClose();
      h.drawRows();
      h.changed();
      return;
    }
    const r = s.rows[i];
    if (!r) return;
    acClose();
    if (s.mode === "pop") {
      const next = pickScore(h.ta.value, s.sl, s.i, r);
      h.writeChange(next.text);
      h.ta.setSelectionRange(next.cursor, next.cursor);
      return;
    }
    const next = fillScore(h.ta.value, s.sl, r.n);
    // Review r1: the line is still being written (`STR 15/DEX `): hold its error, as typing does (D176).
    if (!next.done) h.hold(h.ta.value.slice(0, s.sl.start).split("\n").length);
    h.writeChange(next.text);
    h.ta.setSelectionRange(next.cursor, next.cursor);
    // D322, D307: the next ability's list at once; after CHA, on to the next open choice (D310).
    if (!next.done) complete(true);
    else toNextOpen(lineEnd(next.cursor) + 1);
  };
  /** D352: the list's head on a Background Scores line: what is left of the +3, and from which abilities. */
  const bonusHead = (b: BonusSpot): string => `+${3 - b.have} to add from ${b.abilities.length === 6 ? "any ability" : b.abilities.join(", ")}`;
  /** D352: the caret at the end of a Background block's Scores line: the bonuses still to pick there. */
  const bonusFill = (): boolean => {
    const b = bonusSpotAt(h.ta.value, h.ta.selectionStart);
    if (!b) return false;
    if (!b.rows.length) { acClose(); return true; }
    const same = acBonus?.start === b.start && acBonus.rows.length === b.rows.length && acBonus.rows.every((r, i) => r === b.rows[i]);
    acKey = null;
    acSpot = null;
    acScore = null;
    acHint = null;
    acEmpty = false;
    acSwap = false;
    acMore = 0;
    acBonus = b;
    acRows = b.rows.map((name) => ({ name, source: null }));
    if (!same) acOn = -1;
    acDraw();
    return true;
  };
  /** D352: a pick writes the bonus; with points left, `, ` and the list again (D307), else on to the next open choice (D310). */
  const takeBonus = (i: number) => {
    const b = acBonus!;
    const r = b.rows[i];
    if (!r) return;
    acClose();
    const more = b.have + Number(r[1]) < 3;
    h.insert(`${b.pad ? " " : ""}${r}${more ? ", " : ""}`, b.start, b.end);
    if (more) complete(true);
    else toNextOpen(lineEnd(h.ta.selectionStart) + 1);
  };
  /** D304: a click in or at the end of a written name lists what it can be swapped for. */
  const swapList = (): boolean => {
    const sw = h.names ? swapAt(h.ta.value, h.ta.selectionStart) : null;
    const got = sw && h.names ? alternativeList(h.names, sw, h.ta.value) : { rows: [], more: 0 };
    const rows = got.rows;
    if (!sw || !rows.length) return false;
    acBonus = null;
    acKey = null;
    acOn = -1;
    acSpot = sw;
    acRows = rows;
    acMore = got.more;
    acGearOther = 0;
    acHint = null;
    acEmpty = false;
    acSwap = true;
    acDraw();
    return true;
  };
  const acTake = (i: number) => {
    if (acScore) { takeScore(i); return; }
    if (acBonus) { takeBonus(i); return; }
    const sp = acSpot;
    const r = acRows[i];
    const ks = acKey;
    if (ks && r) {
      // D171: the key, then its value list at once (Feat (…): the cursor in the parentheses, for the slot's name).
      acClose();
      const w = writtenKey(r.name.slice(0, -1));
      h.insert(w.text, ks.start, ks.end);
      h.ta.setSelectionRange(ks.start + w.cursor, ks.start + w.cursor);
      h.refreshHints();
      complete(true);
      return;
    }
    if (!sp || !r) return;
    const swapping = acSwap;
    acClose();
    // Inside [ ], the next group or name starts at once (D163 review), unless a separator is already there.
    const nx = h.ta.value[sp.end];
    const sep = h.names && !swapping && nx !== ";" && nx !== "," ? afterPick(h.names, sp, r.name) : "";
    // Review (D229): the last pick in `[ ]` leaves no stray spaces inside the brackets: `[ Drow ]` → `[Drow]`.
    const [a, b] = sep || sp.parent === null ? [sp.start, sp.end] : bracketTrim(h.ta.value, sp.start, sp.end);
    // D242: a pick that asks a detail comes with its brackets, the cursor inside, and the list for its first group.
    const le = h.ta.value.indexOf("\n", sp.end);
    const br = Boolean(h.names) && opensDetails(h.names as Names, sp, r, h.ta.value.slice(sp.end, le < 0 ? undefined : le));
    const w = swapping ? swapWritten(sp, written(sp, r), h.ta.value) : written(sp, r);
    // T8.2 (D305): a class picked on the bare header of the build's next level, the last block, is a level-up: the
    // block gets its owed keys and Classes: goes up by one.
    const ls = h.ta.value.lastIndexOf("\n", sp.start - 1) + 1;
    const hm = /^L(\d+)\s*$/.exec(h.ta.value.slice(ls, sp.start));
    if (sp.key === "L" && !swapping && hm && !h.ta.value.slice(le < 0 ? h.ta.value.length : le).trim() && Number(hm[1]) === nextLevel(h.ta.value)) {
      const up = levelUp(h.ta.value.slice(0, ls), w);
      if (up) {
        h.writeChange(up.text);
        h.ta.setSelectionRange(up.cursor, up.cursor);
        complete(true);
        return;
      }
    }
    h.insert(w + (br ? " []" : "") + sep, a, b);
    // D351: a background picked (or swapped in) fits its block: the lines it asks for, none of the empty ones it doesn't.
    if (sp.key === "Background" && sp.parent === null) {
      const fitted = fitBackground(h.ta.value, a + w.length);
      if (fitted) { h.writeChange(fitted); h.ta.setSelectionRange(a + w.length, a + w.length); }
    }
    if (br) {
      h.ta.setSelectionRange(a + w.length + 2, a + w.length + 2);
      complete(true);
    } else if (sep) complete(true);
    else if (!swapping && sp.parent === null) {
      // D307: a pick at the end of a line that still owes picks writes `, ` and opens the list for the next one.
      const at = a + w.length;
      const end = h.ta.value.indexOf("\n", at);
      const line = h.ta.value.slice(0, at).split("\n").length;
      const g = h.st.ghosts.find((x) => !x.note && (x.line === line || x.also?.includes(line)));
      const rest = h.ta.value.slice(at, end < 0 ? undefined : end).trim();
      if (g && g.have < g.of && !rest) {
        h.insert(", ", at, end < 0 ? h.ta.value.length : end);
        complete(true);
      } else if (!rest && (g ? g.have >= g.of : onePick(h.ta.value.slice(h.ta.value.lastIndexOf("\n", at - 1) + 1, at)))) {
        // D310: the line is complete (its count met, or a one-pick key): on to the next open choice below.
        toNextOpen(lineEnd(at) + 1);
      }
    } else if (!swapping) {
      // D310: the last pick in `[ ]` completes it: on to the next open choice, when nothing follows the brackets.
      const at = a + w.length;
      if (/^\s*\]\s*$/.test(h.ta.value.slice(at, lineEnd(at)))) toNextOpen(lineEnd(at) + 1);
    }
  };
  /** D310: the caret goes to the next open choice from `from` down, its list open; it stays when there is none. */
  const toNextOpen = (from: number) => {
    const at = from <= h.ta.value.length ? nextOpen(h.ta.value, from) : null;
    if (at === null) return;
    h.ta.setSelectionRange(at, at);
    complete(true);
  };
  const lineEnd = (at: number) => { const e = h.ta.value.indexOf("\n", at); return e < 0 ? h.ta.value.length : e; };
  /** D310: a key that takes one pick (`Subclass`, `Background`, `Rules`, each `Feat` line), from the line up to the pick. */
  const onePick = (line: string) => {
    const k = /^\s*([^:]+):/.exec(line)?.[1];
    const d = k ? resolveKey(k).def : null;
    return Boolean(d && (d.type === "item" || d.type === "items¹" || d.type === "enum" || d.key === "Feat"));
  };
  const keydown = (e: KeyboardEvent) => {
    if (acSwap && !ac.hidden && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) acClose();
    // D297: Tab on a Species line's ghost text, when the list has no row to take (form.ts).
    if ((ac.hidden || !acRows.length) && h.tabGhost(e)) return;
    if (ac.hidden || e.isComposing || !acRows.length) {
      if (e.key === "Escape" && !ac.hidden) { e.preventDefault(); acClose(); }
      return;
    }
    const plain = !e.altKey && !e.ctrlKey && !e.metaKey;
    if (isStepper() && (e.key === "ArrowDown" || e.key === "ArrowUp") && plain) {
      // D360: on a Custom score the arrows change the number (Shift: by 5), Enter or Tab writes it.
      e.preventDefault();
      stepCustom((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1));
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && plain && !e.shiftKey) {
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
  };
  ac.addEventListener("click", (e) => {
    // D321: the list's corner chip turns it into the method list; a pick there comes back to the same list.
    if ((e.target as Element).closest("[data-back]") && acScore?.back) {
      const s = acScore;
      const sl = scoreLineAt(h.ta.value, s.sl.start) ?? s.sl;
      if (s.back === "fill") { acClose(); complete(true); } else showScore({ ...s, sl, mode: "pop", back: null, rows: listRows(scoreKindNow(sl), sl.values, s.i), anchor: null });
      return;
    }
    if ((e.target as Element).closest("[data-m]") && acScore && acScore.mode !== "method") {
      showScore({ ...acScore, mode: "method", back: acScore.mode, anchor: null });
      return;
    }
    // D360: the stepper's less and more.
    const st = (e.target as Element).closest<HTMLElement>("[data-st]");
    if (st) { stepCustom(Number(st.dataset.st)); return; }
    // D362: the Gear list's switch; the same list again, in the other half, remembered for this visitor.
    const g = (e.target as Element).closest<HTMLElement>("[data-g]");
    if (g) {
      const half = g.dataset.g === "magic" ? "magic" : "mundane";
      gear.set(half);
      setGearHalf(half);
      if (acSwap) { if (!swapList()) acClose(); } else complete(true);
      if (!ac.hidden) acSays.textContent = `${half === "magic" ? "Magic" : "Mundane"} items, ${acRows.length}${acMore > 0 ? `, ${acMore} more` : ""}.`;
      return;
    }
    const o = (e.target as Element).closest<HTMLElement>("[data-i]");
    if (o) acTake(Number(o.dataset.i));
  });
  acAria();
  phone.addEventListener("change", acClose);
  window.addEventListener("resize", () => { if (!ac.hidden && !phone.matches) acPlace(); });
  return {
    complete,
    close: acClose,
    openMethods,
    namesArrived: () => { if (acScore && acScore.mode !== "fill" && !ac.hidden) acDraw(); else complete(true); },
    keydown,
    openLine: () => (ac.hidden ? 0 : h.ta.value.slice(0, h.ta.selectionStart).split("\n").length),
    // D229, D302: a key release updates or closes the list; a release in the list itself does nothing.
    keyup: (e) => { if (!ac.contains(e.target as Node)) complete(false); },
    click: (e) => {
      // A click in the list, even on a row its redraw just took out (the corner chip, a method pick, D321).
      if (ac.contains(e.target as Node) || !(e.target as Node).isConnected) return;
      const here = e.target === h.ta && h.ta.selectionStart === h.ta.selectionEnd;
      if (here && h.suggestOn() && scorePop()) return;
      if (here && h.names && h.suggestOn() && !opensOnClick(h.ta.value, h.ta.selectionStart) && swapList()) return;
      complete(here && (opensOnClick(h.ta.value, h.ta.selectionStart) || Boolean(scoreLineAt(h.ta.value, h.ta.selectionStart)?.fill) || Boolean(bonusSpotAt(h.ta.value, h.ta.selectionStart))));
    },
  };
}

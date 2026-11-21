/**
 * "Start a build" on the empty paste form (D121–D124): rules edition, then classes as rows in the order taken, each
 * with its levels (a class may come back, 20 levels in all). A class not on the list goes in as "Other class" with a
 * typed name: it sets the levels and lays out nothing for that class. "Start the build" fills the editor once with the
 * preset (src/preset.ts); the form hides the builder as soon as the editor has text. Native selects, so the pickers
 * stay inside the viewport on every device (D89 b).
 */
import { esc, icon } from "../render.ts";
import { CLASS_NAMES, MAX_LEVEL, OTHER_NAME, presetText, totalLevels } from "../preset.ts";
import type { Edition, Row } from "../preset.ts";
import type { ScoreKind } from "../../../src/dndpaste.ts";

/** D322: how the build's ability scores are made, or Skip (the Scores line stays empty, as before). */
export type ScoreChoice = ScoreKind | "skip";
const SCORE_CHOICES: readonly [ScoreChoice, string][] = [["standard-array", "Standard array"], ["point-buy", "Point buy"], ["custom", "Custom"], ["skip", "Skip"]];
/** The last choice made on this browser (D322); the first time, Skip. */
const SCORES_KEY = "dndpaste.start.scores";
export const scoreChoiceStore = (get: () => Storage = () => localStorage) => ({
  read(): ScoreChoice {
    try { const v = get().getItem(SCORES_KEY); return SCORE_CHOICES.some(([k]) => k === v) ? v as ScoreChoice : "skip"; } catch { return "skip"; }
  },
  write(v: ScoreChoice): void { try { get().setItem(SCORES_KEY, v); } catch { /* storage blocked: the choice lasts this visit */ } },
});

/** One row as the builder holds it: a listed class, "other" with a typed name, or "" (not picked yet). */
export interface StarterRow { cls: string; name: string; levels: number }
const OTHER = "other";

/** The rows the preset reads: an "Other class" row gives its typed name. */
export function presetRows(rows: readonly StarterRow[]): Row[] {
  return rows.map((r) => ({ cls: r.cls === OTHER ? r.name.trim() : r.cls, levels: r.levels }));
}
const nameOk = (r: StarterRow) => r.cls !== OTHER || OTHER_NAME.test(r.name.trim());
/** Start is on once a row names a class and no "Other class" name is unusable. */
export const startReady = (rows: readonly StarterRow[]): boolean =>
  rows.every(nameOk) && rows.some((r) => r.cls && (r.cls !== OTHER || r.name.trim()));

/** The builder's HTML for one state; pure, so the tests can read it. */
export function starterHtml(edition: Edition, rows: readonly StarterRow[], scores: ScoreChoice = "skip"): string {
  const total = totalLevels(rows);
  const seg = (["2024", "2014"] as const).map((e) =>
    `<button type="button" role="radio" aria-checked="${e === edition}" tabindex="${e === edition ? 0 : -1}" class="${e === edition ? "on" : ""}" data-ed="${e}">${e}</button>`).join("");
  const many = rows.length > 1;
  const list = rows.map((r, i) => {
    const room = MAX_LEVEL - (total - r.levels);
    const label = many ? ` ${i + 1}` : "";
    const cls = `<option value=""${r.cls ? "" : " selected"} disabled>Choose a class</option>` +
      CLASS_NAMES.map((c) => `<option${c === r.cls ? " selected" : ""}>${esc(c)}</option>`).join("") +
      `<option value="${OTHER}"${r.cls === OTHER ? " selected" : ""}>Other class</option>`;
    const lv = Array.from({ length: Math.max(room, 1) }, (_, j) => j + 1)
      .map((n) => `<option value="${n}"${n === r.levels ? " selected" : ""}>${n} level${n === 1 ? "" : "s"}</option>`).join("");
    const name = r.cls === OTHER
      ? `<input class="in sbname" data-f="name" type="text" maxlength="53" autocomplete="off" spellcheck="false" placeholder="Class name, as in your book" ` +
        `aria-label="Class name${label}" aria-describedby="sbh${i}" aria-invalid="${!nameOk(r) && r.name.trim() !== ""}" value="${esc(r.name)}">` +
        `<small class="muted sbhint" id="sbh${i}">Only its levels are laid out. Use letters, digits, spaces, ' or -.</small>`
      : "";
    return `<li class="sbrow" data-i="${i}"><span class="sel grow"><select class="in" data-f="cls" aria-label="Class${label}">${cls}</select>${icon("chevron-down")}</span>` +
      `<span class="sel lv"><select class="in" data-f="lv" aria-label="Levels${label ? ` in class${label}` : ""}">${lv}</select>${icon("chevron-down")}</span>` +
      (many ? `<button type="button" class="bt ghost icon sbdel" aria-label="Remove class${label}">${icon("x")}</button>` : "") + name + `</li>`;
  }).join("");
  return `<div class="sbhead"><span class="sbt" id="sbt">Start a build</span>` +
    `<span class="sbrules"><span class="muted" id="sbr">Rules</span><span class="seg" role="radiogroup" aria-labelledby="sbr">${seg}</span></span></div>` +
    // D322: one row, a select that starts on the last choice; no score cells (D312). Review: above the classes.
    `<div class="sbscores"><label class="muted" for="sbsc">Ability scores</label><span class="sel"><select class="in" id="sbsc" data-f="scores">` +
    SCORE_CHOICES.map(([k, label]) => `<option value="${k}"${k === scores ? " selected" : ""}>${label}</option>`).join("") +
    `</select>${icon("chevron-down")}</span></div>` +
    `<ol class="sbrows">${list}</ol>` +
    `<div class="sbfoot"><button type="button" class="bt ghost sbadd"${total >= MAX_LEVEL ? " disabled" : ""}>${icon("plus")}Add a class</button>` +
    `<span class="muted sbtot">Level ${total}</span></div>` +
    `<div class="sbgo"><button type="button" class="bt sbmake"${startReady(rows) ? "" : " disabled"}>${icon("pencil")}Start the build</button>` +
    `<span class="muted">or type, paste or open a file. See the <a href="/guide">format guide</a>.</span></div>`;
}

/** Mounts the builder in `box`; `fill` gets the laid-out text and the score method (null for Skip). */
export function mountStarter(box: HTMLElement, fill: (text: string, method: ScoreKind | null) => void): void {
  let edition: Edition = "2024";
  const store = scoreChoiceStore();
  let scores = store.read();
  const rows: StarterRow[] = [{ cls: "", name: "", levels: 1 }];
  box.setAttribute("role", "group");
  box.setAttribute("aria-labelledby", "sbt");
  const draw = (focus?: string) => {
    box.innerHTML = starterHtml(edition, rows, scores);
    if (focus) box.querySelector<HTMLElement>(focus)?.focus();
  };
  draw();
  const rowOf = (e: Event) => Number((e.target as Element).closest<HTMLElement>(".sbrow")?.dataset.i);
  box.addEventListener("change", (e) => {
    const sel = e.target as HTMLSelectElement;
    if (sel.dataset.f === "scores") { scores = sel.value as ScoreChoice; store.write(scores); return; }
    const r = rows[rowOf(e)];
    if (!r || sel.tagName !== "SELECT") return;
    if (sel.dataset.f === "cls") r.cls = sel.value;
    else r.levels = Number(sel.value);
    const i = rowOf(e);
    draw(sel.dataset.f === "cls" && r.cls === OTHER ? `.sbrow[data-i="${i}"] .sbname` : `.sbrow[data-i="${i}"] select[data-f="${sel.dataset.f}"]`);
  });
  // Typing a class name redraws nothing (the caret stays); only its check and the Start button follow it.
  box.addEventListener("input", (e) => {
    const inp = e.target as HTMLInputElement;
    const r = rows[rowOf(e)];
    if (!r || inp.dataset.f !== "name") return;
    r.name = inp.value;
    inp.setAttribute("aria-invalid", String(!nameOk(r) && r.name.trim() !== ""));
    const make = box.querySelector<HTMLButtonElement>(".sbmake");
    if (make) make.disabled = !startReady(rows);
  });
  box.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!t || t.disabled) return;
    if (t.dataset.ed) {
      edition = t.dataset.ed as Edition;
      draw(`.seg [data-ed="${edition}"]`);
    } else if (t.classList.contains("sbadd")) {
      rows.push({ cls: "", name: "", levels: 1 });
      draw(`.sbrow[data-i="${rows.length - 1}"] select[data-f="cls"]`);
    } else if (t.classList.contains("sbdel")) {
      const i = rowOf(e);
      rows.splice(i, 1);
      draw(rows.length > 1 ? `.sbrow[data-i="${Math.min(i, rows.length - 1)}"] .sbdel` : `.sbrow select[data-f="cls"]`);
    } else if (t.classList.contains("sbmake") && startReady(rows)) {
      const text = presetText(edition, presetRows(rows));
      if (text) fill(text, scores === "skip" ? null : scores);
    }
  });
  // Arrow keys move between the two rules buttons, as in a radio group.
  box.addEventListener("keydown", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("[data-ed]");
    if (!t || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    edition = edition === "2024" ? "2014" : "2024";
    draw(`.seg [data-ed="${edition}"]`);
  });
}

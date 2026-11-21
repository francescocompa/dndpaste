/**
 * The shared renderer: a parsed paste (AST) → escaped HTML in the Hanging keys layout (D81).
 * One module for the Worker (server-rendered view) and the browser (the editor's highlight layer, slice 2):
 * pure string building, no DOM, no Node or Workers APIs.
 *
 * Every user value passes through `esc`. Names are plain text, never links (D67); nothing is added that the
 * paste does not say (no descriptions, stat lines or icons for entities).
 *
 * Span classes (shared with the editor): k key · xk extension key · p punctuation · r reference name · s |SOURCE
 * · n number · e enum · q quantity · x drop minus · drop dropped item · d detail · ab ability · ab-<str…cha>
 * · kd-<kind> (colour by kind, D82).
 */
import { ABILITIES, keyDef, methodWords, POINT_BUY_BUDGET, scoreKind, splitMarker } from "../../src/dndpaste.ts";
import type { Ability, EntityBlock, Item, LevelBlock, Paste, Ref, ScoreKind, Scope, Value } from "../../src/dndpaste.ts";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML text and double- or single-quoted attribute values. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

export type Kind = "class" | "subclass" | "species" | "background" | "feat" | "spell" | "item";

/** Which kind colours a key's names (D82; the mapping from the jam). Keys not listed take no kind colour. */
export const KIND_OF_KEY: Readonly<Record<string, Kind>> = {
  Classes: "class", Options: "class", Feature: "class", "Fighting Style": "class",
  Invocations: "class", Metamagic: "class", Maneuvers: "class", Infusions: "class", "Arcane Shots": "class", Runes: "class",
  Disciplines: "class", "Pact Boon": "class",
  Subclass: "subclass", Species: "species", Background: "background", Feat: "feat",
  Cantrips: "spell", Spells: "spell", Prepared: "spell", Gear: "item", Equipment: "item", Items: "item",
};

/** A scope key's kind: a marked or capped line takes its key's (`Feat (Origin)`, `Options (…)`, `Spells (3rd)`; D110, D181, D184). */
export function kindOfKey(key: string): Kind | undefined {
  return KIND_OF_KEY[keyDef(key)?.key ?? key];
}

const P = (t: string): string => `<span class="p">${esc(t)}</span>`;
const isAbility = (name: string): name is Ability => (ABILITIES as readonly string[]).includes(name);
const ab = (a: Ability): string => `<span class="ab ab-${a.toLowerCase()}">${a}</span>`;

/** The emitter's quoting rule (SPEC §3.2): names with , ; : [ ] " or a leading - are written in quotes. */
export function needsQuotes(name: string): boolean {
  return /[,;:[\]"]/.test(name) || name.startsWith("-");
}

export function renderRef(ref: Ref, kind?: Kind): string {
  if (!ref.source && isAbility(ref.name)) return ab(ref.name);
  const cls = kind ? `r kd-${kind}` : "r";
  const name = `<span class="${cls}">${esc(ref.name)}</span>`;
  const quoted = needsQuotes(ref.name) ? P('"') + name + P('"') : name;
  return quoted + (ref.source ? `<span class="s">|${esc(ref.source)}</span>` : "");
}

export function renderItem(it: Item, kind?: Kind): string {
  let h = it.drop ? `<span class="x">-</span>` : "";
  h += renderRef(it.ref, kind);
  if (it.details.length) {
    const groups = it.details.map((g) =>
      g.map((d) => `<span class="d">${renderRef(d.ref)}</span>` + (d.at !== null ? ` <span class="n">@${d.at}</span>` : "")).join(P(", ")));
    h += " " + P("[") + groups.join(P("; ")) + P("]");
  }
  if (it.qty !== null) h += ` <span class="q">x${it.qty}</span>`;
  return it.drop ? `<span class="drop">${h}</span>` : h;
}

/** One key's value as written. Its text content equals the emitter's `emitValue`, except `Classes`, which keeps its runs. */
export function renderValue(key: string, v: Value): string {
  const kind = kindOfKey(key);
  switch (v.type) {
    case "items": return v.items.map((it) => renderItem(it, kind)).join(P(", "));
    case "enum": return `<span class="e">${esc(v.value)}</span>`;
    case "int": return `<span class="n">${v.value}</span>`;
    case "text": return esc(v.value);
    case "classes": return v.entries
      .map((e) => renderRef(e.ref, "class") + (e.levels === null ? "" : ` <span class="n">${e.levels}</span>`))
      .join(" " + P("/") + " ");
    case "scores": {
      // SPEC 0.8 (D108): one line is a base or an increase; a value holding both shows its base (`lineEntries` splits it).
      if (v.values.every((x) => x === null)) return (v.increase ?? []).map((b) => `<span class="n">+${b.amount}</span> ${ab(b.ability)}`).join(P(", "));
      // SPEC 0.11 (D320): a base is named and `/`-separated, full or partial.
      return ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [`${ab(a)} <span class="n ab-${a.toLowerCase()}">${v.values[i]}</span>`]))
        .join(P("/"));
    }
    case "hp": return v.roll !== null ? `<span class="n">${v.roll}</span>` : `<span class="e">${esc(v.method)}</span>`;
    case "empty": return "";
  }
}

/** A key, with a marker shown apart from the key's name: `Feat (Fighting Style)`, `Spells (3rd)` (D110, D181, D184). */
export function keyHtml(key: string): string {
  const x = key.startsWith("X-");
  const m = !key.startsWith("X-") && splitMarker(key).marker !== null ? /^(.*?)(\s*)\((.*)\)$/.exec(key) : null;
  const body = m ? `${esc(m[1])}${m[2]}<span class="km">(${esc(m[3])})</span>` : esc(key);
  return `<span class="k${x ? " xk" : ""}">${body}</span>`;
}
function renderKey(key: string): string {
  return keyHtml(key) + P(":");
}
/** The method chip's dry words (D324): `Std. Array`, `Point Buy 2/27` (points left of 27), `Custom`. */
export const KIND_WORDS: Readonly<Record<ScoreKind, string>> = { "standard-array": "Std. Array", "point-buy": "Point Buy", custom: "Custom" };
export interface ScoreMark {
  /** The method the mark names: the marker's when written (D323), else the draft's pick, else the numbers' (D326). */
  kind: ScoreKind;
  /** The chip's words. */
  words: string;
  /** The method came from a written marker. */
  marked: boolean;
  /** A marker the numbers break: `(point buy)` over scores that cost more than 27, `(standard array)` over others (D323). */
  clash: boolean;
}
/**
 * What the method chip (D324), the popover's corner chip (D321) and the view's mark (D325) say for a base `Scores`
 * value: a hint, never a check (D66). `pick`, the method chosen in the editor for this draft, which writes nothing (D323).
 */
export function scoreMark(v: Extract<Value, { type: "scores" }>, pick: ScoreKind | null = null): ScoreMark {
  const read = scoreKind(v.values);
  const kind = v.method ?? pick ?? read.kind;
  const clash = !!v.method && (kind === "standard-array" ? read.kind !== "standard-array" : kind === "point-buy" ? read.left === null : false);
  const left = kind === "point-buy" && read.left !== null ? ` ${read.left}/${POINT_BUY_BUDGET}` : "";
  return { kind, words: KIND_WORDS[kind] + left, marked: !!v.method, clash };
}
/** The key a line is written under: a base `Scores` line with its method marker, `Scores (point buy)` (D323). */
export function lineKey(key: string, v: Value): string {
  return v.type === "scores" && v.method ? `${key} (${methodWords(v.method)})` : key;
}
/** D325: the view's and print's mark after a base `Scores` row, the chip's words as plain small text. */
function markHtml(v: Value): string {
  if (v.type !== "scores" || !v.values.some((x) => x !== null)) return "";
  const m = scoreMark(v);
  return ` <span class="smk${m.clash ? " clash" : ""}">${esc(m.words)}</span>`;
}
const row = (k: string, v: string, kc = "", vc = ""): string =>
  `<span class="hk${kc ? " " + kc : ""}">${k}</span><span class="hv${vc ? " " + vc : ""}">${v}</span>`;
const NONE = (): (number | null)[] => ABILITIES.map(() => null);
/**
 * A scope's key lines in the order written (the AST's insertion order), never re-sorted: the view shows the paste
 * as it reads. A `Scores` value that holds a base and an increase (D108) is two lines, the base first, as written.
 */
export function lineEntries(scope: Scope): [string, Value][] {
  return [...scope].flatMap(([k, v]): [string, Value][] =>
    v.type === "scores" && v.increase && v.values.some((x) => x !== null)
      ? [[k, { ...v, increase: null }], [k, { type: "scores", values: NONE(), increase: v.increase }]]
      : [[k, v]]);
}
/** D216 (T25): a line with nothing after its key (a preset's "not chosen yet" line). The view leaves it out; Raw and
 *  Edit keep it. */
export function isEmptyValue(v: Value): boolean {
  switch (v.type) {
    case "empty": return true;
    case "items": return v.items.length === 0;
    case "classes": return v.entries.length === 0;
    case "scores": return !v.increase && v.values.every((x) => x === null);
    case "text": return v.value === "";
    default: return false;
  }
}
const filled = (scope: Scope): [string, Value][] => lineEntries(scope).filter(([, v]) => !isEmptyValue(v));
const rows = (scope: Scope, vc = ""): string =>
  filled(scope).map(([k, v]) => row(renderKey(lineKey(k, v)), renderValue(k, v) + markHtml(v), "", vc)).join("");

export interface RenderOptions {
  /** URL of the SVG sprite (D89: icons, never text glyphs). */
  sprite?: string;
}

export function icon(name: string, sprite = "/assets/icons.svg"): string {
  return `<svg class="i i-${name}" aria-hidden="true" focusable="false"><use href="${esc(sprite)}#${name}"></use></svg>`;
}

function renderEntity(b: EntityBlock): string {
  if (!b.item && !filled(b.lines).length) return "";   // D216: an empty Species or Background block
  return `<div class="bl ent">${row(renderKey(b.key), (b.item ? renderItem(b.item, KIND_OF_KEY[b.key]) : ""), "", "ehv")}${rows(b.lines, "grp")}</div>`;
}

function renderLevel(b: LevelBlock, o: RenderOptions): string {
  const head = (marker: string) => row(`L${b.n}`, renderRef(b.class, "class") + marker, "lvk", "lvv");
  const n = filled(b.lines).length;
  if (!n) return `<div class="bl lvb">${head("")}</div>`;
  const marker = `<span class="mk">${icon("chevron-down", o.sprite)}${icon("chevron-right", o.sprite)}` +
    `<span class="cnt">${n} line${n === 1 ? "" : "s"}</span></span>`;
  // <details> folds without JavaScript; slice 3 adds fold all / expand all on top.
  return `<details class="lvb" open><summary class="bl">${head(marker)}</summary><div class="bl">${rows(b.lines, "grp")}</div></details>`;
}

/** The whole build. Blocks follow the AST: identifier and header, then Species/Background blocks, then level blocks. */
export function renderPaste(paste: Paste, o: RenderOptions = {}): string {
  let head = paste.identifier ? row("", esc(paste.identifier), "", "idv") : "";
  head += rows(paste.header);
  const parts = head ? [`<div class="bl">${head}</div>`] : [];
  for (const e of paste.entities) { const h = renderEntity(e); if (h) parts.push(h); }
  for (const l of paste.levels) parts.push(renderLevel(l, o));
  return `<div class="build">${parts.join("")}</div>`;
}

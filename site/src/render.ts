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
import { ABILITIES } from "../../src/dndpaste.ts";
import type { Ability, EntityBlock, Item, LevelBlock, Paste, Ref, Scope, Value } from "../../src/dndpaste.ts";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML text and double- or single-quoted attribute values. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

export type Kind = "class" | "subclass" | "species" | "background" | "feat" | "spell" | "item";

/** Which kind colours a key's names (D82; the mapping from the jam). Keys not listed take no kind colour. */
export const KIND_OF_KEY: Readonly<Record<string, Kind>> = {
  Classes: "class", Options: "class", Feature: "class", "Fighting Style": "class",
  Subclass: "subclass", Species: "species", Background: "background", Feat: "feat",
  Cantrips: "spell", Spells: "spell", Prepared: "spell", Equipment: "item", Items: "item",
};

const P = (t: string): string => `<span class="p">${esc(t)}</span>`;
const isAbility = (name: string): name is Ability => (ABILITIES as readonly string[]).includes(name);
const ab = (a: Ability): string => `<span class="ab ab-${a.toLowerCase()}">${a}</span>`;

/** The emitter's quoting rule (SPEC §3.2): names with , ; : [ ] " or a leading - are written in quotes. */
function needsQuotes(name: string): boolean {
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
  const kind = KIND_OF_KEY[key];
  switch (v.type) {
    case "items": return v.items.map((it) => renderItem(it, kind)).join(P(", "));
    case "enum": return `<span class="e">${esc(v.value)}</span>`;
    case "int": return `<span class="n">${v.value}</span>`;
    case "text": return esc(v.value);
    case "classes": return v.entries
      .map((e) => renderRef(e.ref, "class") + (e.levels === null ? "" : ` <span class="n">${e.levels}</span>`))
      .join(" " + P("/") + " ");
    case "scores": {
      const all = v.values.every((x) => x !== null);
      if (all) return v.values.map((x, i) => `<span class="n ab-${ABILITIES[i].toLowerCase()}">${x}</span>`).join(P("/"));
      return ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [`${ab(a)} <span class="n ab-${a.toLowerCase()}">${v.values[i]}</span>`]))
        .join(P(", "));
    }
    case "asi": return v.bonuses.map((b) => `<span class="n">+${b.amount}</span> ${ab(b.ability)}`).join(P(", "));
    case "hp": return v.roll !== null ? `<span class="n">${v.roll}</span>` : `<span class="e">${esc(v.method)}</span>`;
  }
}

function renderKey(key: string): string {
  const x = key.startsWith("X-");
  return `<span class="k${x ? " xk" : ""}">${esc(key)}</span>${P(":")}`;
}
const row = (k: string, v: string, kc = "", vc = ""): string =>
  `<span class="hk${kc ? " " + kc : ""}">${k}</span><span class="hv${vc ? " " + vc : ""}">${v}</span>`;
/** Key lines in the order written (the AST's insertion order), never re-sorted: the view shows the paste as it reads. */
const rows = (scope: Scope, vc = ""): string => [...scope].map(([k, v]) => row(renderKey(k), renderValue(k, v), "", vc)).join("");

export interface RenderOptions {
  /** URL of the SVG sprite (D89: icons, never text glyphs). */
  sprite?: string;
}

export function icon(name: string, sprite = "/assets/icons.svg"): string {
  return `<svg class="i i-${name}" aria-hidden="true" focusable="false"><use href="${esc(sprite)}#${name}"></use></svg>`;
}

function renderEntity(b: EntityBlock): string {
  return `<div class="bl ent">${row(renderKey(b.key), renderItem(b.item, KIND_OF_KEY[b.key]), "", "ehv")}${rows(b.lines, "grp")}</div>`;
}

function renderLevel(b: LevelBlock, o: RenderOptions): string {
  const head = (marker: string) => row(`L${b.n}`, renderRef(b.class, "class") + marker, "lvk", "lvv");
  if (!b.lines.size) return `<div class="bl lvb">${head("")}</div>`;
  const n = b.lines.size;
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
  for (const e of paste.entities) parts.push(renderEntity(e));
  for (const l of paste.levels) parts.push(renderLevel(l, o));
  return `<div class="build">${parts.join("")}</div>`;
}

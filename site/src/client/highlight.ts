/**
 * The editor's highlight layer: the paste's source text, line by line, as escaped HTML with the renderer's span
 * classes (render.ts: k xk p r s n e q x drop d ab ab-* kd-*), so the editor colours a build the way the view does.
 *
 * Unlike the renderer, this works on the text as written, not on the AST: the layer sits under a transparent
 * textarea, so every character of a line must come back exactly once, in place (whitespace, typos and all). The
 * line scanner follows `parse` (SPEC §3, §5): separators, level headers, the identifier line, the value types per
 * key. For a line already in canonical form, the value's markup equals `renderValue`'s (test/form.test.ts).
 */
import { ABILITIES, keyDef, isExtensionKey } from "../../../src/dndpaste.ts";
import type { Ability, Diagnostic, ValueType } from "../../../src/dndpaste.ts";
import { esc, KIND_OF_KEY } from "../render.ts";
import type { Kind } from "../render.ts";

/** The parser's level header (`L<n> <Class>`), on the trimmed line. */
export const LEVEL_RE = /^L([1-9]\d*)\s+(.+)$/i;

/** The parser's key separator: the first `:` on the trimmed line, followed by a space or ending it; -1 if none. */
export function findSeparator(line: string): number {
  const i = line.indexOf(":");
  if (i < 0) return -1;
  return i === line.length - 1 || line[i + 1] === " " ? i : -1;
}

const P = (t: string): string => `<span class="p">${esc(t)}</span>`;
const abilityOf = (s: string): Ability | null => {
  const u = s.toUpperCase();
  return (ABILITIES as readonly string[]).includes(u) ? (u as Ability) : null;
};
const ab = (text: string, a: Ability): string => `<span class="ab ab-${a.toLowerCase()}">${esc(text)}</span>`;
/** Leading whitespace, body, trailing whitespace. */
function pad(s: string): [string, string, string] {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s) as RegExpExecArray;
  return [m[1], m[2], m[3]];
}

/**
 * Splits `s` on `sep` at bracket depth 0 and outside quotes, as `parse` does, keeping every character: the result
 * alternates pieces and separators, each separator holding the whitespace that follows it (the renderer's `, `).
 */
function splitKeep(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0, quoted = false, cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === "[") depth++;
    else if (!quoted && ch === "]") depth = Math.max(0, depth - 1);
    else if (!quoted && depth === 0 && ch === sep) {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      out.push(cur, s.slice(i, j));
      cur = "";
      i = j - 1;
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
const joinKeep = (parts: string[], each: (piece: string) => string): string =>
  parts.map((p, i) => (i % 2 ? P(p) : each(p))).join("");

/** `Name[|SOURCE]`, possibly quoted. An unsourced ability name is an ability (as in `renderRef`). */
function tokRef(raw: string, kind?: Kind): string {
  const [lead, s, trail] = pad(raw);
  if (!s) return lead + trail;
  const cls = kind ? `r kd-${kind}` : "r";
  const rest = (r: string): string => {
    if (!r) return "";
    const m = /^(\s*)(\|[\s\S]*)$/.exec(r);
    return m ? `${m[1]}<span class="s">${esc(m[2])}</span>` : esc(r);
  };
  let h: string;
  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end < 0) h = P('"') + `<span class="${cls}">${esc(s.slice(1))}</span>`;
    else h = P('"') + `<span class="${cls}">${esc(s.slice(1, end))}</span>` + P('"') + rest(s.slice(end + 1));
  } else {
    const bar = s.indexOf("|");
    const [, name, gap] = pad(bar < 0 ? s : s.slice(0, bar));
    const a = bar < 0 ? abilityOf(name) : null;
    h = (a ? ab(name, a) : `<span class="${cls}">${esc(name)}</span>`) + gap + rest(bar < 0 ? "" : s.slice(bar));
  }
  return lead + h + trail;
}

/** One detail: `Name[|SRC] [@n]`. */
function tokDetail(raw: string): string {
  const [lead, s, trail] = pad(raw);
  if (!s) return lead + trail;
  const m = /^([\s\S]*?)(\s+)(@\d+)$/.exec(s);
  const ref = m ? m[1] : s;
  return lead + `<span class="d">${tokRef(ref)}</span>` + (m ? `${m[2]}<span class="n">${m[3]}</span>` : "") + trail;
}

/** One item: `[-]Name[|SRC] [[details; …]] [xN]`. */
function tokItem(raw: string, kind?: Kind): string {
  const [lead, body, trail] = pad(raw);
  if (!body) return lead + trail;
  let s = body;
  let drop = "";
  const dm = /^-(\s*)/.exec(s);
  if (dm && !/^-\d/.test(s)) { drop = `<span class="x">-</span>${dm[1]}`; s = s.slice(dm[0].length); }
  let qty = "";
  const q = /(\s+)(x\d+)$/.exec(s);
  if (q) { qty = `${q[1]}<span class="q">${q[2]}</span>`; s = s.slice(0, q.index); }
  let det = "";
  const open = s.indexOf("[");
  if (open >= 0 && s.endsWith("]") && open < s.length - 1) {
    const inner = s.slice(open + 1, -1);
    det = P("[") + joinKeep(splitKeep(inner, ";"), (g) => joinKeep(splitKeep(g, ","), tokDetail)) + P("]");
    s = s.slice(0, open);
  }
  const h = drop + tokRef(s, kind) + det + qty;
  return lead + (drop ? `<span class="drop">${h}</span>` : h) + trail;
}

const tokItems = (s: string, kind?: Kind): string => joinKeep(splitKeep(s, ","), (p) => tokItem(p, kind));

/** A whole value, by the key's type. Text that does not fit the type keeps its characters, plainly escaped. */
function tokValue(type: ValueType, raw: string, kind?: Kind): string {
  const [lead, s, trail] = pad(raw);
  let h: string;
  switch (type) {
    case "items": case "item": case "items¹": h = tokItems(s, kind); break;
    case "enum": h = `<span class="e">${esc(s)}</span>`; break;
    case "int": h = /^\d+$/.test(s) ? `<span class="n">${s}</span>` : esc(s); break;
    case "hp": h = /^\d+$/.test(s) ? `<span class="n">${s}</span>` : `<span class="e">${esc(s)}</span>`; break;
    case "text": h = esc(s); break;
    case "classes": h = tokClasses(s); break;
    case "scores": h = tokScores(s); break;
    case "asi": h = tokAsi(s); break;
  }
  return lead + h + trail;
}

function tokClasses(s: string): string {
  return s.split(/(\s\/\s)/).map((part, i) => {
    if (i % 2) return part[0] + P("/") + part[2];
    const [lead, body, trail] = pad(part);
    const m = /^([\s\S]*?)(\s+)(\d+)$/.exec(body);
    return lead + (m ? `${tokRef(m[1], "class")}${m[2]}<span class="n">${m[3]}</span>` : tokRef(body, "class")) + trail;
  }).join("");
}

/** `Scores` (D106, D108): six numbers; named scores split by `,` or `/`; or an increase, `+2 CHA, +1 CON`. */
function tokScores(s: string): string {
  if (/^\+/.test(s)) return tokAsi(s);
  if (s.includes("/") && !/[A-Za-z]/.test(s)) {
    const parts = s.split("/");
    return parts.map((p, i) => {
      const [lead, n, trail] = pad(p);
      const a = parts.length === 6 && /^\d+$/.test(n) ? ` ab-${ABILITIES[i].toLowerCase()}` : "";
      return lead + (/^\d+$/.test(n) ? `<span class="n${a}">${n}</span>` : esc(n)) + trail;
    }).join(P("/"));
  }
  return s.split(/(\s*[,/]\s*)/).map((part, i) => {
    if (i % 2) return P(part);
    const [lead, body, trail] = pad(part);
    const m = /^([A-Za-z]{3})(\s+)(\d+)$/.exec(body);
    const a = m ? abilityOf(m[1]) : null;
    return lead + (m && a ? `${ab(m[1], a)}${m[2]}<span class="n ab-${a.toLowerCase()}">${m[3]}</span>` : esc(body)) + trail;
  }).join("");
}

function tokAsi(s: string): string {
  return s.split(/(,\s*)/).map((part, i) => {
    if (i % 2) return P(part);
    const [lead, body, trail] = pad(part);
    const m = /^(\+\d+)(\s+)([A-Za-z]{3})$/.exec(body);
    const a = m ? abilityOf(m[3]) : null;
    return lead + (m && a ? `<span class="n">${m[1]}</span>${m[2]}${ab(m[3], a)}` : esc(body)) + trail;
  }).join("");
}

/** One key line's value, for a key known to the profile, as the editor colours it. Exported for the parity test. */
export function highlightValue(key: string, raw: string): string {
  const def = keyDef(key);
  if (!def) return tokItems(raw);
  return tokValue(def.type, raw, KIND_OF_KEY[def.key]);
}

export interface LineInfo {
  /** Whether this is the paste's first non-blank line (an identifier, when it has no separator). */
  first: boolean;
  /** The diagnostics on this line. */
  codes: readonly string[];
}

/** One source line → HTML whose text content is exactly `line`. */
export function highlightLine(line: string, info: LineInfo): string {
  const [lead, t, trail] = pad(line);
  if (!t) return esc(line);
  const lv = LEVEL_RE.exec(t);
  if (lv && t !== "---") {
    const n = t.slice(0, 1 + lv[1].length);
    const gap = /^\s+/.exec(t.slice(n.length))?.[0] ?? "";
    return lead + `<span class="lvh"><span class="lvn">${esc(n)}</span>${gap}${tokRef(t.slice(n.length + gap.length), "class")}</span>` + trail;
  }
  const sep = findSeparator(t);
  if (sep < 0) return lead + (info.first && t !== "---" ? `<b>${esc(t)}</b>` : esc(t)) + trail;
  const [, key, keyGap] = pad(t.slice(0, sep));
  const ext = isExtensionKey(key);
  const def = ext ? undefined : keyDef(key);
  const bad = !ext && !def ? " bad" : "";
  const value = t.slice(sep + 1);
  const body = def ? tokValue(def.type, value, KIND_OF_KEY[def.key]) : tokItems(value);
  // A slot marker (D110) is drawn apart from the key's name, as the view draws it (render.ts keyHtml).
  const mk = def?.key === "Feat" ? /^(.*?)(\s*)\(([\s\S]*)\)$/.exec(key) : null;
  const kh = mk ? `${esc(mk[1])}${mk[2]}<span class="km">(${esc(mk[3])})</span>` : esc(key);
  return lead + `<span class="k${ext ? " xk" : ""}${bad}">${kh}</span>${keyGap}${P(":")}${body}` + trail;
}

/** The whole layer: one row per source line, with its number in the gutter and its diagnostics marked. */
export function highlight(text: string, diagnostics: readonly Diagnostic[]): string {
  return highlightRows(text, diagnostics).join("");
}

/** The layer's rows, one HTML string each, so the editor can patch only the rows that changed. */
export function highlightRows(text: string, diagnostics: readonly Diagnostic[]): string[] {
  const byLine = new Map<number, string[]>();
  for (const d of diagnostics) if (d.line) byLine.set(d.line, [...(byLine.get(d.line) ?? []), d.code]);
  const lines = text.split(/\r?\n/);
  let seen = false;
  return lines.map((line, i) => {
    const codes = byLine.get(i + 1) ?? [];
    const first = !seen && line.trim() !== "";
    if (first) seen = true;
    const cls = codes.some((c) => c.startsWith("E")) ? " err" : codes.length ? " warn" : "";
    // The line number comes from a CSS counter (.g::before), so a row's markup does not depend on its position.
    return `<div class="row${cls}"><span class="g"></span><span class="t">${highlightLine(line, { first, codes })}</span></div>`;
  });
}

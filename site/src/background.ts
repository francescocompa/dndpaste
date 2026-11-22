/**
 * The editor's Background block (D351, D352): the block follows the background picked for it, and its `Scores` line
 * lists the bonuses left to pick. Pure text in, text out; what a background owes comes from `backgroundSpec`
 * (ghost.ts, the committed SRD presets). No rules text.
 */
import { KEYS, resolveKey } from "../../src/dndpaste.ts";
import { backgroundSpec } from "./ghost.ts";
import type { BackgroundSpec } from "./ghost.ts";

/** Lines a background's block may hold for it: an empty one the background doesn't ask for goes when it is picked. */
const FITTED = new Set(["Scores", "Skills", "Tools", "Languages", "Feat"]);
const KEY_LINE = /^\s*([^:]+?)\s*:(.*)$/;
const ORDER = new Map(KEYS.map((d, i) => [d.key, i]));

const rulesOf = (text: string): string | null => /^\s*rules\s*:\s*(2014|2024)\s*$/im.exec(text)?.[1] ?? null;
const keyOf = (line: string): string | null => {
  const m = KEY_LINE.exec(line);
  const r = m ? resolveKey(m[1]) : null;
  return r?.def ? r.key : null;
};
const opens = (line: string) => { const k = keyOf(line); return /^\s*L[1-9]\d*\b/i.test(line) || k === "Species" || k === "Background"; };

/** The written background at a `Background:` line (0-based), and its spec; null when the line isn't one or owes
 *  nothing the table knows. */
function specAt(lines: readonly string[], i: number, rules: string | null): BackgroundSpec | null {
  if (keyOf(lines[i] ?? "") !== "Background") return null;
  const v = lines[i].slice(lines[i].indexOf(":") + 1).trim();
  const [name, source] = v.replace(/\s*\[.*$/, "").split("|").map((x) => x.trim().replace(/^"|"$/g, ""));
  return name ? backgroundSpec({ name, source: source || null }, rules) : null;
}

/**
 * D351: the text after a background is picked on the line holding `pos`: its block keeps the lines that background
 * asks for (added where missing, in the key table's order) and loses the empty ones it doesn't. A line with names in
 * it is never touched, nor `Gear`, `Note` or any other key. Null when nothing changes or the background is unknown.
 */
export function fitBackground(text: string, pos: number): string | null {
  const lines = text.split("\n");
  const at = text.slice(0, pos).split("\n").length - 1;
  const spec = specAt(lines, at, rulesOf(text));
  if (!spec) return null;
  let end = at + 1;
  while (end < lines.length && !opens(lines[end])) end++;
  const body: string[] = [];
  for (let i = at + 1; i < end; i++) {
    const k = keyOf(lines[i]);
    const empty = !lines[i].slice(lines[i].indexOf(":") + 1).trim();
    if (k && FITTED.has(k) && empty && !spec.keys.includes(k)) continue;
    body.push(lines[i]);
  }
  // The block's own lines, then its trailing blank lines (kept below what is added).
  let last = body.length;
  while (last > 0 && !body[last - 1].trim()) last--;
  const tail = body.splice(last);
  for (const k of spec.keys) {
    if (body.some((l) => keyOf(l) === k)) continue;
    const o = ORDER.get(k) ?? 0;
    const j = body.findIndex((l) => { const lk = keyOf(l); return lk !== null && (ORDER.get(lk) ?? 0) > o; });
    body.splice(j < 0 ? body.length : j, 0, `${k}:`);
  }
  const next = [...lines.slice(0, at + 1), ...body, ...tail, ...lines.slice(end)].join("\n");
  return next === text ? null : next;
}

export interface BonusSpot {
  /** The range a pick replaces: what is typed of the bonus being written. */
  start: number;
  end: number;
  /** `Scores:` with no space after it: a pick writes one. */
  pad: boolean;
  /** `+2 INT`, … the bonuses that still fit, the larger first, each in the key table's ability order. */
  rows: string[];
  /** Points written so far, of 3. */
  have: number;
  /** The abilities the background's increase takes. */
  abilities: readonly string[];
}

const BONUS = /^\+([12])\s+([a-z]{3})$/i;

/**
 * D352: the caret at the end of a Background block's `Scores` line: the bonuses left to pick there, from the
 * background's abilities (any for Custom). The increase is +2 and +1 on two abilities, or +1 on three; a bonus
 * already written is never offered again on its ability. Null where this is not such a line, or its background has
 * no increase (2014) or is unknown, or what is written there doesn't read as bonuses.
 */
export function bonusSpotAt(text: string, pos: number): BonusSpot | null {
  const ls = text.lastIndexOf("\n", pos - 1) + 1;
  let le = text.indexOf("\n", pos);
  if (le < 0) le = text.length;
  if (text.slice(pos, le).trim()) return null;
  const line = text.slice(ls, pos);
  if (keyOf(line) !== "Scores" || /^\s*[^:]*\(/.test(line)) return null;
  const lines = text.split("\n");
  let i = text.slice(0, ls).split("\n").length - 1;
  while (i > 0 && !opens(lines[i - 1])) i--;
  const spec = i > 0 ? specAt(lines, i - 1, rulesOf(text)) : null;
  if (!spec?.abilities.length) return null;
  const colon = line.indexOf(":");
  const value = line.slice(colon + 1);
  const parts = value.split(",");
  const typed = parts.pop() ?? "";
  const done: [number, string][] = [];
  for (const p of parts) {
    const m = BONUS.exec(p.trim());
    if (!m) return null;
    done.push([Number(m[1]), m[2].toUpperCase()]);
  }
  const have = done.reduce((a, [n]) => a + n, 0);
  const used = new Set(done.map(([, a]) => a));
  // +2 then +1; +1 then +2 or +1; +1 and +1 then +1. Never past 3, never a second +2.
  const sizes = have >= 3 ? [] : done.some(([n]) => n === 2) ? [1] : done.length >= 2 ? [1] : [2, 1];
  const q = typed.trim().toLowerCase().replace(/\s+/g, "");
  const rows = sizes.flatMap((n) => spec.abilities.filter((a) => !used.has(a)).map((a) => `+${n} ${a}`))
    .filter((r) => { const k = r.toLowerCase().replace(/\s+/g, ""); return !q || k.startsWith(q) || k.slice(2).startsWith(q); });
  const lead = typed.length - typed.trimStart().length;
  return { start: pos - typed.length + lead, end: pos, pad: !parts.length && !/\s/.test(value.slice(0, 1)), rows, have, abilities: spec.abilities };
}

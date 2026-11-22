/**
 * T8.4: the base `Scores` line in the editor (D321–D324). Pure, no DOM, so the tests read it: where a click or the
 * caret sits on the header's base line, the rows its list offers by method, the line a pick writes (the named slash
 * form, D320), and the final the popover's title shows.
 *
 * The final mirrors the library's `finalScores()` (src/check.ts) from the names table the browser already has (D331):
 * src/check.ts may not ship in a site bundle (the IP gate, scripts/check-bundle.mjs). test/scores.test.ts holds the two
 * equal over every fixture. A hint, never a check (D66).
 */
import { ABILITIES, POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, abilityOf, classSequence, emitValue, parse, resolveKey, scoreKind } from "../../src/dndpaste.ts";
import type { Ability, Bonus, Detail, Item, Paste, ScoreKind, Scope, Value } from "../../src/dndpaste.ts";

type Scores = Extract<Value, { type: "scores" }>;

/** The header's base `Scores` line, as the editor reads it around a position. */
export interface ScoreLine {
  /** Offsets in the text: the line's start and end, and where its value starts (just after the colon). */
  start: number; end: number; vstart: number;
  /** The key as written, marker and all: `Scores`, `Scores (point buy)`. */
  key: string;
  /** The base in STR…CHA order (`null`: not written), and the method marker when the line has one (D323). */
  values: (number | null)[];
  marker: ScoreKind | null;
  /** A click on a score: the ability it belongs to (index into ABILITIES), or null elsewhere on the line. */
  at: number | null;
  /** The caret at the end of a line being filled (D322): the next ability and what is typed of its number. Null when
   *  the line is not being filled. */
  fill: { i: number; typed: string } | null;
}

const ABILITY_RE = /^(STR|DEX|CON|INT|WIS|CHA)\b\s*(\d*)$/i;
const BLOCK_RE = /^\s*(L\d+\b|Species\s*:|Background\s*:)/i;
const idx = (a: string): number => ABILITIES.indexOf(a.toUpperCase() as Ability);

/** The value of a `Scores` line, read by the library itself: the base and the marker (null when it doesn't read). */
function readLine(line: string): Scores | null {
  const v = parse(line).header.get("Scores");
  return v?.type === "scores" && !v.increase ? v : null;
}

/** The header's base `Scores` line at `pos` (the line holding it), or null on any other line. */
export function scoreLineAt(text: string, pos: number): ScoreLine | null {
  const start = text.lastIndexOf("\n", pos - 1) + 1;
  const e = text.indexOf("\n", pos);
  const end = e < 0 ? text.length : e;
  const line = text.slice(start, end);
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const key = line.slice(0, colon).trim();
  const r = resolveKey(key);
  if (!r.def || r.def.key !== "Scores") return null;
  const raw = line.slice(colon + 1);
  if (raw.trim().startsWith("+")) return null;
  // A base goes in the header: no level or block opened above.
  if (text.slice(0, start).split("\n").some((l) => BLOCK_RE.test(l))) return null;
  const vstart = start + colon + 1;
  const marker = "marker" in r && r.marker ? (readLine(`${key}:`)?.method ?? null) : null;
  // The segments as written, `/` or `,` apart (the 0.10 bare and comma forms read too).
  const segs: { s: number; e: number; t: string }[] = [];
  let s = 0;
  for (let i = 0; i <= raw.length; i++) {
    if (i === raw.length || raw[i] === "/" || raw[i] === ",") { segs.push({ s, e: i, t: raw.slice(s, i) }); s = i + 1; }
  }
  const bare = segs.some((g) => /^\s*\d+\s*$/.test(g.t));
  const rel = pos - vstart;
  // The caret at the end, in a tail that names no number yet (`STR 15/`, `STR 15/DEX `, `DEX 1`): a fill (D322).
  let fill: ScoreLine["fill"] = null;
  const tail = segs[segs.length - 1];
  const tm = ABILITY_RE.exec(tail.t.trim());
  const atEnd = !line.slice(colon + 1 + rel).trim();
  let done = raw;
  if (!bare && atEnd && rel >= tail.s && (tail.t.trim() === "" || (tm && tm[2].length < 2))) {
    done = raw.slice(0, Math.max(0, tail.s - 1));
  }
  const v = readLine(`Scores: ${done}`);
  const values = v ? [...v.values] : ABILITIES.map(() => null);
  if (!v && done.trim()) return { start, end, vstart, key, values, marker, at: null, fill: null };
  if (done !== raw || (!raw.trim() && atEnd)) {
    const named = tm?.[1] ? idx(tm[1]) : -1;
    const i = named >= 0 && values[named] === null ? named : values.findIndex((x) => x === null);
    if (i >= 0) fill = { i, typed: tm?.[2] ?? "" };
  }
  // A click on a score: on its ability or its number.
  let at: number | null = null;
  if (!fill) {
    const k = segs.findIndex((g) => rel >= g.s && rel <= g.e && g.t.trim());
    const g = segs[k];
    if (g) {
      const m = ABILITY_RE.exec(g.t.trim());
      const lead = g.s + (g.t.length - g.t.trimStart().length);
      const onText = rel >= lead && rel <= g.s + g.t.trimEnd().length;
      if (onText && m && m[2]) at = idx(m[1]);
      else if (onText && bare && /^\s*\d+\s*$/.test(g.t) && segs.length === 6) at = k;
    }
    if (at !== null && values[at] === null) at = null;
  }
  return { start, end, vstart, key, values, marker, at, fill };
}

/** One row of a score list: the number, and for a standard array the ability that holds it now (a pick swaps both). */
export interface ScoreRow { n: number; swap: number | null; cost: number | null; over: boolean }

/** The rows for ability `i` under `method` (D321): the array's other numbers, each with its holder; point buy's 8–15
 *  with their cost, `over` past the 27 points; custom, none. `fill`: only the numbers still free (standard array). */
export function scoreRows(method: ScoreKind, values: readonly (number | null)[], i: number, fill = false): ScoreRow[] {
  if (method === "standard-array") {
    return STANDARD_ARRAY.flatMap((n) => {
      if (n === values[i]) return [];
      const j = values.findIndex((x, k) => k !== i && x === n);
      if (fill && j >= 0) return [];
      return [{ n, swap: j >= 0 ? j : null, cost: null, over: false }];
    });
  }
  if (method === "point-buy") {
    const spent = values.reduce<number>((a, x, k) => (k === i || x === null ? a : a + (POINT_BUY_COST[x] ?? POINT_BUY_BUDGET + 1)), 0);
    return Object.keys(POINT_BUY_COST).map(Number).sort((a, b) => b - a).filter((n) => n !== values[i])
      .map((n) => ({ n, swap: null, cost: POINT_BUY_COST[n], over: spent + POINT_BUY_COST[n] > POINT_BUY_BUDGET }));
  }
  return [];
}

/** The base value in the named slash form (D320): `STR 15/DEX 14`. */
export function namedScores(values: readonly (number | null)[]): string {
  return emitValue({ type: "scores", values: [...values], increase: null });
}

/** The text after a popover pick (D321): ability `i` set to `n`; a standard-array row's holder takes `i`'s number. */
export function pickScore(text: string, sl: ScoreLine, i: number, row: ScoreRow): { text: string; cursor: number } {
  const v = [...sl.values];
  if (row.swap !== null) v[row.swap] = v[i];
  v[i] = row.n;
  const line = `${sl.key}: ${namedScores(v)}`;
  const at = sl.start + line.indexOf(`${ABILITIES[i]} ${row.n}`) + ABILITIES[i].length + 1 + String(row.n).length;
  return { text: text.slice(0, sl.start) + line + text.slice(sl.end), cursor: at };
}

/** The text after a fill pick (D322): `STR 15/DEX ` and the caret at the end, or the last number and `done`. */
export function fillScore(text: string, sl: ScoreLine, n: number): { text: string; cursor: number; done: boolean } {
  if (!sl.fill) return { text, cursor: sl.end, done: true };
  const v = [...sl.values];
  v[sl.fill.i] = n;
  const next = v.findIndex((x) => x === null);
  const body = `${sl.key}: ${namedScores(v)}${next >= 0 ? `/${ABILITIES[next]} ` : ""}`;
  return { text: text.slice(0, sl.start) + body + text.slice(sl.end), cursor: sl.start + body.length, done: next < 0 };
}

// ─── The final (D321, D331) ─────────────────────────────────────────────────

/** What the final reads from the names table: feats and species rows, and the species' fixed increases. A feat row's
 *  eighth field holds its fixed +1s as ability bits (D340). */
export interface FinalNames {
  FEATS: readonly (readonly [string, number, string, number, ...unknown[]])[];
  SPECIES: readonly (readonly [string, number, ...unknown[]])[];
  SPECIES_FIXED: readonly (readonly [string, string, string, readonly number[]])[];
  LINEAGES: readonly (readonly [string, number, string, number, readonly string[]])[];
}
/** One ability's final: the base, each increase on the way with where it comes from, and the result. */
export interface Final { base: number; final: number; parts: { amount: number; where: string }[] }

const BOOK_BIT: Readonly<Record<string, number>> = { PHB: 1, XPHB: 2, DMG: 4, XDMG: 8 };
const BITS_2024 = 2 | 8 | 32;
const lc = (s: string) => s.toLowerCase();
const ASI_FEAT = "ability score improvement";
const isFeatKey = (k: string) => k === "Feat" || k.startsWith("Feat (");
const itemsOf = (scope: Scope, k: string): Item[] => { const v = scope.get(k); return v?.type === "items" ? v.items : []; };
const increaseOf = (scope: Scope): Bonus[] => { const v = scope.get("Scores"); return v?.type === "scores" && v.increase ? v.increase : []; };
function bonusesOf(group: readonly Detail[]): Bonus[] | null {
  const out: Bonus[] = [];
  for (const d of group) {
    const m = /^\+(\d+)\s+(STR|DEX|CON|INT|WIS|CHA)$/i.exec(d.ref.name);
    if (!m || d.ref.source) return null;
    out.push({ amount: Number(m[1]), ability: m[2].toUpperCase() as Ability });
  }
  return out;
}

/** D341 (the library's `asiBonuses`): `+2 CHA` as written, and a bare ability with no `+x`: +2 when it is the group's
 *  only detail, else +1 (`[INT, CON]`, `[+1 INT, CON]`). Null when a detail is neither. */
function asiBonuses(group: readonly Detail[]): Bonus[] | null {
  const out: Bonus[] = [];
  for (const d of group) {
    const bare = d.ref.source ? null : abilityOf([d]);
    if (bare && !/^\+/.test(d.ref.name)) { out.push({ amount: group.length === 1 ? 2 : 1, ability: bare }); continue; }
    const b = bonusesOf([d]);
    if (!b) return null;
    out.push(...b);
  }
  return out;
}

const BITS_2014 = 1 | 4 | 16;
const EDITION_OF: Readonly<Record<string, string>> = { PHB: "2014", DMG: "2014", XPHB: "2024", XDMG: "2024" };
const looseEq = (a: string, b: string) => lc(a).replace(/\s+/g, " ").trim() === lc(b).replace(/\s+/g, " ").trim();

/**
 * The species printing's fixed increases, by the library's choice of printing (src/check.ts `speciesRef`, D282): the
 * printing the book or edition names; with a lineage it doesn't offer, the one printing that does, else the 2014
 * subrace `Elf (High)`. Printings are told apart by edition here (the names table merges books).
 */
function speciesFixed(n: FinalNames, it: Item, rules: string | null): readonly number[] | null {
  const name = it.ref.name;
  const src = it.ref.source;
  const bits = n.SPECIES.filter((r) => lc(r[0]) === lc(name)).reduce((a, r) => a | r[1], 0);
  const has = (e: string) => Boolean(bits & (e === "2014" ? BITS_2014 : BITS_2024));
  const fixedOf = (nm: string, e: string | null): readonly number[] | null => {
    const rows = n.SPECIES_FIXED.filter((r) => lc(r[0]) === lc(nm));
    return (src ? rows.find((r) => lc(r[1]) === lc(src)) : rows.find((r) => r[2] === e))?.[3] ?? null;
  };
  const base = src ? EDITION_OF[src.toUpperCase()] ?? null : rules && has(rules) ? rules : has("2024") ? "2024" : "2014";
  const lineage = it.details.find((g) => g.length && abilityOf(g) === null)?.[0]?.ref.name ?? null;
  if (!lineage) return fixedOf(name, base);
  const offers = (e: string | null) => n.LINEAGES.some((r) => lc(r[0]) === lc(name) && r[2] !== "" &&
    (e === null || r[1] & (e === "2014" ? BITS_2014 : BITS_2024)) && r[4].some((o) => looseEq(o, lineage)));
  if (offers(base)) return fixedOf(name, base);
  const other = src ? [] : ["2014", "2024"].filter((e) => has(e) && offers(e));
  if (other.length === 1) return fixedOf(name, other[0]);
  const sub = `${name} (${lineage})`;
  const subRows = n.SPECIES_FIXED.filter((r) => lc(r[0]) === lc(sub));
  if (subRows.length) return (src ? subRows.find((r) => lc(r[1]) === lc(src)) : subRows.find((r) => r[2] === rules) ?? subRows[0])?.[3] ?? fixedOf(name, base);
  return fixedOf(name, base);
}

/** The feat rows a name means: by its book when written (a book past the four core ones: your own sources' rows),
 *  else by the paste's edition when it has a printing there. */
function featRows(n: FinalNames, it: Item, rules: string | null) {
  let rows = n.FEATS.filter((r) => lc(r[0]) === lc(it.ref.name));
  if (it.ref.source) { const bit = BOOK_BIT[it.ref.source.toUpperCase()] ?? (16 | 32); rows = rows.filter((r) => r[1] & bit); }
  else if (rules) { const e = rows.filter((r) => r[1] & (rules === "2024" ? BITS_2024 : BITS_2014)); if (e.length) rows = e; }
  return rows;
}

/**
 * Each ability's final after every increase the paste records (the library's `finalScores`, D36: played levels
 * only): the species' fixed increases and its line, the background's line, each level's line and ASI or half-feat
 * pick, then the header's increase. Null for an ability the base leaves out.
 */
export function finalOf(paste: Paste, n: FinalNames): (Final | null)[] {
  const base = paste.header.get("Scores");
  const out: (Final | null)[] = ABILITIES.map((_, i) => {
    const b = base?.type === "scores" ? base.values[i] : null;
    return b === null || b === undefined ? null : { base: b, final: b, parts: [] };
  });
  const rulesV = paste.header.get("Rules");
  const rules = rulesV?.type === "enum" ? rulesV.value : null;
  const played = classSequence(paste).played;
  const bump = (ability: string, amount: number, where: string, cap = 20) => {
    const f = out[idx(ability)];
    if (!f) return;
    const next = Math.max(f.final, Math.min(cap, f.final + amount));
    if (next !== f.final) f.parts.push({ amount: next - f.final, where });
    f.final = next;
  };
  const feats = (scope: Scope, where: string) => {
    for (const k of [...scope.keys()].filter(isFeatKey)) {
      for (const it of itemsOf(scope, k)) {
        if (it.drop) continue;
        // D341: an ASI's bare ability counts, +2 alone, +1 beside another.
        if (lc(it.ref.name) === ASI_FEAT || lc(it.ref.name) === "asi") { for (const b of asiBonuses(it.details[0] ?? []) ?? []) bump(b.ability, b.amount, `${where} feat`); continue; }
        const rows = featRows(n, it, rules);
        // D340: a half feat's fixed increase (Durable's CON) counts with nothing written, before and beside a pick.
        const fixed = rows.find((x) => x[7]);
        if (fixed) ABILITIES.forEach((a, i) => { if (Number(fixed[7]) & (2 ** i)) bump(a, 1, `${where} feat`, fixed[2] === "Epic Boon" ? 30 : 20); });
        const pick = it.details[0]?.[0];
        if (!pick) continue;
        const ability = abilityOf([pick]) ?? pick.ref.name;
        const bit = 1 << idx(ability);
        const r = rows.find((x) => x[2] !== "Origin" && x[3] & bit);
        if (r && idx(ability) >= 0) bump(ability, 1, `${where} feat`, r[2] === "Epic Boon" ? 30 : 20);
      }
    }
  };
  const sp = paste.entities.find((e) => e.key === "Species");
  if (sp) {
    const fixed = sp.item ? speciesFixed(n, sp.item, rules) : null;
    fixed?.forEach((a, i) => { if (a) bump(ABILITIES[i], a, "Species"); });
    for (const b of increaseOf(sp.lines)) bump(b.ability, b.amount, "Species");
    feats(sp.lines, "Species");
  }
  const bg = paste.entities.find((e) => e.key === "Background");
  if (bg) {
    for (const b of increaseOf(bg.lines)) bump(b.ability, b.amount, "Background");
    feats(bg.lines, "Background");
  }
  for (const lv of paste.levels) {
    if (played !== null && lv.n > played) continue;
    for (const b of increaseOf(lv.lines)) bump(b.ability, b.amount, `L${lv.n}`);
    feats(lv.lines, `L${lv.n}`);
  }
  for (const b of increaseOf(paste.header)) bump(b.ability, b.amount, "header");
  feats(paste.header, "header");
  return out;
}

const mod = (x: number) => Math.floor((x - 10) / 2);
const signed = (x: number) => (x < 0 ? `−${-x}` : `+${x}`);
/** The popover's title (D321): `WIS 15 → 19 (+4)`, the arrow drawn by the caller; the modifier is the final's. */
export function finalTitle(i: number, f: Final): { from: string; to: string } {
  return { from: `${ABILITIES[i]} ${f.base}`, to: `${f.final} (${signed(mod(f.final))})` };
}
/** The popover's foot (D321): where the final comes from, one line: `15 base, +2 Background, +2 L4 feat`. */
export function finalFoot(f: Final): string {
  return [`${f.base} base`, ...f.parts.map((p) => `${signed(p.amount)} ${p.where}`)].join(", ");
}

/** The method a list and chip follow (D323): the marker's, else the draft's pick, else the numbers' when any. */
export function methodOf(sl: Pick<ScoreLine, "marker" | "values">, pick: ScoreKind | null): ScoreKind | null {
  return sl.marker ?? pick ?? (sl.values.some((x) => x !== null) ? scoreKind(sl.values).kind : null);
}

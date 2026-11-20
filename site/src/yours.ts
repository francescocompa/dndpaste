/**
 * Your own sources (M6, D244–D257): reading a names file, keeping only what the editor needs, and the switches that
 * decide which names show. Pure, so it runs in node tests; the browser side is client/sync.ts (store, GitHub) and
 * client/sources.ts (the /sources page).
 *
 * What is kept (D160, D244): names, book codes, option lists and counts, as the slot extractor (src/extract.ts) writes
 * them. Every other field of a file is dropped on read, and a string that reads as text (long, or across lines) is
 * dropped from what is kept, so no rules text is ever stored or shown.
 */
import { extractSlots, mergeData, FAMILIES } from "../../src/extract.ts";
import type { DataSet, SlotTable } from "../../src/extract.ts";
import { nameRows } from "./namerows.ts";
import { presetRows } from "./presetrows.ts";
import type { ClassPreset, SpeciesPreset } from "./presets.ts";
// The names module's shape (names.gen.ts) without its data: the bundle gets the data at run time (D158).
import type * as N from "./names.gen.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
export type Names = typeof N;

/** The eight kinds a name can be (D253), and the slot-table parts each one covers. */
export const KINDS = [
  { kind: "classes", label: "Classes", tables: ["classes", "features"] },
  { kind: "subclasses", label: "Subclasses", tables: ["subclasses"] },
  { kind: "species", label: "Species", tables: ["species"] },
  { kind: "backgrounds", label: "Backgrounds", tables: ["backgrounds"] },
  { kind: "feats", label: "Feats", tables: ["feats"] },
  { kind: "spells", label: "Spells", tables: ["spells"] },
  { kind: "items", label: "Items", tables: ["items", "magicVariants"] },
  { kind: "options", label: "Options", tables: ["optionalFeatures"] },
] as const;
export type Kind = (typeof KINDS)[number]["kind"];
const TABLE_KIND: Record<string, Kind> = Object.fromEntries(KINDS.flatMap((k) => k.tables.map((t) => [t, k.kind])));
export const TABLES: readonly string[] = KINDS.flatMap((k) => k.tables);

/** One source as the store keeps it (D245). `table` is the extractor's output for this source only. */
export interface SourceRec {
  id: string;
  /** A file's name, or a link's `owner/repo` (and path). */
  name: string;
  /** D269: a folder from this computer, read once like a file. */
  type: "file" | "folder" | "link";
  on: boolean;
  /** ISO date-time the source was added. */
  added: string;
  /** A link source: the address and what its last check saw (D248, D249). */
  link?: LinkState;
  /** Files read: 1 for a file, the .json files read for a folder. */
  files: number;
  /** Lines or entries the reader could not use. */
  skipped: number;
  table: SlotTable;
}
export interface LinkState {
  url: string;
  kind: "file" | "folder";
  /** The file's path for a file link, shown in the row. */
  path: string;
  /** ISO date-time of the last check that reached GitHub, and of the copy in use. */
  checked: string | null;
  copy: string;
  /** The last check failed: when, and what to tell the visitor. The stored copy stays in use (D249). */
  failed?: { at: string; message: string } | null;
  etag?: string | null;
  /** Blob sha per file path, to fetch only what changed; tree sha per subfolder, to list only what changed. */
  shas?: Record<string, string>;
  trees?: Record<string, { sha: string; files: { path: string; sha: string; size: number }[] }>;
}
/**
 * The switches (D253, D267): books for all sources at once, the SRD names, and kinds inside one book or one source.
 * `offPairs` holds `BOOK|kind` (that kind in that book), `@id|kind` (that kind in that source) and `@srd|kind`.
 */
export interface Switches { builtin: boolean; offBooks: string[]; offPairs: string[] }
export const NO_SWITCHES: Switches = { builtin: true, offBooks: [], offPairs: [] };
/** The `offPairs` key of a source (its id, or `srd` for the SRD names) and a kind. */
export const srcPair = (id: string, kind: Kind): string => `@${id}|${kind}`;
export const bookPair = (code: string, kind: Kind): string => `${code}|${kind}`;

// ---- reading (D244) ----

/** Plain names format keys → the data kind they fill. */
const PLAIN: Record<string, string> = {
  class: "class", subclass: "subclass", species: "race", race: "race", background: "background", feat: "feat",
  spell: "spell", cantrip: "spell", item: "item", option: "optionalfeature", feature: "feature",
};
const ORDINAL = /^(\d)(?:st|nd|rd|th)?(?:[- ]level)?$/i;

/** Splits on `sep` outside double quotes. */
const parts = (s: string, sep: string) => {
  const out: string[] = [];
  let cur = "", q = false;
  for (const ch of s) {
    if (ch === '"') q = !q;
    if (ch === sep && !q) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
};
const unquote = (s: string) => s.trim().replace(/^"(.*)"$/, "$1").trim();

const ABILITY_CODE = /^(str|dex|con|int|wis|cha)$/i;

export interface Read { data: DataSet; features: Record<string, J>; skipped: number; format: "plain" | "json" }

/**
 * The plain names format (D258): one name per line, `Kind: Name|BOOK`, an optional `[…]` after it for the few
 * details a list needs. `#` starts a comment line. A name with no book gets `HB`.
 *   Spell: Ember Ward|MYHB [1; Wizard, Sorcerer]   level (0 or "cantrip"), then the classes that have it
 *   Subclass: Oath of Ash|MYHB [Paladin]          its class
 *   Option: Ember Lance|MYHB [Eldritch Invocations] its family (name or code)
 *   Feature: Ember Gift|MYHB [Spark, Flare]        the options its `[ ]` offers
 *   Feat: Lucky Streak|MYHB [Origin; INT, WIS]    its category, then the abilities its pick takes (D275)
 */
export function readPlain(text: string, featCategories: Readonly<Record<string, string>> = {}): Read {
  const data: Record<string, J[]> = {};
  const features: Record<string, J> = {};
  let skipped = 0;
  const catCode = (name: string) => Object.entries(featCategories).find(([c, n]) => n.toLowerCase() === name.toLowerCase() || c.toLowerCase() === name.toLowerCase())?.[0] ?? null;
  const famCode = (name: string) => Object.entries(FAMILIES).find(([c, n]) => n.toLowerCase() === name.toLowerCase() || c.toLowerCase() === name.toLowerCase() ||
    n.toLowerCase() === `${name.toLowerCase()}s`)?.[0] ?? name;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([A-Za-z ]+?)\s*:\s*(.+)$/.exec(line);
    const key = m ? m[1].toLowerCase().trim() : "";
    // A plural key reads as its kind too: Spells, Classes, Species.
    const kind = m ? PLAIN[key] ?? PLAIN[key.replace(/s$/, "")] ?? PLAIN[key.replace(/es$/, "")] : undefined;
    if (!m || !kind) { skipped++; continue; }
    let value = m[2].trim();
    let detail: string[][] = [];
    const br = /\[([^\]]*)\]\s*$/.exec(value);
    if (br) { detail = br[1].split(";").map((g) => parts(g, ",").map(unquote)); value = value.slice(0, br.index).trim(); }
    const bar = value.lastIndexOf("|");
    const name = unquote(bar > 0 && !/"[^"]*$/.test(value.slice(bar)) ? value.slice(0, bar) : value);
    const source = bar > 0 ? value.slice(bar + 1).trim() : "HB";
    if (!name || !/^[A-Za-z0-9][\w\-:.']{0,39}$/.test(source)) { skipped++; continue; }
    const e: J = { name, source };
    if (kind === "spell") {
      const lv = detail[0]?.[0] ?? "";
      const level = /^cantrip$/i.test(lv) || m[1].toLowerCase().startsWith("cantrip") ? 0 : ORDINAL.test(lv) ? Number(ORDINAL.exec(lv)?.[1]) : null;
      if (level !== null) e.level = level;
      const cls = (level !== null || /^cantrip$/i.test(lv) ? detail.slice(1) : detail).flat();
      if (cls.length) e.classes = cls;
    } else if (kind === "subclass" && detail[0]?.[0]) { e.className = detail[0][0]; e.shortName = name; }
    else if (kind === "optionalfeature" && detail[0]?.[0]) e.featureType = [famCode(detail[0][0])];
    else if (kind === "feat") {
      // A group of ability names is the feat's ability pick, before or after its category (D275).
      const isAb = (g: string[] = []) => g.length > 0 && g.every((a) => ABILITY_CODE.test(a));
      const [cat, ab] = isAb(detail[0]) ? [[], detail[0]] : [detail[0] ?? [], detail[1] ?? []];
      if (cat[0]) e.category = catCode(cat[0]);
      if (isAb(ab)) e.ability = [{ choose: { from: ab.map((a) => a.toLowerCase()) } }];
    }
    if (kind === "feature") { features[`${name}|${source}`] = { name, source, options: detail.flat() }; continue; }
    (data[kind] ??= []).push(e);
  }
  return { data, features, skipped, format: "plain" };
}

/** A file's text, read as JSON when it parses as an object, else as the plain format. */
export function readText(text: string, featCategories: Readonly<Record<string, string>> = {}): Read {
  const t = text.replace(/^﻿/, "");
  if (/^\s*[{[]/.test(t)) {
    try {
      const json = JSON.parse(t);
      return { data: mergeData(Array.isArray(json) ? json : [json]), features: {}, skipped: 0, format: "json" };
    } catch { /* not JSON after all: the plain reader says what it can't use */ }
  }
  return readPlain(t, featCategories);
}

/** Several reads (a folder's files) as one. */
export function joinReads(reads: readonly Read[]): Read {
  const files = reads.filter((r) => r.format === "json").map((r) => r.data);
  const plain = reads.filter((r) => r.format === "plain").map((r) => r.data);
  return {
    data: mergeData([...files, ...plain]), features: Object.assign({}, ...reads.map((r) => r.features)),
    skipped: reads.reduce((a, r) => a + r.skipped, 0), format: files.length ? "json" : "plain",
  };
}

// ---- keeping (D160) ----

/** A name: short, on one line, no markup. */
export const isName = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 100 && !/[\n\r\t<>{}]/.test(s);
const isCode = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9][\w\-:.']{0,39}$/.test(s);

/** Drops every string that reads as text (over 120 characters, or across lines) from what is kept. */
function scrub(v: J): J {
  if (typeof v === "string") return v.length <= 120 && !/[\n\r]/.test(v) ? v : undefined;
  if (Array.isArray(v)) return v.map(scrub).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const o: J = {};
    for (const [k, x] of Object.entries(v)) { const y = scrub(x); if (y !== undefined) o[k] = y; }
    return o;
  }
  return v;
}

/**
 * A read → the table kept for a source: the extractor's output (names, codes, counts, option lists), entries with a
 * name and a book code only, a spell with no level marked -1 (offered on both cantrip and spell lines), and the plain
 * format's features beside it. `sourceDates`: book code → date, to tell a 2024 book from a 2014 one.
 */
export function keepTable(read: Read, sourceDates: Readonly<Record<string, string>> = {}, featCategories: Readonly<Record<string, string>> = {}): SlotTable {
  const full = extractSlots(read.data, { sourceDates, featCategories, generated: new Date().toISOString().slice(0, 10) });
  const out: SlotTable = { families: scrub(full.families), featCategories: scrub(full.featCategories) };
  for (const t of TABLES) {
    const src = t === "features" ? read.features : full[t] ?? {};
    const kept: Record<string, J> = {};
    for (const [k, e] of Object.entries(src) as [string, J][]) {
      if (!isName(e?.name) || !isCode(e?.source)) continue;
      const c = scrub(e);
      if (t === "spells" && typeof c.level !== "number") c.level = -1;
      if (t === "features") c.options = (c.options ?? []).filter(isName);
      if (t === "features" && !c.options.length) continue;
      kept[k] = c;
    }
    out[t] = kept;
  }
  // D268, D291: a species variant `Base (Variant)` stays in the table: the editor offers it as a lineage of its base.
  return out;
}

/**
 * D268: a species named `Base (Variant)` is left out when `Base` is a species too (here, or in `more`), so a full data
 * folder adds Dragonborn once, not once per colour. Since 0.10 the variant is a lineage of its base (D291, namerows.ts).
 */
export function dropVariants(species: Record<string, J>, more: Iterable<string> = []): Record<string, J> {
  const bases = new Set([...Object.values(species).map((e: J) => String(e.name).toLowerCase()), ...[...more].map((x) => x.toLowerCase())]);
  return Object.fromEntries(Object.entries(species).filter(([, e]: [string, J]) => {
    const m = /^(.+?)\s*\([^()]+\)$/.exec(String(e.name));
    return !m || !bases.has(m[1].toLowerCase());
  }));
}

// ---- counting ----

/** A table's entries of one kind; species variants left out (D268) also from copies kept before that rule. */
const kept = (table: SlotTable, t: string): Record<string, J> => (t === "species" ? dropVariants(table.species ?? {}) : table[t] ?? {});

/** Names per kind, the options their `[ ]` offer, and names per book. */
export function counts(table: SlotTable): { kinds: Record<Kind, number>; names: number; options: number; books: Map<string, number> } {
  const kinds = Object.fromEntries(KINDS.map((k) => [k.kind, 0])) as Record<Kind, number>;
  const books = new Map<string, number>();
  let options = 0;
  for (const t of TABLES) {
    for (const e of Object.values(kept(table, t)) as J[]) {
      kinds[TABLE_KIND[t]]++;
      books.set(e.source, (books.get(e.source) ?? 0) + 1);
      if (t === "features") options += e.options?.length ?? 0;
      else for (const f of Object.values(e.features ?? {}) as J[]) options += f.options?.length ?? 0;
    }
  }
  return { kinds, names: Object.values(kinds).reduce((a, b) => a + b, 0), options, books };
}

/** Names per (book, kind) across the tables given. */
export function bookKinds(tables: readonly SlotTable[]): Map<string, Map<Kind, number>> {
  const out = new Map<string, Map<Kind, number>>();
  for (const table of tables) for (const t of TABLES) for (const e of Object.values(kept(table, t)) as J[]) {
    const m = out.get(e.source) ?? new Map<Kind, number>();
    m.set(TABLE_KIND[t], (m.get(TABLE_KIND[t]) ?? 0) + 1);
    out.set(e.source, m);
  }
  return out;
}

// ---- what shows (D253, D255) ----

/** The names of the sources that are on, with their off books and kinds left out: what feeds the editor. */
export function visible(sources: readonly SourceRec[], sw: Switches): SlotTable {
  const off = new Set(sw.offBooks);
  const pairs = new Set(sw.offPairs);
  const out: SlotTable = { families: { ...FAMILIES }, featCategories: {} };
  for (const t of TABLES) out[t] = {};
  for (const s of sources) {
    if (!s.on) continue;
    Object.assign(out.families, s.table.families ?? {});
    Object.assign(out.featCategories, s.table.featCategories ?? {});
    for (const t of TABLES) {
      const kind = TABLE_KIND[t];
      if (pairs.has(srcPair(s.id, kind))) continue;
      // D291: variants too; merge drops them from the species and folds them into their base's lineages.
      for (const [k, e] of Object.entries(s.table[t] ?? {}) as [string, J][]) {
        if (!off.has(e.source) && !pairs.has(bookPair(e.source, kind))) out[t][k] = e;
      }
    }
  }
  return out;
}

/** The built-in books per kind your names stand in for (D255): `kind|BOOK`. */
export function covered(vis: SlotTable): Set<string> {
  const out = new Set<string>();
  for (const t of TABLES) for (const e of Object.values(vis[t] ?? {}) as J[]) out.add(`${TABLE_KIND[t]}|${e.source}`);
  return out;
}

/** The built-in names' book bits (D155) and their codes. */
export const BUILTIN_BOOKS: readonly (readonly [string, number])[] = [["PHB", 1], ["XPHB", 2], ["DMG", 4], ["XDMG", 8]];
/** Book bits for a name from your sources: the four built-in books keep theirs; any other book is "a 2014 book" (16),
 *  "a 2024 book" (32) or, edition unknown, both (D259). */
export const OWN_2014 = 16, OWN_2024 = 32;
export function ownBits(e: J): number {
  const core = BUILTIN_BOOKS.find(([c]) => c === e.source);
  if (core) return core[1];
  return e.edition === "2024" ? OWN_2024 : e.edition === "2014" ? OWN_2014 : OWN_2014 | OWN_2024;
}

/** The arrays of the names module that are `[name, books, …]` rows, by kind. */
const BOOK_ROWS: readonly [keyof Names, Kind][] = [["CLASS_ROWS", "classes"], ["SUBCLASSES", "subclasses"], ["SPECIES", "species"],
  ["BACKGROUNDS", "backgrounds"], ["FEATS", "feats"], ["SPELLS", "spells"], ["ITEMS", "items"], ["MASTERY_WEAPONS", "items"], ["OPTIONS", "options"]];

/** The built-in names per (book, kind), for the /sources counts. */
export function builtinBookKinds(n: Names): Map<string, Map<Kind, number>> {
  const out = new Map<string, Map<Kind, number>>();
  for (const [arr, kind] of BOOK_ROWS) {
    if (arr === "MASTERY_WEAPONS") continue; // the same weapons as in ITEMS
    for (const r of n[arr] as readonly (readonly [string, number])[]) {
      for (const [code, bit] of BUILTIN_BOOKS) if (r[1] & bit) {
        const m = out.get(code) ?? new Map<Kind, number>();
        m.set(kind, (m.get(kind) ?? 0) + 1);
        out.set(code, m);
      }
    }
  }
  return out;
}

/** What the editor gets: the names module with yours merged in, and your classes' presets for ghost counts. */
export interface Merged { names: Names; presets: ClassPreset[]; species: SpeciesPreset[] }

/**
 * The built-in names with your sources merged in (D250, D253, D255). A built-in name stays when the built-in names,
 * its book and its kind are on and no source of yours brings that book for that kind; your names join them, ranked
 * together by match. `OWN` maps each of your names (lower case) to its books, for the row's book (D250).
 */
export function merge(n: Names, sources: readonly SourceRec[], sw: Switches): Merged {
  const vis = visible(sources, sw);
  const allSpecies = vis.species ?? {};
  vis.species = dropVariants(allSpecies, n.SPECIES.map((r) => r[0]));
  const hide = covered(vis);
  const pairs = new Set(sw.offPairs);
  const offBooks = new Set(sw.offBooks);
  const srdOff = (kind: Kind) => !sw.builtin || pairs.has(srcPair("srd", kind));
  const mask = (kind: Kind) => BUILTIN_BOOKS.reduce((a, [code, bit]) =>
    (srdOff(kind) || offBooks.has(code) || pairs.has(bookPair(code, kind)) || hide.has(`${kind}|${code}`) ? a | bit : a), 0);
  const out: J = { ...n };
  for (const [arr, kind] of BOOK_ROWS) {
    const m = mask(kind);
    out[arr] = m ? (n[arr] as readonly J[]).flatMap((r) => (r[1] & ~m ? [[r[0], r[1] & ~m, ...r.slice(2)]] : [])) : [...(n[arr] as readonly J[])];
  }
  if (srdOff("classes")) out.CLASS_FEATURES = [];
  if (srdOff("species")) { out.LINEAGES = []; out.SPECIES_FEATURES = []; }
  // A built-in species book that is off (or that your sources bring) takes its lineage rows with it (D291).
  const sm = mask("species");
  if (sm) out.LINEAGES = (out.LINEAGES as readonly J[]).flatMap((r) => (r[1] & ~sm ? [[r[0], r[1] & ~sm, ...r.slice(2)]] : []));

  // D291: the variants left out of the species are lineage options of their base (`Elf (Drow)` → `Elf [Drow]`).
  const withVariants = { ...vis, species: allSpecies };
  const yours = nameRows(withVariants, {}, { bookOf: ownBits, classes: n.CLASSES, skills: n.SKILLS, featCategories: n.FEAT_CATEGORIES, bases: n.SPECIES.map((r) => r[0]) });
  out.CLASSES = yours.CLASSES;
  for (const [arr] of BOOK_ROWS) out[arr] = [...out[arr], ...(yours[arr as keyof typeof yours] as J[])];
  for (const k of ["CLASS_FEATURES", "LINEAGES", "SPECIES_FEATURES", "DETAILS", "CASTERS", "SKILL_LISTS"] as const) out[k] = [...out[k], ...yours[k]];
  const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])].sort();
  out.LANGUAGES = union(n.LANGUAGES, yours.LANGUAGES);
  out.TOOLS = union(n.TOOLS, yours.TOOLS);
  out.FAMILIES = { ...n.FAMILIES, ...yours.FAMILIES };
  const own = new Map<string, string[]>();
  for (const t of TABLES) for (const e of Object.values(vis[t] ?? {}) as J[]) {
    const k = e.name.toLowerCase();
    const list = own.get(k) ?? [];
    if (!list.includes(e.source)) list.push(e.source);
    own.set(k, list);
  }
  out.OWN = own;

  const p = presetRows(withVariants, {}, () => true);
  const edition = (name: string, source: string, tbl: string) => vis[tbl]?.[`${name}|${source}`]?.edition ?? undefined;
  const real = (r: J) => r.owes.some((o: string[]) => o.length) || r.counts.some((c: J) => Object.keys(c).length) || r.first.length;
  return {
    names: out as Names,
    presets: p.rows.filter(real).map((r) => ({ ...r, edition: edition(r.name, r.source, "classes") })),
    species: p.species.map((r) => ({ ...r, edition: edition(r.name, r.source, "species") })),
  };
}

/** A category's state from its books (D253): on, off, or partly on. */
export function categoryState(books: readonly string[], sw: Switches): "on" | "off" | "mix" {
  const off = books.filter((b) => sw.offBooks.includes(b)).length;
  return off === 0 ? "on" : off === books.length ? "off" : "mix";
}

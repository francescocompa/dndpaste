// Writes site/src/books.ts, the list behind /codes (D103): each book code that a player option can cite (species,
// background, feat, optional feature, class, subclass, spell or item), with the book's title and type. Titles only,
// never rules text. Type: Core, Supplement, Setting, Adventure, or Extra (small, free or promo releases); `y2014`
// marks the books the 2024 rules replaced. Unearthed Arcana (D218, T03): every playtest source the UA files name in
// their header, by the same code and title character-forge reads; `y2014` for those before the 2024 rules (XUA2025 on
// are not). `HB` (homebrew) is listed by hand. Run it by hand after the local data mirror updates, then commit the diff:
//   node site/scripts/books.mjs [mirror data dir] [unearthed arcana dir]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT = join(homedir(), "Documents/D&D/5etool_mirror/5etools-src-main/data");
const root = process.argv[2] ?? DEFAULT;
if (!existsSync(root)) { console.error(`mirror not found: ${root}`); process.exit(1); }
const load = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const uaRoot = process.argv[3] ?? join(root, "..", "..", "unearthed-arcana-master");

// Codes cited by player options.
const cited = new Set();
const add = (list) => { for (const x of list ?? []) if (typeof x.source === "string") cited.add(x.source); };
const races = load("races.json");
add(races.race); add(races.subrace);
add(load("backgrounds.json").background);
add(load("feats.json").feat);
add(load("optionalfeatures.json").optionalfeature);
add(load("items.json").item);
add(load("items-base.json").baseitem);
add(load("magicvariants.json").magicvariant);
for (const f of readdirSync(join(root, "class")).filter((f) => /^class-.*\.json$/.test(f))) { const j = load(`class/${f}`); add(j.class); add(j.subclass); }
for (const f of readdirSync(join(root, "spells")).filter((f) => /^spells-.*\.json$/.test(f))) add(load(`spells/${f}`).spell);

// Titles: the book and adventure indexes, then the full-name table of the mirror's parser for codes they lack.
const titles = new Map();
const BOOK_TYPE = { core: "Core", supplement: "Supplement", setting: "Setting" };
for (const b of load("books.json").book) titles.set(b.source, { title: b.name, type: BOOK_TYPE[b.group] ?? "Extra" });
for (const a of load("adventures.json").adventure) if (!titles.has(a.source)) titles.set(a.source, { title: a.name, type: "Adventure" });
const parser = readFileSync(join(root, "..", "js", "parser.js"), "utf8");
// String constants, plain ("PHB") or templates of other constants (`${Parser.SRC_PS_PREFIX}A`).
const consts = new Map();
const value = (raw) => {
  if (raw.startsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("Parser.")) return consts.get(raw.slice(7)) ?? null;
  const s = raw.slice(1, -1).replace(/\$\{Parser\.(\w+)\}/g, (_, k) => consts.get(k) ?? "\0");
  return s.includes("\0") ? null : s;
};
for (const m of parser.matchAll(/^Parser\.(\w+) = ("[^"\n]*"|`[^`\n]*`);/gm)) { const v = value(m[2]); if (v !== null) consts.set(m[1], v); }
// The parser's source sets (`Parser.SOURCES_ADVENTURES = new Set([ Parser.SRC_…, … ])`), comments left out.
const set = (name) => {
  const m = new RegExp(`^Parser\\.${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`, "m").exec(parser);
  const body = (m?.[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  return new Set([...body.matchAll(/Parser\.(SRC_\w+)/g)].map((x) => consts.get(x[1])).filter(Boolean));
};
const ADVENTURES = set("SOURCES_ADVENTURES");
const EXTRA = set("SOURCES_NON_STANDARD_WOTC");
const Y2014 = set("SOURCES_LEGACY_WOTC");
for (const m of parser.matchAll(/^Parser\.SOURCE_JSON_TO_FULL\[Parser\.(SRC_\w+)\] = ("[^"\n]*"|`[^`\n]*`|Parser\.\w+);/gm)) {
  const code = consts.get(m[1]);
  const title = value(m[2]);
  if (code && title && !titles.has(code)) titles.set(code, { title, type: ADVENTURES.has(code) ? "Adventure" : EXTRA.has(code) ? "Extra" : "Supplement" });
}

// Codes with no title are left out; playtest codes come from the UA files below.
const isUA = (c) => /^X?UA/.test(c);
const rows = [...cited].filter((c) => titles.has(c) && !isUA(c))
  .map((code) => ({ code, ...titles.get(code), y2014: Y2014.has(code) }));

// Unearthed Arcana: each source a UA file's header names (code, title). Before the 2024 rules unless XUA2025 or later.
const ua = new Map();
const walk = (dir) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith("_") || f.name.startsWith(".") || f.name === "node_modules") continue;
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".json")) {
      let j;
      try { j = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
      for (const s of j?._meta?.sources ?? []) if (typeof s.json === "string" && isUA(s.json) && !ua.has(s.json)) ua.set(s.json, s.full || s.json);
    }
  }
};
if (existsSync(uaRoot)) walk(uaRoot);
else console.warn(`no Unearthed Arcana folder at ${uaRoot}: UA codes left out`);
for (const [code, title] of ua) rows.push({ code, title, type: "Unearthed Arcana", y2014: Number(/^XUA(\d{4})/.exec(code)?.[1] ?? 0) < 2025 });
rows.push({ code: "HB", title: "Homebrew", type: "Homebrew", y2014: false });
rows.sort((a, b) => a.code.toLowerCase().localeCompare(b.code.toLowerCase()));

const out = fileURLToPath(new URL("../src/books.ts", import.meta.url));
const q = (s) => JSON.stringify(s);
writeFileSync(out, `/**
 * Book codes for /codes (D103): each code a player option can cite, with the book's title. Titles only.
 * Generated by site/scripts/books.mjs from the local data mirror; do not edit by hand.
 */
export type BookType = "Core" | "Supplement" | "Setting" | "Adventure" | "Extra" | "Unearthed Arcana" | "Homebrew";
/** \`y2014\`: a book the 2024 rules replaced. */
export interface Book { code: string; title: string; type: BookType; y2014: boolean }

export const BOOKS: readonly Book[] = [
${rows.map((r) => `  { code: ${q(r.code)}, title: ${q(r.title)}, type: ${q(r.type)}, y2014: ${r.y2014} },`).join("\n")}
];
`);
const count = {};
for (const r of rows) count[r.type] = (count[r.type] ?? 0) + 1;
console.log(`${out}: ${rows.length} codes`, count, `2014: ${rows.filter((r) => r.y2014).map((r) => r.code).join(" ")}`);

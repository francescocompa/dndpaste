#!/usr/bin/env node
// Build the checker's slot table from a local game-data folder (JSON).
//   node scripts/extract-slots.mjs <data-folder>  (or DNDPASTE_DATA=<data-folder>)
//   → data/slots.json (full, gitignored)
//   → data/srd/slots.json (SRD-flagged entities only, committed)
// The output holds names, counts, levels and option lists — no rules text (CLAUDE.md content boundary).
// The work is src/extract.ts (D246), a pure function the site also runs in the browser; this script only reads the
// folder and writes the two files.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { extractSlots, mergeData, srdSubset } from "../src/extract.ts";

const root = process.argv[2] ?? process.env.DNDPASTE_DATA;
if (!root) { console.error("usage: node scripts/extract-slots.mjs <data-folder>  (or set DNDPASTE_DATA)"); process.exit(1); }
if (!existsSync(root)) { console.error(`data folder not found: ${root}`); process.exit(1); }

const load = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const optional = (rel) => { try { return load(rel); } catch { return null; } };
const listDir = (rel, prefix) => readdirSync(join(root, rel)).filter((f) => f.startsWith(prefix) && f.endsWith(".json") && !f.includes("fluff"));

const files = [
  optional("books.json"), optional("adventures.json"),
  load("items.json"), load("items-base.json"), optional("magicvariants.json"),
  ...listDir("class", "class-").map((f) => load(join("class", f))),
  load("races.json"), load("backgrounds.json"), load("feats.json"), load("optionalfeatures.json"),
  ...listDir("spells", "spells-").map((f) => load(join("spells", f))),
  optional("generated/gendata-spell-source-lookup.json"),
];
// Feat category names for `Feat (<marker>)` (D110). The data keeps them in js/parser.js, not in its data files: read them
// from beside the data folder (names only); a folder without that file leaves the checker on its own fallback list.
const featCategories = {};
try {
  const m = /Parser\.FEAT_CATEGORY_TO_FULL = \{([\s\S]*?)\};/.exec(readFileSync(join(root, "..", "js", "parser.js"), "utf8"));
  for (const [, code, name] of m?.[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g) ?? []) featCategories[code] = name;
} catch { /* optional */ }

const full = extractSlots(mergeData(files), { featCategories });
const srd = srdSubset(full);

mkdirSync(new URL("../data/srd/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/slots.json", import.meta.url), JSON.stringify(full));
writeFileSync(new URL("../data/srd/slots.json", import.meta.url), JSON.stringify(srd));
console.log("full", full.meta.counts);
console.log("srd ", srd.meta.counts);

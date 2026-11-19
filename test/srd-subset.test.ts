// The committed SRD subset (data/srd/slots.json): what scripts/extract-slots.mjs lets into the public repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

interface Entity { name: string; source: string; srd?: boolean; subraceOf?: string }
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const srd = JSON.parse(readFileSync(join(root, "data", "srd", "slots.json"), "utf8")) as Record<string, Record<string, Entity>>;
const TABLES = ["classes", "subclasses", "species", "backgrounds", "feats", "optionalFeatures", "spells", "items", "magicVariants"];

test("D166: the subset holds entities from the SRD and Basic Rules books only", () => {
  const books = new Set(["PHB", "XPHB", "DMG", "XDMG", "MM", "XMM"]);
  for (const t of TABLES) for (const [k, e] of Object.entries(srd[t] ?? {})) assert.ok(books.has(e.source), `${t}: ${k} is not from an SRD or Basic Rules book`);
});

test("D166: a 2014 subrace takes its own SRD flag, not its parent race's", () => {
  const subraces = Object.values(srd.species ?? {}).filter((s) => s.subraceOf).map((s) => `${s.name}|${s.source}`).sort();
  assert.deepEqual(subraces, ["Dwarf (Hill)|PHB", "Dwarf (Mountain)|PHB", "Elf (High)|PHB", "Elf (Wood)|PHB", "Gnome (Rock)|PHB",
    "Halfling (Lightfoot)|PHB", "Halfling (Stout)|PHB", "Human (Variant)|PHB"]);
});

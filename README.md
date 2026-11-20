# dndpaste

- **Live site:** <https://dndpaste.fcomfy.workers.dev>
- **Status:** the format is 0.x and can still change. A paste you write today keeps reading:
  within `Paste: 1`, an old key name stays as an alias and is never removed.
- **Feedback:** [open an issue](https://github.com/francescocompa/dndpaste/issues/new/choose)
  for a build you can't write or a paste that reads wrong.

A Pokepaste-style plain-text format for D&D 5e character builds, plus its reference parser
and canonical emitter. A paste replays a build through its meaningful choice points **by
reference only** — names and optional 5etools source codes, never rules text. Sparse pastes
are valid: `Classes: Warlock` is a complete document.

```
Shigen
Rules: 2024
Scores: 8/13/14/12/10/15
Classes: Fighter 1 / Warlock 5

Species: Human
Feat: Spellfire Spark|FRHoF [CHA]

L1 Fighter
Feat (Fighting Style): Archery
Masteries: Longbow, Rapier, Warhammer

L2 Warlock
Invocations: Pact of the Blade
Cantrips: Blade Ward, True Strike

L3 Warlock
Invocations: Agonizing Blast [True Strike]
```

- **Spec:** [`SPEC.md`](SPEC.md): the core grammar (game-neutral) and the `dnd5e` profile.
- **Format changes:** [`FORMAT-UPDATES.md`](FORMAT-UPDATES.md): how a change is proposed,
  aliased, released and retired (draft).

## Use the library

The package is not on npm yet. Install it from a clone or a tarball, then import it:

```sh
npm install ../dndpaste          # or: npm install dndpaste-0.8.0.tgz (from `npm pack`)
```

```js
import { parse, emit, isClean, tidy } from "dndpaste";             // parser and emitter, no game data
import { check } from "dndpaste/check";                             // the checker
import slots from "dndpaste/data/srd/slots.json" with { type: "json" };
import supplement from "dndpaste/data/supplement.json" with { type: "json" };

const paste = parse(text);                  // never throws
if (!isClean(paste)) for (const d of paste.diagnostics) console.log(d.code, d.line, d.message, d.hint);
const canonical = emit(paste);              // one canonical text for the build
const findings = check(paste, slots, supplement);
for (const f of findings) console.log(f.code, f.severity, f.where, f.message);
```

A page with no build step can load `dist/dndpaste.umd.cjs`: one file with the parser, the emitter and
the checker under the global `dndpaste`.

**Reading a build.** `paste.header`, each block in `paste.entities` (Species, Background) and each
level in `paste.levels` is a `Map` from key to value. `levels[i].n` is the character level and
`levels[i].class` the class taken there. A header line is a choice with no level. `Spells` adds
spells to the build at that level; `Prepared` is the default loadout of a caster that prepares, so
the two are not the same list. `Note` is free text for people and means nothing to the build.

### Library functions

| Function | What it does |
|---|---|
| `parse(text)` | The AST and its diagnostics. Never throws. A line with an error is kept as written in `paste.kept` (SPEC §4). |
| `emit(paste)` | The canonical text. Idempotent: `emit(parse(emit(p))) === emit(p)`. It never drops a line: a line with an error comes back as written, at the end of its block. |
| `isClean(paste)` | True when there is no error (warnings allowed). |
| `tidy(text, opts?)` | The editor's Tidy: makes every safe fix (SPEC §7), folds `Options` lines when `opts.optionFamily` names their family, then emits. |
| `applyFix(text, fix)` | Makes one diagnostic's `fix`. Each diagnostic has `hint`, how to fix it in a few words, and often `fix`, the edit. |
| `scopeLines(scope)` | A block's lines in canonical order, one entry per line. |
| `classSequence(paste)` | The class of every character level, by the reading rule (SPEC §5.4). |
| `classTotals(paste)` | One `Classes` entry per class, when `Classes` is written as runs. |
| `keyDef(key)`, `resolveKey(key)` | A key's definition: its type, the blocks it may go in, its marker. |
| `keyGroup(key)` | The key a line counts as: `Invocations` and `Options (Soul Techniques)` count as `Options`, `Spells (3rd)` as `Spells`. |
| `levelCap(key)`, `familyOf(key)`, `familyKey(code)` | A spell line's level cap; an option line's family; the family key for a family code. |
| `isAbilitySlot(group)`, `abilityOf(group)` | Whether a detail group is an ability pick, and which ability (`[CHA]`, or `[+1 CHA]` on a 2024 half feat). |
| `foldOptions(paste, family)` | Moves plain `Options` lines onto their family key, with family data you supply. |

SPEC 0.7 keys still parse, with a `W005` warning, and emit in their 0.8 form (SPEC §2.6, §5.6).

### The checker and the slot table

`check(paste, slots, supplement)` from `dndpaste/check` needs game data: a **slot table** (what
each class, species, background, feat and option asks for, by level) and a small hand-kept
**supplement** for choices the data gives only as prose. The package ships the SRD subset
(`dndpaste/data/srd/slots.json`) and the supplement. A fuller table comes from your own data
folder: `node scripts/extract-slots.mjs <data-folder>` writes `data/slots.json` (full, never
committed) and `data/srd/slots.json`. Names, counts, levels and option lists only, no rules text.

Findings are warnings or infos, never errors. Each has a code:

| Code | Kind | Meaning |
|---|---|---|
| C001 | missing | a pick the build still owes; `at` names the key and level block to add it to |
| C002 | misplaced | a pick at a level or class that can't have it; a `Subclass` in the wrong block gets `at` too |
| C003 | unresolved | a name that matches nothing, a bare Unearthed Arcana name, or a homebrew, Unearthed Arcana or unknown book code |
| C004 | redundant | something the rules give anyway, or a name repeated on one Gear line |
| C005 | unplaced | a header pick that more than one class could own |
| C006 | extra | a pick beyond what the rules grant; accepted, since a DM may allow it |

`normalise(paste, slots, supplement)` returns a new paste with redundant lines removed, repeated
Gear names written as `x2`, and `Options` lines moved onto their family key. `finalScores` adds up
the ability scores. `UA_SOURCES` (`dndpaste/sources`) lists the Unearthed Arcana codes the checker
knows.

A name with no book code means its newest printing under the paste's `Rules`, or in either edition
when there is none. A core book wins over a setting book or an adventure of the same edition. The
slot table's `meta.sourceDates` (release date per book code) and `meta.settingSources` carry what
this needs.

## Command line

After `npm run build`, `bin/dndpaste.mjs` (or `dndpaste` once installed):

- `dndpaste check <file>` prints diagnostics and findings, with each one's hint and code. It exits 1
  on an error and 0 otherwise, so a sparse paste passes. `--strict` also exits 1 on any warning.
  `--info` shows info-level findings too, `--json` prints `{ diagnostics, findings }` with the
  shapes above, and `--slots <path>` picks a slot table (default `data/slots.json`, else
  `data/srd/slots.json`).
- `dndpaste emit <file>` prints the canonical text; a line with an error is kept, and the exit
  code is 1 when there is one. `dndpaste tidy <file>` makes the safe fixes first.
  `dndpaste normalise <file>` prints the text after `normalise`.
- `-` reads stdin; `--help` shows usage; a usage error exits 2.

## The site's endpoints

The share site (<https://dndpaste.fcomfy.workers.dev>, `site/`, brief in [`SITE.md`](SITE.md)) takes
and gives builds as text:

- `POST /` with a JSON body `{ "title": "…", "author": "…", "paste": "…" }` saves a build. A request
  from another site's page is refused (its `Origin` must be the site's own, or absent, as from a
  server). The reply is `{ id, url, key, edit }`: `edit` is the private edit link, and `key`
  appears only in this reply. A paste with an error is refused, warnings pass.
- `GET /<id>/raw` is the text as saved, `/<id>/canon` its canonical form, and `/<id>/json` is
  `{ title, author, paste, created, edited, revision }`: the metadata and the raw text, not the AST.
  Run `parse` on `paste` to read it. `/<id>/<n>/…` is revision n. All of them allow any origin.

## Develop

- **Build:** `npm run build` writes `dist/src/*.js` (ESM and `.d.ts`) and `dist/dndpaste.umd.cjs`.
- **Verify:** `npm run verify` runs the typecheck, the lint and the tests, including a byte-for-byte
  round trip of `fixtures/`. `npm run verify:site` does the same for the site.

## Licence

Code: MIT (`LICENSE`). SRD-derived data: CC-BY-4.0 attribution in `NOTICE.md`.

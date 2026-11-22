# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

## Unreleased
- **SPEC 0.12 (draft): Masteries add up, like Spells** (D337, D342–D344). A level's `Masteries` line lists only the
  masteries new at that level; `-Name` drops one (a swap is `Masteries: Flail, -Sap`); a name the build already holds
  is ignored. `Prepared` stays a snapshot. A 0.11 paste whose later lines only add reads the same, with no
  diagnostic. A later line that repeats held names and leaves one out now keeps that one and warns **`W008`**; its
  fix (not safe) writes the new names and the drop. Tidy and the checker's `normalise` rewrite the lines that only
  add as additive ones and leave a `W008` line as written; `emit` alone keeps every line.
- **Feat bonuses count with no `+x`** (D334, D340, D341). `Feat: Ability Score Improvement [CHA]` is +2 CHA;
  `[INT, CON]` and `[+1 INT, CON]` are +1 INT, +1 CON; the checker no longer reports the bare form. A half feat with
  a fixed increase and no pick (`Durable`, `Keen Mind`, the 2024 `Great Weapon Master`, 25 feats in 5etools) adds its
  +1 in `finalScores`. A picked half feat (`Grappler [STR]`) counted already.
- Library: `loadoutAt(paste, level)` gives the masteries held and the `Prepared` snapshot at a level, data-free
  (also from `dndpaste/check`); `masteryWalk(paste)` reads each level's line (added, repeated, left out, held);
  `foldMasteries(paste)` is Tidy's rewrite. The slot table's feats get `abilityFixed` (`{ "con": 1 }`), written
  only when a feat has one: regenerate `data/slots.json`. `SPEC_VERSION` is `"0.12"`.
- Fixtures: `masteries-fighter` in 0.12 form; `fixtures/v0.11/masteries-fighter` keeps the snapshot lines, and a
  test checks it reads the same at every level and converts.

### Migrating from 0.11
Readers: use `loadoutAt` (or sum the lines) for a level's masteries instead of reading the last `Masteries` line.
Writers: write only the new masteries per level, and `-Name` for a swap. Saved pastes go through Tidy once.

| 0.11 | 0.12 |
|---|---|
| `L4` `Masteries: Longsword, Sap, Handaxe, Lance` (after `L1` `Masteries: Longsword, Sap, Handaxe`) | `L4` `Masteries: Lance` |
| `L10` `Masteries: Longsword, Handaxe, Lance, Flail` (Sap left out: a swap) | `L10` `Masteries: Flail, -Sap` (the `W008` fix) |
| `Feat: Ability Score Improvement [+2 CHA]` | unchanged; `[CHA]` also reads as +2 |
| `Feat: Ability Score Improvement [+1 INT, +1 CON]` | unchanged; `[INT, CON]` also reads as +1/+1 |

## 0.11.0 — 2026-11-21
- **SPEC 0.11: scores** (D320, D323, D326). Tidy and `emit` write the base `Scores` line named, with `/`, full or
  partial: `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15`, `Scores: DEX 16/CHA 17`. Six numbers
  (`8/14/13/12/10/15`) and the comma form (`DEX 16, CHA 17`) still read, with no diagnostic, and mean the same.
  The increase line keeps its commas.
- An optional method marker on the base line: `Scores (standard array): …`, `Scores (point buy): …`,
  `Scores (custom): …`, read in any case and written in lower case. Not written by default; the parser never compares
  it with the numbers. An unknown method is `E002`; a marker on an increase is `E012` with a safe fix that drops it;
  a marked line outside the header is `E005`. The AST's `scores` value gets an optional `method`
  (`"standard-array" | "point-buy" | "custom"`).
- Library: `scoreKind(values)`, data-free, says whether a base is the standard array, point-buy legal (with the
  points left of 27) or custom, on the known numbers of a partial base too; the constants `STANDARD_ARRAY`,
  `POINT_BUY_COST`, `POINT_BUY_BUDGET` are numbers only. In the main module and the UMD build, and exported from
  `dndpaste/check` beside `finalScores`. Also exported: `lineOfValue` (a scope line's text, the marker included) and
  `methodWords`.
- Build: the UMD file loads again. 0.10.0's `dist/dndpaste.umd.cjs` kept an `export { shortLineage } from …` line
  and failed to load as a script; a test now loads it.
- Fixtures are in 0.11 form; `fixtures/v0.10/` keeps `shigen` and `heavenly-archer-v3` with six numbers, and a test
  checks they convert.

- Site (T8.4, D321–D325, D331–D333): a click on a base score opens a list titled with its final value
  (`WIS 15 → 19 (+4)`), with the method chip in its corner and the swaps the method allows. A chip at the end of
  the `Scores` line says `Std. Array`, `Point Buy 2/27` or `Custom`; its chevron lists the methods, and a pick
  rewrites a written marker. Start a build asks for the method and remembers it. The shared and printed pages
  carry the same mark. The page renders the slash form (`RENDER_VERSION` bump).
- Site (M8, D302–D319, deployed 2026-11-21): name lists open on any empty key, however the line got there, and a
  click on a written name lists what can replace it. Every list holds up to 60 rows. A level-up line after the last
  block adds the next level with the lines it owes, and the owed-line fixes are `+ Add …` chips. After a write,
  the caret moves to the next open choice. A `Classes:` line that counts fewer levels than the headers shows an
  alert chip.

### Migrating from 0.10
Readers need nothing: every 0.10 paste reads as before. A writer's emit and snapshot tests see the new base line;
a reader that matched the old text should parse instead:

| 0.10 | 0.11 |
|---|---|
| `Scores: 8/14/13/12/10/15` | `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15` |
| `Scores: STR 8, DEX 14, CON 13, INT 12, WIS 10, CHA 15` | `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15` |
| `Scores: DEX 16, CHA 17` | `Scores: DEX 16/CHA 17` |
| `Scores: +2 WIS, +1 DEX` | unchanged |
| (new) | `Scores (point buy): STR 15/DEX 14/CON 13/INT 10/WIS 10/CHA 8` |

Code building lines from `scopeLines`: the key stays `Scores` for the base line; write it with `lineOfValue` to keep
the method marker. The share site bumps `RENDER_VERSION` (D320).

## 0.10.0 — 2026-11-20
- **SPEC 0.10: the lineage format** (D280–D287). A species' defining pick goes in brackets on the `Species` line,
  then its spellcasting ability: `Species: Elf [Drow; WIS]`, `Species: Dragonborn [Black]`, `Species: Goliath [Fire]`.
  2014 subraces use the same form, with the source after the name as on every item: `Species: Elf|PHB [Wood]`.
  An `Ability: WIS` line in the Species block still reads, with no warning, and is written in the brackets.
- Library: 0.9 pastes keep working. A lineage `Feature` line in the Species block (`Feature: Elven Lineage [WIS; Wood]`)
  reads with `W006` and `Species: Elf (Wood)|PHB` with `W007`; both carry a safe fix, and Tidy and `emit` write the
  bracket form. `Elf [Wood]|PHB` (the source after the brackets) is `E011` with a safe fix (D286).
- Checker: lineage and ability slots on the `Species` line. `Elf|PHB [Wood]` maps to the data's `Elf (Wood)|PHB`;
  `Elf [Lorwyn]` picks the printing that offers Lorwyn; a missing lineage names the bracket form
  (`Elf [Drow | High | Wood]`); Gnomish Lineage's ability is in the supplement (`lineageAbility`). `Wood Elf` and
  `Black Dragonborn` read as `Elf [Wood]` and `Dragonborn [Black]`, with an info; `normalise` writes them, and so does
  `tidy` given `TidyOptions.species` (the checker's new `speciesLineage`). New exports: `speciesPicks`,
  `shortLineage`, `speciesLineage` (D287).
- Fixtures `druid-custom-background`, `mc-planned-20`, `mc-planned-20-families` are in 0.10 form.
- Site (T7.2, D291–D298): the editor writes 0.10. `Species: Elf [` lists the lineages, then the abilities, with the
  hint "lineage; ability"; picking a species with lineages or 2014 subraces writes `Elf []` / `Dwarf []` and opens the list; a Species
  line shows `[lineage]`, `[legacy]` or `[subrace]` as ghost text, and Tab writes the brackets; the missing-lineage
  fix writes the brackets. A lineage keeps its species' skill list (`Elf [Drow]`). The 0.9 `Feature: Elven Lineage`
  line is still offered (ability first, then lineage) and still warns. 2014 subraces and a source's species
  variants (`Dragonborn (Black)`) are lineage options of their base, no longer species names. Tidy writes
  `Wood Elf` as `Elf [Wood]`, and turns on when that is its only change. `/guide` and its example use the bracket form; saved shares re-render
  (`RENDER_VERSION` 8). `shortLineage` is now in the data-free library too.
- Library: the checker no longer counts 2024 origin languages as extras: Common is free and two more fill the origin,
  written in the Background, Species, header or L1 block (D272).
- Site only (T6.3): book titles read clean ("Project Lamordia", D273; saved shares re-render); `/codes` sorts at phone
  width (D274); a plain names line can give a feat's ability pick, `Feat: Name|BOOK [General; INT, WIS, CHA]` (D275);
  a `/sources` copy pass (D277). Fixtures `shigen` and `vice` write their feats' CHA picks (D276).
- Library: `dndpaste/extract` (D246, D260): the slot extractor as a pure function (`extractSlots`, `mergeData`,
  `srdSubset`); `scripts/extract-slots.mjs` now runs on it, with the same output.
- Site, deployed 2026-11-20 (1031bf4): `/sources`, your own sources (M6, D244–D270). A hand-written names file, a folder from this
  computer or a GitHub file or folder link adds names to the editor's autocomplete, the options inside `[ ]` and the ghost pick counts. Kept in this
  browser only; GitHub is fetched by the browser and checked again on each visit (CSP `connect-src` allows GitHub's
  API and raw hosts only). SRD names are hidden per book and kind where yours stand in (D255); the list groups by book or
  by source, with kinds switched per row (D267); species variants such as "Dragonborn (Black)" are left out (D268).
- Site only, deployed 2026-11-20 (e04074d): one-click fix buttons survive the live CSP (D240); name lists put the
  line's class first and dim the rest (D241, D243); a pick that asks a detail opens its brackets (D242).

## 0.9.0 — 2026-11-19
- **SPEC 0.9** (D180–D185, additions only; a minor version per FORMAT-UPDATES §1). Every 0.8 paste reads
  and emits as before, with no new warning: nothing renames, so there is no alias and no `W005`.
  - Option families get their own keys: `Invocations`, `Metamagic`, `Maneuvers`, `Infusions`,
    `Arcane Shots`, `Runes`, `Disciplines`, `Pact Boon`. They sit between `Masteries` and `Options` in
    the canonical order. `Options` stays valid for any family (D180, amends D27).
  - `Options` takes a family marker, an open list as `Feat`'s: `Options (Soul Techniques): …`. A family
    key's name, singular or plural, in any case, folds into that key, and `emit` writes the key:
    `Options (invocation): …` → `Invocations: …`. `Masteries` is a family too: `Options (Mastery)` reads as
    `Masteries` (D181, D182). Both spellings in one scope are `E003`.
  - `Spells` and `Prepared` take a level cap, `1st` to `9th`: `Spells (6th): Mass Suggestion`, the highest
    level the line picks from. It is its own line beside the uncapped one (D184).
  - Class-feature picks stay `Feature` lines: `Feature: Divine Order [Thaumaturge]` (D183).
  - `E002` also covers a marker on a key that takes none, and a cap outside `1st`–`9th`.
- Checker (D185): family, marked and capped lines count into the same slots as `Options` and `Spells`. An
  option of another family on a family line is `misplaced`/warning. An open marker is matched to the
  table's family names and codes: a near miss is `unresolved`/warning ("did you mean"), an unknown one
  `unresolved`/info. A spell above its line's cap is `misplaced`/warning. `normalise` also reaches into
  family and capped lines.
- Library: `resolveKey`, `keyGroup`, `levelCap`, `familyOf`; `KeyDef.marker` and `KeyDef.family`; `keyDef`
  resolves marked keys (`Options (Invocation)` → `Invocations`, `Spells (3rd)` → `Spells`). `SPEC_VERSION`
  is `"0.9"`.
- Fixtures: `mc-planned-20-families` (0.9 form of `mc-planned-20`) and its long form in `noncanonical/`.
- **Wide user test fixes** (D192–D197, D200–D206). SPEC 0.9 adds a `Note` key for free text (D200), a
  chosen form in brackets on pacts and summons (`Pact of the Chain [Imp]`, `Find Steed [Warhorse]`),
  highlights of granted features and spells as plain lines (D201), and `[+1 CHA]` as `[CHA]` on a 2024
  half feat (D206).
  - Library: every diagnostic has a `hint` and often a `fix`; `applyFix`, `tidy` (makes the safe fixes,
    never refuses), `foldOptions`, `familyKey`, `abilityOf`. `emit` keeps a line with an error as written
    (`Paste.kept`, D202). `UA_SOURCES` in `dndpaste/sources` (D205).
  - Checker: owed picks say "N of M written; add K at Ln Class" with an `at` target; an unresolved
    Subclass counts as picked; granted spells and bare features are silent; homebrew, Unearthed Arcana and
    unknown codes are infos; repeated Gear names; finding codes C001–C006 (D204). `normalise` writes `xN`
    and folds Options lines.
  - CLI: `check` exits 1 on errors only, `--strict` on warnings too; hints and codes printed; `emit`
    keeps error lines; `tidy` command. Package exports `dndpaste/check` and the SRD slot table.
  - Extract: `meta.sources`; 2014 expanded spell lists are not granted; options record granted spells.
  - README: install, recipe, helpers, checker, CLI, site endpoints. Guide: D192–D198 copy.
- **Subclass placement and bare names** (D220, D221). A `Subclass` line goes in the level block where its
  class gains the subclass, or in the header; any other block is `misplaced`/warning with "move it to L3
  Wizard" and an `at` target. `Diviner Wizard` (short name, then class) resolves. A name with no code
  means its newest printing within `Rules` (newest of all without), a core book before a setting book
  of the same edition; a bare name only Unearthed Arcana prints is a warning. Extract: `meta.sourceDates`,
  `meta.settingSources`; `isUaSource` exported from `dndpaste/check`.
- Site (needed by the site tests, outside the editor): key-table rows for the family keys, and the
  render kind and marker style for marked and capped keys. `RENDER_VERSION` is 6 (5 for the family keys, 6 for empty lines left out of the view and the Sources line, D216, D217).

### Migrating from 0.8
Readers and writers need nothing: 0.8 pastes keep their meaning and their canonical form. A writer may
switch to the new forms line by line:

| 0.8 | 0.9 |
|---|---|
| `Options: Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]` | `Invocations: Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]` |
| `Options: Riposte, Trip Attack` | `Maneuvers: Riposte, Trip Attack` |
| `Options: Quickened Spell` | `Metamagic: Quickened Spell` |
| `Options: Pact of the Chain` (2014) | `Pact Boon: Pact of the Chain` |
| `Spells: Counterspell, Mass Suggestion` (Warlock 11) | `Spells: Counterspell` and `Spells (6th): Mass Suggestion` |

Code reading the AST: read options from every key whose `keyGroup` is `Options` (`Options`,
`Options (<marker>)`, the family keys), and spells from every key whose `keyGroup` is `Spells` or
`Prepared` (`levelCap` gives the cap). A reader that only looks at the `Options` or `Spells` key misses
the new lines.

## 0.8.0 — 2026-11-16
- **SPEC 0.8** (D106–D113, decided in the pre-deploy review): fewer keys, one canonical place for each pick.
  A 0.7 paste still parses, with a `W005` "renamed key" warning per old line, and emits in 0.8 form (D113).
  - Ability picks are the first detail of the `Feat`, `Feature` or `Options` that asks them; no ability asked,
    no leading slot (D107). `Ability` goes.
  - `Scores` carries increases: the `+` decides (`Scores: +2 CHA`), in any scope; a base stays header-only
    (D108). `ASI` goes. A level's ASI is `Feat: Ability Score Improvement [+2 CHA]` in both editions; the
    checker accepts `ASI` as its short name (D109).
  - `Feat` takes an optional slot marker: `Feat (Fighting Style): Archery`. Open list, kept by emit; the
    checker matches it to 5etools' feat categories and hints the nearest name on a typo (D110).
    `Fighting Style` goes.
  - `Gear` replaces `Equipment` and `Items`; placement decides starting pick (background, L1) or gear in
    play (D111). Quantities on `Gear` only.
  - Named scores take `/` too: `STR 8/DEX 13/CON 14` (D106).
  - An empty value is "not chosen yet": `W004`, an empty value in the AST, kept by emit; the checker reads
    it as absent (D112). `E006` is retired.
- AST: a `scores` value has `increase`; the `asi` value type is gone; `{ type: "empty" }` is new;
  `EntityBlock.item` may be `null`; a marked feat line is the scope key `Feat (<marker>)`. New exports:
  `LEGACY_KEYS`, `scopeLines`, `splitMarker`, `isFeatKey`, `isAbilitySlot`, `ASI_FEAT`, type `Bonus`.
- Checker: increases, ASI feat lines, slot markers, `Gear` placement and to-dos as above. The slot table
  carries `featCategories`, read by the extract from the mirror's `js/parser.js` (names only); the committed
  SRD table gains just that field. On every fixture the full-table findings and final scores match 0.7.
- `FORMAT-UPDATES.md`: a DRAFT policy for format changes (⚑ under D113).

### Migrating from 0.7
Readers need nothing: 0.7 keys keep reading for as long as `Paste: 1` (D142; was "until 1.0"). Writers switch line by line:

| 0.7 | 0.8 |
|---|---|
| `Ability: WIS` + `Feature: Elven Lineage [Wood]` | `Feature: Elven Lineage [WIS; Wood]` |
| `ASI: +2 CHA, +1 DEX` (species or background block) | `Scores: +2 CHA, +1 DEX` |
| `ASI: +2 CHA` (level block or header) | `Feat: Ability Score Improvement [+2 CHA]` |
| `Fighting Style: Archery` | `Feat (Fighting Style): Archery` |
| `Equipment: A`, `Items: Cloak of Protection` | `Gear: A`, `Gear: Cloak of Protection` |
| `Feat: Skilled [; Arcana, History, Insight]` | `Feat: Skilled [Arcana, History, Insight]` |
| `Skills:` (was `E006`) | `Skills:` is a to-do (`W004`) |

Code reading the AST: read increases from `Scores` (`value.increase`), feats from every `Feat` and
`Feat (<marker>)` key (`isFeatKey`), gear from `Gear`; handle `{ type: "empty" }` and a `null` entity item.
To rewrite stored pastes in 0.8 form, pass them through `emit(parse(text))`.

## 0.7.0 — 2026-11-10
- **SPEC 0.7** (additions only): an optional header key `Producer` stamps what wrote the paste and its
  version (`Producer: character-forge 2.1`), free single-line text (D62). Canonical emit places it right
  after `Paste`. No checker finding, present or absent; `emit` keeps it.
- **SPEC 0.6** (additions only): an optional `HP` key records the hit-point method (D59). Header
  `HP: Fixed` or `HP: Rolled`; a level block may override it with `HP: Fixed`, `HP: Rolled` or the die
  result rolled there (`HP: 7`). Canonical emit places it after `Classes` and first in a level block.
  Checker: a level-1 line or a roll above the level's class die is `misplaced`/warning; a level method
  that repeats the header is `redundant`/info and `normalise` removes it; an absent key has no finding.
  Replaces character-forge's interim `X-HP` extension key (D60, cf-D163).

## 0.6.0 — 2026-09-30
- **SPEC 0.5** (additions only, D46–D56), from Francesco's calls on the real-build stress wave (cf-D81):
  - `Scores` takes a named, partial form of base scores (`Scores: DEX 15, CON 13`); canonical emit
    picks the six-number form when all six are known. `finalScores` returns `null` (unknown) for an
    ability left out, never 10 (D46).
  - `Classes` accepts runs in the order taken, as cumulative class levels
    (`Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14`). Canonical emit folds them to totals and writes a
    level header at each class change of a timeline. One reading rule gives the class of every level,
    exported as `classSequence` (plus `classTotals`, `foldClasses`) and used by the checker. New
    diagnostics: `E016` (header contradicts the runs), `W003` (header with no levels left; was a checker
    warning). The 0.5.0 library sums runs silently: pin 0.6.0 before accepting them (D49).
  - Checker: a feat an option grants (Lessons of the First Ones) is claimed from a `Feat` line in the
    same block, not counted as an ASI-slot feat (D50); Scholar expertise at Wizard (XPHB) 2 and option
    feat grants in the data (D51); an Origin feat at an ASI level is legal (D54); generic magic variants
    resolve from `magicvariants.json` plus the base item (D55).
  - Fix: `emit` writes extension keys back as authored (`X-Plan-B`, D56).
  - No change, recorded: unnamed picks stay absent (D47), unplaced lines stay class-less (D48), one paste
    is one build (D52), a written class order is a claim (D53).
- The extract reads the current 5etools mirror (`5etools-src-main`); the SRD table is regenerated and now
  carries magic variants and base-item matcher keys. Re-run `node scripts/extract-slots.mjs` for the full
  table. The UMD build inlines `check.ts`'s one import from `dndpaste.ts`.
- T2.7 review-nit cleanup: one `+N` stripper and one index builder shared by `check` and
  `finalScores` (`findByName` gone); Epic Boon feats cap at 30, and a cap overshoot never lowers a
  score; `--slots` without a path is a usage error. 87 tests; fixture output unchanged.

## 0.5.0 — 2026-09-05
- M2 tail (D41–D44), built by five parallel worktree agents + a fresh-eyes review: spell-list
  legality (`misplaced`, per-spell class/subclass lists in the extract), 2014 starting-equipment
  picks (`missing`/info, generic groups skipped), `bin/dndpaste.mjs` CLI (`check`/`emit`/
  `normalise`, `--json`/`--info`/`--slots`), `finalScores` ability arithmetic (cap 20), dangling
  `Class 0` → `unplaced`/info (D42), name-alias contains fallback (D43). 84 tests.
- `data/supplement.json` is now tracked (it was swallowed by the `data/*` ignore rule).
- Distribution stays a copied UMD (D44); consumers pin this version.

## 0.4.0 — 2026-09-04
- Project seeded from an 8-round scoping interview (D1–D17); SPEC 0.1 → 0.3 through Francesco's
  review and a 5-persona panel (D18–D32); SPEC 0.4 adds `Items` and the extras policy (D33–D34).
- `src/dndpaste.ts`: parser + canonical emitter, zero deps, ESM + UMD (`dist/dndpaste.umd.cjs`).
- `src/check.ts`: data-driven checker + `normalise`; `scripts/extract-slots.mjs` builds the slot
  table from a 5etools mirror (SRD subset committed); `data/supplement.json` for prose-only slots
  (D35–D36).
- Stress wave: 65 pastes (22 from Francesco's Notion builds) → 11 fixes, `stress/REPORT.md`
  (D37–D38); Medium default size and `+N` item prefix (D39–D40); ten fixtures, 52 tests.

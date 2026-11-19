# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

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

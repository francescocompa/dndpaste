# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

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
Readers need nothing: 0.7 keys read until 1.0. Writers switch line by line:

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

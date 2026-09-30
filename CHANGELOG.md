# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

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

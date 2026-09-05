# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

## Unreleased
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

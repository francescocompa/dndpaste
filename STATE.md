# STATE — dndpaste

## TL;DR (2026-09-04 · M1 done, M2 first cut shipped · 48 tests green)
- SPEC 0.4: 0.3 signed off by Francesco; 0.4 adds the `Items` key (magic items, D33) and the extras
  policy (accepted, info severity, D34). `Feat` and `Fighting Style` are lists everywhere (D29 amended).
- Library: `src/dndpaste.ts` (parse/emit) + `src/check.ts` (check/normalise); UMD bundles both.
  `npm run verify` green: 48 tests. Fixtures: vice, shigen, flat-multiclass, druid-custom-background.
- Checker data: `scripts/extract-slots.mjs` → `data/slots.json` (gitignored) + `data/srd/slots.json`
  (committed); `data/supplement.json` hand-kept (D35). Missing vs played levels only (D36).
- The checker already caught two real sheet defects (fixtures/README.md).
- **Next action:** M2 tail (PLAN) or jump to M3 — the my-spellbook export (L5.5), the first real producer.
- **Waiting on Francesco:** M2 tail vs M3 order; GitHub remote; ⚑ Spellfire Spark / Fey Sentinel ability pick.

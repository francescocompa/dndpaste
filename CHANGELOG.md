# Changelog

Newest first. Versions follow `package.json`; the spec has its own number inside `SPEC.md`.

## 0.4.0 — 2026-09-04
- Project seeded from an 8-round scoping interview (D1–D17); SPEC 0.1 → 0.3 through Francesco's
  review and a 5-persona panel (D18–D32); SPEC 0.4 adds `Items` and the extras policy (D33–D34).
- `src/dndpaste.ts`: parser + canonical emitter, zero deps, ESM + UMD (`dist/dndpaste.umd.cjs`).
- `src/check.ts`: data-driven checker + `normalise`; `scripts/extract-slots.mjs` builds the slot
  table from a 5etools mirror (SRD subset committed); `data/supplement.json` for prose-only slots
  (D35–D36).
- Stress wave: 65 pastes (22 from Francesco's Notion builds) → 11 fixes, `stress/REPORT.md`
  (D37–D38); Medium default size and `+N` item prefix (D39–D40); ten fixtures, 52 tests.

# STATE — dndpaste

## TL;DR (2026-09-04 · M1 essentially done · parser + emitter green)
- SPEC 0.3 signed off by Francesco after his review and a 5-persona panel (D1–D32; O1–O4 open).
- `src/dndpaste.ts`: `parse`, `emit`, `isClean`, `KEYS`; zero deps; `npm run build` → ESM + `.d.ts`
  and `dist/dndpaste.umd.cjs` (global `dndpaste` in a browser, `require`-able in Node).
  `npm run verify` green: typecheck, eslint, 33 node:test cases incl. byte-for-byte round-trip of
  `fixtures/vice.dndpaste` and `fixtures/shigen.dndpaste`. UMD smoke-tested via `require`.
- **Next action:** M1 tail — add the two remaining fixture files (flat multiclass, SPEC §8.4), then
  M2 🔶 O2: the checker's data extract (`scripts/extract-slots`) from the 5etools mirror + the
  hand-kept supplement for prose-only slots (D30).
- **Waiting on Francesco:** GitHub remote (his account); ⚑ whether Spellfire Spark / Fey Sentinel
  ask an ability pick; O2 (extract shape) before M2 starts.

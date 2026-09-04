# dndpaste

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
Feat: Spellfire Spark|FRHoF

L1 Fighter
Fighting Style: Archery
Masteries: Longbow, Rapier, Warhammer

L2 Warlock
Options: Agonizing Blast [True Strike]
Cantrips: Blade Ward, True Strike
```

- **Spec:** [`SPEC.md`](SPEC.md) — core grammar (game-neutral) + the `dnd5e` profile.
- **Library:** `src/dndpaste.ts`, zero dependencies. `parse(text)` → AST with diagnostics
  (never throws); `emit(ast)` → canonical text, data-free; `isClean(ast)`.
- **Builds:** `npm run build` → `dist/src/dndpaste.js` (ESM + `.d.ts`) and
  `dist/dndpaste.umd.js` (single file for no-build pages, global `dndpaste`).
- **Verify:** `npm run verify` (typecheck, lint, tests incl. byte-for-byte round-trip of
  `fixtures/`).

A data-driven **checker** (what a build still owes, given 5etools-format data) is the next
milestone — see `PLAN.md`.

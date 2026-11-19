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
Feat: Spellfire Spark|FRHoF

L1 Fighter
Feat (Fighting Style): Archery
Masteries: Longbow, Rapier, Warhammer

L2 Warlock
Options: Agonizing Blast [True Strike]
Cantrips: Blade Ward, True Strike
```

- **Spec:** [`SPEC.md`](SPEC.md) — core grammar (game-neutral) + the `dnd5e` profile.
- **Library:** `src/dndpaste.ts`, zero dependencies. `parse(text)` → AST with diagnostics
  (never throws); `emit(ast)` → canonical text, data-free; `isClean(ast)`;
  `classSequence(ast)` → the class of every character level by the spec's reading rule
  (§5.4), with `classTotals(ast)` for one entry per class when `Classes` is written as runs;
  `scopeLines(scope)` → a scope's lines in canonical order, one entry per line. SPEC 0.7 keys
  still parse, with a `W005` warning, and emit in their 0.8 form (SPEC §2.6, §5.6).
- **Format changes:** [`FORMAT-UPDATES.md`](FORMAT-UPDATES.md) — how a change is proposed,
  aliased, released and retired (draft).
- **Builds:** `npm run build` → `dist/src/dndpaste.js` (ESM + `.d.ts`) and
  `dist/dndpaste.umd.cjs` (single file for no-build pages, global `dndpaste`).
- **Verify:** `npm run verify` (typecheck, lint, tests incl. byte-for-byte round-trip of
  `fixtures/`).

- **Checker:** `src/check.ts` — `check(paste, slots, supplement)` reports what a build still
  owes (**missing**), what sits at an impossible level (**misplaced**), names that do not resolve
  (**unresolved**), choices the rules grant anyway (**redundant**), header picks that could belong
  to several classes (**unplaced**) and picks the rules never granted (**extra** — accepted, a DM
  boon is a build fact). Findings are warnings or infos, never errors. `normalise` returns a new
  paste with the redundant lines folded away.
- **Slot table:** `node scripts/extract-slots.mjs [data-folder]` reads a local game-data folder
  (JSON) and writes `data/slots.json` (full, gitignored) and `data/srd/slots.json` (SRD-flagged entities,
  committed). Names, counts, levels and option lists only — no rules text. `data/supplement.json`
  is the hand-kept list of choice slots the data encodes only as prose.

The UMD file bundles parser, emitter and checker under one global.

- **CLI:** `bin/dndpaste.mjs` (after `npm run build`) — `dndpaste check <file>` prints diagnostics
  and findings and exits 1 on any error or warning (2 on a usage error); `--info` also shows
  info-level findings, `--json` gives machine output, `--slots <path>` picks a slot table
  (default `data/slots.json`, else `data/srd/slots.json`). `dndpaste emit <file>` and
  `dndpaste normalise <file>` print canonical text; `-` reads stdin; `--help` shows usage.

## Licence

Code: MIT (`LICENSE`). SRD-derived data: CC-BY-4.0 attribution in `NOTICE.md`.

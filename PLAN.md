# PLAN — dndpaste

> The queue. Decisions in `DECISIONS.md` (D1–D44). Status lines: ⏳ next · 🔶 decide-gate · 🔍 review gate.

## What it is (one paragraph)

A plain-text, Pokepaste-style format that replicates a D&D 5e build through every meaningful
choice point, by reference only (names, optional `|SOURCE`), never rules text. Sparse pastes are
first-class: a class name alone is valid. Two layers: a data-free **parser** (grammar, canonical
emit, round-trip) and a data-driven **checker** (which choices a build owes, from 5etools-format
data, official or homebrew). Core grammar is game-neutral; D&D 5e is the first **profile**.

## Grammar sketch (SPEC 0.3 is the truth; this is the shape)

```
<identifier line>?
<Key>: <value>                 header scope: Rules · Scores · Classes · unplaced choices

Species: <ref>                 entity block — its picks as key lines
<Key>: <value>
Background: <ref>              entity block
<Key>: <value>

L<n> <Class>                   level block, n = character level
<Key>: <value>
```
- Item: `[-]Name[|SRC] [slot; slot] x<qty>`; brackets for details, quotes for names containing `, ; : [ ]`.
- Choice keys: Subclass · Skills · Tools · Languages · Expertise · ASI · Ability · Feat · Fighting Style ·
  Masteries · Options (all optional-feature families) · Feature (named feature with a pick) · Cantrips ·
  Spells · Prepared · Equipment. Reserved: `---`, `Game:`, `Paste:`, `X-` keys.

## Milestones

### M0 — Seed the repo · size S
- [x] `~/Documents/GitHub/dndpaste` public repo (2026-09-04, not yet on GitHub): CLAUDE.md, PLAN.md, DECISIONS.md, STATE.md, SPEC.md skeleton, LICENSE (MIT), `.gitignore` reserving `data/` for future non-SRD extracts.
- [x] Content boundary stated up front: fixtures name WotC entities, never quote rules text.

### M1 — SPEC v0 + parser + fixtures (D17) · ✅ DONE 2026-09-04
- [x] **SPEC.md v0** (0.1 → 0.3 after his review and the panel, 2026-09-04): core grammar (EBNF), 5e profile (keys, value shapes, detail-group orders), canonical emit rules, error classes, versioning (`formatVersion` in spec, not in paste).
- [x] 🔍 **/panel on SPEC 0.2** (5 personas, 5–0 change) → D25–D32, SPEC 0.3. A second, cheaper panel pass on 0.3 is optional; his read is the gate.
- [x] `src/dndpaste.ts` `parse` → AST (SPEC §4); never throws; line on every diagnostic. (2026-09-04)
- [x] `emit` → canonical text, data-free (SPEC §5.5); fixtures round-trip byte-for-byte.
- [x] Zero deps; ESM + `dist/dndpaste.umd.cjs` (derived by `scripts/umd.mjs`; `.cjs` because the package is `type: module`); strict TS; `npm run verify` = typecheck + lint + test (33 tests).
- [x] Tests cover: sparse, identifier, quoting, quantity, drop, empty groups, `@n`, case, `X-` keys, every E-code. Fixture files: vice, shigen, flat-multiclass, druid-custom-background.
- [x] **Vice** and **Shigen** hand-written as dndpastes (`fixtures/`), parse clean and round-trip byte-for-byte from `~/Documents/D&D/D&D Character Builder/Characters` and round-tripped. Done-when: every choice on those sheets has a line, no invented key.
- [x] 🔶 Francesco read SPEC 0.3 + fixtures: "looks right" (2026-09-04).

### M2 — Checker · size M/L · ✅ 0.5.0 shipped 2026-09-05 (D35, D36, D41–D44)
- [x] `scripts/extract-slots.mjs` → `data/slots.json` + `data/srd/slots.json` (D35).
- [x] `src/check.ts` → missing / misplaced / unresolved / redundant / unplaced / **extra** findings + `normalise` (D30, D34). 15 tests on the SRD table; the two real builds run against the full table when present.
- [x] Stress wave 2026-09-04 (`stress/REPORT.md`): 65 pastes, 11 fixes, 9 open calls.
- [x] `+N` magic-variant prefix (D40); Medium default size (D39); six stress pastes promoted to fixtures (2026-09-04).
- [x] **M2 tail → 0.5.0** ✅ shipped 2026-09-05 (D41) · parallel worktree agents, sonnet@high, fresh-eyes review on the strong model before merge:
  - [x] T2.1 spell-list legality — extractor emits per-spell class lists; `Cantrips`/`Spells`/`Prepared` off the class's (or subclass's granted) list → warning. Done when: fixtures pass, a wrong-list spell on Vice-style paste is reported.
  - [x] T2.2 2014 starting-equipment picks — class + background `Equipment` choices from the extract (2014 only; 2024 letters already covered). Done when: a 2014 paste missing its pick is `missing`, a valid one is clean.
  - [x] T2.3 `bin/dndpaste` CLI — `check <file>` / `emit <file>` / `normalise <file>`, loads `data/slots.json` else `data/srd/slots.json`, exit 1 on warnings. Done when: runs on every fixture; `npm run verify` green.
  - [x] T2.4 ability-score arithmetic — `Scores` + species/background/ASI/feat increments → final scores, cap 20, warn on overflow or on an ASI that names an unknown ability. Done when: Vice and Shigen compute to the sheet values.
  - [x] T2.5 dangling `Class 0` → unplaced info (D42) + name-alias contains fallback (D43). Done when: both have a fixture line and a test.
- [x] 🔍 T2.6 fresh-eyes review (opus): 1 blocker + 4 should-fixes, all fixed; 0.5.0 cut.
- [ ] T2.7 cleanup from the review nits · sonnet@medium · size S: one `+N` stripper and one name lookup (`findByName` → `Index.resolve`; `finalScores` reuses `check()`'s indexes); `--slots` as last argument errors instead of silently defaulting; Epic Boon feats cap at 30, not 20. Done when: verify green, no behaviour change on fixtures.
- [ ] Homebrew: run the extract over a 5etools-format homebrew file and merge its slots (a homebrew file brings its own slots).

### M3 — First producer: my-spellbook export (L5.5 / A-03) · size S in that repo
- [ ] Copies `dist/dndpaste.umd.cjs` (global `dndpaste`); `levelGains`/`timelinePicks` → AST → `emit`. Scores line omitted. Logged in that repo's DECISIONS as the format L5.5 was waiting for.

### M4 — character-forge interview seeding · size M in that repo
- [ ] Paste → pre-filled chassis sections; interview asks only what the paste left unplaced or missing. References resolve against the KB at compile time as today.

### M5 — my-spellbook import · size M in that repo
- [ ] Paste → build, resolving refs against loaded sources; unresolved refs use the existing "not loaded" path (its D56).

### Later
- Variants / party blocks (D6). `Game:` header and a second profile (O1). Python port only if extract.py needs it.

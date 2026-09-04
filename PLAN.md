# PLAN — dndpaste

> The queue. Decisions in `DECISIONS.md` (D1–D17). Status lines: ⏳ next · 🔶 decide-gate · 🔍 review gate.

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

### M1 — SPEC v0 + parser + fixtures (D17) · size M
- [x] **SPEC.md v0** (0.1 → 0.3 after his review and the panel, 2026-09-04): core grammar (EBNF), 5e profile (keys, value shapes, detail-group orders), canonical emit rules, error classes, versioning (`formatVersion` in spec, not in paste).
- [x] 🔍 **/panel on SPEC 0.2** (5 personas, 5–0 change) → D25–D32, SPEC 0.3. A second, cheaper panel pass on 0.3 is optional; his read is the gate.
- [x] `src/dndpaste.ts` `parse` → AST (SPEC §4); never throws; line on every diagnostic. (2026-09-04)
- [x] `emit` → canonical text, data-free (SPEC §5.5); fixtures round-trip byte-for-byte.
- [x] Zero deps; ESM + `dist/dndpaste.umd.cjs` (derived by `scripts/umd.mjs`; `.cjs` because the package is `type: module`); strict TS; `npm run verify` = typecheck + lint + test (33 tests).
- [x] Tests cover: sparse, identifier, quoting, quantity, drop, empty groups, `@n`, case, `X-` keys, every E-code. ⏳ Still to add as `.dndpaste` fixture files: a flat multiclass and SPEC §8.4 (species block + custom background).
- [x] **Vice** and **Shigen** hand-written as dndpastes (`fixtures/`), parse clean and round-trip byte-for-byte from `~/Documents/D&D/D&D Character Builder/Characters` and round-tripped. Done-when: every choice on those sheets has a line, no invented key.
- [x] 🔶 Francesco read SPEC 0.3 + fixtures: "looks right" (2026-09-04).

### M2 — Checker · size M/L · 🔶 O2 first
- [ ] `scripts/extract-slots.*` from the 5etools mirror → compact "choice slots" JSON (class, subclass, species, background, feat: what is chosen, how many, at which level, from which pool). SRD subset committed, rest gitignored.
- [ ] `src/check.ts(ast, slots)` → missing / misplaced / unresolved / redundant / unplaced findings, plus `normalise(ast, slots)` (D30). Slot table = data extract **+ hand-kept supplement** for prose-only slots (D30).
- [ ] Homebrew: accepts any 5etools-format JSON as extra slot data (a homebrew file brings its own slots).

### M3 — First producer: my-spellbook export (L5.5 / A-03) · size S in that repo
- [ ] Copies `dist/dndpaste.umd.cjs` (global `dndpaste`); `levelGains`/`timelinePicks` → AST → `emit`. Scores line omitted. Logged in that repo's DECISIONS as the format L5.5 was waiting for.

### M4 — character-forge interview seeding · size M in that repo
- [ ] Paste → pre-filled chassis sections; interview asks only what the paste left unplaced or missing. References resolve against the KB at compile time as today.

### M5 — my-spellbook import · size M in that repo
- [ ] Paste → build, resolving refs against loaded sources; unresolved refs use the existing "not loaded" path (its D56).

### Later
- Variants / party blocks (D6). `Game:` header and a second profile (O1). Python port only if extract.py needs it.

# PLAN — dndpaste

> The queue. Decisions in `DECISIONS.md` (D1–D17). Status lines: ⏳ next · 🔶 decide-gate · 🔍 review gate.

## What it is (one paragraph)

A plain-text, Pokepaste-style format that replicates a D&D 5e build through every meaningful
choice point, by reference only (names, optional `|SOURCE`), never rules text. Sparse pastes are
first-class: a class name alone is valid. Two layers: a data-free **parser** (grammar, canonical
emit, round-trip) and a data-driven **checker** (which choices a build owes, from 5etools-format
data, official or homebrew). Core grammar is game-neutral; D&D 5e is the first **profile**.

## Grammar sketch that SPEC v0 must pin down (D4, D7, D12–D15)

```
<identifier line>?                       one line, free-form, no key — optional
<Key>: <value>                           header/unplaced lines
<blank>
L<n> <Class>[|SOURCE]                    level block header; n = character level
<Key>: <value>                           placed lines
```
- Value = item list, `,`-separated. Item = `Name[|SOURCE][ (detail; detail, item)]`. Leading `-` = dropped at this level.
- 5e profile keys (canonical): Rules · Species · Background · Scores · Classes · Subclass ·
  Skills · Tools · Languages · Expertise · Fighting Style · Masteries · Invocations · Metamagic ·
  Pact · ASI · Feat · Cantrips · Spells · Prepared · Equipment. Unknown keys: parse error (D1).
- Header-only keys: Rules, Species, Background, Scores, Classes. Everything else may be placed or unplaced.
- `Classes:` is the class order with levels (`Fighter 1 / Warlock 5`); blocks refine, never contradict.
- Custom background: `Background: Custom (+2 INT, +1 CON; Arcana, History; Calligrapher's Supplies; Magic Initiate (Wizard))` — detail groups in a fixed profile-defined order.
- Reserved, not in v1: blank-line-separated second block (variants/party, D6); `Game:` header (O1).

## Milestones

### M0 — Seed the repo · size S
- [ ] `~/Documents/GitHub/dndpaste` public repo: CLAUDE.md, PLAN.md, DECISIONS.md, STATE.md, SPEC.md skeleton, LICENSE (MIT), `.gitignore` reserving `data/` for future non-SRD extracts.
- [ ] Content boundary stated up front: fixtures name WotC entities, never quote rules text.

### M1 — SPEC v0 + parser + fixtures (D17) · size M
- [ ] **SPEC.md v0**: core grammar (EBNF), 5e profile (keys, value shapes, detail-group orders), canonical emit rules, error classes, versioning (`formatVersion` in spec, not in paste).
- [ ] 🔍 **/panel on SPEC v0** before code (grammar regrets are the expensive kind). Personas: a parser author, a Discord user pasting by hand, a 5etools data maintainer, a homebrew DM.
- [ ] `src/parse.ts` → AST (`header`, `unplaced[]`, `levels[]`, diagnostics); never throws; positions on every diagnostic.
- [ ] `src/emit.ts` → canonical text; `parse(emit(parse(x)))` is a fixed point.
- [ ] Zero deps; ESM + `dist/dndpaste.umd.js`; strict TS; `npm run verify` = typecheck + lint + test.
- [ ] Fixtures: sparse (class only), flat, mixed, full multiclass, homebrew refs, custom background, spell swap, every error class.
- [ ] **Vice** and **Shigen** hand-written as dndpastes from `~/Documents/D&D/D&D Character Builder/Characters` and round-tripped. Done-when: every choice on those sheets has a line, no invented key.
- [ ] 🔶 Francesco reads the two real pastes and signs the shape off.

### M2 — Checker · size M/L · 🔶 O2 first
- [ ] `scripts/extract-slots.*` from the 5etools mirror → compact "choice slots" JSON (class, subclass, species, background, feat: what is chosen, how many, at which level, from which pool). SRD subset committed, rest gitignored.
- [ ] `src/check.ts(ast, slots)` → missing / unplaced / illegal-level / unknown-reference findings. No inference (D4).
- [ ] Homebrew: accepts any 5etools-format JSON as extra slot data (a homebrew file brings its own slots).

### M3 — First producer: my-spellbook export (L5.5 / A-03) · size S in that repo
- [ ] Copies the UMD file; `levelGains`/`timelinePicks` → AST → `emit`. Scores line omitted. Logged in that repo's DECISIONS as the format L5.5 was waiting for.

### M4 — character-forge interview seeding · size M in that repo
- [ ] Paste → pre-filled chassis sections; interview asks only what the paste left unplaced or missing. References resolve against the KB at compile time as today.

### M5 — my-spellbook import · size M in that repo
- [ ] Paste → build, resolving refs against loaded sources; unresolved refs use the existing "not loaded" path (its D56).

### Later
- Variants / party blocks (D6). `Game:` header and a second profile (O1). Python port only if extract.py needs it.

# Fixtures

Hand-written pastes used as conformance cases. They **name** game entities and nothing else
(content boundary, CLAUDE.md). `vice` and `shigen` are Francesco's two real builds (D17); the
compiled sheets they mirror live outside this repo. Both follow SPEC 0.3 (entity blocks, bracket
details, `Options`). Every file in `fixtures/` is in SPEC 0.8 form (migrated 2026-11-16 through the
0.8 parser and emitter). `fixtures/v0.7/` keeps the 0.7 text of `druid-custom-background` (an
`Ability` line, background and level `ASI`): the test asserts it reads with `W005` only and emits
its 0.8 sibling. `noncanonical/st-extension` and `noncanonical/st-quoting` are 0.7 text too.
`mc-planned-20-families` is `mc-planned-20` in SPEC 0.9 form (family keys, `Spells (6th)` for
Mystic Arcanum, D180–D184); `noncanonical/mc-planned-20-families` is its long form (`Options (invocation)`,
`Options (Mastery)`, `Spells (6TH)`), which emits as the canonical file. A test checks both fixtures get the
same checker findings as `mc-planned-20`. Since SPEC 0.10 (D280) the fixtures write the lineage on the `Species`
line (`Species: Tiefling|XPHB [Infernal]`); `v0.7/druid-custom-background` and `noncanonical/mc-planned-20-families`
keep the old `Feature` line and read with `W006`. Since SPEC 0.11 (D320) the base `Scores` line is
named, `Scores: STR 8/DEX 13/…`; `v0.10/shigen` and `v0.10/heavenly-archer-v3` keep the six-number form, and a test
asserts they read clean and emit their canonical sibling. Since SPEC 0.12 (D337) `Masteries` adds up across levels;
`v0.11/masteries-fighter` keeps the 0.11 snapshot lines, and a test asserts it reads the same at every level and
Tidies to `masteries-fighter`.

Fidelity notes:
- `vice`: the paper sheet lists three invocations at level 1; a 2024 Warlock has one at level 1 and
  three at level 2, so two are placed at `L2`. Skills chosen at Warlock 1 are not recorded on the
  compiled sheet and are omitted (D13/D24). Specialized Design's two tools are a `Tools` line in
  the Species block (D26). `Fey Pact|HB [CHA]` — the homebrew origin feat's casting ability.
  Planned levels 3–5 are blocks above `Classes: Warlock 2` (D20).
- `shigen`: the Human origin feat is a `Feat` line in the Species block; the homebrew background
  is fully specified in its block (D21, D26). The six Warlock spells are known only as the current
  prepared set, not by the level each was picked, so they sit unplaced in the header — the mixed
  form (D4, D28). Skills chosen at Fighter 1 are not on the compiled sheet and are omitted. Spellfire Spark
  asks for an ability pick, so CHA sits in its first detail slot; so does `vice`'s Fey Sentinel, a
  D&D Beyond Drops feat written `|HB` (D276).

## What the checker says about them (full extract, 2026-09-04)

The checker caught two genuine defects in the source sheets, which is the proof point M1 wanted:
- `shigen`: **Agonizing Blast at Warlock 1** — the 2024 invocation needs Warlock level 2 (misplaced).
- `vice`: **one prepared spell short** at Warlock 2 (the 2024 table gives 3; the sheet lists Hex and
  Armor of Agathys). Hex is also flagged redundant: the 2024 Great Old One grants it.

`flat-multiclass` shows the extras policy: `Feat: Resilient` on a Fighter 3 / Warlock 3 has no ASI
slot to fill, so it is reported as an accepted extra, not an error (D34). `druid-custom-background`
shows a level-4 Druid still owing its third cantrip.

## Promoted from the stress wave (2026-09-04)

`st-quoting` (quoted and parenthesised names), `st-extension` (`Paste:`, `X-` keys, lower-case,
blank runs — the original tolerance-testing text is in `noncanonical/`), `st-drops` (a `-` swap at
every level-up), `old-subrace-cleric-5` (2014 subrace naming), `mc-planned-20` (planned levels to
20, a class listed with `0`, Mystic Arcanum, an Epic Boon) and `heavenly-archer-v3` (Francesco's
three-class 20-level build from Notion, with the source's own defects intact). Files in
`fixtures/` are canonical; `fixtures/noncanonical/` holds originals that differ from canonical
form, and the test asserts they canonicalise to their sibling.

# Fixtures

Hand-written pastes used as conformance cases. They **name** game entities and nothing else
(content boundary, CLAUDE.md). `vice` and `shigen` are Francesco's two real builds (D17); the
compiled sheets they mirror live outside this repo. Both follow SPEC 0.3 (entity blocks, bracket
details, `Options`).

Fidelity notes:
- `vice`: the paper sheet lists three invocations at level 1; a 2024 Warlock has one at level 1 and
  three at level 2, so two are placed at `L2`. Skills chosen at Warlock 1 are not recorded on the
  compiled sheet and are omitted (D13/D24). Specialized Design's two tools are a `Tools` line in
  the Species block (D26). `Fey Pact|HB [CHA]` — the homebrew origin feat's casting ability.
  Planned levels 3–5 are blocks above `Classes: Warlock 2` (D20).
- `shigen`: the Human origin feat is a `Feat` line in the Species block; the homebrew background
  is fully specified in its block (D21, D26). The six Warlock spells are known only as the current
  prepared set, not by the level each was picked, so they sit unplaced in the header — the mixed
  form (D4, D28). Skills chosen at Fighter 1 are not on the compiled sheet and are omitted. Whether
  Spellfire Spark or Fey Sentinel ask for an ability pick is unverified (⚑ Francesco): if so, it
  goes in the feat's first detail slot.

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

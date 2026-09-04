# gen-multi notes

## Builds

### mc-sorlock-9
**Intent:** Sorcerer 6 / Warlock 3. Draconic Sorcery ancestry as a `Feature` pick, metamagic and
invocations both as `Options:` (same key, different optional-feature families, per D27), two
spell swaps via the `-` drop syntax (one Sorcerer, one Warlock), a feat taken at an ASI-eligible
level instead of `ASI`.

**AMBIGUOUS:** §5.1 lists `Feature` slot order as "the feature's picks in printed order" but
doesn't say where `Feature` sits relative to `Options`/`Subclass` inside one level block when a
subclass choice and its ancestry pick land at the same level (both happen at Sorcerer 3 for
Draconic Sorcery). Used §5.5's key-table order: `Subclass`, then `Options` (metamagic, also
granted at level 3), then `Feature`.

**DATA:** `Fey Touched` only has a `TCE` printing in slots.json (no `XPHB` row), used with
explicit source since `Rules: 2024` doesn't cover it by default.

**GAP:** the reduced/flat variant cannot carry `Feature: Draconic Ancestry [Red]` — §5.1's scope
column for `Feature` is `S, B, L` only, never `H`. A flat unplaced snapshot of a build whose only
non-default ancestry-style pick is a `Feature` line has no legal home for it; the pick is simply
lost when flattening. Noted, not invented a workaround.

### mc-sorlock-9.reduced
**Intent:** Same character as a flat, unplaced header snapshot (mirrors §8.2 / fixtures/flat-multiclass):
`Classes` shows final totals, `Subclass`/`Feat`/`Options`/`Cantrips`/`Spells` all header-scope,
no blocks at all (no Species/Background either, matching the fixture's own flat style). Drops are
resolved away — `Spells:` lists the final repertoire only (`Fireball` and `Hex` in, `Chromatic Orb`
and `Armor of Agathys` out), since `-` is only legal in a level scope (E008).

**GAP:** as above, `Feature: Draconic Ancestry [Red]` has no legal placement in H scope and is
simply dropped from this variant.

### mc-bardadin-8
**Intent:** Paladin 2 / Bard 6 (College of Lore). Fighting style granted by Paladin, Bard
Expertise at the level it's actually granted (Bard 3 = character level 5), a spell swapped on
level-up via drop syntax, and two "Magical Secrets"-style spell adds with no class tag (per
D28, unplaced-by-class is normal for a placed-but-cross-class pick — these are still level-scoped
to Bard, just not restricted to the Bard list, which the format doesn't need to express).

**AMBIGUOUS:** 2024 Paladin table gives `Spellcasting` at level 1 and `Fighting Style` at level 2
(not both at level 1, unlike some other classes). Placed `Spells: Bless` at `L1 Paladin` and
`Fighting Style: Dueling|XPHB` at `L2 Paladin` on that basis; the spec itself is silent on which
class-level owns which feature, that's checker/data territory (§6).

### mc-planned-20
**Intent:** A level-5 character (`Classes: Warlock 5 / Fighter 0` sums to 5) with a full planned
timeline to L20: Mystic Arcanum-tier `Spells:` at Warlock levels 11/13/15/17 (6th–9th level spells
one at a time, matching the class's real cadence), an Epic Boon `Feat:` at 19, and a class
(`Fighter`) that is only ever touched in a future block (`L20 Fighter`), carried in `Classes` as
`Fighter 0` per §5.4.

**AMBIGUOUS:** §5.4 says a level block above the sum of `Classes` is "planned" and its class
"must appear in `Classes` (with `0` if not yet taken)" — it doesn't say a class *may not* appear
with `0` unless a matching future block exists. Not an issue here since `L20 Fighter` does exist,
but see the `.reduced` variant below where this becomes a live question.

**SMELL:** Mystic Arcanum is a prose-only warlock rule (learn one spell of a given level, cast it
once per long rest without a slot) — the checker's hand-kept supplement is explicitly called out
for this in §6, but the paste itself can't distinguish a Mystic Arcanum spell from an ordinary
`Spells:` addition. Both are written identically; only the level (11/13/15/17, one at a time)
signals intent to a human reader.

### mc-planned-20.reduced
**Intent:** Same paste with every planned block (L6–L20) removed, so only the played levels
(1–5) remain — tests that removing a swath of future blocks doesn't require touching anything
else.

**AMBIGUOUS:** left `Classes: Warlock 5 / Fighter 0` untouched even though the only block that
justified `Fighter 0` (`L20 Fighter`) is now gone. The brief said "remove the planned blocks,"
not "reconcile the header," but this now reads as a class permanently planned-but-never-detailed,
which is legal per §5.2 (`0` just means "not yet taken") but slightly odd. Flagged rather than
silently also trimming `Fighter 0` from `Classes`, since that would be a second, unrequested edit.

### mc-triple-12
**Intent:** Three classes (Fighter 5 / Rogue 4 / Barbarian 3). The third class's first level
(`L10 Barbarian`) is written as a level header with **no lines under it** — multiclassing into
Barbarian at that level grants only fixed proficiencies (no subclass, no ASI, no feature with a
choice at Barbarian 1), so there is nothing to write. Followed the precedent in
`fixtures/avg-barbarian-5.dndpaste`, which already writes bare `L1 Barbarian` / `L5 Barbarian`
headers with zero key lines.

**GAP:** the format has no way to say "this level exists and grants only automatic multiclass
proficiencies" versus "this level simply doesn't exist as a block." Rule 0.1/2.2 treats an absent
level and an empty level block as different things syntactically (a header can exist with zero
lines), but semantically both read as "nothing chosen here" — a checker has to know from game data
that character level 10 = Barbarian level 1 to explain why the block is empty; the paste alone
doesn't distinguish "empty because no choices" from "empty because I forgot something."

**AMBIGUOUS:** Barbarian normally requires STR 13 to multiclass into (a prerequisite gate); the
spec's checker scope (§6) never mentions ability-score prerequisites among its finding types
(missing/misplaced/unresolved/redundant/unplaced/extra), so this was written without checking
`Scores` against it — presumably out of scope entirely.

### mc-gish-7
**Intent:** Fighter 5 (Eldritch Knight) / Wizard 2, testing the wizard spellbook cadence (6
spells at the first wizard level, 2 more at the next) alongside a separate `Prepared:` loadout,
and an `Items:` line combining a plain magic weapon with a real item whose "sub-choice" turns out
to be baked into the printed name rather than expressed as a bracket detail.

**DATA:** looked for a real item matching the brief's illustrative `Items: Instrument of the
Bards [Doss Lute]` shape (name + bracket pick). No such structure exists in `data/items`: the
2024/2014 Instrument of the Bards line is six *separate* named items
(`Instrument of the Bards, Doss Lute|XDMG`, `..., Anstruth Harp|XDMG`, etc.) — the specific
instrument is part of the printed name, comma and all, not a detail slot. Wrote it as a single
quoted name (`"Instrument of the Bards, Doss Lute"|XDMG`, quoted per §3.1 because the name
contains a comma) with no bracket. Checked the whole `items` table for anything with an actual
sub-pick structure (grepped for `choose`/`pick` in the exported data) and found none — every
5etools magic item with variants (Bag of Tricks' colors, Sword of Answering's names, etc.) is
modeled the same way, as fully distinct named entries. `Items:` details (§5.1: "Details = the
item's own picks") may be a slot type that has no real-world instance in this data export.

**DATA:** no generic `+1 Longsword`-style entry exists in `data/items` (5etools doesn't itemize
plain +N weapons per weapon type); used `Sun Blade|XDMG`, a real named magic longsword, for the
"magic weapon gained at L6" instead.

---

## Summary

- **GAP (structural, hit twice):** `Feature` is scoped `S, B, L` only (§5.1), never `H`. Any
  build whose only non-default class-ancestry-style pick is a `Feature` line cannot be losslessly
  flattened to an unplaced header snapshot — the pick has nowhere legal to go. Hit in
  `mc-sorlock-9` → `mc-sorlock-9.reduced` (Draconic Ancestry).
- **GAP (Items details):** no item in `data/items` actually carries a bracket-style sub-pick;
  every real 5etools item with variants encodes the variant in its own name. The `Items` detail
  slot (§5.1) may be untestable against real data as written.
- **GAP (empty-but-meaningful level):** an empty level block (header, zero lines) is legal and
  already used in the fixtures, but the format can't distinguish "empty because the level truly
  grants nothing to choose" (multiclass Barbarian 1) from "empty because a choice was missed."
  Both read identically to the parser.
- **AMBIGUOUS (class-table timing):** in three separate builds, this exercise had to guess which
  character level within a class owns which feature (Paladin fighting style at 2 not 1; Sorcerer
  subclass+metamagic both at 3), since the spec is deliberately silent on class tables — that's
  checker/data territory (§6), not core grammar.
- **AMBIGUOUS:** whether trimming planned blocks from a reduced variant should also trim a
  header `Classes` count that only that block justified (`mc-planned-20.reduced`). Left the
  header untouched per literal instruction, flagged the resulting oddity.

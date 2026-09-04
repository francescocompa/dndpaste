# Stress wave report — 2026-09-04

**Method.** Six cheaper agents (5× sonnet, 1× haiku) wrote 65 pastes into `stress/pastes/` from
a shared brief: 22 conversions of Francesco's own Notion "Character Ideas" (+5 reduced variants),
6 average 2024 builds (+2 reduced), 5 multiclass/planned builds (+2 reduced), 5 builds under 2014
rules (+2 reduced), 9 adversarial builds (+1 reduced) and 6 deliberately invalid pastes. Each agent
also filed `stress/notes/<agent>.md` with the gaps it hit while writing. `scripts/stress-run.mjs`
then ran parser, canonical emitter and checker (full 5etools extract) over everything and wrote
`stress/results.md`. Findings were triaged by hand into: **ours** (fixed), **theirs** (author or
source-sheet errors the checker correctly caught), and **open** (design questions for Francesco).

| | before fixes | after fixes |
|---|---|---|
| parse errors | 8 (all in the 6 invalid pastes, as expected) | 8 |
| checker crashes | 0 | 0 |
| checker warnings | 267 | 265 (Rogue/Paladin masteries now owed) |
| checker infos | 219 | 201 |
| unresolved warnings that are declared homebrew (`|HB`, `|MYBREW`) | — | 33 of 36 |

The parser never crashed, never mis-tokenised a quoted or parenthesised name, and round-tripped
every valid paste byte-for-byte after canonicalisation. Every invalid paste produced the expected
error code, except one (below).

## Ours — fixed in this pass

1. **Extract had no 2014 subraces.** Hill Dwarf, Wood Elf, Variant Human were unwritable. Subraces
   are now species entries named the 5etools way: `Species: Elf (Wood)|PHB`, `Human (Variant)|PHB`
   (D38).
2. **Extract dropped all mundane items** (only magic items were indexed): Thieves' Tools, Herbalism
   Kit, packs, Alchemist's Fire all read as unresolved and pushed authors to tag them `|HB`. All
   2,428 items are indexed now.
3. **Tasha's optional class features** (Favored Foe, Deft Explorer, Martial Versatility, Cantrip
   Formulas…) were nowhere in the table. Extracted from `isClassFeatureVariant`; written as
   `Feature: Favored Foe|TCE` (pickless), and `Options: Favored Foe` is redirected.
4. **Rogue and Paladin 2024 masteries** were never owed (no class-table column). Now detected from
   the Weapon Mastery class feature.
5. **Full-list preparers** (2024 Cleric/Druid/Paladin) writing `Spells` were reported as *extra*;
   now *redundant* with a pointer to `Prepared`. **Known-list casters** writing `Prepared` are
   likewise *redundant*.
6. **2014 Fighting Style** owed under the `FS:F` optional-feature family never matched the
   `Fighting Style` key: double-reported (missing + extra). Families `FS:*` now feed the same slot.
7. **`Feature` could not be unplaced**, so a flat snapshot lost Draconic Ancestry. `Feature` is
   allowed in header scope; the consumer resolves the owner (D37).
8. **Lineage trait names** were matched by name only: `Elf|LFL` (Lorwyn) has versions but no
   supplement entry, so a correct `Feature: Elven Lineage [Lorwyn]` was flagged. Matching now also
   accepts a Feature whose pick is one of the species' versions; `Elf|LFL` added to the supplement.
9. **Unknown `Feature` names** on a class were reported as "beyond what the rules grant (DM
   boon?)"; the message now says the data does not know the pick (Channel Divinity options are
   prose).
10. **Duplicate findings** (a granted spell in both `Spells` and `Prepared`) are deduplicated.
11. **`Resilient (CON)` parsed silently** as a name with no details — the one invalid paste that
    produced no diagnostic. It cannot be an error (parentheses are legal in names), so the parser
    now emits a **W002 hint** on `Feat`/`Options`/`Feature`/`Subclass`/`Fighting Style` items
    whose bare name ends in a parenthesised group; the checker then reports it unresolved.

## Theirs — the checker was right (kept as evidence, not fixed)

**Source-sheet defects in the Notion page** (worth correcting there):
- Heavenly Archer v1/v3: four invocations at Warlock 2 (2024 allows 3); 14 warlock spells added by
  Warlock 9 (table gives 10); Arcane Trickster levels 13–20 list no spells or cantrips; the LV18
  line's class levels sum to 19.
- Controller: Rogue 1 lists one Expertise pick of two; no ASI/feat at Rogue 10.
- Graveyard Hound: "LV9: Grave Cleric 8" does not reconcile.
- Enchanter: "Wizard 5-17 / Bard 3" at LV7 is arithmetically impossible.
- Sage Chef: Greater Mark of Hospitality is listed but never placed.
- Nearly every build omits the +1 ability pick of the EFA dragonmark feats (5etools models one).

**Agent authoring errors** (the checker caught them; they stay in the corpus as regression cases):
subclass at level 1 for a 2024 Cleric and at Warlock 1 for a Sorlock; Epic Boons tagged `|HB`
though they are XPHB; `Tough` (an Origin feat in 2024) in an ASI slot at 16; Goliath ancestry
written as `Stone's Endurance`; Soldier bonuses totalling +2; class skills omitted on most
generated builds; a Rogue multiclass level given four skills instead of one; `Mage Armor` as
equipment.

## Open — Francesco's call (nothing changed yet)

1. **Size choice noise.** 23 infos of "Human/Tiefling chooses a size (S/M)". Under D24 an absent
   choice with a default is silent, but the 2024 species have no printed default. Proposal: treat
   Medium as the conventional default and stop reporting it.
2. **Empty level block semantics.** `L10 Barbarian` with no lines is legal and means "a level with
   nothing to record". Two agents wanted it to also carry "multiclass proficiencies only". The
   spec already says gaps are normal; recommend no change.
3. **Homebrew mechanics beyond picks** (the Enchanter's "Deception uses INT") have no home. By
   design (D9, D12); recommend no change.
4. **Weapon-mastery property** is not recorded (`Masteries: Longbow`, not `Longbow (Slow)`). In
   2024 each weapon has exactly one mastery property, so nothing is lost; recommend no change and a
   note in the spec.
5. **One source line advancing two classes** (Notion "LV7: Monk 6, Ranger 1") is a source-notation
   ambiguity; the format is strict about it by design.
6. **A reduced variant that drops planned blocks** keeps `Classes: Warlock 5 / Fighter 0`; the `0`
   entry is then dangling but legal. Recommend the checker report it as *unplaced* info.
7. **Generic magic variants** (`+1 Longsword`, `Flame Tongue Greatsword`) are not 5etools entities;
   they resolve to nothing. Options: accept a `+N ` prefix and strip it on resolution, or leave as
   info. Recommend the prefix rule.
8. **Draconic Sorcery / Orc "heritage" style picks** that 5etools encodes as prose stay
   *info: not a pick the data knows*; they need supplement entries as they come up.
9. **Storm of Radiance** is `Jallarzi's Storm of Radiance` in 2024 — a naming-alias question the
   checker could solve with a "contains" fallback at info severity.

## What to promote to fixtures

`st-quoting`, `st-extension`, `st-drops`, `old-subrace-cleric-5`, `mc-planned-20` and
`heavenly-archer-v3` cover grammar and checker paths the current four fixtures do not. Proposed
for `fixtures/` once Francesco has read this report.

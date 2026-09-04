# notion-b — Francesco's Notion character-idea conversions

13 builds converted from a personal Notion dump. One line intent each, then findings.

## scion-of-rot
Intent: single-class caster, subclass named mid-progression, dedicated `ASI:` key vs a bracketed `Feat` ASI bump in the same build.
- DATA: `Shadow Sorcerer` (dump's shorthand) = 5etools `Shadow Magic|XGE`; used that, not `|HB`.
- DATA: "Harper Agent"/"Harper Teamwork" not in slots.json feats → `|HB`, even though the *background* `Harper` is real (`FRHoF`).

## lunar-knight
Intent: multiclass where class order-taken (Sorcerer first) differs from the dump's summary line order ("Paladin 1, Lunar Sorcerer X").
- DATA: dump lists `Lunar Sorcerer` as maybe-homebrew; it's real: `Lunar Sorcery|Sorcerer|XPHB|DSotDQ`.
- AMBIGUOUS (§5.1 Equipment/Items): "Armor: Breastplate" appears at LV2 (a multiclass dip level, not the paste's first level block). Multiclassing grants no starting gear, so I treated it as gear acquired in play → `Items: Breastplate` rather than `Equipment:`. The instructions' literal rule ("Armor at L1 → Equipment; later → Items") reads on *character* L1, which this isn't for this class, but it's also the first *Paladin* block — a real ambiguity the spec/instructions don't resolve.
- GAP: "Moon Phase: Full Moon" written as `Feature: Moon Phase [Full Moon]` per instructions; no source tag on `Feature` names is possible in the grammar even though the subclass generating it (Lunar Sorcery) is a specific 3rd-party book — Feature carries no `|SOURCE` slot at all (§5.1/§5.3), so provenance of homebrew-adjacent class features is always lost.

## monster-expert
Intent: sparse single-class build with a genuinely empty trailing level (LV5, no picks) — tests that a level with nothing to say is simply omitted.
- DATA: `Zhentarim Ruffian`, `Zhentarim Tactics` → `|HB` (not in feats table).
- Used given example verbatim: `Feature: Hunter's Prey [Colossus Slayer]`.

## hexer
Intent: heavy Masteries churn — cumulative counts at four different levels, each only the new items retained per conversion rule.
- DATA: `Shadowmoor Hexer` → `|HB`.
- SMELL: the "strip the (Vex)/(Nick)/(Slow) property" rule throws away information a real character sheet would want (which mastery property was picked for which weapon) — `Masteries: Rapier` alone doesn't say it's the *Vex* rapier. That's a fact the format simply doesn't carry (by design, per §0.9 "no redundancy" / masteries being a snapshot), but it's a real information loss versus the source.

## controller
Intent: homebrew species variant (Elf (Lorwyn)), struck-and-replaced spells in two different level blocks, unmade tool choice omitted.
- DATA: `Elf|LFL` exists in slots.json with `versions: ["Lorwyn","Shadowmoor"]`, same shape as `Elf|XPHB`'s Drow/High Elf/Wood Elf. But `supplement.json`'s `lineageTrait` map only has an entry for `Elf|XPHB` ("Elven Lineage"), not for `Elf|LFL`. I reused "Elven Lineage" as the feature name for `Feature: Elven Lineage [Lorwyn]` by analogy — **AMBIGUOUS/GAP**: the checker's hand-kept supplement has no confirmed trait name for the LFL book's version pick, so this is a guess, not a lookup.
- GAP: `- Tools:` with nothing after the colon → omitted per instructions (unmade choice), but the *grammar* itself would report empty-value `E006` if literally written as `Tools:` — the omission is the only legal encoding, confirming D13 already covers this, no format gap, just flagging it was exercised.

## arcane-spy-v1 / arcane-spy-v2
Intent: "Elf (High)" 2014-subrace phrasing converted to 2024 Elf + lineage feature (per explicit instruction); same homebrew subclass (`Magic Stealer` Rogue) reused across two variants; v2 additionally exercises splitting a single dump LV line across two character levels for a multiclass dip.
- DATA: `Magic Stealer Rogue` not in subclasses table → wrote subclass as `Magic Stealer|HB` (stripped the trailing class-name word, matching the dump's own "<Subclass> <Class>" convention, e.g. real `Thief Rogue`/`Mastermind Rogue`/`Hunter Ranger` do exist under just `Thief`/`Mastermind`/`Hunter`).
- AMBIGUOUS: v2's "LV4: Fighter 1, Magic Stealer Rogue 3" jumps Rogue from 1 (at LV2) to 3, across only 2 new character levels (3,4) — split into an empty `L3 Rogue` (omitted, no picks) and `L4 Rogue` carrying the subclass, per the split-and-assign-to-the-block-it-logically-belongs rule.

## great-old-one
Intent: minimal 1-level Warlock snapshot, all picks in a single level block — smallest non-trivial paste in the set.
- Same Lorwyn-elf lineage-name guess as `controller` (see above).
- DATA: `Marionette` background not in slots.json → `|HB`.

## failed-lich
Intent: single-class Fighter/Eldritch Knight with a feat that itself grants a further pick (`Undead Grasp` → a Chill Touch cantrip), stacked feat details.
- DATA: `Lich Initiate`, `Undead Grasp`, `Arcane Restoration`, `Lich Ascension` all homebrew per the dump's own list → `|HB`.
- Wrote `Feat: Undead Grasp|HB [INT; Chill Touch]` — first slot the ability bump, second slot the feat's own printed pick, per §5.3's slot-order rule. This is a reasonable reading but nothing in the dump format tells a converter unambiguously that the indented "- Cantrip: Chill Touch" line is a *detail of the feat above it* rather than a separate class-level Cantrips pick — **AMBIGUOUS**, resolved by proximity/indentation.
- SMELL: `Equipment: Breastplate, Quarterstaff, Club, Heavy Crossbow` duplicates most of the same level's `Masteries: Quarterstaff, Club, Heavy Crossbow` line by necessity (starting gear vs. weapon-mastery assignment on the same items) — not redundant per the grammar (different keys, different facts) but reads oddly.

## heavenly-archer-v3 (+ .reduced)
Intent: the largest build in the set — three-class multiclass over 20 levels, several multi-level LV-line splits, an internal arithmetic error in the source, and the flat "everything unplaced" reduced variant.
- GAP/DATA: the dump's own numbers don't reconcile at the top end: "LV18: ... Arcane Trickster Rogue 9" follows "LV17: ... Rogue 7", i.e. +2 Rogue levels across a single new character level, and 1+9+9=19 ≠ 18. 2024 Epic Boons (`Boon of Exquisite Radiance`, `Boon of Combat Prowess`) are only legal at character levels 19 and 20. I treated "LV18" as a transcription slip for LV19 (Rogue 7→8→9 over the two new character levels 18–19, with the boon landing on the corrected L19) so the totals and the boon-level rule both resolve; LV20 needed no correction. Recorded here rather than silently invented — a converter with less domain knowledge would have had no way to resolve this from the dump text alone.
- DATA: "Wizard Spells (3, LV1):" and "Wizard Spells (1, LV2):" both left empty (no names after the colon) at LV13/LV17 → omitted entirely (unmade choice, D13), same treatment as `Spells:`/`Tools:` elsewhere. Also note the class actually gaining these would be the Arcane Trickster Rogue's own spell list, not a separate Wizard — the dump's "Wizard Spells" label is presumably a copy-paste habit; moot since both lines were empty.
- Reduced variant: per the given spec ("only header + a flat unplaced list of Subclass/Feat/Options/Spells"), `ASI` and `Cantrips` lines were dropped even though present in the full build — that's an intentional narrowing dictated by the task, not a claim that ASI/Cantrips are unimportant.

## graveyard-hound (+ .reduced)
Intent: Cleric with two off-book homebrew feats and a real official subclass (`Grave Domain`) that the source dump mislabeled as homebrew; also a second internal off-by-one (LV9 says "Grave Cleric 8").
- DATA: the dump's homebrew list calls out "Grave Cleric (XGE)" as needing a slots.json check — it's real: `Grave Domain|Cleric|XPHB|XGE`. Used the official name.
- GAP: `Species: Orc (Hound)` — Orc has no lineage/version system in slots.json (`versions: []`), unlike Elf/Dragonborn/Goliath/Gnome. There's no canonical feature name for an Orc heritage pick. Wrote `Feature: Heritage [Hound]` — **the "Heritage" name is invented**, not sourced from anywhere; the spec has no key for "a species pick that isn't the default lineage system," which is a genuine format gap the checker's supplement can't cover without a matching entry.
- SMELL: "LV9: Grave Cleric 8" under header L9 doesn't reconcile (single-class Cleric, character level should equal class level) — likely a dump typo for "Grave Cleric 9." Kept the header at L9 (Cleric) since `Classes: Cleric 12` is driven by the final LV12 line, unaffected either way; flagged rather than silently renumbering.
- Reduced variant per explicit spec: just `Classes:`/`Subclass:`, no `Rules`/`Scores`/identifier content beyond what was asked — included the identifier line anyway for consistency with the "-lite" convention used elsewhere; that's additive, not in tension with the literal instruction.

## sir-oswyl
Intent: Paladin with an odd starting-gear entry (`Armor: Mage Armor, Shield` — "Mage Armor" is a spell name, not an armor item) converted literally into `Equipment:`.
- DATA: `Reborn` species is real (`RHW`/`VRGR`); `Iron Court` background and `Spellguard` (Paladin) subclass are not in slots.json → `|HB`.
- SMELL: `Equipment: Mage Armor, Shield` faithfully replays the dump's own inconsistency (a spell name where gear is expected) — the format has no way to flag "this doesn't look like starting equipment," and shouldn't; that's the checker's job against real item data, out of scope here.

## master-poisoner
Intent: Rogue/Monk multiclass with two multi-level LV splits collapsing to a single subclass pickup, and a homebrew feat with a `+1 DEX` bump.
- DATA: `Venom Monk` subclass and `Bloodlust` feat not in slots.json → `|HB`; `Toxin Brewer` background → `|HB`.
- Two multi-level splits (LV2→LV4 Monk 1→3, and LV5→LV9 Monk 4→8) both produced empty intermediate level blocks that were simply omitted, per the "gap is normal" rule — no picks landed on any of the skipped Monk levels in the dump.

## Cross-cutting
- GAP: common mundane tools/kits referenced across nearly every build (`Thieves' Tools`, `Disguise Kit`, `Herbalism Kit`) are **absent from `data/slots.json`'s `items` table** entirely (only crafting "X's Tools" sets and a few outliers are present), despite `fixtures/vice.dndpaste` already using `Thieves' Tools`/`Forgery Kit` bare, untagged. Followed the fixtures' precedent and left them untagged rather than `|HB`, but the checker has no data to resolve them against as things stand.
- AMBIGUOUS (repeated): the "Elf (Lorwyn)" lineage-feature name (`controller`, `great-old-one`, `failed-lich`) is a guess by analogy to `Elf|XPHB`'s "Elven Lineage," since `supplement.json`'s `lineageTrait` map doesn't cover the `LFL` book.
- SMELL (repeated): the "strip the weapon-mastery property, keep only the new names" rule (applied in `hexer`, `monster-expert`, `master-poisoner`, `sir-oswyl`, `heavenly-archer-v3`) discards the specific mastery property chosen per weapon — a real fact about the build the paste can no longer replay.

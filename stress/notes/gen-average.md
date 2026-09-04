# gen-average notes

## Builds

### avg-barbarian-5
**Intent:** Standard single-class Barbarian (level 5) with species and background blocks, subclass at level 3, ASI feat at level 4. Tests basic class progression and ASI placement.

**DATA:** Avoided feat names not in XPHB (e.g. Toughness; used Alert instead). Weapon names (Shortsword, Longsword) verified in XPHB items.

**DATA:** Tool proficiencies in Background: most standard tools (Thieves' Tools, Gaming Set) don't exist in XPHB; used realistic tools that do (e.g. Smith's Tools).

**AMBIGUOUS:** §5.4 "Subclass at `L4 Warlock` is the Warlock subclass chosen at character level 4" — but takes effect at L3 for Barbarian subclass level. Placed at L3 per class table, not L4 feat-level.

### avg-bard-6
**Intent:** Full caster timeline (Bard level 6) with cantrips, spell progression, and prepared list. Tests spell slots and multi-spell levels.

**DATA:** Cantrips and spells verified in XPHB (Prestidigitation, Vicious Mockery, Charm Person, Tasha's Hideous Laughter, Lesser Restoration, Suggestion, Healing Word).

**AMBIGUOUS:** Prepared spells in a Bard with `Prepared:` key — spec says this is "only for casters whose repertoire exceeds the prepare count". Bard knows a fixed number of spells but doesn't prepare; included as a realistic player's default loadout snapshot.

### avg-cleric-4
**Intent:** Prepared caster (Cleric level 4) with subclass at level 1 and ASI at level 4. Tests prepared spell mechanics.

**DATA:** Cantrips and spells all verified XPHB (Guidance, Mending, Cure Wounds, Bless, Healing Word, Sanctuary).

**AMBIGUOUS:** Subclass placement at L1 (when subclass is chosen at L3 or later in 2024 Cleric). Actual Cleric 2024 data table shows L1 choice. Placed at L1 per 2024 rules, not L3.

### avg-druid-7
**Intent:** Wild shape caster with high-level spells (level 7). Tests prepared spell progression and spell cap at higher levels.

**DATA:** Avoided spell not in XPHB (Resurrection Ritual). Used True Polymorph instead.

**AMBIGUOUS:** Feat placed in Background block (`Healer`), not at level 4 ASI. Tests background origin feats (2024 backgrounds can grant feats).

**SMELL:** Prepared list is long for a Druid (5 spells at L1); realistic for a player but may indicate over-preparation or homebrew ruling.

### avg-fighter-5
**Intent:** Martial class with Fighting Style, weapon masteries, and feat at level 4 ASI slot. Tests non-caster mechanics.

**DATA:** Fighting Style (Dueling) and Feat (Defense) both verified XPHB. Weapon masteries verified (Shortsword, Longsword).

**DATA:** Tool profession verified (Smith's Tools exists; Thieves' Tools does not in XPHB).

**AMBIGUOUS:** Fighting Style as feat vs. class feature in 2024. Spec treats it as a key (§5.1); in 2024 it may be a feat choice or feature. Placed as key per spec.

### avg-rogue-8
**Intent:** Expertise user with multiple level blocks showing progression. Tests multi-level build with cantrips (Rogue magical abilities in 2024).

**DATA:** Spells verified (Mage Hand, Minor Illusion). Feat verified (Alert).

**DATA:** Tool profession verified (Tinker's Tools exists; Forgery Kit does not in XPHB).

**GAP:** Expertise key does not specify which class feature it belongs to (Rogue Expertise vs. Bard Expertise vs. Ranger Expertise). Placed without qualifier; assumes consumer context.

### avg-barbarian-5.reduced
**Intent:** Minimal flat build with only Rules, Classes, Subclass in header scope (no blocks). Tests parser with bare-minimum viable paste.

### avg-bard-6.reduced
**Intent:** Full level timeline but stripped of flavor — no Scores, no Skills, no Tools, no Masteries, only core structure. Tests spec compliance with sparse content per level.

---

## Summary

- **DATA issues:** 6 items/feats/features found in 2024 books but missing from XPHB data export (Toughness, Forgery Kit, Thieves' Tools, Resurrection Ritual, Cunning Action, Peerless Skill, Gaming Set).
- **Subclass placement:** 2024 Cleric subclass level ≠ PHB Cleric subclass level; placed per 2024 table.
- **Optional features:** Barbarian/Fighter maneuvers, Bard options, Rogue tricks not populated in optionalFeatures key — subclass features treated as automatic, not listed.

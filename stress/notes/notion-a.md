# notion-a — Notion character-idea conversions

Builds handled: Frost Giant, Sage Chef, Enchanter, Mastermind, High-class Thief,
Dhampir Brute, Luckbender, Heavenly Archer (v1), Evil Enforcer. All `Rules: 2024`.

## frost-giant.dndpaste
Intent: header-only build with zero LV lines — bare `classes` ref, header-scope Subclass/Options/Cantrips/Spells, single-line Species block.
- AMBIGUOUS: no LV lines at all in the source, so "played level" is undefined. Used spec's "bare Ref legal only with no level blocks" (§5.2) for `Classes: Warlock`.
- GAP/AMBIGUOUS: "Feat: Cold Caster" isn't asked by any entity (no background listed) — put it unplaced in H. Nothing in the spec lets me say "this feat came from nowhere in particular" more precisely than that.
- AMBIGUOUS: `Agonizing Blast [Eldritch Blast]` — Notion just says "Agonizing Blast" with no cantrip bracket (unlike the fixtures' `Agonizing Blast [True Strike]`); I inferred the paired cantrip from the build's own `Eldritch Blast` line. Could be wrong if he meant a different blast cantrip.
- DATA: "Goliath (Frost)" → 2024 Goliath's "Giant Ancestry" trait; wrote `Feature: Giant Ancestry [Frost]`. Not verifiable against slots.json (Feature picks aren't a lookup table) — pure guess at the feature's printed name.
- DATA: split "Eldritch Blast, Spirit Shroud" into Cantrips (Eldritch Blast) vs Spells (Spirit Shroud) since dndpaste has no single "spells known, mixed level" key — Notion's flat "Spells:" list doesn't distinguish.

## sage-chef.dndpaste
Intent: Monk→Ranger multiclass with a mid-timeline subclass reveal buried in a class-name change; a homebrew Greater Mark that never gets a level in the source.
- GAP: "Feat: Mark of Hospitality, Greater Mark, Potent Dragonmark" (top summary) lists three feats, but the LV timeline only places two of them (Mark of Hospitality in Background, Potent Dragonmark at LV4). "Greater Mark" (resolved to `Greater Mark of Hospitality|EFA`, matching Cold Caster the character's existing mark) never appears under any LV bullet. Wrote it unplaced in H; no key exists to say "picked, level unknown."
- AMBIGUOUS: "LV13: ... - Feat:" — empty value after the colon. Per the Notion format notes this is an unmade pick, so per D13 I omitted the line entirely; since that was the block's only content, I omitted the whole L13 block too (spec §2.2: "a level with no choices is simply absent").
- AMBIGUOUS: LV7's two bullets (Skill: Survival, Weapon Masteries: Club/Light Hammer) sit under a line that advances both Monk (4→6) and Ranger (0→1) at once. Put both on the Ranger sub-level per the task's own worked example ("Ranger skills on the Ranger level"), but Masteries could just as easily be the Monk's.
- DATA: "Gnome (Rock)" → guessed `Feature: Gnomish Lineage [Rock Gnome]`, same caveat as Frost Giant's ancestry guess — not checkable against slots.json.
- DATA: "Warrior of Intoxication Monk" is NOT the same string as the real subclass "Way of the Drunken Master" in slots.json, even though it's obviously a reflavour of it. Kept the literal Notion name and tagged `|HB` rather than silently substituting the 5etools name — a converter shouldn't be guessing reskins.
- DATA: "Tool: Cook's Utensils" and "Tool: Tinker's Tools" — both exist as PHB/XPHB pairs, left bare per the 2014/2024-both-exist rule.

## enchanter.dndpaste
Intent: Wizard→Bard multiclass whose final LV line names an uncertain future range for one class ("Enchanter Wizard 5-17") while incrementing the other by a fixed amount.
- AMBIGUOUS (biggest one): "Lv7: Enchanter Wizard 5-17 / Bard 3" is internally inconsistent — previous total (Lv6) was Wizard 4 / Bard 2 = 6, and the labelled character level is 7, but Wizard jumping to "5" and Bard to 3 would sum to 8. Treated "5-17" as a *planned* range that hasn't actually been taken yet (matches "stopped planning" instruction) and kept Wizard at 4, so `Classes: Wizard 4 / Bard 3` sums to the character level 7. This means I am discarding a number ("5") the player actually wrote down.
- GAP: no key exists for "this skill's modifier uses INT instead of the normal ability" (Enchanter homebrew mechanic, format note #6). Wrote plain `Skills: Deception` at L3/L8(Mastermind) and dropped the ability-override fact entirely — there's genuinely nowhere to put it in the profile.
- GAP: "Instrument: +1" at L5 (an unmade musical-instrument-proficiency pick) — omitted per the Tool:+1 convention, but note the profile doesn't have a distinct "instrument" concept from `Tools`, so I can't tell if this would have been a Tools line or something else.
- AMBIGUOUS: `Subclass: Eloquence` placed at L7 (final Bard level) because the College name only appears in the top-of-build summary ("Eloquence Bard 3"), never inline on an actual `Lv` line the way "Enchanter Wizard 3" is. Contrast with the Wizard subclass, which names itself directly on its LV line.
- DATA: "Psi Trickster" not in slots.json → `|HB` (explicitly flagged as homebrew-ish in the dump's format notes).

## mastermind.dndpaste / mastermind.reduced.dndpaste
Intent: full timeline for the alternating Rogue/Wizard build, and its "big picks only" reduced form.
- AMBIGUOUS: several LV lines advance a class by exactly 1 with zero bullets under them (e.g. LV2: Rogue1,Wizard1 — nothing listed). Per §2.2 ("gaps are normal") I omitted these as empty level blocks entirely, rather than emitting `L2 Wizard` with no lines, even though the task instructions say "every LV line becomes a block" — the two rules conflict when a LV line carries no picks; I followed the spec's own design rule.
- AMBIGUOUS: "LV7: Mastermind Rogue 5, Wizard 2" jump from LV5 (Rogue4,Wiz1) spans two character levels with one class-level gain each (Rogue+1, Wizard+1). Assigned Wizard's increment to the earlier of the two implied levels (L6, no picks) and Rogue's to the later (L7, carries the `Expertise: Investigation` bullet) since Rogue's own feature list plausibly grants Expertise there — could be swapped.
- DATA: "Feat: Harper's Teamwork" (possessive) in Notion vs `Harper Teamwork|FRHoF` in slots.json (no possessive) — used the slots.json spelling.
- GAP: "Skill: Deception (+INT)" — same ability-override gap as Enchanter, dropped the (+INT).
- Reduced variant keeps only the header keys named in the brief: Rules, Classes, Subclass (both subclasses, unplaced), Feat (all three feats picked anywhere in the timeline), Species (bare, no block lines). No Options exist in this build to include.

## high-class-thief.dndpaste
Intent: Artificer dip into Thief Rogue; abbreviated tool names; an ASI written as "Feat: ASI".
- DATA: "Tools: Thieves, Tinkers, +1" — expanded abbreviations to `Thieves' Tools` and `Tinker's Tools`, dropped the "+1" (unmade pick, D13).
- SMELL/DATA: `Thieves' Tools` does not exist anywhere in data/slots.json's `items` table (nor does Herbalism Kit, Disguise Kit, Forgery Kit, or any generic "gaming set") despite being core-book (PHB/XPHB) proficiencies — the table appears to hold weapons/armor/magic items/artisan's-tool kits only, not the basic adventuring kits. Tagged these `|HB` per the literal "not found → HB" rule, even though they are not actually homebrew; flagging this as a real gap in the reference data rather than the format.
- "Feat: ASI (+2 INT)" at L9 → converted to `ASI: +2 INT` per the task's own worked rule for this exact pattern.

## dhampir-brute.dndpaste
Intent: short single-class build; a species with two plausible sourcebooks; a feat that never resolves an entity.
- DATA: `Dhampir` exists as both `Dhampir|RHW` and `Dhampir|VRGR` in slots.json — picked `|VRGR` (Van Richten's Guide, the more commonly-cited source) since nothing in the dump disambiguates. Could just as validly be `|RHW`.
- GAP/AMBIGUOUS: the top summary lists "Feat: Tough" separately from the Background's own "Feat: Vampire's Plaything" — two feats with no shared entity claiming both, and no LV line assigns either a level. Put `Tough` unplaced in H (bare, exists PHB/XPHB) and `Vampire's Plaything` in the (unnamed→`Custom`) Background block per D21; genuinely unclear whether "Tough" duplicates or supplements the background feat.
- "Tool: Thieves Tools" (no apostrophe) → same `Thieves' Tools|HB` data gap as high-class-thief.

## luckbender.dndpaste
Intent: the sparsest build in the set — no stats, no background, no LV lines at all, three feats with no entity attribution whatsoever.
- AMBIGUOUS: all three feats (Musician, Tireless Reveler, Fey Touched) have no species/background/level context to attach to (the dump gives literally nothing but a top-level feat list) — put the whole list unplaced in H.
- DATA: `Tireless Reveler` only exists as `|ABH`; `Musician` and `Fey Touched` exist without edition ambiguity, left bare.
- Species block (`Species: Human`) has zero lines — first build in the set to test a genuinely empty entity block.

## heavenly-archer-v1.dndpaste / heavenly-archer-v1.reduced.dndpaste
Intent: the invocation-churn stress case — cumulative "Eldritch Invocations (n)" lists across many levels, including one invocation (Eldritch Mind) that is dropped and later re-added.
- AMBIGUOUS (the interesting one): computing the cumulative deltas level-by-level shows Eldritch Mind is in the L2 set (1 invocation), *absent* from the L3 set (3 invocations: Agonizing Blast, Otherworldly Leap, Fiendish Vigor), then reappears in the L8 set. Modeled this literally as `-Eldritch Mind` at L3 and a bare re-add at L8, per the format notes' cumulative-list rule — but this could equally be Francesco simply forgetting to re-list it at LV3 rather than an intentional swap. The dndpaste format has no way to distinguish "I dropped this and picked it again later" from "I mis-transcribed one entry" — that ambiguity is inherent to the source, not the format.
- Also modeled the corresponding drop of Fiendish Vigor at L8 (present at L6's 5-item set, gone from L8's 6-item set even though the count only grew by 1 net of one add and one drop).
- Fighter never advances past level 1 in this build — all subsequent LV lines increment Warlock only, so `Classes: Fighter 1 / Warlock 9`.
- Reduced variant: `Options:` collapses to the *final* cumulative invocation set only (no historical drops/re-adds), since "I only remember the big picks" implies the end state, not the churn — this is a judgment call not spelled out in the brief.

## evil-enforcer.dndpaste
Intent: Fighter/Warlock multiclass with an item name that needs mapping to 5etools naming ("Full Plate" → "Plate Armor"), a homebrew subclass name with no real-world analog, and a starting-vs-acquired-gear distinction (Chain Shirt at L1 vs Full Plate at L7).
- DATA: "Armor: Full Plate" at L7 → 5etools calls this item `Plate Armor`; wrote `Items: Plate Armor` (not `Equipment`, since it's gear acquired later in play, not starting kit — per §5.1's Equipment/Items split).
- DATA: `Gladiator` is not a real subclass name in slots.json (no "Gladiator Fighter" analog exists at all, unlike Sage Chef's Drunken-Master case) → `|HB`, no plausible real-book substitute.
- AMBIGUOUS: "LV11: Gladiator Fighter 9, Warlock 2" advances Fighter by 1 and Warlock by 1 across the two skipped character levels 10–11. Assigned Fighter's increment to the earlier level (L10, empty) and Warlock's to the later (L11, carries the Eldritch Invocations bullet), mirroring the same judgment call made in mastermind.dndpaste.
- The final LV line names "Hexblade Warlock 3" — subclass placed there even though the top summary calls the endgame goal "Hexblade Warlock 5"; per the task's own instruction, played level stops at the last LV line (12), not the aspirational summary level (Warlock 5).
- Top-of-build "Cantrips: Eldritch Blast, Booming Blade" line has no level/entity attribution in the dump → left unplaced in H.

## Cross-build SMELL / DATA notes
- **SMELL**: data/slots.json's `items` table has no entries for the most common tool-kit proficiencies (Thieves' Tools, Herbalism Kit, Disguise Kit, Forgery Kit, generic gaming sets) despite containing ~1860 items including many obscure magic items. Every build in this set that uses one of these had to tag it `|HB`, which reads as "homebrew" when it isn't — the checker's item corpus looks incomplete for mundane gear rather than the paste being wrong.
- **AMBIGUOUS** (recurring, ~4 builds): when a single Notion LV line advances two classes by one level each across two skipped character levels (e.g. "Rogue 4→5, Wizard 1→2" over one LV jump), the format gives no signal for which class takes the earlier vs later of the two implied levels. I guessed based on which bullet's feature family (Expertise, Invocations) matched which class, but this is a real gap in what the Notion notation can express, not something dndpaste itself should have to solve.
- **AMBIGUOUS** (recurring): several custom backgrounds are written in the dump as bare "Background:" with no name at all. Used the SPEC's own `Background: Custom` convention (§8.4) rather than inventing a name.

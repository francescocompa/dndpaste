# gen-stress notes

## st-quoting.dndpaste
Intent: quoting edge cases — comma-name, plain parens, apostrophe+parens, colon-name, slash-name, leading `+`.
- DATA: `Alchemist's Fire (flask)` and `+1 Rod of the Pact Keeper|DMG` — the `items` table in
  `data/slots.json` appears to hold only magic items (DMG/XDMG/etc.); mundane adventuring gear
  (Alchemist's Fire, ammunition beyond `Arrows (20)`) isn't present to verify against. Used the
  real 5etools name anyway; `+1 Rod of the Pact Keeper|DMG` substituted for the brief's `+1
  Longsword` since no generic `+1 <weapon>` entries exist in the corpus (magic weapon variants
  aren't enumerated as named items).
- DATA: `"Channel Divinity: Harness Divine Power"` isn't in `optionalFeatures` or
  `supplement.json` (classFeaturePicks only has Warlock's Mystic Arcanum). Reused verbatim from
  SPEC.md §8.5's own example, which the spec treats as canonical.
- AMBIGUOUS (§5.1 `Spells`/`Prepared`): Cleric prepares from the full list, so a "learned/scribed"
  `Spells` line felt wrong; used `Prepared` instead to carry `Blindness/Deafness`.

## st-dragonborn.dndpaste
Intent: `Feature: Draconic Ancestry [Red]` on a species that grants it, per `supplement.json`.
- Nothing notable; straightforward.

## st-human-small.dndpaste
Intent: `Feature: Size [Small]` on 2024 Human (size `['S','M']` in `data/slots.json`), plus the
species-granted origin feat (Human's Versatile trait: `feats: [{category:['O'], count:1}]`).
- DATA: confirms only Human carries a species-level `feats` entry among species checked
  (Elf/Dwarf/Tiefling/Dragonborn/Goliath all have `feats: []`) — matches the 2024 rule that only
  Human's Versatile trait grants a bonus origin feat from the species itself.

## st-custom-bg-mi.dndpaste
Intent: `Feat: Magic Initiate` twice in two different scopes (Species block, Custom Background
block) with different versions/picks, per D22/D26 ("a choice belongs to the entity that asks it").
- AMBIGUOUS (§5.1 `Species`): 2024 Human's origin feat is written as a `Feat` line inside the
  Species block even though the printed rule calls it "Versatile," because the format has no
  separate key for a species-granted feat pick — same key, different scope from the background's.
- DATA: `Priest's Pack` (equipment) isn't in the `items` table for the same reason as
  Alchemist's Fire above (mundane gear not modeled there).
- GAP: no way to record that the background's `+1 CON` (of `ASI: +2 WIS, +1 CON`) came from a
  different weighting than the species' none — `asi` type just records the total, which is fine
  per §5.2, but there's no way to tag *why* a bonus is split that way; not actually needed by the
  grammar, just noting it wasn't ambiguous once I reread §5.2.

## st-options-families.dndpaste / .reduced.dndpaste
Intent: touch every real `optionalFeatures` family in `data/slots.json`'s `families` map.
- AMBIGUOUS (brief vs. data): the brief asks for every family "as legally possible in 2024," but
  under 2024 rules only `EI`, `MM`, `MV:B` have `XPHB` entries — `AI`, `AS`, `RN`, `ED`, `PB` are
  2014-only in this corpus (Warlock's Pact Boon has no `XPHB` optionalFeature entry at all in
  2024; it's folded into subclass text). Switched the whole paste to `Rules: 2014` to reach more
  families, and documented as GAP below rather than under-delivering.
- GAP: even under 2014, one legal single-character build cannot touch all 8 real families —
  `MV:B` (Battle Master), `RN` (Rune Knight) and `AS` (Gunslinger, UA) are three different Fighter
  *subclasses*, and a class has exactly one subclass. Picked Battle Master (matches the brief's
  own example) and skipped `RN`/`AS`; got 6 of 8 real families (`MV:B`, `MM`, `PB`, `EI`, `AI`,
  `ED`). `OTH` has zero entries anywhere in `optionalFeatures`, so it's unreachable regardless —
  the `families` map lists a family with no members.
- SMELL: the resulting 5-class, 14-level "Polymath" build is grammar-legal but has zero narrative
  reason to exist; that's the point of an adversarial fixture, but the checker's `extra` handling
  (D34) will presumably light up on almost every line since none of these classes share a
  character concept. Worth confirming the checker doesn't choke on that volume of `extra`s.
- Reduced variant drops all `Subclass`/level placement and states `Options` once, unplaced, in
  the header — exactly what a consumer resolving unplaced choices (§5.4, D28) would have to
  disambiguate across five different possible owning classes.

## st-drops.dndpaste
Intent: `-` prefix (drop) on `Spells` at every Sorcerer level-up and on `Options` for a Warlock
invocation swap, per §3.1.
- Nothing ambiguous; `-Magic Missile, Chromatic Orb` style repeated 6 times plus one
  `-Agonizing Blast [Eldritch Blast], Repelling Blast [Eldritch Blast]` invocation swap.
- SMELL: dropping and re-adding a detailed item (`Agonizing Blast [Eldritch Blast]`) requires
  repeating the full detail bracket on the dropped copy even though it's about to disappear —
  `-Agonizing Blast [Eldritch Blast]` — SPEC doesn't say whether the drop needs to restate details
  or can be bare (`-Agonizing Blast`); assumed bare is also legal per §3.1's grammar (details are
  optional on any item) but restated it for clarity/matching, since the checker likely matches
  drops to adds by name+source only anyway (§3.2, "the parser never dedupes or matches drops
  against adds — the checker does, on resolved entities").

## st-extension.dndpaste
Intent: every §2.5/tolerance rule at once — `Paste: 1`, two `X-` keys, all-lowercase keys and
level header (`l3 fighter`), blank-line runs, trailing spaces on three lines (verified with `od
-c`, real `\n` after literal spaces, not stripped).
- Nothing ambiguous; case-insensitivity (Lexical structure, "Matching is case-insensitive
  everywhere") explicitly licenses `species:`/`l3 fighter`/`fighting style:`.

## st-epic-20.dndpaste
Intent: level-20 single-class Fighter with every ASI/feat slot from `data/slots.json`'s
`asiLevels` for `Fighter|XPHB` (`[4,6,8,12,14,16]`) filled, Epic Boon at 19 (2024 removes the
extra Fighter ASI at 19 in favor of this), `Masteries` re-stated at each level its count grows
(`[3,3,3,4,...]` → restated at L1/L4/L10/L16), three `Items` at L20.
- DATA: verified `Boon of Combat Prowess|XPHB`'s ability slot (`abilityChoose:
  [str,dex,con,int,wis,cha]`) to justify the bracketed `[STR]` pick per §5.3's `Feat` slot order
  (ability pick first).
- DATA: `Flame Tongue` from SPEC.md's own `Items` example (§5.1) does **not** resolve in
  `data/slots.json` — only `Flame Tongue Shortsword of Greed|TftYP` exists. Avoided it; used
  `Belt of Fire Giant Strength|XDMG`, `Ring of Protection|XDMG`, `Boots of Elvenkind|XDMG`
  instead. Flagging since a future fixture copying the spec's own prose example verbatim would
  fail resolution.

## st-homebrew.dndpaste
Intent: species, background, subclass, two feats and one spell all homebrew, one with a distinct
source code (`|MYBREW`) per D9, plus a `Feature:` line on the homebrew subclass.
- Nothing ambiguous; followed §3.1's "homebrew uses the code its file declares, or `HB` when it
  has none" — used `|HB` for the pieces without an implied file and `|MYBREW` for the subclass to
  simulate a homebrew file with its own source code.

## Invalid pastes (stress/pastes/st-invalid-0N.dndpaste)

- **st-invalid-01**: `Level 3 Fighter` instead of `L3 Fighter`. Doesn't match the level-header
  grammar (`L<n> <Ref>`, no space between `L` and the digits) and has no `:`, so it can't be a key
  line either; it isn't the first line so it can't be an identifier.
  EXPECT: **E001** (malformed line).
- **st-invalid-02**: `L3: Fighter` — a colon turns this into a key line with key `L3`, which isn't
  a profile key.
  EXPECT: **E002** (unknown key).
- **st-invalid-03**: `Feats: Alert|XPHB` — plural key; canonical is singular `Feat`.
  EXPECT: **E002** (unknown key).
- **st-invalid-04**: tab-indented `- Athletics` / `- Perception` lines under a valid `Skills:`
  line. After trimming, each becomes `- Athletics` with no `:` — not a key line, not a level
  header, not first-line-eligible.
  EXPECT: **E001** (malformed line), once per bullet line (2 diagnostics).
- **st-invalid-05**: `# my notes` comment line placed after `Species: Human|XPHB` (not the first
  line of the document, so it can't be read as the identifier).
  EXPECT: **E001** (malformed line). Noting as AMBIGUOUS: if this exact line were the *first*
  line of the file instead, it would be legal — it's shaped exactly like an identifier line. The
  grammar has no comment syntax at all (confirmed: "No free text, except the optional identifier
  line," §0 rule 5), so `#`-comments are simply not a thing; a human used to Python/YAML/etc.
  would plausibly try this.
- **st-invalid-06**: `Resilient (CON)` — parentheses instead of `[CON]` for the feat's ability
  detail. Parens are ordinary characters per §3.1 ("parentheses, apostrophes, `/` and `+` are
  ordinary characters"), so this does **not** violate any lexical rule: the parser reads
  `Resilient (CON)` as one opaque item name with no details and no drop.
  EXPECT: **no diagnostic from the parser** — it parses cleanly as `Item{ref:{name:"Resilient
  (CON)"}, details:[]}`. Only the checker (out of scope to run here) would eventually report this
  as **unresolved** (no feat named "Resilient (CON)") once real game data is loaded. Flagging
  this as the most dangerous invalid case in the set: a human typo here produces silence, not an
  error, at the parser layer.

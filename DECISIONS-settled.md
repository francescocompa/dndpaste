# DECISIONS (settled) — dndpaste

> Reference, not a cold read. Landed decisions moved out of `DECISIONS.md` by binding status (2026-11-20, /clean),
> verbatim and in their original order, under their original section headings (a heading here may also hold live
> entries that stayed in `DECISIONS.md`). A settled decision still binds the surface it owns. Tags and AMENDED markers
> as in `DECISIONS.md`; new entries never start here. Find any id: `grep -n "D146" DECISIONS*.md`.

## Scoping interview (2026-09-04) — mechanism: AskUserQuestion, 8 rounds

- **D2 — Spec before integrations. DECIDED (2026-09-04).** No tool is edited in the first milestone. Later producers/consumers, in this order of intent: my-spellbook export (closes its L5.5 / A-03), character-forge interview seeding, my-spellbook import. monster-forge is out (PCs are not its domain).
  *Raw note:* "no need to edit the tools right away".

- **D3 — Home is a new public repo `~/Documents/GitHub/dndpaste`. DECIDED (2026-09-04).** Own CLAUDE.md, own conventions; consumers copy a built file or install a package. *Rejected:* inside my-spellbook or character-forge (each would make the other depend on a repo whose conventions it must not adopt).

- **D4 — One paste = one build, described as a timeline by level blocks, with flat and mixed forms equally valid. DECIDED (2026-09-04).** **AMENDED → D22/D32 (a `@n` stamp exists, on details only).** A `Key: value` line under a level header is placed at that level. A line before any header, or in a paste with no headers, is **unplaced**: kept by the parser, reported by the checker, **never inferred**.
  *Raw note:* "As with Pokepaste, the goal is to make the tool functional almost regardless of the amount of details provided. Ex. I can generate a dndpaste even after selecting only a class. Nothing is strictly required, as long as what is present follows the same structured pattern."
  *Rejected:* flat snapshot only (cannot replay a multiclass or a swap); inference "unstamped = earliest legal level" (challenged: needs rules data to be correct, tools would disagree); inline `@level` on flat lines (two spellings for one fact).

- **D5 — Ability scores and ASI splits are in the format. DECIDED (2026-09-04).** **AMENDED → D46 (a named, partial form of base scores).** A `Scores:` line for the array; an ASI is a choice at its level like a feat. my-spellbook (no score model) simply omits the line.

- **D6 — Variants and parties are not in v1; the blank-line-block rule is reserved for them. DECIDED (2026-09-04).** **AMENDED → D18 (separator is `---`, not the blank line).** *Rejected for now:* variant override blocks (chassis §10 style) in v1; party pastes in v1.

- **D10 — 5e profile coverage for v1: all four groups. DECIDED (2026-09-04).** Chassis (species + lineage/options, background incl. custom detail, class order/levels, subclass, scores); level picks (ASI/feat with sub-choices, fighting style, invocations, metamagic, masteries, expertise, skills/tools/languages); spells (cantrips, learned, prepared defaults, drop/learn swaps); equipment (starting option letter + named items).
  *Raw note (round 5c):* "keep in mind backgrounds could be custom and have more details" → a value may carry parenthesised detail groups, `;`-separated, `,`-separated items inside.

- **D13 — An unmade choice is omitted; absence is the only "unknown". DECIDED (2026-09-04).** **AMENDED → D24 (absence = default when one exists).** A half-made pick is written as far as it goes. *Rejected:* explicit `?` placeholder.

- **D14 — Keys are full English words, case-insensitive, one canonical spelling; emitters always write the canonical form. DECIDED (2026-09-04).** *Rejected:* short aliases (two spellings to test); 5etools codes (`EI:`) as keys (opaque).

- **D15 — Syntax shape A: header lines, then level blocks `L<n> <Class>` each holding `Key: value` lines. DECIDED (2026-09-04, mockup + 2 rounds).** List values are `,`-separated; a leading `-` on a list item means "dropped here" (spell swaps). *Rejected:* B one-line-per-level (alias table, unreadable past 3–4 picks); C grouped-by-kind with `@level` stamps (scatters the level-up sequence, awkward swaps).

- **D16 — Reference implementation in TypeScript, zero dependencies, ESM plus a single-file UMD build. DECIDED (2026-09-04).** character-forge imports the ESM types; my-spellbook (no-build) copies the UMD file. *Rejected:* vanilla JS single file (no types at the character-forge boundary); Python first (not runnable in the browser).

- **D17 — First milestone = SPEC v0 + parser + fixtures, proven against two real builds (Vice, Shigen) written by hand as dndpastes. DECIDED (2026-09-04).** No app touched. *Rejected:* spec-only with panel first (chosen instead: a panel gate inside M1 after the spec draft, before the parser); spec + spellbook export in one go (edits a tool now).

## OPEN

- **D18 — Blank lines are insignificant; the multi-build separator reserved by D6 is the line `---`. DECIDED (2026-09-04, spec drafting).** Level blocks already use blank lines cosmetically, so the blank line cannot double as the variant/party separator D6 reserved. Amends D6; `---` is an error (E010) in v0.

- **D19 — The 5e profile has a generic `Option: <Feature> (<picks>)` key plus a `Level:` header. DECIDED (2026-09-04, spec drafting).** **AMENDED → D20 (no `Level:`), D27 (`Option` → `Feature` + `Options`); its Pact Boon evidence was wrong — the 2014 Pact Boon is structured data, Divine Order is prose.** Evidence from the 5etools mirror: option-bearing class features such as Divine Order or the 2014 Pact Boon are prose `entries`, not `choose` nodes, so no key-per-feature list and no data-driven checker could stay current on its own. Dedicated keys cover the cross-class mechanics; `Option` covers the rest by feature name, and canonical emit folds it back into a dedicated key when one exists. `Level:` (current character level) lets a paste carry planned levels above the played one, which character-forge seeding needs. *Rejected:* a key per feature (stale on every book); a `Choice:` key without the feature name (unresolvable).

- **D20 — No `Level:` header. DECIDED (2026-09-04, Francesco's spec review).** **AMENDED → D49 ("their sum" is the sum of the class totals once a class is written as runs).** `Classes` states levels as played; a level block above their sum is planned. Supersedes the `Level:` half of D19.
  *Raw note:* "what is the level mentioned at the top or Classes mentions Warlock 10? Likely both redundant info: always prune redundancy" → spec rule 7.

- **D21 — Custom and homebrew backgrounds are fully specified inline in the fixed four-group order. DECIDED (2026-09-04).** **AMENDED → D26 (a homebrew background is a block, not inline groups).** *Raw note:* "archer priest is a custom background, everything about it should be listed under the bg".

- **D22 — A choice belongs to the entity that asks it, as that entity's details, not to a level; a later sub-choice is stamped `@n` inside the details. DECIDED (2026-09-04).** **AMENDED → D26 (species/background picks are block lines; details remain for feats, options, features).** Species, background, feat, subclass and invocation picks are details; `Option` shrinks to class features only. Supersedes the "unplaced/`Option`" reading of D19 for non-class entities. Narrows the D4 rejection of inline `@level`: the stamp exists, but only on details.
  *Raw notes:* "if a feature gained ex. in bg or at a certain level upgrades or offers a choice something at later level mark the choice directly under the original one with @5 for example"; "specialized design is a species trait, why is it under L1 warlock? All choices pertaining a certain feature should be under it, not necessarily in levels"; "missing ability scores mentions in feats and bg".

- **D23 — `Prepared` is written only when the repertoire exceeds the prepare count; never for a caster that picks prepared spells on level-up. DECIDED (2026-09-04).** *Raw note:* "prepared spells also redundant info if the class chooses on level up (ex. warlock)".

- **D24 — Defaults are silent: an absent choice that has a rules default means the default; only default-less choices are undecided when absent. DECIDED (2026-09-04).** Amends D13. The checker must know which slots carry a default. *Raw note:* "only if a choice has a default option, no choice mentioned means default selected".

## Panel round (2026-09-04) — mechanism: /panel, 5 personas (Skeptic, Domain Purist, Maintainer on opus; End User on sonnet; Fresh Eyes on haiku), verdict 5–0 *change*; then AskUserQuestion, 2 rounds

- **D25 — Details use square brackets; names containing `, ; : [ ]` are double-quoted. DECIDED (2026-09-04).** Verified on the mirror: 7,168 names, none contains `"` `[` `]` `{` `}` `<` `>` `=` `@`; 291 items and 36 class features contain parentheses, 120 items contain commas, 51 class features contain colons. Parentheses become ordinary characters (`Arrows (20)`). *Rejected:* quotes alone (his pick was brackets); brackets alone (leaves commas/colons unwritable); changing the list separator.

- **D26 — `Species` and `Background` open entity blocks; their picks are ordinary key lines inside the block. DECIDED (2026-09-04).** Removes nested details and the "which slot is which" problem for the two multi-pick entities. Feats, options and features keep bracket details with a fixed slot order (feat: ability first). *Raw note:* "Species can be its own row similarly to class levels, which should circumvent the issue." *Rejected:* fixed positional slots with empty `;` placeholders; named `key=value` slots; untyped picks classified by the checker.

- **D27 — One `Options` key for every optional-feature family; `Option` renamed `Feature` for named features with a pick. DECIDED (2026-09-04).** **AMENDED → D180–D182 (0.9: family keys beside `Options`, and `Options (<family>)`; `Options` stays the catch-all).** Invocations, metamagic, manoeuvres, infusions, arcane shots, runes, disciplines and 2014 pact boons are all `Options`; 5etools tags the family, so no new key per book. `Fighting Style` stays (a feat in 2024, an optional feature in 2014). *Rejected:* keep `Invocations`/`Metamagic` beside a generic key (two spellings); a key per family (stale).

- **D28 — Unplaced lines carry no class qualifier; the consumer assigns them. DECIDED (2026-09-04).** Parser records no class; a consumer assigns to the class that can own the pick, and to any of them when several can. *Raw note:* "If they can be inferred without any class qualifier, than do that, otherwise if the classes share for example the skill picked, assign it to any of the two. There should be no specific vocabulary for less detailed builds." *Rejected:* class-qualified keys (`Warlock Subclass:`); class as a detail; flat form only for single-class builds.

- **D29 — `Subclass`, `Feat`, `Fighting Style` are lists in header scope, single items in a level block. DECIDED (2026-09-04, panel finding, 3 panelists).** **AMENDED → D34 (`Feat` and `Fighting Style` are lists everywhere, so an extra granted at a level is writable; only `Subclass` stays single per level block).** Otherwise a flat multiclass or a two-feat build is unwritable, contradicting D4.

- **D30 — `emit` is data-free and lossless; data-aware `normalise` lives in the checker. DECIDED (2026-09-04, panel finding, 2 panelists).** Amends D11: the checker also carries a small hand-kept supplement for prose-only slots (Divine Order, Draconic Ancestry, Mystic Arcanum, 2014 equipment, invocation sub-picks) — the Domain Purist showed the pure-data premise does not hold for those.

- **D31 — `Paste: <int>` version header (absent = 1) and `X-` extension keys (kept, W001). DECIDED (2026-09-04, panel finding, Maintainer).** Without them any new key hard-fails deployed parsers, and my-spellbook copies the built file so it lags.

- **D32 — Housekeeping from the panel. DECIDED (2026-09-04).** D13/D24 reconciled in spec rule 8; `Species`/`Background` scope contradiction removed by D26; `Classes`, `Scores`, `ASI` are typed values with AST nodes; subclasses match by printed or short name; equality is on the AST, not text; `Equipment` letters are 2024-only.

## OPEN (added)

- **D33 — `Items` key for magic items and gear acquired in play, distinct from starting `Equipment`. DECIDED (2026-09-04).** Placed at the level gained, details for the item's own picks; never owed, so never "missing". *Raw note:* "include the possibility to mark magic items". *Rejected:* folding them into `Equipment` (conflates a rules choice with a table event); a `Magic Items` key (2024 has non-magic acquired gear too).

- **D34 — Extras are accepted and flagged at info severity. DECIDED (2026-09-04).** A pick with no slot (extra feat, second fighting style, bonus invocation) is reported as `extra` and otherwise treated as part of the build. Every checker finding is warning or info; only grammar is an error. *Raw note:* "allow the checker to accept for example extra feats or other extras (they are flagged, but nonetheless accepted, perhaps a boon from the dm)". *Rejected:* an explicit `boon` marker in the syntax (adds vocabulary for a case the checker can classify by itself).

- **D36 — Missing is judged against played levels only; extras against every level present. DECIDED (2026-09-04).** A planned level above the `Classes` total owes nothing yet, but a pick written there counts toward the build, so a planned subclass at `L3` on a `Warlock 2` is neither missing nor extra.

- **D37 — `Feature` may be unplaced (header scope); the parser hints on `Name (X)` typos. DECIDED (2026-09-04, stress wave).** A flat snapshot must carry Draconic Ancestry; the consumer resolves the owner as for any unplaced line (D28). `Resilient (CON)` cannot be an error (parentheses are legal in names), so W002 hints on picky keys. *Rejected:* forbidding parentheses on those keys (real names have them).

- **D38 — 2014 subraces are species names the 5etools way (`Elf (Wood)|PHB`); Tasha's optional class features are pickless `Feature` lines (`Feature: Favored Foe|TCE`). DECIDED (2026-09-04, stress wave).** The extract now emits subraces as species entries and class-feature variants per class. *Rejected:* a `Subrace` key (2024 has lineages as features already); `Options` for Tasha's features (they are class features, not optional-feature entities).

- **D39 — Medium is the silent default size. DECIDED (2026-09-04, Francesco).** A 2024 species offering Small/Medium is Medium unless `Feature: Size [Small]` is written; the checker no longer reports the absent pick. Applies D24.

- **D40 — A `+N ` prefix on `Items`/`Equipment` is stripped for resolution. DECIDED (2026-09-04, Francesco).** **AMENDED → D55 (named variants resolve from 5etools' magic-variant data; the `+N` strip stays as the fallback).** `+1 Longsword` resolves as `Longsword`; the paste keeps the prefix. Named variants still need a data source.

## M2 tail scoping (2026-09-05) — mechanism: AskUserQuestion, 3 rounds

- **D41 — The M2 tail ships as 0.5.0 before M3, built by parallel worktree agents with a fresh-eyes review before merge. DECIDED (2026-09-05).** Scope: spell-list legality · 2014 starting-equipment picks · `bin/dndpaste` CLI · ability-score arithmetic · dangling `Class 0` · name-alias fallback. Homebrew merge stays queued (needs a real homebrew file). *Rejected:* CLI + spell-list only (leaves the checker half-blind on 2014 builds); sequential build (no reason to serialise independent modules).

- **D42 — A `Classes` entry at level 0 with no level block is reported as `unplaced` info, kept in the paste, never dropped by `normalise`. DECIDED (2026-09-05, closes stress call 6).** *Rejected:* warning severity (noise on planned-but-unstarted classes); dropping it on emit (loses the author's plan).

- **D43 — Unresolved names fall back to a unique contains-match within the same entity kind, resolved at info severity ("resolved as X"); two or more hits stay unresolved. A cross-edition hit still resolves, with the edition mismatch stated in the same finding. DECIDED (2026-09-05, closes stress call 9).** Fallback only fires on the full `Name|SRC` miss and never on refs shorter than 4 characters, so `Shield` cannot swallow `Shield Master`. *Rejected:* an alias table in `supplement.json` (hand upkeep per rename); table-then-contains (two mechanisms for one problem); refusing cross-edition hits (breaks builds that mix books on purpose).

- **D44 — Consumers get the library as a copied `dist/dndpaste.umd.cjs`, the version stamped in `CHANGELOG.md`; M3 runs as a separate session inside my-spellbook after 0.5.0 lands. DECIDED (2026-09-05, closes O3).** *Rejected:* public npm package (needs the remote and an account first; can revisit once there is a third consumer); git submodule/subtree (Drive-synced folders); running M3 from this repo's context in parallel (crosses the CLAUDE.md boundary and targets a moving UMD).

## Share links (2026-09-29) — mechanism: Francesco's call in the character-forge v2 seed session

- **D45 — dndpaste gets a pokepaste-style share service: a Cloudflare Worker with KV storage, short links, anyone can paste. DECIDED (2026-09-29).** Scope:
  - A paste goes in and comes back as a short link (`…/p/<id>`).
  - A public viewer renders it pokepaste-style, dry, ~~with names linked~~ with plain names (AMENDED → D67, 2026-11-15), and offers an import action to consuming apps.
  - Names only, as always (D9): the service never stores rules text, notes or session state.
  - Producers get "Share link" and consumers get "Import from link": My Spellbook produces, character-forge v2 consumes (see its cf-D67).
  *Raw note:* "For the paste, I'd like to mimic pokepaste and have tiny storage." Then, choosing between a Worker and GitHub Gists: "Cloudflare Worker".
  *Rejected:*
  - GitHub secret Gists as storage: only the key holder can create pastes, and a gist-scoped token would sit in browser storage.
  - Links that carry the paste in the URL fragment: no storage, and links run long (1–2k chars). Still a possible offline fallback, not the product.
  - No sharing at all.
  *Open for the build session (⚑ Francesco, 2026-09-29) — all closed 2026-11-15 by D65–D74 (AMENDED in place):*
  - He creates the Cloudflare account; the API token lives only in local `.env` / `wrangler login`.
  - Abuse limits: a size cap, per-IP rate limits, and whether pastes expire (pokepast.es keeps them).
  - Where the viewer is hosted (this repo's Pages site, or the Worker itself).
  - Whether a paste can be edited or versioned, or every share makes a new id.
  *Enforced by:* prose only until built.
  *Affects:* PLAN.md (a new milestone, placed by his call relative to M3), SPEC.md (a share-link section, if the link format needs specifying), README.

## Real-build stress wave (2026-09-30) — mechanism: Francesco's calls on the report of the real-build stress wave (cf-D81), relayed by the character-forge session

- **D46 — `Scores` takes a named, partial form; always base scores. DECIDED (2026-09-30).** `Scores: DEX 15, CON 13`: an ability and its value, any order, each ability once, missing abilities simply absent. It is the **base** score, before background and feat increases, like the six-number form, which stays valid. Canonical emit writes the six-number form when all six are known, else the named form in `STR…CHA` order. The AST keeps six slots, `null` for an ability not written. `finalScores` and the checker say "unknown" (`null`) for a missing ability and never assume 10; increases on an unknown score are not cap-checked. Amends D5 and SPEC §5.2 `scores`. Closes F1, the commonest loss in the wave (9 builds). Posted *final* scores are written only when the paste's own increases turn them back into base scores; otherwise they stay out.
  *Rejected:* `?` placeholders in the six-number form (`?/17/14/?/14/?`); a separate `Final:` key for posted final values.
  *Enforced by:* `parseScores`, `emitValue`, `finalScores`; parse and check tests.

- **D47 — A pick made but unnamed stays absent: no change. DECIDED (2026-09-30).** "Rogue 6 Expertise, skills unstated" or "an Epic Boon" is written as nothing; rule 8 (absence = default if one exists, else undecided) holds. The level block, when present, still shows the level was taken. Closes F2 (6 builds).
  *Rejected:* an explicit unnamed pick (`Expertise: ?`) — a placeholder is the same `?` D13 already rejected, and a consumer still has to ask for the name.

- **D48 — Unplaced lines keep no class qualifier: no change, deferred. DECIDED (2026-09-30).** D28 stands. The gap only matters when two classes cast with different abilities, and the wave hit it once (a Sorcerer/Warlock, both Charisma). Revisit if character-forge's replay meets a real case. Closes F3 for now.
  *Rejected:* a class qualifier on unplaced spell lines (the class-qualified keys D28 already rejected).

- **D49 — `Classes` accepts runs in the order taken, as cumulative class levels; one reading rule gives the class of every level. DECIDED (2026-09-30).** `Classes: Fighter 1 / Rogue 3 / Fighter 6 / Rogue 14` is Fighter to class level 1, then Rogue to 3, then Fighter to 6, then Rogue to 14: a 20-level Fighter 6 / Rogue 14. A class's repeated entries must each carry a count, strictly increase, never be 0 and name one source, or it is `E012`. The played total is the sum of the class totals (each class's last entry). Planned levels and `0` entries keep their meaning.
  - *Canonical emit* prints the totals, one entry per class in first-appearance order, and carries the order as a level header at each class change, adding an empty level block where there is none yet — at changes only, not at every level. Only a paste with a timeline (level blocks, or runs) gets them; a flat paste stays flat. Emit stays data-free, lossless and idempotent: a header that agrees with the sequence does not change it.
  - *Reading rule* (SPEC §5.4), backward-compatible: on played levels, runs give each level's class and a header must agree (`E016`); without runs, a header fixes its level, and an unheadered level continues the current class while it has levels left, else takes the first class in `Classes` order with levels left, where levels left excludes levels a later header of that class claims. A header whose class has no levels left is `W003` (it was the checker's "does not account" warning). Planned levels carry on from the previous one. The rule is exported as `classSequence` and the checker uses it.
  - *Evidence:* every fixture and spec example keeps its canonical form and class sequence. Across the 97 clean pastes in the fixtures and both stress corpora, one sequence changes (the 2026-09-04 wave's `mastermind`, which the old rule read as Rogue 6 against `Classes`' Rogue 5); seven non-fixture pastes gain switch-point headers.
  - *Compatibility:* the 0.5.0 library (SPEC 0.4) reads runs as separate entries and sums them (24 levels above) without a diagnostic, so consumers must pin 0.6.0 before they accept runs. No `Paste: 2`: a SPEC 0.4 paste means the same under SPEC 0.5.
  Amends D20 and SPEC §5.2 `classes`, §5.4, §5.5. Closes F4 (5 builds; up to 13 of 20 blocks were empty scaffolding) and stress open call 2.
  *Raw note:* "generally it should print Fighter 6 / Rogue 14 and have the class level blocks when a change happens"; runs "compute as an ordered list".
  *Rejected:* keeping empty scaffolding blocks as the only way to state interleaving; a header at every level; the old queue reading "first class in `Classes` order with levels left" for every unheadered level (it needs a header on every level of a dip, and reads `mastermind` against its own totals); headers added to flat pastes too (turns every flat multiclass into a mixed one and repeats what the reading rule already gives; ⚑ Francesco may prefer it — it would change `flat-multiclass` and SPEC §8.2).
  *Enforced by:* `parseClasses`, `sequenceOf`/`classSequence`, `withSwitchHeaders`; parse and check tests.

- **D50 — A feat an option grants is written as the option plus, when the feat has picks of its own, a standalone `Feat` line in the same level block; no grammar change. DECIDED (2026-09-30).** `Options: Lessons of the First Ones [Magic Initiate]` with `Feat: Magic Initiate [CHA; Wizard; …]`. The option names its feat as its pick (§5.3, as `Lessons of the First Ones [Alert]` already did); the `Feat` line carries the feat's own picks. E011 stays: details do not nest. The checker claims that `Feat` line for the option, so it is not an ASI-slot feat, not "extra", not "misplaced"; a bare option claims the first `Feat` line in its block of the category it grants. A granting option with no feat named or written, and a named feat whose own picks have no `Feat` line, are `missing`/info; a feat of the wrong category is `misplaced`. Closes F5.
  *Rejected:* nested details (`Lessons of the First Ones [Magic Initiate [CHA; …]]`, breaks E011 and every parser); the option always bare with the feat only on a `Feat` line (loses which `Feat` line is the option's at an ASI level).
  *Enforced by:* `optionFeats` in `check`; check tests.

- **D51 — Missing pick data is data, not grammar. DECIDED (2026-09-30).** The extract records the feats an optional feature grants (5etools `featProgression`; today only Lessons of the First Ones: one Origin feat per instance), and the supplement owes one `Expertise` at Wizard (XPHB) 2 for Scholar. Pact of the Blade's bonded weapon and a familiar's form (Find Familiar, Pact of the Chain) are chosen when used, not at build time, so they get no slots and no detail; a paste leaves them out. Closes F6 and the wave's C4.
  *Rejected:* detail slots for the pact weapon and the familiar form (they are per-use choices, like Cunning Strike options).
  *Enforced by:* `scripts/extract-slots.mjs`, `data/supplement.json`; check tests.

- **D53 — A written class order is a claim: no change. DECIDED (2026-09-30).** A post that leaves the class order open ("either class first") is written in one order, and that order is asserted. Closes F8 (4 builds).
  *Rejected:* an "order open" marker.

- **D54 — An Origin feat at an ASI level is legal. DECIDED (2026-09-30).** The checker warned "an ASI-slot feat must be General". The 2024 Ability Score Improvement feature grants "the Ability Score Improvement feat or another feat of your choice for which you qualify" (verified in the 5etools XPHB class data); Origin feats have no prerequisite, and Skilled and Magic Initiate are repeatable. The warning is removed; the reverse (a General feat from a species or background) stays `misplaced`. Closes C1 (2 builds, incl. the "all 18 skills by level 4" Skilled build).
  *Enforced by:* `checkFeat`; check tests.

- **D55 — Generic magic variants resolve from 5etools' magic-variant data plus the base item. DECIDED (2026-09-30).** The extract carries `magicvariants.json` (names, naming affixes, and the requires/excludes matchers: item-type codes and flags, no text) and marks base items with the matcher keys they have. `Items`/`Equipment` resolve by exact name, then as a variant by its own name (`Vicious Weapon`, `+2 Armor`), then as a variant's affix around a base item it applies to (`Flame Tongue Warhammer`, `Vicious Longsword`), before the D43 contains fallback and the D40 `+N` strip. A base the variant does not apply to is `unresolved`/info; a combination only another edition allows resolves with the edition stated (as D43). Amends D40; closes C2 and stress open call 7.
  *Rejected:* a hand-kept list of variant names in the supplement (goes stale; the data exists); stripping any known prefix without checking the base (would accept a Vicious Shield).
  *Enforced by:* `scripts/extract-slots.mjs`, `resolveItem` in `check`; check tests.

- **D56 — Extension keys are written back as authored. DECIDED (2026-09-30).** `emit` lowercased everything after `X-` (`X-Plan-B` → `X-plan-b`), against SPEC §2.5. The reserved prefix is written `X-` (keys are case-insensitive, and the prefix is the one fixed part); the rest of the name keeps its case. The same name in another case is a duplicate (`E003`); `X-` keys sort alphabetically ignoring case. Closes C3.
  *Rejected:* keeping the lowercasing and documenting it; writing the prefix as authored too (`x-foo` and `X-foo` would be two canonical spellings of one key).
  *Enforced by:* `parse`, `emitScope`; parse tests.

- **D58 — character-forge v2 consumes v0.6.0 as a copied ESM build; the UMD stays the artefact of record (D44). DECIDED (2026-10-10).** A D64 crossing, recorded in character-forge v2 as D160. What crossed: tag `v0.6.0` (`c11498da577a4e401e9de1c7016d871ce894d164`), built with `npm ci && npm run build` from `git archive v0.6.0`: `dist/src/dndpaste.js` and `dist/src/check.js` with their `.d.ts`, the two modules `scripts/umd.mjs` concatenates into the UMD, whose sha256 is recorded beside them. Why not the UMD: a CJS file in a Vite project's `src/` is not transformed, and the typings come free. Where: `src/paste/lib/v0.6.0/` in character-forge (private). Who owns what: v2 owns the adapter and the goldens and refuses a `Paste:` major above the one it knows and any `E###` diagnostic; this repo owns the library and its tags (D57). v2 reads `fixtures/shigen.dndpaste` and `fixtures/vice.dndpaste` from this checkout for a local-only parse check (read-only, never copied into its git). *Not yet:* "Import from link" waits for D45's service.
  *Rejected:* copying the UMD unchanged (needs a CJS interop v2's build does not give source files).
  *Enforced by:* character-forge's `src/paste/lib.test.ts` (header, upstream hash, manifest).

## HP key (2026-10-10) — mechanism: AskUserQuestion, 1 round (3 questions), in a session started from character-forge's T2.3

character-forge v2 needed to store the hit-point method in the paste and wrote `X-HP: average`, which every reader reports as `W001`. Francesco chose a real, optional key here instead (cf-D163 b).

- **D59 — An optional `HP` key: a header method, overridable per level, with rolls as die results. DECIDED (2026-10-10).** `HP: Fixed` or `HP: Rolled` in the header is the method for every level after 1st. A level block may carry `HP: Fixed`, `HP: Rolled` or the die result rolled at that level (`HP: 7`, before the Constitution modifier, which changes retroactively anyway); an integer implies `Rolled` and is legal only in a level block (`E012` in the header, as are 0, leading zeros and anything else). Level 1 always takes the die's maximum (2014 and 2024), so it has no line. New profile type `hp` (AST `{ type: "hp", method, roll }`); key order after `Classes`, so it is first in a level block, which is where levelling up starts. The key is optional and never owed: absence states no method and draws no finding; every existing paste and fixture keeps its meaning and its bytes. Checker: a level-1 line or a roll above the hit die of the level's class (by the reading rule, so a multiclass level uses its own die; the slot table already carries `hd`) is `misplaced`/warning; a level method that repeats the header is `redundant`/info and `normalise` drops it (rule 9); a level line that differs from the header is an override and stays. `Fixed` is the one spelling (D14): the 2024 rules' term and D&D Beyond's, and exact where "average" is not (a d8's value is 5, its average 4.5).
  *Raw note:* "Header + level override" · "Fixed" · "No, Fixed and Rolled only".
  *Rejected:* header + rolls only, no per-level method (loses RAW's choice made afresh each level; a roll under `Fixed` would have to be a warning); header only (a rolled character's HP cannot be replayed from the paste); `Average` as the spelling (2014 wording and cf's interim value, wrong for 2024 and arithmetically); a `Max` method for the max-HP house rule (a table rule, not a build choice; writable as rolls at the die maximum; additive later if wanted); the HP gained per level instead of the die result (mixes in CON, which changes retroactively).
  *Enforced by:* `parseHp`, `emitValue`, `KEYS` order, the HP block in `check`, `normalise`; parse and check tests.

- **D60 — character-forge v2 asked for D59 and switches from `X-HP` in its own crossing. DECIDED (2026-10-10).** A D64 crossing, recorded in character-forge v2 as D163 (cf-D163 b). What crosses: nothing yet. The key ships in the next minor release (0.7.0, SPEC 0.6, made by hand per D57); until then character-forge keeps writing `X-HP`. To switch, it copies the tagged 0.7.0 build in the D58 way (a separate crossing, its own decision there), writes `HP: Fixed` where it wrote `X-HP: average` (and `HP: Rolled` for a rolled character), and may read `X-HP` from older stored pastes once and rewrite it. Who owns what: this repo owns the key's grammar, emit order and checks; character-forge owns when it sets the key and the migration of its stored pastes.
  *Rejected:* keeping `X-HP` (a `W001` on every reader, and an extension key never gets checked).
  *Enforced by:* prose (this entry); character-forge's own crossing checks once it copies 0.7.0.

## Release 0.7.0 (2026-11-10) — mechanism: a brief from the overseer, Francesco's go given 2026-11-10

character-forge v2's P8 builder needs the HP key and a producer stamp in one release (cf-D2235; cf-D1987 c asked for every need up front). Needs: `character-forge/jams/2026-11-10-p8-flow/DNDPASTE-NEEDS.md`.

- **D61 — 0.7.0 ships the HP key (D59) and the `Producer` stamp (D62) together, for character-forge's P8 builder. DECIDED (2026-11-10).** A D64 crossing, recorded in character-forge v2 as D2235 (needs up front: D1987 c). Nothing else crosses: owed picks stay absent (D47), class variants and replacements stay in game data, the score method is the app's. Release per D57: annotated `v0.7.0` tag = `package.json` = dated CHANGELOG heading, made by hand, not pushed until Francesco says. character-forge copies the built `dist/` in its own crossing and retires `X-HP` then (D60).
  *Rejected:* releasing HP alone now and the stamp later (two copy-ins for the app, against D1987 c).
  *Enforced by:* prose (this entry); character-forge's copy-in checks (header, upstream hash).

- **D62 — An optional header key `Producer`: free single-line text, `<name> <version>`, placed right after `Paste`. DECIDED (2026-11-10).** `Producer: character-forge 2.1` says what wrote the paste, so odd output can be traced. The name is plain and unabbreviated, like `Paste`/`Rules`; a producer is the standard word for "what made this file". Type `text` (new): the rest of the line, trimmed, kept as written. Header scope only. Canonical place: second, after `Paste`, since both are about the document, not the build. No finding present or absent: it never changes what the build means, and a checker that judged it would break every producer it had not heard of. Additive: a 0.6 reader reports `E002` on it, so consumers pin 0.7.0 before writing it.
  *Rejected:* a structured `name/version` pair or semver check (breaks on any producer's own scheme, buys nothing); the `X-Producer` extension key (a `W001` on every reader, never checked: the same reason `X-HP` retires, D60); a comment line (dropped by parse, so `emit` could not keep it); allowing it in level blocks (a stamp is per paste).
  *Enforced by:* `KEYS`, `parseValue`/`emitValue` (`text`); parse test.

## Share site scoping (2026-11-15) — mechanism: /interview, AskUserQuestion, 6 rounds

- **D65 — A share holds the paste, a title and an author; it is immutable and kept forever. DECIDED (2026-11-15); REOPENED → D96 (owner-device edits); AMENDED → D97 (editable by its owner as revisions; each revision immutable).** No notes field (D45: never notes). Every save makes a new id; revisions go through "Duplicate and edit". No expiry, no delete link; takedown is a manual KV delete (D71).
  *Rejected:* a pokepaste-style notes box (invites rules text, against D45 and the IP check); text only (no credit, nothing to show in tabs); editable via a secret link or versions under one id (an import link could change under its reader; secret-token handling); expiry after a year unread (old forum links die); a self-service delete link.

- **D67 — The view page shows names as plain text, no links. DECIDED (2026-11-15).** Amends D45 ("names linked").
  *Rejected:* D&D Beyond search links (some results paywalled; a dependency on another site's URL scheme); a viewer-chosen link template (more build for little use).

- **D68 — v1 quality-of-life set. DECIDED (2026-11-15); AMENDED → D84 (no preview pane), D83/D85 (additions).** Form: ~~live preview~~ with diagnostics as you type, a Tidy button (canonical form via `emit`), syntax colouring in the editor, open or drop a `.txt`/`.dndpaste` file. View page: copy buttons (link, text, canonical text), Duplicate and edit, fold level blocks, a light/dark toggle, "My recent shares" kept in this browser only (localStorage, no accounts).
  *Rejected:* nothing offered was left out.

- **D69 — Links are `<origin>/<id>`; consumers get `/raw`, `/canon` and `/json` with open CORS. DECIDED (2026-11-15).** The id is 10 random base62 characters. `/<id>/raw` is the text as written (`text/plain`, `nosniff`); `/<id>/canon` is `emit` of the parse; `/<id>/json` is `{ title, author, paste, created }`, like pokepaste. All three carry `Access-Control-Allow-Origin: *`, so character-forge's "Import from link" (cf-D67, T2.1) fetches them from the browser. Fixed pages (`/`, `/about`) cannot collide with a 10-character id.
  *Rejected:* `/p/<id>` (2 characters longer, buys nothing); raw only (every consumer re-canonicalises).

- **D70 — Free hosting first: one Worker on workers.dev, with a canonical-origin switch so links survive a move. DECIDED (2026-11-15); AMENDED → D91 (a Durable Object joins the KV namespace).** The Worker serves pages, static assets and the API, with one KV namespace; this closes D45's "where the viewer is hosted". A `CANONICAL_ORIGIN` setting: when a domain is added later, it points at the same Worker, the setting flips, and every request on another host gets a 301 to the canonical host, path kept, CORS headers on the redirect too. Ids do not depend on the host, so nothing migrates.
  *Raw note:* "I want a free option, but structure it in a way that links won't break and will redirect if I ever move it."
  *Rejected:* buying dndpaste.com or dndpaste.app now (about $10/$14 a year; "D&D" is a WotC trademark, a small exposure common to fan tools); Cloudflare Pages beside a Worker (two deploys).

- **D71 — Abuse handling: a 32 KB cap, a per-IP save limit, Turnstile stubbed for later, and a Report button whose reports land in a KV inbox. DECIDED (2026-11-15).** Reports hold id, reason and an optional contact; Francesco reads them with one `wrangler` command, documented in `SITE.md`; `/about` explains the route and that the site is unaffiliated with Wizards of the Coast. Once a domain exists, an `abuse@<domain>` alias through Cloudflare Email Routing joins it (the first choice; it needs a domain).
  *Rejected:* Turnstile from day one (a key before the build, friction for real users); 64 KB (no real build needs it; Vice is about 2 KB); a dedicated free mailbox or GitHub issues as the only route.

- **D72 — The look comes from a jam before the build; the build works from approved frames. DECIDED (2026-11-15); AMENDED → D82 (colour-coding categories carried over from character-forge, by his call).** A fresh Mac jam session (the loop needs the browser), decision ids D80–D89. Then one build session, Opus@high (model policy: UI build from approved frames), on the Mac (the browser checks the live preview; the wrangler login lives here). Walled off from every other project's look.
  *Rejected:* a pokepaste-dry look by the builder with /ui-review polish after (more rework); function first with a placeholder skin and a re-skin later (two builds, not one-shot).

- **D73 — The site lives in `site/` in this repo, imports `src/`, and goes live on workers.dev after review. DECIDED (2026-11-15).** `site/` has its own `package.json` (wrangler, dev-only), so the library stays zero-dependency, and the site always runs the current format. The build session goes: build → verify → fresh-eyes review (XSS, abuse, IP) → fixes → Francesco's go → `wrangler deploy` → smoke test on the live URL. Pushing to GitHub stays separate and his.
  *Rejected:* its own repo copying `dist/` (drift, a release dance per format change); stopping at local `wrangler dev`.

- **D74 — The site is M3; the my-spellbook export moves to Later. DECIDED (2026-11-15).** My Spellbook went independent (cf-D1986), so its export is that repo's call under its new role (ms-D176). Closes the "milestone position" call (D45, PLAN Later).
  *Rejected:* keeping the export as a numbered milestone right after the site.

## Site look jam (2026-11-15) — mechanism: /jam, 4 rounds on an Artifact board + AskUserQuestion, in a session started by the overseer

- **D80 — The site's direction is dry text: pokepaste-close, a mono build, one column, the view reads like the paste. DECIDED (2026-11-15).** Picked in words before any mockup.
  *Raw note:* picked "A · Dry text (Rec.)".
  *Rejected:* B Typeset sheet (the view stops looking like the text people type; a type pairing to build); C Workbench (casual readers of a shared link land in an IDE).
  *Enforced by:* jam frames (`jams/2026-11-15-site-look/`), build brief.

- **D81 — Identity: Hanging keys — keys right-aligned in a margin, values in one mono column, level numbers in the accent, sans UI chrome (IBM Plex Sans + Plex Mono, self-hosted OFL). Accent: Garnet (light `#a51d4a`, dark `#f48fb1`). DECIDED (2026-11-15).** Round 1.1 → C; round 1.2 → A Garnet.
  *Raw note:* picked C on the board; "Lock C with notes, do one more round to confirm". Board notes: "For the main colors, I want something more towards red but that doesn't read as error" · "The main buttons feels a bit disorganized, and perhaps difficult to access on mobile?" (→ round 3).
  *Rejected:* A Plain, system mono flush text (no reason given; least identity); B Listing, line-number gutter and level bands (no reason given); reds Oxblood (reads brown, near the STR hue) and Rosewood (washed out on dark), no reasons given.
  Form errors use amber plus the E-code, never the accent (1.2 goal).
  *Enforced by:* build frames.

- **D82 — Colour coding comes from character-forge's settings, hues re-tuned to this palette: "Colour by kind" (class, subclass, species, background, feat, spell, item) and "Colour abilities" (STR–CHA), each a switch saved in this browser. DECIDED (2026-11-15).** An explicit, scoped override of D72's "walled off from every other project's look" and of the global cross-project rule, for colour-coding categories only: character-forge's *Sources* category becomes "Colour by kind" here (dndpaste's "source" already means `|SOURCE`), its *Abilities* category is kept; *Keywords* (damage, healing, conditions, areas, actions) and *Advantage* colour rules text and do not apply to a paste. Hue values are dndpaste's own; only the categories and the kind/ability→hue-family mapping carry over. Nothing is imported as code or tokens.
  *Raw note:* "Let's import all relevant color coding options from character-forge and add them as settings." · "D72 shouldn't be as non-negotiable. Import from character-forge, hues can be changed to fit our color scheme."
  *Rejected:* dndpaste's own scheme designed blind (he chose the import); syntax colour only, no settings.
  *Amends:* D72 (wall), for colour coding only. *Enforced by:* build frames; SITE.md view-page section (overseer to add).

- **D83 — The paste form gets a key hint strip in v1: under the editor, the keys the current line's block allows (from the profile's key table, no game data); a tap inserts `Key: `. DECIDED (2026-11-15).** A scope addition to D68 and SITE.md (overseer folds).
  *Raw note:* "When writing, is it possible a level auto-suggests what keys should follow?" → picked "Hint strip in v1 (Rec.)".
  *Rejected:* an autocomplete popup at the cursor (costly and fiddly over a textarea on phone keyboards); queue for later.
  *Enforced by:* round 2 frames, build brief.

- **D84 — No live preview pane on the form: the syntax- and kind-coloured editor is the preview; live diagnostics stay. DECIDED (2026-11-15).** Amends D68 ("live preview") and SITE.md Form ("Live preview + diagnostics beside it"). The shared renderer still draws the view page.
  *Raw note:* "considering we don't have images to attach like pokepaste, we don't really need a preview pane, which is mostly identical to the editor."
  *Rejected:* a Preview switch that swaps the editor for the rendered view in place; the side-by-side preview pane of round 2.1.
  *Amends:* D68. *Enforced by:* round 2.2 frames.

- **D85 — Pasting a dndpaste link or bare id into the editor offers to import that build: a bar above the editor, "Open it" or "Keep as text"; title and author come along. DECIDED (2026-11-15).** Triggers only when the whole paste is one of this site's links (any host the site answers on, or the canonical origin) or a 10-character id; fetches `/<id>/json` same-origin. A scope addition to SITE.md Form (overseer folds).
  *Raw note:* "pasting either an id or full link in the builder should pop up an option to import the build as well."
  *Rejected:* importing at once with an undo toast.

- **D86 — Paste form layout: editor + side column. Title and author each on their own full-width line above the toolbar; toolbar Open file · Tidy · problem count · Save and get link; the side column (270 px) holds Problems, Keys you can add, My recent shares. On the phone the side column stacks below, and a bottom dock carries the problem line and Save plus the key hints collapsed behind a "Keys" toggle (one scrolling chip row when open), kept short so the keyboard and the lines being typed stay visible. DECIDED (2026-11-15).** Round 2.2 → A.
  *Raw note:* "A — Title and author in two lines to allow for longer entries — on mobile, the parts after the build like keys you can add are quite difficult to use, could we add them to the dock in a collapsed way (making sure there's enough space for the keyboard and text preview)"
  *Rejected:* C Single column + dock (no reason given); B Side rail (Save scrolls away on the phone; problems below a long paste). Round 2.1's Two panes / Side rail / Document, all with a preview pane (superseded by D84).
  *Enforced by:* build frames `form-*`.

- **D87 — Share view actions: one split button, "Copy link" (link glyph) with a ▾ half opening Copy text (as written) and Copy canonical (tidied, for apps); "Duplicate and edit" beside it; fold controls above the build; Report as a quiet line under the build ("Something wrong with this build? Report it") that opens the report form in place. On the phone the split button and Duplicate and edit sit in a bottom dock; the ▾ opens a sheet. DECIDED (2026-11-15).** Round 3.1 → A, renamed per his note.
  *Raw note:* picked A on the board; "Unclear what more copies does" → "Copy as a split button (default as link, perhaps with link icon) with the second part opening a dropdown for more options".
  *Rejected:* B Side column (no reason given); C segmented Copy control + More (no reason given); "Copy text ▾" as a separate button, two plain buttons, one "Copy ▾" for all three.
  *Enforced by:* build frames `view-*`.

- **D89 — Build frames approved with three notes, applied to the frames: (a) icons on buttons, never text glyphs (▾ ▸ ✓ ◐ become SVG icons), each optically centred in its button; the frames use Lucide-style outline icons (ISC licence), self-hosted as one SVG sprite under CSP 'self'; (b) dropdowns, menus and dialogs always stay inside the viewport: flip or shift at the edges, and on phones use a bottom sheet; (c) the footer disclaimer ("Names only, never rules text. Not affiliated with Wizards of the Coast.") is removed from the pages. DECIDED (2026-11-15).** Round 4.1.
  *Raw note:* "Let's add icons to our buttons. Also, make sure to always use icons instead of text glyphs, and make sure these icons are centered accurately." · "Make sure dropdowns and modals are never out of bounds independently from the viewport" · "Remove the disclaimer as is now. It's clear, there is no text from us." · "Done marking, few notes but you can move on from the jam."
  *Closed (2026-11-15, AskUserQuestion, overseer):* `/about` keeps one plain "not affiliated with Wizards of the Coast" sentence, as the frames have it; only the footer line goes. Picked "Keep it on /about only (Rec.)".
  *Enforced by:* build frames (all 12), build brief.

- **D90 — The form holds an `E001` on the line being typed until the cursor leaves it or typing pauses (about 1.5 s). DECIDED (2026-11-16).** Mechanism: AskUserQuestion, 1 round, on slice 2's open question (`site/FIDELITY.md`, `form-keys-dark-phone`). Save still blocks on it. Matches the frame's "No problems" while the key hints narrow a half-typed key.
  *Rejected:* showing it at once (amber flashes on every keystroke of a new key).
  *Enforced by:* slice 3's brief (a fix in the form's diagnostics timing).

## T3.3 review fixes (2026-11-16) — mechanism: AskUserQuestion, 1 round (2 questions), overseer, on the fix worker's two flags

- **D91 — The daily cap per IP (IPv6: per /64) counts in a SQLite-backed Durable Object, `DailyCap`, a second binding beside the KV namespace; it fails open. DECIDED (2026-11-16).** Amends D70 ("one KV namespace"). Comes from T3.3 finding 1: one IP at the per-minute limit used up the ~1k free daily KV writes in about 100 minutes. The DO is on the Workers Free plan, has its own write quota and counts exactly; if it errors, saves go through.
  *Raw note:* picked "Keep the Durable Object (Recommended)".
  *Rejected:* counting in KV (each count spends the budget it protects, and concurrent requests race past the cap); no daily cap (per-minute limit + 503 page only; one IP still drains the day).
  *Enforced by:* `site/src/daily.ts`, `site/wrangler.toml`, `site/test/abuse.test.ts` (branch `claude/site-m3-ee11e4`, b679c33).

- **D92 — Starting daily limits: 50 saves and 20 reports per rate key. DECIDED (2026-11-16).** Far above a real user's day; about 20 keys at the cap would still use the whole free budget, which the 503 page then covers. Revisit with real traffic.
  *Raw note:* picked "50 saves, 20 reports (Recommended)".
  *Rejected:* 20/10 (a heavy user tidying many builds could hit it); 100/30 (10 keys drain the budget).
  *Enforced by:* `site/src/daily.ts` constants, abuse tests.

## /ui-review of the share site (2026-11-16) — mechanism: /ui-review round 1 (24 items, all approved) + AskUserQuestion, 2 rounds (7 questions), worker session on branch `claude/site-m3-ee11e4`

- **D93 — Phone sheets close with a round × in their head, on the grab-bar line; the bottom Cancel / Close row goes. The desk copy menu carries the same icons as the sheet. DECIDED (2026-11-16); AMENDED → D98 (the × is a ghost, no fill).** Applies to the Copy sheet, the Display sheet and the copy-by-hand panel. A tap on the scrim and Escape still close; focus still lands on the first item. Amends D89 b's sheet anatomy (frame `view-copysheet-dark-phone`).
  *Raw note:* "For the scrims, maybe the close option isn't obvious" · "The icons could be present also in the dropdown form"; picked "× in the sheet head (Recommended)".
  *Rejected:* a full-width Close button at the bottom (still reads as a row of text); both (too much chrome).
  *Enforced by:* `site/src/client/site.ts` (`SHEET_HEAD`), `site/public/assets/site.css`.

- **D94 — On the phone form, a problem takes its own full-width row above Keys · Save, with the message cut to one line. DECIDED (2026-11-16); AMENDED → D98 (every status on that row, ruled off).** The all-clear ("No problems") stays in the row between Keys and Save. Amends D86's dock (frame `form-error-phone`).
  *Raw note:* pin "Error line is compressed between keys and wraps badly, either we reduce info or we move it"; picked "Own line above (Recommended)".
  *Rejected:* shortening it to code + line (still squeezed; the message helps while typing); a count only.
  *Enforced by:* `site/src/client/form.ts` (`.prow`), `status.ts` `dockLineHtml`, `test/form.test.ts`.

- **D95 — The site saves a build only when it has at least one key besides its name (a header key, an entity block or a level). DECIDED (2026-11-16).** A site rule, not a format rule: SPEC still allows a name-only paste. Blocks client-side (Save off, "Only a name · add a key to save") and server-side (422). A pasted link kept as text can no longer become a share.
  *Raw note:* "Why is the link not returning an issue? Should we have a bare minimum required outside of the name line to save a build?"; picked "Block on the site" over the recommended "Warn, don't block".
  *Rejected:* a warning only; no change (name-only shares stay valid).
  *Enforced by:* `site/src/store.ts` `isBare` + `BARE`, `app.ts` save, `status.ts`, tests in `form.test.ts` and `worker.test.ts`.

- **D96 — Editing a build from the device that made it: D65 is reopened, to design before T3.4. ~~OPEN~~ DECIDED → D97 (2026-11-16).** D65 ships immutable shares with "Duplicate and edit"; Francesco wants a way to change a share from the browser that saved it. Needs its own design pass (an edit key kept in the browser; what happens to old links, the hour-long cache, reports, immutability in SITE.md). Nothing built.
  *Raw note:* "Is there no way to allow edits to a build, when done from the same device that created it for example?"; picked "Design it now" over "Keep D65 for v1, park it (Recommended)".
  *Rejected:* never.

## Editing shares (2026-11-16) — mechanism: AskUserQuestion, 1 round (3 questions), overseer; closes D96

- **D97 — A share can be edited by its owner, any time, as revisions; the link shows the latest; shared pages cache for 5 minutes. DECIDED (2026-11-16).** Amends D65 (immutable shares). Each edit adds a revision: `/<id>` and its `/raw`, `/canon`, `/json` serve the latest, with an "Edited <date>" line on the view and an `edited` field in the JSON; `/<id>/<n>` (and its raw/canon/json) is revision *n*, fixed forever, for apps that pin. Who edits: the browser that saved the share keeps a secret edit key (localStorage) and shows Edit; the save screen also offers a private edit link once, for another device or a cleared browser. A lost key leaves Duplicate and edit, as before. No deadline. Share pages drop from a 1-hour to a 5-minute public cache, so an edit shows everywhere within about 5 minutes (plus KV's ~60 s spread). Each edit is a save for D71/D92 limits. A revision is still taken down by a manual KV delete.
  *Raw note:* picked "Revisions, link shows latest (Recommended)", "Saving browser + edit link (Recommended)", "Any time; cache cut to 5 min (Recommended)".
  *Rejected:* replace in place (an import link changes under its reader with no way to pin, what D65 avoided); keep D65 and park it (he wants it before launch); saving browser only (a cleared browser or new phone loses the right for good); keeping the 1-hour cache (others see old text for up to an hour); a 24-hour edit window (fixes typos only).
  *Enforced by:* T3.2d build brief (overseer), SITE.md (to update in that build).

## UI review round 3 (2026-11-16) — mechanism: /ui-review round 2 notes, approved in round 3, worker session

- **D98 — On the phone form, every dock status sits on the row above Keys · Save, ruled off from them; the phone sheet's × is a ghost. DECIDED (2026-11-16).** Amends D94 and D93. The status row is always there: Nothing to save yet, No problems, No errors · N warnings, Only a name, errors. Nothing sits between Keys and Save, a 1px `--rule` line runs under the row, and the dock keeps one height while you type. The sheet × has no fill behind it; its tap area stays 36 × 36.
  *Raw note:* "Use the same line for nothing to save yet and other saving status lines, so that nothing is held between the buttons. Add a divider between the line and the commands below it." · "Keep the close ghost, without fill behind it". Both approved in round 3.
  *Rejected:* D94's split (problems above, all-clear between the buttons: the dock jumped in height and held text between the buttons); the round-2 × on a `--chip` fill (his note asked for none).
  *Enforced by:* `site/src/client/form.ts` (`.prow`), `site/public/assets/site.css` (`.pdock .prow`, `.pop.sheet .x`).

## Format guide (2026-11-16) — mechanism: AskUserQuestion, 1 round (2 questions), overseer, on Francesco's note; closes the parked "writing help/prefill" ⚑ (under D96)

- **D99 — The site gets a `/guide` page in v1, and an empty form offers "Start from an example". DECIDED (2026-11-16); AMENDED → D121 (the form offers a class mini-builder instead; the example stays on `/guide`).** `/guide` explains how a paste is laid out (header, entity blocks, level blocks, details, `Name|SOURCE`), walks one annotated example, and shows the key table built from the profile at build time so it cannot drift; `SPEC.md` stays the authority and the guide links it. Linked from the form and `/about`. The form's example is the guide's example, offered only on an empty editor. Copy is dry and plain (D88c, /humanize); examples name entities, never rules text (content boundary). Built as slice 3.2e after 3.2d, before T3.4.
  *Raw note:* "should we include in the site also a full guide on how to use dndpaste itself, how the format is organized?" → picked "A /guide page, in v1 (Recommended)" and "Yes: an example to start from (Recommended)".
  *Rejected:* /guide after launch (first visitors would have only the hint strip); linking SPEC.md only (written for implementers; works only once the repo is pushed); the guide alone without form help; leaving the ⚑ parked.
  *Enforced by:* 3.2e brief (overseer).

- **D100 — The edit link can be copied again from the view page's Copy menu ("Copy edit link"), in the browser that holds the edit key. DECIDED (2026-11-16).** Mechanism: Francesco's note mid-build in the 3.2d session, logged by the overseer. Extends D97's "offers a private edit link once": the save panel still shows it once, and the owner's browser can copy it later to move to another device. Other browsers never see the item.
  *Rejected:* showing it only once (an owner who missed the panel had no way to reach another device).
  *Enforced by:* `site/src/client/site.ts` Copy menu, 3.2d tests (branch `claude/site-m3-ee11e4`, 56f3f64).

## Pre-deploy review of edits and guide (2026-11-16) — mechanism: fresh-eyes review (Opus) of 56f3f64 + c5ba8fa, then AskUserQuestion, 1 round, overseer

- **D101 — An edit counts as 2 saves against the daily cap. DECIDED (2026-11-16).** Amends D97 ("each edit is a save") and keeps D92's budget math: an edit writes twice to KV (frozen copy + new head), so it weighs 2 in `DailyCap`; 25 edits a day per rate key. New saves still weigh 1.
  *Raw note:* picked "Edits count 2 (Recommended)".
  *Rejected:* keeping weight 1 and documenting it (about 10 heavy users drain the free day, not 20); a separate edit cap (a third limit to explain and test).
  *Enforced by:* fix worker on branch `claude/site-m3-ee11e4` (`site/src/daily.ts`, `app.ts`, abuse tests).

- **D102 — The share form keeps an unsaved draft in the browser and offers to restore it. DECIDED (2026-11-16).** Mechanism: AskUserQuestion, 1 question, overseer, on Francesco's question ("if I save a build just to not lose progress, does it count as an edit…? Does a build get saved… if not saved before closing the browser?"). Today the only way to keep work in progress is to save, which publishes a permanent revision and, after the first save, costs 2 (D101). The form now writes its text to localStorage as you type (one draft for a new build, one per share being edited), offers to restore it on return, and clears it after a successful save. Nothing goes to the server; storage blocked → no draft, no error.
  *Raw note:* picked "Local draft autosave (Recommended)".
  *Rejected:* a leave-page warning only (doesn't survive a crash or a closed tab); both (the warning adds a browser prompt for little gain); not for v1 (people would publish checkpoints).
  *Enforced by:* pre-deploy fix worker (local_9b723919), `site/src/client/form.ts`, form tests.

## Short /ui-review of 3.2d + 3.2e (2026-11-16) — mechanism: /ui-review, 1 round (11 items, all approved), worker session local_175b755f; logged by the overseer

- **D104 — The example build (the guide's walk-through and "Start from an example") is a multiclass and shows an option header. DECIDED (2026-11-16).** Amends D99's example (Briar). Not built.
  *Raw note:* "The example build should be a multiclass and also feature an option header from somewhere".
  *Enforced by:* nothing yet (`site/src/example.ts`, `guide.ts`, `guide.test.ts` checks it parses clean and canonical).

- **D105 — Before T3.4: SPEC 0.8 settles first, then all three site follow-ups build on it. DECIDED (2026-11-16).** Mechanism: AskUserQuestion, 1 round (2 questions), overseer. Order: a /interview on the five format questions from the review → SPEC 0.8 + library release (D57) → one site worker builds the D104 example and guide rewrite, the D103 book-code page and the Keys popover, on 0.8 keys → a short re-review → T3.4 on his go. Launch pastes never use a key that 0.8 renames.
  *Raw note:* picked "All three before deploy" (over the recommended "1 and 2 before deploy") and "Before deploy" for the SPEC interview (over the recommended "After launch").
  *Rejected:* deploying now and doing the follow-ups after; the Keys popover after launch; parking the SPEC questions to after launch (a key rename would follow live pastes).

## SPEC 0.8 format calls (2026-11-16) — mechanism: /interview, AskUserQuestion, 6 rounds, overseer; topics from the short /ui-review (D105)

- **D106 — Named scores also take `/` between entries; the guide states the six-number order. DECIDED (2026-11-16).** `STR 8/DEX 13/CON 14` parses like `STR 8, DEX 13, CON 14` (full or partial, any order); emit still writes the six-number form when all six are known. The guide and the Keys popover say `STR/DEX/CON/INT/WIS/CHA`.
  *Raw note:* picked "Also accept `/` in named form" (over the recommended "Guide states the order" alone).
  *Rejected:* the guide alone; the named form as canonical (every paste changes on round-trip).

- **D107 — The `Ability` key goes: every ability pick is the first detail slot of the thing that asks it. DECIDED (2026-11-16).** `Feature: Spellcasting [INT]`, `Feature: Elven Lineage [INT; High]`, `Feat: Resilient [CON]` — one rule for `Feat`, `Feature` and `Options`; no ability asked → no leading slot. A feat whose score increase also sets its casting ability writes the ability once. Amends §5.1 `Ability`, §5.3.
  *Raw note:* first picked "Widen Ability to any pick (Recommended)", then: "walking back on the previous decision: we could instead of having the ability header, have instead ex. [INT] always inline (ex. Feature: Spellcasting [INT])" · "Always first slot, also avoid redundancy in feats for example that tie spellcast ability to score increase".
  *Rejected:* widening `Ability` to any of the six (his own first pick, walked back); printed order for the ability slot.

- **D108 — `Scores` holds increases too; the `+` decides; the `ASI` key goes. DECIDED (2026-11-16).** `Scores: 8/13/14/12/10/15` (no `+`) is the base, header only, once; `Scores: +2 CHA` / `+1 INT, +1 CON` is an increase, in header, species, background or level scope. The parser types each line as base or increase, so the AST never carries the ambiguity.
  *Raw note:* "Scores, could be the shortest one." Challenged (one key, two meanings; apps branch on the value) → kept: "One key, the + decides".
  *Rejected:* `Score Increases` (recommended), `Ability Scores` (sits between `Scores` and `Ability`), `Increases`; increases in blocks only.

- **D109 — A level's ASI is written as the feat line in both editions: `Feat: Ability Score Improvement [+2 CHA]`. DECIDED (2026-11-16).** One canonical form: the emitter is data-free and knows the edition only from `Rules:`, so a form that changes by edition can't be canonical. The checker reads it as the 2014 class ASI too, and accepts `ASI` as a short name for the feat.
  *Raw note:* "Both could work, also ASI shortened could work as feat." · "Can't the canonical form change by edition? Otherwise, just use feat line."
  *Rejected:* an increase line at L4 (recommended); a canonical form per edition.

- **D110 — `Feat` takes an optional slot marker on its key: `Feat (Fighting Style): Archery`; the `Fighting Style` key goes. DECIDED (2026-11-16).** The marker names the limited slot the feat fills (Fighting Style, Origin, Epic Boon, Dragonmark, Dark Gift, …), so emit keeps it. Open list: the parser takes any text; the checker checks it against the feat categories in the 5etools data and hints the nearest one on a typo. No checker on the site in v1 (D66), so the site doesn't catch marker typos yet.
  *Raw note:* "Feat with an optional marker, however the marker should be in the header ideally. A header marker highlights a limiting factor for the choice (the feat can only be a fighting style or origin etc.). A marker after the feat would instead just categorize the feat without implying the limit." · "Open list, books keep adding categories (ex. dragonmark, dark gift etc.). Could a smarter parser check for typos only in near words of an existing list of feat categories taken live from 5etools?"
  *Rejected:* `Feat` with no marker (recommended); a marker after the feat name (categorises, doesn't limit); keeping `Fighting Style`; `Fighting Style Feat:` and `Feat/Fighting Style:` spellings; a fixed marker list.

- **D111 — `Equipment` and `Items` merge into `Gear`; placement decides. DECIDED (2026-11-16).** `Gear` in the background block or the first level block is the starting pick (option letters only there; can be missing). Anywhere else in a level block it is gained in play; in the header it is carried and unplaced. Those two are never missing. Item details, `+N` and magic variants as before (D33, D40, D55).
  *Raw note:* picked "One Gear key, placement decides (Recommended)".
  *Rejected:* `Gear` + `Starting Gear`; keeping both keys.

- **D112 — An empty value means "not chosen yet": a warning, kept by emit. DECIDED (2026-11-16).** `Spells:` parses as an empty list with a W-code, and Tidy keeps the line as a to-do. The checker treats it like absent. Replaces E006 for key lines. Closes the parked ⚑ under D96.
  *Raw note:* pin "Empty lines shouldn't necessarily be an error"; picked "'Not chosen yet', a warning (Recommended)".
  *Rejected:* silently dropping it (Tidy erases the to-do); keeping E006.

## T3.6 site on 0.8 (2026-11-16) — mechanism: /ui-review, 2 rounds (all approved) + AskUserQuestion, worker session local_f964a965; logged by the overseer

- **D114 — `/codes` is one table (Code, Book, Type) with search and click-to-sort both ways. DECIDED (2026-11-16).** Search matches every word, accents ignored. Type = Core / Supplement / Setting / Adventure / Extra (small, free or promo), with ", 2014" on books the 2024 rules replaced. No "Partnered" (the data's partnered list is empty). Phone width hides the Type head (no sort by type there).
  *Raw note:* "Add a search field ... sorting both a>z and z>a ... Add a column that lists the type of book (ex. partnered etc.)"; picked "Core/Supplement/Setting… (Recommended)" with the 2014 mark.
  *Enforced by:* `site/src/books.ts`, `/codes` route (866da84).

- **D115 — The book-code list is a committed file, regenerated by hand from the local mirror. DECIDED (2026-11-16).** `node site/scripts/books.mjs`, commit the diff, it ships with the next deploy. Implements D103's "kept in step silently".
  *Raw note:* picked "Script by hand (Recommended)".
  *Rejected:* a weekly GitHub Action; a runtime fetch (IP gate on the source).

- **D116 — A feat's slot marker is drawn apart from `Feat`, in italics; in the view's key column it wraps under `Feat`, a size smaller. DECIDED (2026-11-16).** Approved as review item marker-style (cfcfbdd).

- **D117 — The share site is live at `https://dndpaste.fcomfy.workers.dev`, on one KV namespace `PASTES` (id `56d53b07251049a1907a301968bf2c60`). DECIDED (2026-11-16); AMENDED → D118 (URL, was `dndpaste.compagnoni96.workers.dev`).** Mechanism: AskUserQuestion at /start, the T3.4 gate; Francesco picked "Go: deploy and merge". `CANONICAL_ORIGIN` stays empty (no redirect until a custom domain exists, D70). The rate-limit bindings and the `DailyCap` Durable Object deployed on the free plan, so no WAF rule is needed. The smoke test covered pages, save, view/raw/canon/json, edit with key, revisions, a stale-base 409, a bad-key 403, a cross-site 403 and an empty-save 400. Its test share was deleted from KV afterwards. Then the branch `claude/site-m3-ee11e4` was merged into `main` (423ac7b), and main's STATE/PLAN were kept on conflict. *Raw note:* "Go: deploy and merge (Recommended)". *Rejected:* reading FORMAT-UPDATES.md first; deploying without the merge; holding.
  Landed: 2026-11-16 (423ac7b, deploy 1a2b935f).

- **D118 — The account's workers.dev subdomain is `fcomfy`, so the site lives at `https://dndpaste.fcomfy.workers.dev`. DECIDED (2026-11-16).** Mechanism: AskUserQuestion, 1 round (2 questions), on Francesco's note "can we remove compagnoni96 from the current link?". He picked "Rename the subdomain" with `fcom`, then set `fcomfy` in the Cloudflare dashboard himself. The old URL stopped working with no redirect. That was harmless because no shares existed yet. The rename covers every Worker on the account. *Rejected:* a custom domain (needs a paid domain; still possible later with `CANONICAL_ORIGIN`, D70); leaving `compagnoni96` (it shows the email's local part); `dndpaste` as the subdomain (repetitive).
  Landed: 2026-11-16 (699141f).

## Share image (2026-11-16) — mechanism: AskUserQuestion, 1 round (3 questions), overseer, on Francesco's note

- **D119 — The view page gets a share image and a Post to Reddit button, drawn in the browser; v1 has no text formats and no link-preview image. DECIDED (2026-11-16).** *Raw note:* "the main reason for the tool is to make d&d builds easily shareable on forums for example. Is there a way to return an image that can be shared with the whole build optimized for view, and perhaps direct to reddit sharing". Answers: v1 = "Image: download/copy/share" + "Post to Reddit button"; image = "Full build ideally, summary card only if it can be controlled by the user to show what actually matters and still keep it as a complete build"; process = "Build from my brief" (no jam; a /ui-review after).
  - **Image:** a PNG of the whole build, drawn on a canvas in the browser from the parsed paste, in the site's look (D80–D89). Actions: Download, Copy image, and the system Share sheet where the browser supports sharing files. Nothing is left out. *Overseer's reading of the summary-card answer, to confirm at /ui-review:* the user picks **Tall** (one column) or **Wide** (levels in columns), and both keep every line. A summary that drops content is not built.
  - **Reddit:** opens Reddit's submit page with the title and the share link filled in. Reddit cannot attach an image from a URL, so the button says to download the image to post it as an image.
  - **Cost:** no server rendering, no new dependency, no extra KV writes. Names only (D67), so no rules text in the image.
  *Rejected for v1:* copy-as-text buttons (Reddit/Discord/BBCode markdown; Francesco did not pick them); a server-side `og:image` link preview (the free plan's ~10 ms CPU per request is too little for satori/resvg; it needs Workers Paid or a hand-written renderer; can come later); a design jam (he chose a build from the brief).
  *Confirmed at /ui-review (2026-11-16, 2 rounds, worker session on `claude/share-image`):* the summary card is dropped ("Drop it"): Tall and Wide stay, both complete. Share image and Post to Reddit are items in the Copy link ▾ menu, not buttons in the row ("Share can be folded inside the dropdown of copy link"; Reddit "as a separate option in copy link dropdown"). The image has its own light/dark switch in the panel, affecting the image only. The panel carries no hint lines (the layout hint and the "download it to post it" line were removed at his note); the menu item says "link and title, in a new tab".
  Landed: 746734c (c2c9270), deployed ffd80c9c.

- **D120 — The build page and the share image list the books a build cites; uncited names are left out. DECIDED (2026-11-16).** Mechanism: AskUserQuestion, 1 round (2 questions), overseer. *Raw note:* "when sharing, both the image and the actual dndpaste, it could be shown somewhere which books and sources were required/used to make the build". Answers: "Cited books, no count. We can park uncited names for later if we ever expand 5etools integration."; "Build page + image". Derived from explicit `|SOURCE` codes and titled from `BOOKS` (D103); the paste text is unchanged. *Rejected:* a count or note for uncited names; resolving uncited names with a shipped name→book index (it touches the content boundary; parked until a wider 5etools integration); a `Books:` key in the format (repeats the codes, can go stale, a SPEC change).
  *Enforced by:* `site/test/share.test.ts` (dedupe, unknown codes, none cited, the view's Books line).

  Landed: 746734c (c2c9270), deployed ffd80c9c.

## Class presets (2026-11-17) — mechanism: /interview, AskUserQuestion, 2 rounds (6 questions), overseer at /start; closes T3.8's open list · Landed (D121–D128): merged 9f8c697, deployed 16fea8f4

- **D121 — On the empty paste form, a "Start a build" mini-builder replaces "Start from an example"; the example stays on `/guide` only. DECIDED (2026-11-17).** Amends D99 ("an empty form offers Start from an example") and D104 (the example is still the guide's walk-through). Like the example today, the builder shows only on an empty editor and fills it once; after that you edit the text. No merge into an existing paste, no restart button.
  *Raw note:* "start from class presets instead of the example, so that the main lines are mostly all laid out" (PLAN T3.8); picked "Replace the example" (over the recommended "Class first, example quiet") and "Empty editor only (Recommended)".
  *Rejected:* the builder first with the example as a quiet link under it; two equal buttons; a builder usable any time that replaces the text after a confirm; one that adds the missing lines to an existing paste (a merge into existing blocks: a much bigger build to test).
  *Enforced by:* T3.8 build (form tests).

- **D122 — A preset lays out the build up to a chosen level, with only the lines owed at each level, as empty "not chosen yet" values (D112). DECIDED (2026-11-17).** Header (`Rules`, `Classes`, `Scores:`), the `Species` and `Background` blocks, then `L1`…`Ln`. Each level holds what its class owes there, from the slot table: skills and the starting `Gear` at L1, `Subclass` at the subclass level, a `Feat` at ASI levels, `Cantrips`/`Spells`/`Options`/`Masteries` where the count goes up. Every slot line is empty, so the form shows each as a warning until it is filled, and Tidy keeps it.
  *Raw note:* picked "Up to a chosen level (Recommended)".
  *Rejected:* level 1 only (skips the subclass and ASI milestones); milestones only, no per-level spell lines (casters lose most of their lines).
  *Enforced by:* T3.8 build (preset tests: each preset parses with no `E###` and is already canonical).

- **D123 — Presets cover all 12 classes in 2014 and 2024; an edition switch defaults to 2024 and sets `Rules:` and the `|PHB`/`|XPHB` source. DECIDED (2026-11-17).** Artificer is not in the SRD subset, so not in v1.
  *Raw note:* picked "Both, 2024 default (Recommended)".
  *Rejected:* 2024 only (2014 players rewrite the start).

- **D124 — The mini-builder allows free multiclassing as rows in the order taken: each row a class and a number of levels, a class may come back, up to level 20. DECIDED (2026-11-17).** The rows map one-to-one onto `Classes` runs (D49); the preset is emitted, so the switch headers come from `emit`. A class taken after the first owes its multiclass picks from the table (`multiclassSkills`, no starting `Gear`).
  *Raw note:* "In this mini-builder, we can include free multiclassing" (over the recommended "Single class in v1"); then picked "Rows in order taken (Recommended)".
  *Rejected:* single class in v1; classes plus totals with no interleaving (a dip back into the first class can't be written).

- **D125 — Presets are built from the committed SRD slot table (`data/srd/slots.json`) into a generated site file; no new data leaves the repo. DECIDED (2026-11-17).** The subset holds the 24 core class entries with the counts and levels a preset needs (subclass level, ASI levels, skill counts, cantrip/spell counts, option progressions, masteries): numbers and key names, no rules text, no subclass or spell names. Regenerated by a script, like D115.
  *Mechanism:* settled by evidence at /start (the subset's contents), stated in the interview's report, not asked.
  *Rejected:* the full gitignored table (publishes non-SRD data); a hand-written table (goes stale).

## Start a build review (2026-11-17) — mechanism: /ui-review round 1 (5 items approved, 3 pins, 3 notes), then AskUserQuestion (3 questions); T3.8 build session

- **D126 — A preset's lines follow the checker's owed-slot ledger. DECIDED (2026-11-17).** Fills in D122's list: `Expertise` and `Feature` lines come in where the checker owes them; `Prepared` (a loadout, never owed) and the 2014 starting `Gear` (owed only as a 2024 letter) stay out. Fighting styles and Epic Boons are marked `Feat` lines (D110). Under 2024 rules the `Background` block gets `Scores:`, `Skills:`, `Tools:` and `Gear:`: every 2024 background has those parts, and the preset doesn't know which background it is, so it asks for all four; a 2014 background varies too much and stays empty.
  *Raw note:* item "What gets laid out" approved as built; "Backgrounds in 2024 follow a structure we can fill in presets" → picked "Yes, 2024 only (Recommended)"; round 2: "Background also offers consistently skills and tools", then "Fixed as in the choice is always there, not the selection. Also, the preset doesn't ask which background, so it should still ask. Add both".
  *Rejected:* `Prepared` lines for full-list casters; 2014 background lines; `Scores`/`Gear` only (the strict SPEC §5.1 reading for an official background; the preset can't tell official from custom).
  *Enforced by:* `site/scripts/presets.mjs`, `site/test/preset.test.ts`.

- **D127 — The builder takes a class not on the list as "Other class" with a typed name: it sets that class's levels and lays out nothing for it. DECIDED (2026-11-17).** Amends D124. The name is letters, digits, spaces, `'` and `-`, with an optional `|SOURCE`, so it can never break the `Classes` line; Start stays off while a name is missing or unusable.
  *Raw note:* "Class levels could also allow for a class not on the list, in which case it only sets the level but does not prefill any header"; picked "Other class now, counts later (Recommended)".
  *Rejected:* listed classes only (homebrew and Artificer users rewrite the start).

- **D128 — Builder copy: no "order you take them" note; the total reads "Level N"; the button reads "Start the build" with a pencil icon. DECIDED (2026-11-17).**
  *Raw note:* pins "Remove this", "Keep only the current total level", "The copy of this button isn't clear, as well as the icon" → "Nothing fancy, it just needs to start the build from the preset".
  *Rejected:* "Lay out the build" with a list icon; "Write the outline"; "Fill the editor".

- ~~⚑ **Pick counts as ghost text (Francesco, 2026-11-17; owner: overseer).** "Ghost" text in the editor that reads the build and shows how many picks a line expects (spells to prepare, options), from the class tables. A new editor feature, not part of T3.8: the overseer plans it.~~ Closed by D129–D133.

## Ghost pick counts (2026-11-17) — mechanism: /interview, AskUserQuestion, 2 rounds (7 questions), T3.9 build session; closes the ⚑ after D128 · Landed (D129–D134): merged 6c78f01, deployed f4c67871

- **D129 — The paste editor shows a ghost pick count on level-block lines for `Cantrips`, `Spells`, `Skills`, `Expertise`, `Options`, `Masteries` and (2024 only) `Prepared`, from the committed SRD class table; `Feat` and `Subclass` get none. DECIDED (2026-11-17).** The count follows the checker's owed-slot ledger, per class level: each level's class comes from `classSequence` (D49), each class from its own table, so multiclass works without a rule of its own. Gains for `Cantrips`, `Spells`, `Skills` (class or multiclass skills at class level 1), `Expertise`, `Options` (every option family's gain at that level, summed; an option that costs several slots counts as one); the loadout total for `Masteries` and `Prepared` (SPEC: "the default loadout from that level"). A `-` drop on the line lets one more pick in, as the checker's `owed + dropped`. A 2014 `Prepared` count needs the ability modifier, so it gets none. No hint for an "Other class" (D127), a class or edition not in the table, a count the table lacks (2024 Paladin, Ranger and Rogue masteries), a header, Species or Background block, or a line the level doesn't have.
  *Raw note:* "\"Ghost\" text in the editor that reads the build and shows how many picks a line expects (spells to prepare, options), from the class tables" (⚑ after D128); picked "Cantrips, Spells", "Skills, Expertise", "Options, Masteries" (not "Feat, Subclass too"); Prepared: "Yes, 2024 only (Recommended)".
  *Rejected:* counts on `Feat` and `Subclass` (always one pick; the warning colour already marks an empty line); no `Prepared` count (leaves out the note's "spells to prepare"); a 2014 `Prepared` count (needs the modifier: checker work, D66).
  *Enforced by:* `site/test/ghost.test.ts`.

- **D130 — The ghost reads `· 2 of 3` (picks on the line, of the count), in faint mono after the value, aligned per level block: the block's ghosts start one column, two past its longest counted line; a line too long for the pane keeps its ghost right after its value. DECIDED (2026-11-17).** It lives in the editor's highlight layer only: zero width in the layout, so it never wraps a line, moves the caret, or enters the text, a copy or the paste.
  *Raw note:* picked "After the value (Recommended)" with the aligned preview, then "Aligned per block (Recommended)".
  *Rejected:* a right-margin column (sits on top of a long line's text); "remaining only" (`· 2 more`: hides the total, silent on a full line); ragged, one space after each value.

- **D131 — The ghost shows on every counted line, short, met or over, in the editor only: never on the share view, the guide or any page outside the editor. DECIDED (2026-11-17).** A line the class owes nothing for at that level shows no ghost while empty, and the over form (`· 1 of 0`) once it has picks.
  *Raw note:* "Always, but maybe not when sharing/viewing outside of the editor"; zero owed: "No ghost while empty".
  *Rejected:* hidden once met (a met line and an uncounted line look alike); only on the caret's line (can't scan the build); `· none at this level` on an empty zero-owed line; no ghost at all on zero-owed lines.

- **D132 — Over the count is a quiet ghost note, never a problem: `· 4 of 3` in the same faint tone with a small mark; nothing in Problems, never blocks Save. DECIDED (2026-11-17).** No checker on the site in v1 (D66), and a DM boon is fine.
  *Raw note:* picked "Quiet ghost note (Recommended)".
  *Rejected:* an info line in Problems as well (checker work, D66); no mark at all.

- **D133 — The ghost counts are generated with the presets from the same SRD slot table (`site/scripts/presets.mjs` → `site/src/presets.ts`): numbers and key names only. DECIDED (2026-11-17).** Amends D125's "key names only" for the generated file: it now carries the per-class-level counts too (D125 already lists them as what the subset holds). No new data leaves the repo.
  *Mechanism:* settled by evidence (D125, the subset's contents), stated in the interview's report, not asked.
  *Rejected:* bundling the checker and the slot table on the site (D66; the table is 466 KB); a second generated file (two copies of one table).

- **D134 — Ghost review: the ghost is a small sans chip that reads `2/3`; over the count, an amber alert icon after the numbers; while any ghost shows, both editor layers keep an 8-character lane on the right. DECIDED (2026-11-17).** Amends D130 (`· 2 of 3` in faint mono) and D132 (`+1` as the over mark). The chip is 11px IBM Plex Sans in `--mute` on `--chip`, so it never reads as text of the paste; the padding that aligns a block stays mono. The lane keeps a long line's ghost from being cut at the edge; a paste with no ghost has the full width.
  *Raw note:* round 1: "instead of 0 of 3, we can keep it short as 0/3 · for extra picks, no need to add +1, perhaps we add a subtle alert icon or subtle color · the current style and color makes them seem like text that actually prints, just like the headers"; lane: picked A (lane) over B (no lane, clipped); round 2: picked B (chip) over A (plain sans), "Move the alert icon after the numbers."
  *Rejected:* mono text in the source-code grey (reads as printed text); `· 2 of 3`; `+1`; a plain sans tag without the chip; the icon before the numbers; no lane (ghosts cut at the right edge on long lines).
  *Enforced by:* `site/test/ghost.test.ts` (markup), `site/test/contrast.test.ts` (`err` on `chip`, 3:1 for the icon).

## Build stamp and update notice (2026-11-17) — mechanism: AskUserQuestion, 2 rounds (6 questions) + /ui-review, 2 rounds, worker session on `claude/build-stamp` · Landed (D137–D140): merged 9d5925e, deployed f80cf721

- **D137 — Every page ends with the site's version, one muted mono line in the foot: `v0.8.0`, the root `package.json` version. The commit is not shown. DECIDED (2026-11-17).** Works without JS; on the phone it sits above the dock's padding. Written at build time by `site/scripts/stamp.mjs` into `site/src/build.gen.ts` (gitignored, rewritten only when it changes, since `wrangler dev` watches `src/`); site.js rewrites the line with its own build, since a cached page can be older than its script. The foot holds nothing else (D89 c still stands).
  *Raw note:* picked "Page foot (Recommended)"; review round 1: "We can remove the build and only use the version. The version will need to be updated regularly, I prefer having one single versioning option that is clear."
  *Rejected:* `/about` only (not on every page); the Display menu (JS only, hidden); `v0.8.0 · 39e1cab` (two version numbers on screen); a site version separate from the library's (two numbers in the project).
  *Enforced by:* `site/test/update.test.ts` (foot on every page), `site/test/worker.test.ts` (the foot holds only the version).

- **D138 — A deployed build different from the page's own gets a fixed toast with Reload: bottom centre on a wide screen, at the top on a phone (clear of the docks), under sheets and menus. DECIDED (2026-11-17).** `GET /version` answers `{ version, commit, date }` with `Cache-Control: no-store`; the page compares the version and the hidden commit (so every deploy offers Reload with no version bump, and D57's release process stays as is). It checks when the tab comes back (visibilitychange, focus, back-forward cache) and every 15 minutes while visible, at most once a minute, none in the first minute after load, never on typing; a failed check says nothing. × closes it for that deployed build in this tab (sessionStorage).
  *Raw note:* picked "Fixed toast (Recommended)"; compare: picked "Hidden commit (Recommended)" after the version-only note.
  *Rejected:* an inline bar under the header (pushes the editor while you type); a toast at the top everywhere; comparing the library version only (a site deploy without a library bump, tag and CHANGELOG heading would never show it).
  *Enforced by:* `site/test/update.test.ts` (route, headers, timing, dismissal, failures).

- **D139 — Reload from the toast puts the form's title, author and text back without the draft bar; an edit form opened from an edit link keeps the link's key over the reload. DECIDED (2026-11-17).** Amends D102 for this one path: site.js fires `dndpaste:before-reload`, the form writes its draft and a sessionStorage flag naming the page, and the reloaded form restores at once. If an older draft's bar was still open and you typed since, the newer text wins; with nothing typed, the bar comes back as before. A plain browser reload still shows the bar. An untested link key (held in memory, D97) goes back in the address as `#k=` for the reload.
  *Raw note:* picked "Restore silently (Recommended)".
  *Rejected:* the usual D102 bar after an update reload (an extra click for text the user never chose to leave).
  *Enforced by:* `site/test/update.test.ts` (hand-over), checked live on the dev build (text and an edit-link save after Reload).

- **D140 — The toast reads "A new version of dndpaste is out." with Reload (rotate icon) and a ghost × labelled Close. DECIDED (2026-11-17).**
  *Raw note:* picked "A new version is out (Recommended)"; review round 1: "Remove the second line (your text stays)".
  *Rejected:* a second line "Your text stays." on the form; "dndpaste was updated. Reload to use the new version."; "New version available".
  *Enforced by:* `site/test/update.test.ts` (copy, icons not glyphs).

## Community launch prep (2026-11-17) — mechanism: /start, AskUserQuestion, 3 rounds (8 questions), overseer · Landed: D141–D144 docs 2026-11-18 (handoff commit); D145–D147 merged 4c34e26, not deployed

- **D144 — On the site, a share with old keys reads quietly; the edit form shows `W005` and Tidy rewrites it. DECIDED (2026-11-17).** The view renders the AST, so readers see the new form; the Text view keeps what the author wrote. This is how the site already behaves (diagnostics show only on the form), so nothing is built.
  *Raw note:* picked "Quiet view, warn on edit (Recommended)".
  *Rejected:* a note on the view page (noise for readers who can't fix it); no warning anywhere (authors never learn the new keys).
  *Enforced by:* the form's diagnostics path (`site/src/pages.ts`).

- **D145 — Format changes reach the community through a GitHub release per tag (with the CHANGELOG's Migrating list) and a "Format changes" line on `/guide` that links the releases. DECIDED (2026-11-17); closes D113's ⚑ (the format-update policy, `FORMAT-UPDATES.md`, now decided).** Crossing notes to his own apps stay as they are.
  *Raw note:* picked "GitHub release + guide line (Recommended)".
  *Rejected:* a GitHub release only (site users never see it); crossing notes only.
  *Enforced by:* prose only (`FORMAT-UPDATES.md` §5).

- **D146 — Launch feedback goes to GitHub Issues, with two templates: "Can't write my build" and "Parse bug". DECIDED (2026-11-17).** The README gets a short header: the live site link, "0.x: the format may still change, and a paste you write today keeps reading (D142)", and the feedback route. Reddit threads cover people with no GitHub account.
  *Raw note:* picked "Issues + templates (Recommended)".
  *Rejected:* GitHub Discussions as well (one more place to watch); a feedback form on the site (private, read with wrangler, more to build).
  *Enforced by:* `.github/ISSUE_TEMPLATE/` (d2d9472).

- **D147 — The site's "Send feedback" link sits on `/about` and `/guide`; the page foot stays the version line only. DECIDED (2026-11-17).** D137 and D89 c hold.
  *Raw note:* picked "/about and /guide (Recommended)".
  *Rejected:* a link in the foot beside the version (amends D137 for a link most visitors won't need).
  *Enforced by:* `site/test/guide.test.ts`, `site/test/worker.test.ts` (ca548b0).

- **D148 — Francesco's temp logo (a back sheet and a front card with a clip notch and a sprout, drawn in Affinity) sits in the site header beside the wordmark and is the SVG favicon. DECIDED (2026-11-18).** Mechanism: he asked "show me the logo in site then deploy"; the logo-deploy worker ran /ui-review, 2 rounds, all approved (header size, phone header on one line with Display as an icon up to 440 px, favicon colour). `currentColor` in the header, so it follows both themes. Temporary until a real mark; the source is `site/public/assets/logo.svg`. Landed: cac5fdc, merged d9bf405, deployed b8b2afa4.
  *Raw note:* "use this" (his SVG); "show me the logo in site then deploy".
  *Rejected:* the overseer's traced versions v1–v3 (his own drawing replaced them).
  *Enforced by:* `site/test/logo.test.ts`.

## Empty lines in the edit form (2026-11-19) — mechanism: AskUserQuestion, 1 round (1 question), overseer

- **D149 — On the edit form, `W004` (an empty "not chosen yet" line) leaves the Problems list for its own "To choose · N" row of line chips under it; the toolbar summary and the phone dock say "N to choose", not "N warnings". DECIDED (2026-11-19).** Display only: the spec and the library keep `W004` as a warning (D112). A fresh Bard 5 preset (2024) listed 19 W004 rows and nothing else, and the editor's ghost counts (D129) already mark those lines. Problems now shows only what is wrong.
  *Raw note:* "the problems section can be overwhelming, especially right after starting a preset, with multiple empty line problem mentions"; picked "Separate To-do line (Recommended)".
  *Rejected:* one folded "N lines not chosen yet" row inside Problems (the panel still opens with a warning, the toolbar still counts warnings); hiding preset W004s until the first edit (the list jumps to 19 rows on the first keystroke, and the same text shows different problems by how it was made).
  *Review (/ui-review, 2 rounds, approved):* counted lines short of their ghost count (D129) also go under To choose; the first 10 chips show, then "+N" opens the rest; a chip jumps to the end of its line and flashes the row; the cursor line's chip is outlined.
  *Enforced by:* `site/test/tochoose.test.ts` (b63b829, unmerged).

## Pre-launch form notes (2026-11-19) — mechanism: AskUserQuestion, 1 round (3 questions), overseer

- **D150 — The form remembers the author you last saved with, in this browser, and fills a new build's Author field with it as plain editable text. DECIDED (2026-11-19).** Stored in localStorage beside the other `dndpaste.*` keys, never sent; SITE.md's "What this browser keeps" list gains it. An edit of an existing share keeps that share's author. A draft (D102) keeps its own author.
  *Raw note:* "the author needs to be stored in the browser so that you don't need to type it again"; picked "Filled in directly (Recommended)".
  *Rejected:* a ghost that Tab or a tap fills (one extra step on every build; Tab normally moves focus, and phones have no Tab).
  *Enforced by:* `site/test/author.test.ts` (a9cc543, unmerged). Note: the /about privacy line still omits drafts and the author; fix with D152. Fixed by D234.

- **D152 — One copy pass on the site's functional copy before launch: dry, short, minimal. DECIDED (2026-11-19).** Buttons, labels, the toolbar summary, the phone dock, empty states, error and status messages, menus. A before/after table on a review board, then applied. `/guide` and `/about` prose are out of scope. It runs last, after D149–D151, so it covers their new strings. Applied: D230–D234.
  *Raw note:* "we need one more pass on copy especially functional copy ex. buttons to keep the dry and short, minimal"; picked "Functional copy only (Recommended)".
  *Rejected:* the whole site including `/guide` and `/about` prose (more to review; the guide reads longer by design).
  *Enforced by:* pending.

- **D153 — 2024 Paladin, Ranger and Rogue get a Masteries ghost count of 2 from `data/supplement.json` (numbers only), since the SRD slot table has mastery but no progression for them. DECIDED (2026-11-19); amends D129 (those three had no count).** Mechanism: a /ui-review pin in the D149 build session. `presets.mjs` reads the supplement when the table has no progression.
  *Enforced by:* `site/test/ghost.test.ts` (42c6607, unmerged).

## SRD subset data fixes (2026-11-19) — mechanism: overseer brief (pre-launch data bugs found by D151), data-fixes worker

- **D165 — `Masteries:` suggests weapons with a mastery property only. DECIDED (2026-11-19).** The slot table marks a base item `mastery: true` when it is a weapon with a mastery property (a focus that fights as a staff is not); `site/scripts/names.mjs` exports them as `MASTERY_WEAPONS`, and the Masteries list reads that, not every mundane item. 38 names in the SRD subset, all 2024 (2014 weapons have no mastery property).
  *Raw note (brief):* "Masteries suggests every mundane item. Only weapons can have masteries."
  *Rejected:* the `weapon` flag alone (offers the 2014-only Net and the futuristic firearms, which have no mastery); a fourth field on `ITEMS` rows (touches every reader of the row shape while another worker edits them).
  *Enforced by:* `test/srd-subset.test.ts` ("D165: …"), `site/test/names.test.ts` ("D165: …"), `site/test/complete.test.ts` ("D165: …").

- **D166 — A 2014 subrace is in the SRD subset only on its own flag, never its parent race's. DECIDED (2026-11-19); amends D141's count.** The extract gave every subrace of an SRD race (`Elf|PHB`) that race's flag, so 45 non-SRD subraces reached `data/srd/slots.json`: the 44 D159 flagged (MTF, ERLW, SCAG, EGW, PSD, the DMG Eladrin) plus `Elf (Drow)|PHB` and `Gnome (Forest)|PHB`. The subset keeps 8 subraces: Hill and Mountain Dwarf, High and Wood Elf, Rock Gnome, Lightfoot and Stout Halfling, Variant Human. Recounted against the current data folder, the Basic-Rules-only names in the subset are 17 (4 subraces, 6 backgrounds, 3 items, 1 DMG potion, 3 magic variants), not 36: none of the 2024 items D141 counted is Basic-Rules-only there now. `NOTICE.md` says 17.
  *Raw note (brief):* "44 non-SRD species carry an SRD flag in the slot table, so they land in the public data/srd/slots.json."
  *Rejected:* keeping the parent's flag and filtering by book (a PHB subrace like Drow is not SRD either).
  *Enforced by:* `test/srd-subset.test.ts` ("D166: …").

## Editor polish (2026-11-19) — mechanism: /interview, AskUserQuestion, 3 rounds (9 questions), editor-polish worker, on D164's ⚑

- **D170 — Key names autocomplete too: a line that starts with a letter suggests the keys its block allows (`Spe` → `Species:`), from the hint strip's list (D83). DECIDED (2026-11-19).** Opens at 1 letter, never on an empty line (Enter for a new line opens nothing). Same keys and behaviour as the name list (D154): Tab takes the top key, arrows then Enter or Tab, Esc closes; a tap on phone.
  *Raw note:* picked "At 1 letter (Recommended)".
  *Rejected:* D164's size rule (a block with 12 or fewer keys left would open a list on every new line); 2 letters (`S` alone is often the whole job).
  *Enforced by:* `site/test/complete.test.ts` ("D170: …"); the list itself checked in /ui-review 2026-11-19 (3 rounds). (09af58c, unmerged)

- **D171 — Taking a key writes `Key: ` and opens that key's value list at once; a tap on a hint-strip chip does the same. DECIDED (2026-11-19).** The same chain as a pick inside `[ ]` (D163).
  *Raw note:* picked "Value list opens (Recommended)".
  *Rejected:* writing the key and stopping (the value list then waits for a letter).
  *Enforced by:* `site/test/complete.test.ts` ("D171: …"); the chip tap and the chain checked in /ui-review. (09af58c, unmerged)

- **D172 — Trial: every empty name spot opens its list before a letter is typed, after `: `, after `, ` and inside `[ ]`, whatever the list's size. DECIDED (2026-11-19) for the /ui-review; amends D164 (letters by list size).** Only typing opens it (D154): a pick, a comma or a key; reaching a spot with the arrows doesn't. Class first, as D156. The D164 thresholds stay in the code as one switch, so going back is a one-line change.
  *Raw note:* "Let's test it every spot and add a setting to disable autocomplete."
  *Challenged:* D164 kept spell and item lists shut until a letter; opening them on every spot reverses that. Accepted as a test, to judge in review.
  *Rejected:* only one-pick keys (Species, Background, Subclass, Feat, a header's class) at once; every key after `: ` but not after commas.
  *Enforced by:* `site/test/complete.test.ts` ("D172 (trial): …"; the D164 test runs with `OPEN_EVERY_SPOT` off); approved in /ui-review round 1. (09af58c, unmerged)

- **D173 — A "Suggestions" switch turns the name and key lists off; ~~it sits at the end of the key hint strip's label row on desktop and in the dock's Keys row on phone~~, and this browser remembers it. DECIDED (2026-11-19). AMENDED (2026-11-19, /ui-review round 1): it lives in the header menu, renamed Display → Settings (settings icon), after the display settings and a rule: "Suggestions · Name and key lists in the editor"; the same menu on every page and on phone.** Ghost text, counts and the auto `]` stay on. Stored like the author name (D150), never sent.
  *Raw note:* "add a setting to disable autocomplete"; picked "Hint strip toggle (Recommended)", "Lists only, remembered (Recommended)".
  Review: "Let's move suggestions inside Settings (change Display to settings, make display options part of settings)"; phone: "Change as mentioned on desktop".
  Round 2: "The save on this browser box in settings doesn't seem useful." (the "Saved in this browser." line goes; blocked storage still says so); "Add day and night icons to the toggle inside settings." (Auto contrast, Light sun, Dark moon).
  *Rejected:* a "Turn off suggestions" row at the list's foot (two places to learn); a switch by the title and author (far from the editor); all editor help off; off for this visit only; in review, the switch in the hint strip's label row and the dock's Keys row.
  *Enforced by:* `site/test/prefs.test.ts` ("D173: …"), `site/test/display.test.ts` ("D173 (review): …"), `site/test/logo.test.ts` (Settings label). (09af58c, unmerged)

- **D174 — Ghost text names the kind of name still wanted: `Cantrips: Guidance, cantrip`, faint, at the cursor. DECIDED (2026-11-19).** Only on the cursor's line, at an empty name spot, when that line's count chip is short (D130); gone at the first letter. Display only, in the highlight layer like the count chip: never in the text, a copy or the paste. Not inside `[ ]` (the list's slot hint guides there, D163).
  *Raw note:* picked "The kind of name (Recommended)", "Counted lines, short (Recommended)".
  *Rejected:* how many more (`2 more`: the chip says it); the top match inline with Tab (a name you didn't choose, and the open list already shows it); any list line, Gear and Languages too; every short line, cursor or not (faint words all over the editor).
  *Enforced by:* `site/test/complete.test.ts` ("D174: …"), `site/test/ghost.test.ts` ("D174: …"). (09af58c, unmerged)

- **D175 — The count chip on the line being typed keeps its last value while the line doesn't read (an open comma, bracket or quote): `Guidance, ` stays 1/3. DECIDED (2026-11-19).** It follows the line again once the line reads, or once the cursor leaves it.
  *Raw note:* picked "Freeze while typing".
  *Rejected:* counting the names written, ignoring the unfinished tail (recommended: always matches the line, but needs a second reading of the line beside the parser's); hiding the chip while typing (a gap in the aligned column).
  *Enforced by:* `site/test/ghost.test.ts` ("D175: …"); the form wiring checked in /ui-review. (09af58c, unmerged)

- **D176 — Every error on the line being typed waits until the cursor leaves the line or typing pauses for 3 s. DECIDED (2026-11-19); amends D90 (E001 only, 1.5 s).** Save still blocks on a held error; pressing Save shows it at once.
  *Raw note:* picked "Leave line or 3 s (Recommended)".
  *Rejected:* every error at 1.5 s (a pause to think after `Guidance, ` shows it); no timer, only leaving the line (a mistake can sit unmarked).
  *Enforced by:* `site/test/form.test.ts` ("status, D176: …", and the D90 test). (09af58c, unmerged)

## Family keys and the spell level cap (2026-11-19) — mechanism: /interview, AskUserQuestion, 2 rounds (8 questions), D161 worker on `claude/format-0-9-b72b82`; SPEC 0.9

- **D180 — Optional-feature families get their own keys: `Invocations`, `Metamagic`, `Maneuvers`, `Infusions`, `Arcane Shots`, `Runes`, `Disciplines`, `Pact Boon`. `Options` stays valid for any family. DECIDED (2026-11-19); amends D27.** An addition (minor): each family key is an `Options` line that also names its family. It has the same type, scopes (H, L) and detail rules (§5.3), and the same W002 hint. The list is the 8 families the 5etools data tags on class options today (`EI`, `MM`, `MV`, `AI`, `AS`, `RN`, `ED`, `PB`). Canonical order: `Masteries`, the family keys in that order, `Options`, then the marked `Options (…)` lines (D181). `Masteries` keeps its place before `Options`, so every 0.8 paste emits unchanged. Before: `Options: Agonizing Blast [Eldritch Blast], Riposte`. After: `Invocations: Agonizing Blast [Eldritch Blast]` and `Maneuvers: Riposte`. The before line still reads and means the same thing. Consumers: a reader that collects options also reads the family keys (`optionKeys`); a writer may keep `Options`.
  *Raw note:* "I'm considering though reinstating specific options as headers or header aliases of options (so that both work the same, one just gives an additional detail), and masteries would become aligned with them." Round 1: picked "Family keys. Also Options (Invocations) is valid." and "All 8 tagged. How can we make sure this system is future-proofed for new families without a dedicated update each time?" (answered by D181's open marker).
  *Why:* the books and players say "invocations" and "maneuvers". The family also gives the editor a filter and the checker a self-check (D185).
  *Rejected:* a marker only, `Options (Invocations):` (his "long for no reason"); the core-book four or the 2024 three (an uneven split); dropping `Options` (D142: a 0.8 paste keeps reading, and it covers families with no key).
  *Enforced by:* `test/spec09.test.ts` ("D180: …").

- **D181 — `Options` takes an optional family marker, `Options (<family>)`, an open list as D110's for `Feat`. A marker that is a family key's name, singular or plural in any case, folds into that key: `Options (Invocation)` reads as `Invocations`, and emit writes `Invocations:`. DECIDED (2026-11-19).** Any other marker stays `Options (<marker>)` as authored, so a family from a new book needs no format update (`Options (Soul Techniques): …`). A short key for it can come later as a minor addition. The fold is data-free: the parser knows the profile's key names, nothing more. Two lines that fold into one key in one scope (`Invocations` and `Options (Invocations)`) are E003, like two `Feat (Origin)` lines. An empty marker is E002. The fold raises no warning, because both spellings are valid (no W005: nothing renames).
  *Raw note:* round 2: picked "Family key; fold sing./plural (Recommended)".
  *Rejected:* fold only the exact key name (`Invocation` and `Invocations` would be two lines); emit as authored (two canonical forms for one fact, against design rule 2).
  *Enforced by:* `test/spec09.test.ts` ("D181: …").

- **D182 — `Masteries` is an `Options` family: `Options (Masteries)` and `Options (Mastery)` read as `Masteries`. The key, its AST scope key and its canonical place don't change. DECIDED (2026-11-19).** It is listed in the family table, with the 8 option families and the same rules. The checker still resolves masteries as weapons, not as optional features.
  *Raw note:* round 1: picked "Masteries should be an Options family for internal consistency". Pushback given before round 2 and kept in the design: a `Masteries` that moved into `Options` items would break every consumer reading the `Masteries` scope key, so the alignment is through the fold, not a new AST shape.
  *Rejected:* "same rules, no change" (my recommendation, overruled: he wants `Options (Masteries)` to read); mastery picks as `Options` items (a reader break, and the checker would need data to tell a weapon from an option).
  *Enforced by:* `test/spec09.test.ts` ("D182: …").

- **D183 — Class features with a pick stay `Feature` lines: `Feature: Divine Order [Thaumaturge; Guidance]`. No feature-name keys and no marker on `Feature`. DECIDED (2026-11-19).** A key per class feature is an open set. A new book makes it stale, and an unknown key is E002, so a typo can't be told from a new feature (D19's reason). The editor already narrows inside `[ ]` (D163).
  *Raw note:* round 1: picked "Keep Feature line (Recommended)".
  *Rejected:* `Feature (Divine Order): Thaumaturge` (no shorter, and a second spelling of every feature pick); a fixed list of feature keys (`Divine Order: Thaumaturge`; stale each book, and two spellings).
  *Enforced by:* prose only (nothing changes; `Feature (…)` stays E002, `test/spec09.test.ts` "D183: …").

- **D184 — `Spells` and `Prepared` take an optional level cap in parentheses, an ordinal `1st`–`9th`: `Spells (3rd): Fireball`. It names the highest spell level the line picks from. DECIDED (2026-11-19).** An addition (minor). A capped line is its own key (`Spells` and `Spells (6th)` share a level block, as Mystic Arcanum does at Warlock 11), with the same scopes as the key. Matched case-insensitively and written in lower case (`Spells (3RD)` → `Spells (3rd)`). Canonical order: the uncapped line, then the capped lines by level. Anything else in the parentheses (`(3)`, `(cantrip)`, `(10th)`), or a cap on another key (`Cantrips (1st)`), is E002. The same cap twice in one scope is E003. The AST scope key is `Spells (3rd)`; `levelCap(key)` gives 3. Before: `Spells: Counterspell, Mass Suggestion` at L11. After: `Spells: Counterspell` and `Spells (6th): Mass Suggestion`.
  *Raw note (review, the limiter):* "We should use the bracket next to header format more: for example, Spells could have (3rd) indicating the highest level possible to choose as an optional bracket limiter". Round 2: picked "Ordinal: Spells (3rd) (Recommended)" and "Spells and Prepared (Recommended)".
  *Rejected:* a digit, `Spells (3)` (reads less naturally, and could be taken for a count); both forms with an ordinal emit (two spellings); `Spells` only (`Prepared` from a capped list is also real, as with a wizard's spellbook at a level).
  ~~⚑ (worker → overseer, 2026-11-19): the site's autocomplete reads the line's cap in place of D162's class-progression cap when the line has one; D162 stays for an uncapped line.~~ Done → D186.
  *Enforced by:* `test/spec09.test.ts` ("D184: …").

- **D185 — The checker checks a line against its own family and cap, nothing more. DECIDED (2026-11-19).** An option on a family key, or on a folded or matched `Options (<marker>)` line, that resolves to another family is `misplaced`/warning. An unknown marker is matched to the slot table's family names and codes, as D110's feat categories are. A near miss is `unresolved`/warning with "did you mean". No match at all is `unresolved`/info and accepted. A spell above its line's cap is `misplaced`/warning. The cap is never judged against what the class can cast (that stays the editor's D162 hint). Family lines, marked lines and capped lines count into the same slots as `Options` and `Spells` did.
  *Raw note:* round 2: picked "Self-consistency only (Recommended)".
  *Rejected:* also judging the cap against the class (needs casting progressions the checker doesn't model; overlaps D162); an editor hint only (the paste could contradict itself unseen).
  *Enforced by:* `test/spec09.test.ts` ("D185: …").

## The editor reads SPEC 0.9 (2026-11-19) — mechanism: AskUserQuestion, 1 round (2 questions), wire-0.9 worker on `claude/editor-polish-44bc86`

- **D177 — A frame's key hints list only its class's option family keys: Warlock `Invocations` and `Pact Boon`, Sorcerer `Metamagic`, Fighter `Maneuvers`, `Arcane Shots` and `Runes`, Monk `Disciplines`, Artificer `Infusions`. DECIDED (2026-11-19).** A level frame takes its level header's class; the header and entity frames take the `Classes:` line's classes; no class known, no family key (plain `Options` stays in every frame). A half-typed key still finds every family key (`Meta` → `Metamagic` in a Barbarian frame), so the key autocomplete (D170) loses nothing. Phone dock and desktop strip alike (D157). Key and class names only, in `site/src/client/hints.ts`.
  *Raw note:* picked "The class's own (Recommended)".
  *Rejected:* all eight in every frame (a Warlock L2 frame listed 23 keys, Metamagic offered to a Barbarian); none, `Options` only (people wouldn't learn the family keys exist).
  *Enforced by:* `site/test/form.test.ts` ("D177: …", "hints: the frames' key lists (header 22, …)").

- **D178 — A count that spans several lines of a level block shows one chip, on the group's first line, with the total. DECIDED (2026-11-19).** Lines count into the group the checker's slots use (D185): a family line or `Options (<marker>)` into `Options`, a capped `Spells (6th)` into `Spells`. At Warlock 11, `Spells: Counterspell` reads 2/2 with `Spells (6th): Mass Suggestion` under it, and the capped line has no chip of its own. The ghost text (D174) shows on any line of the group while the total is short. A group of one line is as before. Before: the capped line was skipped as a second `Spells` line and family lines had no count.
  *Raw note:* picked "One chip, first line (Recommended)".
  *Rejected:* the same chip on each line (one count twice reads as two counts); one chip on the last line (the main line loses its chip).
  *Enforced by:* `site/test/ghost.test.ts` ("D178: …"), `site/test/complete.test.ts` ("D186: family lines get the ghost text of their kind").

- **D186 — The name autocomplete reads SPEC 0.9: a family line offers its family only, and the pacts follow the edition. DECIDED (2026-11-19).** `Invocations:` and the other family keys offer the options of their 5etools codes; `Options (<marker>)` folds as D181 or is matched to the table's family names as the checker does (D185); an unknown marker, and plain `Options`, offer any option. `[ ]` slots work on every family line as on `Options` (D163). Under a `Rules:` edition, a name that edition files under another family is left out: in a 2024 paste the pacts are invocations, so `Pact Boon:` offers none and `Invocations:` offers all three with no source; in a 2014 paste the other way round. Without `Rules:`, both lines offer them. The names module keeps each option's family codes and a family table (names only), and a name whose family differs by book stays two rows. A capped line's own cap (`Spells (3rd)`, D184) dims the spells above it in place of the class's cap (D162).
  *Raw note:* worker's call within the brief ("2024 Pact Boon … suggestions mustn't mislead").
  *Rejected:* offering the PHB pacts with `|PHB` under `Pact Boon:` in a 2024 paste (a valid line, but it invites a 2014 boon into a 2024 build); hiding XPHB-only invocations from a 2014 paste (cross-edition picks stay offered with their source, D155).
  *Enforced by:* `site/test/complete.test.ts` ("D186: a family line offers its family only…", "D186: the pacts follow the edition…", "D184: a capped line's own cap dims…"), `site/test/names.test.ts` ("D158: src/names.gen.ts matches…").

- **D190 — Whole-list preparers get guided to `Prepared`; the format stays. DECIDED (2026-11-19).** SPEC's key table and D23: a 2024 Cleric, Druid or Paladin prepares from its whole class list, so it has no `Spells` lines, only `Prepared`; a Wizard keeps both (`Spells` the spellbook, `Prepared` the loadout). Before, a `Spells:` line in such a block expected 0 picks and its chip turned red, and presets never laid out `Prepared` (D126). The site, for whole-list preparers: (1) the 2024 preset lays out an empty `Prepared:` line with its ghost count where the loadout first appears or grows (Cleric 1–11 and 13, not 12, where it stays 16); (2) the key suggestions (D170) and the hint strip don't offer `Spells` in those blocks; (3) a `Spells` line there shows ~~a plain hint in its chip, "Cleric prepares from its list. Use Prepared.", never red~~ no chip; its `Spells` key gets a dedicated hint underline (dashed, accent; not an error's wavy red) and is clickable. AMENDED (2026-11-19, /ui-review rounds 1–2): the key opens a popover with one button, Switch to Prepared (the class's reason is the button's accessible label only): it renames the line (`Spells (3rd)` → `Prepared (3rd)`), or adds its names to the block's `Prepared` line (no repeats) and removes it; Undo brings it back (the D152 copy pass reviews the wording: Change to Prepared, D230). Whole-list is read from the class table, not listed: a 2024 class that counts a `Prepared` loadout and never `Spells`. That is Cleric, Druid, Paladin and Ranger. 2014 is unchanged: its tables count no loadout (D129).
  *Raw note:* "For the prepared header what to do? In particular, I see the value for wizard, but what about classes that only prepare? Currently prepared works but spells effectively doesn't (chip marks error)." Picked "Keep the rule, guide to it (Recommended)" (overseer, relayed to the wire-0.9 worker).
  *Rejected:* accepting `Spells` as `Prepared` for those classes (a format change where one key means two things by class); leaving it as is (no guide from the preset).
  *Review note (round 1, Change):* "Instead of a long prose, there should be a silent icon that opens a popover suggesting the switch and also enabling the switch on click."
  *Review note (round 2, Change):* "The copy is way too long. Just say Switch to prepared. Instead of having an icon where the chip would be, instead let's have a dedicate underline/highlight type for this type of issues that also makes the wrong header clickable, returning then the button."
  *Enforced by:* `site/test/ghost.test.ts` ("D190: a 2024 whole-list preparer's Spells line shows a plain hint…", "D190: the 2024 preset lays out Prepared…", "D190 review: Switch to Prepared renames…"), `site/test/complete.test.ts` ("D190: a 2024 whole-list preparer's block offers no Spells key…").

## Wide user test before the 0.9 release (2026-11-19) — mechanism: AskUserQuestion, 1 round (4 questions), overseer

- **D191 — Before releasing 0.9, a wide user test: agents play four personas and write ~15 builds from Francesco's Obsidian character notes on the release candidate; findings land on a triage board he marks. DECIDED (2026-11-19).**
  - *Personas:* newcomer on phone (guide only, presets, phone-width editor); optimizer and DM (odd multiclass orders, 2014/2024, homebrew, boons, UA); converter (Open file, paste-in, Tidy); developer (library `parse`/`emit`/`check`, CLI, `/json`).
  - *Method:* mixed. Most agents work headless and in parallel against the local dev server's endpoints and the library, using only what the site shows. Two personas drive the real editor in the browser pane, desktop and phone, on a sample (serial: one pane).
  - *Input:* each note from `Compendio/Personaggi` with its ```dndpaste block removed; the block is the answer key, compared by parsed tree (not text), since older keys read as aliases.
  - *Scale:* ~15 notes sampled across 2014/2024, single class and multiclass, low and level 20, homebrew and UA; about 8 agents. Findings deduped and checked, then a private board he marks (fix now / later / no) → decisions and fix sessions before the D152 copy pass.
  - *Privacy:* vault content and results stay out of the repo (`.claude/`, untracked); fixtures from it only by name, with his OK.
  - *When:* on `claude/editor-polish-44bc86` after the 0.9 keys are wired, before the copy pass and the release.
  *Raw note:* "Before release, I want to plan a wide testing session. The goal is to maneuver agents replicating various types of users, manually trying to fill in dndpaste the assorted builds from my obsidian." Picked all four personas, "Mixed (Recommended)", "The note, paste removed (Recommended)", "~15 sampled, triage board (Recommended)".
  *Rejected:* all in the browser (serial, several times the cost); all headless (misses the editor UX that most changed); a generated summary or the paste itself as input (tests transcription or typing only); all ~50 notes (about 3x the cost, many repeats); a report without a board.
  *Enforced by:* prose only (PLAN T3.12).

## Wide user test triage (2026-11-19) — mechanism: T3.12 board (37 reproduced cards T01–T37, private Artifact) marked by Francesco, then AskUserQuestion, 1 round (4 questions); user-test worker on `claude/editor-polish-44bc86`

- **D192 — Fix now, checker and Tidy messages: every error says how to fix it, in as few words as it can. DECIDED (2026-11-19).** (T01) E005 for a line under `Species:`/`Background:` reads "Move above Species" (the guide says Species and Background come last in the header; the editor's one-click move is D196). (T07) A written but unresolved `Subclass` counts as picked; "owes N more" names where to add it and says "N of M written". (T16) Did-you-mean on E002 near misses (Class→Classes, Feats→Feat, Race→Species, `INT: 17`→Scores); E001 says a line is `Key: value`. (T17) E003 says to join with commas. (T19) E012 on `Classes: A 5, B 5` says to use ` / `. (T21) Drop the doubled key in messages ("Species: Species:"). (T37) Tidy moves lines it can place safely (scope errors) instead of refusing on errors.
  *Raw note:* T17: "For these errors, keep the text concise and if possible one or two words". T01: "Fix proposed unclear", then picked "Hint + one-click move (Recommended)". Others marked Fix now with no note.
  *Rejected:* T01 also warning on legal keys under Species (needs data to tell; the hint and move cover it); T01 message only (no editor help); T37 left as is (the board's suggestion, overruled).
  *Enforced by:* prose only (fix session adds tests).

- **D193 — Granted spells and features are not written by default; a build may still highlight one at the level it arrives. DECIDED (2026-11-19).** (T02) Domain and always-prepared spells aren't a choice, so the guide says they aren't written, and the checker stops calling them "misplaced" or "beyond what the rules grant (DM boon?)". (T26) A spec addition lets a build name a granted feature where it lands, to showcase what the build relies on, with no "unplaced" alarm; showing granted spells goes the same way. (T22) In a 2024 half feat's ability slot, `[+1 CHA]` and `[CHA]` are both accepted (origin and fighting-style feats excluded).
  *Raw note:* T02: "Always prepared spells are not a choice, therefore do not really belong here. We could still have an optional way to show them, but in general we are not mentioning every feature we get if it comes with another choice." Picked "Guide + fold into T26 (Recommended)". T26: "We could add a way to mention specific features you get regardless overriding the standard so that for example if I want to showcase a build that relies on a feature, I highlight the moment it gets it." T22: "Accept, for 2024 feats that are all half feats (except origin-like and FS), it's ok both to have +1 CHA and CHA only".
  *Rejected:* T02 later or no; listing which casters write `Prepared` as the fix (the board's proposal; Prepared is a loadout, granted spells are not in it).
  *Enforced by:* prose only.

- **D195 — Format additions before 0.9: forms and pact weapons in brackets, notes, and one spelling per pick. DECIDED (2026-11-19).** (T05) A detail on Pact of the Chain, Pact of the Blade, Find Familiar, Find Steed and the Summon spells names the form or weapon (`Pact of the Chain [Imp]`, `Pact of the Blade [Glaive]`); the guide shows one. (T14) A way to keep notes, plans and alternatives in a paste (a comment line, or `X-` keys with no W001), designed in the spec session. (T33) Tidy folds a plain `Options` line into its family key when every pick resolves to that family. (T27) The guide says `Scores` are base scores. (T31) A repeated name in `Gear` gets an info pointing to `x2`; the guide says what brackets in Gear mean.
  *Raw note:* marked Fix now with no note; T05 is his wire-0.9 review note 1 ("could have an optional square bracket to specify a form (ex. Pact of the Chain [Imp])").
  *Rejected:* T14 later and T27 no (the board's suggestions, overruled).
  *Enforced by:* prose only (SPEC 0.9 text + tests in the fix session).

- **D196 — Fix now, editor: explain every chip and offer what a line owes. DECIDED (2026-11-19).** (T08) An over chip opens a short popover saying why. (T09) A 2014 Cleric, Druid or Paladin `Spells` line gets no count, and the dashed hint and Switch to Prepared appear, as in 2024. (T10) A typed or pasted level header offers that level's owed lines (as a preset lays them out). (T11) A species name lays out its owed lines (Elven Lineage, Skillful). (T12) The D190 hint underline with a one-click fix goes to E005 scope (D192), W005 renamed keys, comma classes, Options→family key and other-edition names. (T25) The share view hides empty lines; Edit keeps them. (T28) Family-key suggestions follow the written subclass. (T35) The Switch to Prepared popover anchors to its key.
  *Raw note:* T09: "Unclear issue", then picked "Same as 2024 (Recommended)". T25: "Hide empty lines, keep them for edit". Others marked Fix now with no note.
  *Rejected:* T09 hiding the chip only, or explaining 3/0; T10 and T11 later (the board's suggestions, overruled).
  *Enforced by:* prose only.

- **D197 — Fix now, library and README: no silent loss, and a developer can start from the README. DECIDED (2026-11-19).** (T04) `emit` never drops a line that failed to parse (keep it verbatim, or refuse; the fix session picks and README says which). (T06) README gets install and import lines, a short consumer recipe, the helper list, and where `check` and the slot table come from (decide whether `check` is exported). (T20) README documents the site's JSON save and that `/json` is metadata plus text. (T32) README says `emit` is idempotent; `check --strict` exits 1 on warnings, errors only by default; finding kinds get codes.
  *Raw note:* marked Fix now with no note.
  *Rejected:* T32 later (the board's suggestion, overruled).
  *Enforced by:* prose only.

- **D198 — Fix now, guide examples. DECIDED (2026-11-19).** (T15) One `Feature: … [choice]` example in the level-block section (Hunter's Prey, Replicate Magic Item), and plans ≠ infusions. (T24) An example of a class left and returned to (`Classes: Paladin 9 / Rogue 1`, `L9 Rogue`, `L10 Paladin`), and one sentence: header picks are build-wide, a level block ties a pick to its class. (T34) Francesco's vault pastes get a Tidy pass outside the repo; Troll Bandit's `Classes` line is fixed by hand.
  *Raw note:* T24: "Unclear fix", then picked "Two guide examples (Recommended)".
  *Rejected:* T24 a level-less class block (a format change for notes that give no levels).
  *Enforced by:* prose only.

## Wide user test fixes (2026-11-19) — mechanism: AskUserQuestion, 1 round (2 questions) for D200–D201; the rest delegated to the lib-fixes worker on `claude/lib-fixes-0-9` under D192–D197

- **D200 — Notes go on a `Note:` key: free text, any block, one line per block, written last in its block; no warning, the checker ignores it. DECIDED (2026-11-19).** (D195 T14.) A `#` line stays E001, with a fix that turns it into `Note: …`; a second `Note` in a block is E003 and its fix joins the two with `; `. `X-` keys keep W001 and their item-list values.
  *Raw note:* picked "Note: key (Recommended)".
  *Rejected:* `#` comment lines (Tidy reorders lines, so a comment can't stay pinned above one; the canonical form would move it); `X-` keys as free text with no W001 (changes the value type of an existing key family under apps reading it).
  *Enforced by:* `test/usertest.test.ts` (D195 T14), SPEC §5.1, §5.5.

- **D201 — A granted feature or spell is highlighted with a plain line where it arrives (`Feature: Portent`, `Prepared: Bless`); no new syntax. DECIDED (2026-11-19).** (D193 T26, T02.) The checker never counts a granted spell (subclass always-prepared list, species spell, a feat's or option's fixed spell) as a pick, never calls it misplaced or "more than the rules grant"; a bare `Feature` the data knows no pick for is silent anywhere. Header `Prepared` fills no slot. The extract no longer counts a 2014 patron's *expanded* list as granted, and records the spells an option grants (Pact of the Chain → Find Familiar).
  *Raw note:* picked "Plain Feature/Spells line (Recommended)".
  *Rejected:* a `Highlight:` key (one more key to learn; Francesco chose no new syntax). Cost accepted: a misspelt bare `Feature` passes silently.
  *Enforced by:* `test/usertest.test.ts` (D193, D201), SPEC §5.1, §6.

- **D202 — `emit` keeps a line that failed to parse, as written, at the end of the block it stood in; it never refuses. DECIDED (2026-11-19).** (D197 T04.) The parser records it in `Paste.kept`; `emit(parse(emit(p))) === emit(p)` holds with errors too. The CLI `emit` prints the text and exits 1 when a line has an error.
  *Raw note:* D197: "keep it verbatim, or refuse; the fix session picks".
  *Rejected:* `emit` refusing on errors (an app would still lose the text unless it checked first; keeping is what T04 asked for).
  *Enforced by:* `test/usertest.test.ts` (D202), `test/cli.test.ts`, SPEC §0 rule 6, §4.

- **D203 — Each diagnostic carries a short `hint` and, when the parser can write it, a `fix` (text edits on the paste as written); `tidy()` makes every safe fix, then emits. DECIDED (2026-11-19).** (D192, D196 T12, T37.) Shape: `fix: { label, safe, edits: { line, text | null, insert? }[] }`, made by `applyFix`. Safe: E005 move above the first block, E003 join, E012 `/` between classes, a space after a colon. Not safe (one click only): did-you-mean, `Level 5 Wizard` → `L5 Wizard`, a line made a `Note`. `message` texts stay as they were, so existing consumers keep matching them. `tidy(text, { optionFamily })` also folds a plain `Options` line into its family key (D195 T33); the checker's `normalise` does the same from the slot table.
  *Raw note:* D192 T17: "For these errors, keep the text concise and if possible one or two words".
  *Rejected:* putting the hint inside `message` (breaks every consumer matching message text, the site's tests among them); Tidy guessing (did-you-mean is never automatic).
  *Enforced by:* `test/usertest.test.ts` (D192), SPEC §7.

- **D204 — `check` is exported as `dndpaste/check` with the SRD slot table and supplement in the package; the CLI `check` exits 1 on errors only, `--strict` on warnings too; findings carry a code per kind (C001–C006). DECIDED (2026-11-19).** (D197 T06, T32.) The main entry stays data-free. `dndpaste/sources` exports the UA list (D205). A missing finding carries `at: { key, level }`.
  *Rejected:* `check` in the main entry (pulls checker code into every parser-only consumer, the editor bundle among them); a code per finding message (kinds are what tools filter on; messages still change).
  *Enforced by:* `test/cli.test.ts`, `test/usertest.test.ts` (D204), SPEC §6, README.

- **D206 — On a 2024 feat whose ability slot raises that score (half feat, epic boon; not origin or fighting-style), `[+1 CHA]` reads as `[CHA]`. DECIDED (2026-11-19).** (D193 T22.) `abilityOf`/`isAbilitySlot` accept both; the checker gives an info ("write [WIS]") on any other feat. `emit` keeps what was written; `[CHA]` stays canonical.
  *Raw note:* T22: "Accept, for 2024 feats that are all half feats (except origin-like and FS), it's ok both to have +1 CHA and CHA only".
  *Rejected:* rewriting `[+1 CHA]` in `emit` (data-free emit can't tell a half feat).
  *Enforced by:* `test/usertest.test.ts` (D206), SPEC §5.3.

### Wide user test: editor and share-page fixes (D196, D192 T01, D194; /ui-review rounds 1–3, reviews/2026-11-19-user-test-fixes)

- **D210 — Over chips stay `1/0` with the alert icon and open nothing. DECIDED (2026-11-19).** (T08) Built as a popover saying why (round 1: "Ranger 3 gets no option picks…"); round 1 asked for a shorter flag or a fix, round 2 tried `extra` in the chip, round 3 reverted to the plain chip. An over count needs no prose; where a fix exists, the fix pattern (D214) carries it.
  *Raw note:* "Instead of the current long prose, either propose to fix or simply flag in a much simpler, shorter text it is an unexpected value." Pin: "No popover if this is all it says." Round 2: "1/0 + alert icon was better, no popover".
  *Rejected:* a why popover on the chip; the word `extra` in place of `1/0`.
  *Enforced by:* `site/test/ghost.test.ts` ("zero owed: … the over form once it has picks").

- **D211 — A species offers its owed lines in one click; its Skills line counts. DECIDED (2026-11-19); AMENDED → D270 (the trait is written `Name []`, the cursor inside, its list open).** (T11) `Species: Elf` gets the hint underline on its key: Add Skills, Elven Lineage. It writes empty lines as a preset does, the lineage trait with its brackets (`Feature: Elven Lineage [ ]`, review round 1), appended to an existing Feature line. The lines come from `SPECIES_PRESETS` (site/scripts/presets.mjs, the checker's Species-block warnings: Skills, Tools, Languages, Feat, the lineage trait). The species block's `Skills` line gets a ghost count. One click, never laid out on typing the name.
  *Enforced by:* `site/test/fixes.test.ts` ("D211 (T11)…").

- **D212 — 2014 Cleric, Druid and Paladin are whole-list preparers too. DECIDED (2026-11-19).** (T09) A 2014 class whose table counts no `Spells` and whose 2024 twin prepares from its whole list: no count on `Spells`, the D190 underline and Switch to Prepared, no `Spells` key suggestion. A 2014 Ranger keeps its count. The 2014 preset still lays out no `Prepared` line (D129).
  *Enforced by:* `site/test/ghost.test.ts` (D190 test), `site/test/complete.test.ts` ("D190, D212…"), `site/test/fixes.test.ts` ("D212 (T09)…").

- **D213 — A line under Species or Background that belongs elsewhere moves in one click. DECIDED (2026-11-19).** (T01 editor side) An E005 header key there: Move above Species (or Background). A pick a known species doesn't give (Spells, Prepared, Expertise, Options, Masteries; Skills or Feat when it asks none): the same. A `Subclass` line there moves into the level block where its class gains its subclass ("Move to L3 Wizard"), never to the header (review round 1).
  *Raw note:* "Subclass should only belong to a build after level 3, and should likely be mentioned only there, it shouldn't have a line anywhere else. An accepted exception should be the subclass name before the class name (ex. Diviner Wizard…)." The format part: closed → D220.
  *Enforced by:* `site/test/fixes.test.ts` ("T01, D192…", "D213…").

- **D214 — One-click fixes for older keys, comma classes and plain Options lines; no other-edition hint. DECIDED (2026-11-19).** (T12) W005: Rename to `Feat (Fighting Style)` / `Gear`, ASI rewritten as its 0.8 line (Ability is left to Tidy). E012 commas: Use / between classes. A plain `Options` line whose picks are all one family: Change to Invocations (a rename), or Move to Invocations when the block already has that line (review round 2). One fix per line. All in `site/src/fixes.ts`; `libraryFixes` is the seam for the library's fix targets (D203), which win per line once wired.
  *Raw note:* "I think the hint on every PHB entry is too much, especially because to get them you had to type PHB as source (it should always defaults to the most recent iteration except UA which must be specified)." The default-source rule: closed → D221.
  *Rejected:* a fix on every other-edition `|PHB` name (round 1).
  *Enforced by:* `site/test/fixes.test.ts`.

- **D215 — A level header offers the lines that level owes. DECIDED (2026-11-19).** (T10) A typed or pasted `L3 Fighter` whose block lacks a key the level owes gets the underline on the header: Add Subclass (the preset's keys, `owedKeys`), written empty at the block's end. Hover on any hint underline is a light tint, not an outline (review round 1).
  *Enforced by:* `site/test/fixes.test.ts` ("D215 (T10)…").

- **D216 — The share view and image leave out empty lines. DECIDED (2026-11-19).** (T25) A key with nothing after it, and an empty Species or Background block, are not shown; a level of empty lines keeps its header, unfolded. Raw, Copy, Edit and the paste keep every line. RENDER_VERSION 6.
  *Enforced by:* `site/test/render.test.ts` ("D216 (T25)…"), `site/test/cache.test.ts` (LOCK).

- **D217 — The share page says "Sources" and sets unknown codes apart. DECIDED (2026-11-19).** (T03) `Sources: <title> (<code>) · …`, then `Unknown code(s): …` linked to /codes for a code /codes lacks; `HB` reads Homebrew.
  *Enforced by:* `site/test/share.test.ts`.

- **D218 — /codes lists Unearthed Arcana and HB; the type note sits behind an info button. DECIDED (2026-11-19).** (T03) `site/scripts/books.mjs` reads every UA source a UA file's header names (the code and title character-forge reads; second argument: the UA folder), type Unearthed Arcana, `y2014` before XUA2025; `HB` Homebrew by hand. 106 UA codes. The Type explanation moved into an ⓘ beside the Type header (review pin).
  *Raw note:* "There should be easier navigation tools, right now the list is too long. We need a publication date, and maybe filters." Open (⚑ overseer, 2026-11-19). The library's `UA_SOURCES` (D200s) holds the same list: one source to keep at merge.
  *Rejected:* XUA2025 on only (15 codes).
  *Enforced by:* `site/test/share.test.ts` (UA title on the Sources line).

- **D225 — One-click fixes come from the library; its safe fixes are Tidy's. DECIDED (2026-11-19).** `site/src/fixes.ts` `libraryFixes` maps a diagnostic's `fix` to a site Fix (label = action, hint = reason; applies only while its lines read as written). The site's own E005 move-above, W005 rename and E012 comma fixes are gone. Review: a fix the library marks safe (header key out of a block, joined lines, `/` between classes, a space after a colon, a 0.7 key) gets no underline; Tidy makes it. Underlines stay for what Tidy won't do: the library's unsafe fixes, a pick the species doesn't give, a Subclass to its level (D213), owed lines, Switch to Prepared, an Options family.
  *Raw note:* "Currently it can be a lot to have these reminders all the time for inconsequential changes" → "Tidy takes safe ones".
  *Rejected:* keep every fix one-click (too many reminders); drop one-click fixes (owed lines and Prepared would lose their path). The library's E005 move for a Subclass (D213).
  *Enforced by:* `site/test/fixes.test.ts` ("D225 (review)…").

- **D226 — One UA code list: the library's `UA_SOURCES`. DECIDED (2026-11-19).** /codes and the share page's Sources line read `allCodes()` (`site/src/codelist.ts`): `books.ts` plus `UA_SOURCES`. `site/scripts/books.mjs` no longer writes UA rows; it writes their release dates as `UA_DATES` (a code→date map kept in the site; the library's `UaSource` has no date).
  *Rejected:* asking the library to add `date` to `UaSource` now (its 0.9 work was unmerged); keeping both lists.
  *Enforced by:* `site/test/guide.test.ts` ("D226: the library's UA codes, once").

- **D227 — A short skill list greys out what it can't take. DECIDED (2026-11-19).** A Skills line in a Species block, at the build's L1, or at a later class's first level lists that species', class's or multiclass list first; the other skills follow dimmed, still pickable (as over-level spells, D162). Lists are generated names-only into `names.gen.ts` (`SKILL_LISTS`). No dimming for a header line, a Background block, a list of every skill, or a species with no choice in the paste's edition.
  *Enforced by:* `site/test/complete.test.ts` ("D227…").

- **D228 — /codes: publication dates, filters, A–Z. DECIDED (2026-11-19).** A Published column (`Aug 2014`, sortable, unknown dates last both ways; a year in the search finds its books). A sticky bar: search with a "2014 books" checkbox on one row, type chips (All, Core, Supplement, Setting, Adventure, Extra, Unearthed Arcana) below, then an A–Z strip for the sorted column (code or book; hidden when sorted by type or date).
  *Raw note:* "There should be easier navigation tools, right now the list is too long. We need a publication date, and maybe filters."; review: "Search bar and note after it should be as large as filters, or move 2014 check next to it".
  *Enforced by:* `site/test/guide.test.ts` ("D228 /codes…").

- **D229 — Tidy's badge; a click into an empty `[ ]` opens the list. DECIDED (2026-11-19).** Tidy applies at once through the textarea (one Undo takes it back). A badge on its corner counts the changes; clicking it lists them ("Tidy will:"); clicking a change strikes it through and Tidy leaves it out until it's clicked again (cleared after a Tidy). Tidy's plan (`tidyPlan`): the site's Subclass move, the library's safe fixes, the Options family fold, the canonical form; it is on with errors (D202) and off while a line is held. A click that puts the cursor in an empty `[ ]` opens the name list; the last pick in a bracket trims the spaces inside it (`[ Drow ]` → `[Drow]`).
  *Raw note:* "add an indicator on Tidy's button, clicking the indicator opens a simpler list of the changes, clicking tidy resolves directly"; "clicking on a row disables it making it greyed out and stroke through".
  *Rejected:* a confirm with Tidy / Cancel buttons (review round 1); adding owed lines or Switch to Prepared to Tidy.
  *Enforced by:* `site/test/fixes.test.ts` ("D229: Tidy's plan…"), `site/test/complete.test.ts` ("D229…").

### Subclass placement and bare names (2026-11-19) — mechanism: Francesco's calls via the lib-fixes brief (D213, D214 raw notes) + AskUserQuestion, 1 round (1 question), lib-fixes round 2 worker on `claude/lib-fixes-0-9`

- **D220 — A `Subclass` line goes in the level block where its class gains the subclass, or in the header; `<short name> <class>` is an accepted spelling. DECIDED (2026-11-19).** Header `Subclass` stays allowed (flat snapshots, a subclass still to come) and has no placement finding; one ahead of its class level is a plan, not an extra. Any other level block is `misplaced`/warning with a how-to-fix message and `at = { key: "Subclass", level }`: "Wizard gets its subclass at class level 3, not 1; move it to L3 Wizard"; another class's block: "Evoker is a Wizard subclass; move it to L6 Wizard"; a class not there yet: "…; move it to the header until then" (`level: null`). `Diviner Wizard` resolves through an index alias (`shortName className`), no finding. Closes D213's format ⚑.
  *Raw note:* "Subclass should only belong to a build after level 3, and should likely be mentioned only there, it shouldn't have a line anywhere else. An accepted exception should be the subclass name before the class name (ex. Diviner Wizard…)." Brief: keep header `Subclass`.
  *Rejected:* dropping header `Subclass` (breaks flat snapshots, SPEC §8.2); an error for a misplaced line (checker findings are never errors, D34).
  *Enforced by:* `test/resolve.test.ts` (D220), SPEC §5.1 Subclass row, §3.2, §6.

### D152 copy pass (2026-11-19) — mechanism: review board (private Artifact, 2 rounds, 324 strings inventoried, 53 proposals) marked by Francesco + AskUserQuestion, 1 round (1 question); copy-pass worker on `claude/copy-pass-d152`

- **D230 — The site's functional copy is the board's approved set: 53 strings changed, the rest kept. DECIDED (2026-11-19).** Approved as proposed: "Fold levels" / "Unfold levels" (was Fold all levels / Expand all), "Report a problem" (the report summary), "Saved builds" (was My recent shares), "Change to Prepared" (D190's fix button, same verb as the Options family fix), one "No keys left for this block." for desktop and phone, the dock's name-only line matching the toolbar ("Only a name · add a key to save"), one `·` separator in the toolbar summary, fixes that say what to do ("Shorten it to save", "Fix them to save"), no semicolons, "The site is busy. Try again in an hour." for the 503. The drop zone names the undo shortcut by system (⌘Z on Apple devices, else Ctrl+Z). Key descriptions (shared with /guide), library fix labels (D192) and /codes kept.
  *Raw note:* "Is there an actual undo button?"; "Can the site detect the device and use the appropriate wording? Otherwise keep current."
  *Rejected:* "Undo brings it back" (there is no Undo button; it means the shortcut).
  *Enforced by:* site tests asserting the strings (`tochoose`, `worker`, `edit`, `form`, `fixes`, `display`, `abuse`). *Landed:* 24e923a, 1731adb.

- **D233 — The copy menu says "Copy tidied text · for apps" and the no-JS link "Tidied text"; both show only when Tidy would change the text. DECIDED (2026-11-19).** "Canonical" stays the spec's and /guide's word, not the UI's. The view marks `data-tidy="same"` when the cached tidied text equals the text as written, and neither the menu nor the `<noscript>` line offers it (or fetches it).
  *Raw note:* "If the tidied and current text are the same, then this option shouldn't appear."
  *Rejected:* "Copy canonical · tidied, for apps" (format jargon); always showing the item.
  *Enforced by:* `site/test/worker.test.ts` ("D152 round 2: the view offers the tidied text only when Tidy would change it"), `site/test/share.test.ts`.

- **D234 — /about's privacy line calls the edit key a "private edit link" and lists everything the browser keeps. DECIDED (2026-11-19).** "The site stores the title, the author and the text that you save. It never stores your private edit link, only a scrambled check for it. Saved builds, your private edit links, your unsaved drafts, the author name you last saved with and your settings stay in your browser." Closes D150's note. Its Reports paragraph names the Report a problem link.
  *Raw note:* "The key part isn't clear to a regular user."
  *Rejected:* "a scrambled form of the edit key that cannot be turned back into the key" (unclear); option A1a, "a scrambled copy that can check the link but can't rebuild it" (longer).
  *Enforced by:* `site/test/worker.test.ts` (the /about checks). *Landed:* 1731adb.

## Your own sources scoping (2026-11-20) — mechanism: /interview, AskUserQuestion, 3 rounds (9 questions), overseer at /start; T6.1

- **D244 — The importer reads two shapes: the plain dndpaste names format, and any JSON whose top-level arrays per kind hold entries with a `name` and a `source`. DECIDED (2026-11-20); amends D160 (which named the plain format only).** The JSON shape is described generically in the docs and never named after a site. Every other field is dropped on read, before anything is kept or shown (D160 still holds for text).
  *Picked:* "Plain + generic JSON (Recommended)". *Rejected:* plain format only (almost nobody has such a file); plain format plus a converter script in the repo (a step most visitors won't take).

- **D245 — Imported sources are kept in this browser (IndexedDB) until removed. DECIDED (2026-11-20).** Never uploaded; nothing about them goes into a share (D65: a share is paste, title, author). Clearing site data loses them, and the Sources page says so.
  *Picked:* "Kept in this browser (Recommended)". *Rejected:* this tab only (tedious for regular use).

- **D246 — Your sources feed names, feature options and counts, in one build (T6.2). DECIDED (2026-11-20).** Autocomplete names (D151 ranking, D219/D241 dimming apply the same way), the option lists inside `[ ]`, and counts for ghost pick counts (D129) and slot hints. This is D66's checker-data step on the visitor's data: the slot extractor becomes a pure library function run in the browser. Size L, not M.
  *Picked:* "Names, options and counts"; then "One build". *Rejected:* names only; names + options with counts later; two builds (T6.2 names/options, T6.3 counts).

- **D247 — Sources are managed on their own page, `/sources`: add (file or link), list with counts, turn on/off, remove; linked from the editor's menu and the autocomplete's empty state. DECIDED (2026-11-20).** It needs a clean, organized design that is easy to reach: a /jam on the page comes before the build. The names-format docs live there.
  *Raw note:* "A sources page, we need a clean organized design for it to be easy to access." *Rejected:* a panel inside the editor.

- **D248 — A source can also be a GitHub link, fetched by the visitor's browser straight from GitHub and checked again on each visit. DECIDED (2026-11-20); amends D160 ("never fetched by the site").** The site's server never sees the link or the data. CSP `connect-src` allows GitHub's raw and API hosts only. The site suggests no links, ships no presets and names no source; it works with any repo laid out by kind, including the 5etools one, without saying so.
  *Raw note:* "If possible, we could also allow for live sync with a github source by pasting a link, but without reference to 5etools (although it works with it)." *Challenged:* one paste could load a whole mirror, so the site is no longer file-only; accepted with the browser-only, GitHub-only, no-presets limits. *Rejected:* files now and links later; any https URL (wide CSP, harder to keep the no-door promise).

- **D249 — A link may point to a raw file or a folder; a folder's JSON files are listed through GitHub's API, cached with ETags. DECIDED (2026-11-20).** Unauthenticated API calls are limited to 60 an hour per IP, so a re-check sends conditional requests and a 304 costs nothing kept. A failed re-check keeps the stored copy and says so.
  *Picked:* "Files and folders (Recommended)". *Rejected:* single files only.

- **D250 — Names from your sources and the SRD names rank in one list by match, each of your rows showing its book. DECIDED (2026-11-20).** D219 dimming and D241 class-first apply to your names too.
  *Picked:* "Mixed by match". *Rejected:* your names first on a tie.

- **D251 — When your sources include a book, the bundled SRD names filed under that book are hidden: per book, not per edition. DECIDED (2026-11-20); AMENDED → D255 (per book and kind).** Importing XPHB hides the SRD names under XPHB, so no near-dupes (Hideous Laughter vs Tasha's Hideous Laughter); SRD names under XDMG stay until XDMG is imported. Turning the source off brings them back.
  *Raw note:* "SRD is fully hidden if for example the XPHB is present for 2024 (want to avoid dupes or 'almost dupes' like tasha's hideous laughter and hideous laughter)"; then "Per book (Recommended)". *Rejected:* per edition (importing XPHB alone would lose the SRD magic items).

## /sources page jam (2026-11-20) — mechanism: /jam, 3 rounds on a private Artifact board (https://claude.ai/artifact/QqTphyKGhkiaxk1vvdyDNt) + AskUserQuestion, 4 calls; jam session started by the overseer; T6.1b

- **D252 — `/sources` is one column, like /guide: title and intro, the storage note ("Kept in this browser only, never uploaded. Clearing site data removes them."), an Add bar (File | GitHub link; files also by a drop zone), the list, then the names-format docs folded at the bottom. Same column on phone. DECIDED (2026-11-20); AMENDED → D266 (copy, SRD names) and D269 (folders).** Round 1.1 → A. Asked for directions in words first; his answer: "Mockup different layout options".
  *Picked:* A on the board; "Lock A + books (Rec.)". *Rejected:* B list + side column (no reason given; it also moved the full docs off the page, against D247); C two tabs, sources | names format (no reason given).
  *Enforced by:* build frames `sources-empty-*` (`.claude/mockups/sources/`, untracked).

- **D253 — Books and kinds are switched for all sources at once: a name shows only when its source, its book and its kind are all on. DECIDED (2026-11-20); AMENDED → D267 (kinds per book or per source).** Book categories come from the site's own book list (`site/src/books.ts` types: Core, Supplement, Setting, Adventure, Extra, Unearthed Arcana, Homebrew) plus "Your own codes" for codes not in it; a category has its own switch, partly on when some of its books are off. Built-in books get switches too: turning XDMG off hides the built-in XDMG names (shown on the round 2.1 board, not objected). Kinds: Classes, Subclasses, Species, Backgrounds, Feats, Spells, Items, Options.
  *Raw note:* (1.1 pin) "The source manager shouldn't only be divided by import but also by book and other divisions within the imports (ex. I may want to remove a book or a category of books etc.)"; then "Everywhere, the manager should be aggregated"; (2.2 pin) "If I want to only enable or disable a specific type of content ex. spells, how can I do it?" → "Third lens: By kind (Rec.)".
  *Rejected:* book switches per source; global plus per-source overrides; kind chips above the categories (a new chip control); kinds inside each book (three levels deep).

- **D254 — The list has three lenses on one segmented switch, By book | By kind | By source; By book is the default. DECIDED (2026-11-20); AMENDED → D267 (Group by Book | Source, and Kinds).** By book opens on category rows: name, books and names counts, the codes in one muted line, a switch on the right (the Settings menu's pattern, D82); opening a category lists its books as title + switch, the code and names count under the title. By kind: the 8 kinds as rows, same pattern. By source: round 1.1 A's rows trimmed (switch, name, type, names, books, Check now and the failed re-check message for links, Remove), the built-in names as the last row (cannot be removed); while a re-check has failed, the By source button carries a warning dot. Switches keep clear of the column edge (his spacing pin). Round 2.1 → B; round 2.2 → C.
  *Raw note:* (2.1 pin on B) "I'm not sold on this column organization, it feels very busy and I'm not sure how to rework it"; (2.2 pin on C) "Make sure the spacing is ok between toggles and box margins."
  *Rejected:* 2.1 A stacked Sources then Books (no reason given); 2.1 C category chips over one book table (no reason given); 2.2 A books as toggle chips, B title-first checklist (no reasons given).
  *Enforced by:* build frames `sources-bybook-*`, `sources-bykind-*`, `sources-bysource-*`.

- **D255 — Built-in SRD names are hidden per book and kind: XPHB spells in your sources hide only the built-in XPHB spells; built-in XPHB classes stay until a source brings XPHB classes. DECIDED (2026-11-20); amends D251 (per book).** Turning the source, the book or the kind off brings them back.
  *Picked:* "Per book and kind (Rec.)". *Rejected:* per book as D251 (a partial source, say spells only, would hide the built-in classes and feats of that book).

- **D256 — Ways in: a "Your sources · N on" row at the foot of the Settings menu opens `/sources`; no header link. While no source is added, an autocomplete list that matches nothing for a name of 3+ letters stays open on one line, "No matches. Add your own sources to suggest more books.", linking to `/sources` (the draft is kept, D102); once any source exists it closes as D154 says. DECIDED (2026-11-20); amends D154 for that case; AMENDED → D266 (the row's count chip, the two-row no-match).**
  *Picked:* "Settings row only (Rec.)"; "Only with no sources". *Rejected:* a Sources link in every page's header (busier header, wraps sooner on phone); the no-match line for everyone (noise once sources are set up).
  *Enforced by:* build frame `ways-in-desk`.

- **D257 — T6.2 builds `/sources` from the jam's 9 build frames. DECIDED (2026-11-20).** Frames and their index: `.claude/mockups/sources/build-frames/` in the main checkout on the Mac (untracked; copy them into the T6.2 worktree, or render again with `~/.claude/shared/bin/jam-frames.sh .claude/mockups/sources <out>`); the board link above. New primitives to build once: the mixed switch (partly-on category), the drop zone, the Settings menu link row. The frames' book titles and sample data are mock content; the build shows only names, codes and counts the visitor's own data and `books.ts` carry, and names no data source (D160, D248).

## T6.2 your own sources, build calls (2026-11-20) — mechanism: worker's calls inside the T6.2 brief (D244–D257), each checked in code and tests; open to change at /ui-review

- **D258 — The plain names format: one name per line, `Kind: Name|BOOK [details]`. DECIDED (2026-11-20).** Kinds: Class, Subclass, Species (or Race), Background, Feat, Spell (Cantrip), Item, Option, Feature; a plural key reads the same. A name with no book is `HB`; a `#` line is a note. The brackets are optional and hold only what a list ranks by: a spell's level (`0`/`cantrip`, `2`, `2nd`) then its classes, a subclass's class, an option's family (name or code), a feat's category; on a `Feature` line, the options its `[ ]` offers. Any other line is counted as not read and shown on the source's row. *Rejected:* a format without details (no class-first ranking or `[ ]` options from a hand-written file); a second syntax unlike dndpaste's own (brackets already mean "details" in a paste).
  *Enforced by:* `site/test/sources.test.ts` (D258), the docs on `/sources`.
- **D259 — Your names carry book bits beside the built-in four: PHB, XPHB, DMG, XDMG keep theirs; any other book is "a 2014 book" (16) or "a 2024 book" (32) by its date, both when unknown. DECIDED (2026-11-20).** A row of yours shows its book (D250) unless it already shows the `|SOURCE` a pick writes; a pick under the other edition writes your book's code (D155). An unknown edition is never "the other edition", so it is never dimmed (D219) and always written bare. A spell with no level is offered on both Cantrips and Spells lines. *Rejected:* one bit per book (32-bit masks overflow past ~27 books; a full folder brings 90+).
- **D260 — The extractor is `src/extract.ts` (`extractSlots`, `mergeData`, `srdSubset`), exported as `dndpaste/extract`; `scripts/extract-slots.mjs` only reads the folder and writes. DECIDED (2026-11-20).** Output byte-identical to the old script on the local data (checked). Files merge by kind: an entry seen twice (same name and book) keeps the fields of both, the first file's where both have one; a spell → class map file is recognised by shape. The names (`names.mjs`) and presets (`presets.mjs`) generators run on the same pure functions the browser uses (`site/src/namerows.ts`, `presetrows.ts`); both outputs unchanged except `FEAT_CATEGORIES` added to `names.gen.ts`. *Rejected:* a browser-only copy of the extractor (two copies drift).
- **D261 — A GitHub folder link reads the folder's .json files and its subfolders' .json files whose path names a kind (class, race, species, background, feat, spell, item, option); description companion files (`fluff`) are skipped; at most 400 files and 80 MB a source, 30 MB a file. DECIDED (2026-11-20); AMENDED → D270 (a GitHub folder up to 1,000 files, a folder from this computer no file cap).** One check = one contents-API call with the last ETag (304 costs nothing kept); each subfolder's tree is listed once per tree sha; files come from the raw host, and all of them again only when a blob sha changed (the extractor needs the whole set). A file link is checked through the same API (its blob sha). *Rejected:* reading every subfolder (a full data folder is 100+ MB of creatures and adventures); the git-trees API on `ref:path` (404s for subpaths).
- **D262 — "Checked again on each visit" (D248) means each visit to `/sources` and each editor load while a source exists, at most once per link every 10 minutes; Check now always checks. DECIDED (2026-11-20).** The 10-minute floor keeps reloads from spending GitHub's 60 calls an hour. CSP `connect-src 'self' https://api.github.com https://raw.githubusercontent.com` on every page, since the editor checks too (and the dev review CSP).
- **D263 — What a source keeps: the extractor's output for its own entries, a name up to 100 characters on one line, a book code of letters, digits and `-_:.'` (up to 40); any string over 120 characters or across lines is dropped wherever it sits. DECIDED (2026-11-20); applies D160.** Raw files are never stored: parsed in memory, extracted, dropped.
- **D264 — Your classes give ghost counts and owed-key hints (D129, D215) through the same presets; for a class and book the site already has, the built-in table wins. DECIDED (2026-11-20).** A count only the supplement knows (a spellbook, a fixed mastery count) stays unknown for your classes, so it shows no ghost (D66: a hint, never a check). A class written without a book takes yours in the `Rules:` edition, else its only printing.
- **D265 — The editor loads your sources at once when a source exists (so your classes' counts show before the editor is used), otherwise never; a one-line summary in localStorage (`dndpaste.sources`: count, on) feeds the Settings row ("N on", "None yet") and the D256 no-match line without opening IndexedDB. DECIDED (2026-11-20); AMENDED → D266 (the Settings row shows a count chip).** With storage blocked the page says sources can't be added here and the editor runs on the built-in names.

## T6.2 your own sources, /ui-review (2026-11-20) — mechanism: Francesco's verdicts, notes and pins in the review overlay, and his AskUserQuestion picks

- **D266 — Review round 1 copy and layout calls on `/sources` and in the editor. DECIDED (2026-11-20); amends D156, D163, D252, D256, D265; AMENDED → D270 (the lines-not-read alert is the icon alone, a rule between the no-match rows).** Raw: "Go with SRD instead of built in. The copy could use a general pass" · "Instead of a 1 on text, add a round chip counter with the number of sources" · "Change it to be in two rows, the first: No matches, the second is the button + Add sources. It needs to remain small and subtle" · "Instead of an additional line, there could be a subtle alert inline above that returns the error in a popover" · "By source elements positioning and by book should be the same … toggles on the right". (1) "Built-in names" is "SRD names" everywhere; the intro, hints and empty state lose a sentence each; the SRD row says "partly replaced by yours", not a list per book; the hint line under the list head is gone. (2) "Your own codes" is "Other books" (picked over "Unlisted books", "Your books"). (3) A source row is built like a book row: name, actions, the switch on the right, small lines under. (4) Lines not read: a quiet "⚠ N lines not read" in the row's meta line that opens the reason. (5) The add message is in parts: a check, "Added name" in bold, the counts, the lines not read in red; while a link or folder is read, a spinning icon, the count line and a thin bar that fills (picked over text only and a full loading state). (6) The Settings row shows a round chip with the number of sources, nothing with none. (7) No match: two quiet rows, "No matches" then "+ Add sources". (8) The `[ ]` hint line only for two groups or more (picked over keeping it always and removing it); its rule runs the full width. (9) An unknown `Feature:` offers nothing inside `[ ]` (picked over keeping all names and parking it); an unknown feat keeps the general list. ⚑ Follow-up (Francesco, 2026-11-20): the editor doesn't flag an unknown feature name (`Elf Lineage` for Elven Lineage); that is checker work (M2).
  *Enforced by:* `site/test/sources.test.ts`, `site/test/complete.test.ts` (D156, D266).
- **D267 — The list groups by Book or by Source, and a Kinds button splits every row by kind, each kind with its own switch. DECIDED (2026-11-20); amends D253, D254.** Raw: "I'm not sure by kind should be an option beside by book and by source, because it should only be a grouping option and still let you disable for example only classes in a specific source or book. Perhaps we should add a grouping tool." Picked: "try without jam yourself now" (over parking it for a jam, dropping By kind, or jamming before merge). Switches: books for all sources (as D253), the SRD names, and `offPairs` with `BOOK|kind`, `@source|kind` and `@srd|kind`; a kind switch hides that kind in that row only. *Rejected:* By kind as a third view (a kind could only be off everywhere).
  *Enforced by:* `site/test/sources.test.ts` (D253, D267).
- **D268 — A species named `Base (Variant)` is left out when `Base` is a species too, in the same source or in the SRD names. DECIDED (2026-11-20).** Raw: "drop the parenthesis name, a species should aggregate then divide in its lineages later (should also work for same species with additional lineages like Elf with lorwyn and shadowmoor variants). However, we could update the dndpaste format in general to allow for Elf [Drow] or Dragonborn [Black], with lineage-like variants folded inside the name instead of Feature. We still need a place for other related choices, ex. spellcast ability." Applied when a source is read, and on copies kept before. The SRD names' own 2014 subraces ("Elf (High)") stay. ⚑ Follow-up (Francesco, 2026-11-20): a lineage-in-brackets format (`Elf [Drow]`), species suggesting their lineage feature (Dragonborn → Draconic Ancestry), a place for related choices such as the spellcasting ability. *Rejected:* keeping the variant names (noisy species lists).
  *Enforced by:* `site/test/sources.test.ts` (D268).
- **D269 — A folder from this computer is a source: picked (Choose a folder) or dropped, read once with the GitHub folder rule (D261). DECIDED (2026-11-20).** Raw: "I should also be able to load a local folder directly". Its row says "Folder · N files"; it is not checked again (add it again to update it). *Rejected:* parking it as a follow-up.
  *Enforced by:* `site/test/sources.test.ts` (D261, D269).
- **D270 — Review round 3 on `/sources` and one editor fix. DECIDED (2026-11-20); amends D211, D261, D266.** Raw: "maybe a divider or some way to better separate no matches and add sources" · "Keep only the alert icon, the error message only on popover, make sure margins are ok. In general it should a subtle error" · "Comes with the site replaced with built-in" · "Why the limit? A folder may be larger, but the related files could be only part of it" · "After adding an option that spawns brackets, the cursor should move inside the brackets and open the next dropdown instead of after" ("I think it was Elven Lineage"). (1) No match: a full-width rule between "No matches" and "+ Add sources". (2) Lines not read: the meta line shows only the warning icon (its count as its label); the popover opens with the count in bold, then the reason. (3) The SRD names row says "Built-in · N names". (4) A folder from this computer has no file cap, only the 80 MB size cap; a GitHub folder reads up to 1,000 files (each file is a download); the 723 he saw already counted only the files the folder rule keeps. Picked over no file cap anywhere and keeping 400 with clearer copy. (5) A fix that writes empty brackets (the species fix, `Elven Lineage []`, now written as a pick writes them) puts the cursor inside the first ones and opens their list, as after a pick (D242). Picked over the first empty spot the fix writes (`Skills:` first) and a follow-up. ⚑ Follow-up (Francesco, 2026-11-20): a plain-text way for a name to carry its detail slots (a feat granting spells from a list with a casting ability); today the plain format holds only names and where they rank (D258), and that behaviour lives in JSON.
  *Enforced by:* `site/test/sources.test.ts` (D266, D270), `site/test/fixes.test.ts` (D211, D270).

## 0.10 scope, T6.3 small fixes (2026-11-20) — moved from the live file at handoff 2026-11-20; mechanism and context under D271 there

- **D272 — 2024 origin languages fill their own allowance before any language is an extra. DECIDED (2026-11-20).** (T6.3) Under `Rules: 2024` (or no `Rules`), a character knows Common and two standard languages from its origin, which no species, background or class data grants, so every written language was "extra". The checker now treats Common as always free and lets two more fill the origin, read in this order: the Background block, the Species block, the header, the L1 block. A species or background that grants languages of its own (a 2014 book under 2024 rules) fills those first. `Rules: 2014` is unchanged. A missing origin language is never reported: sparse pastes stay valid. Library change, in Unreleased for 0.10.0 (D271). Enforced by `test/check.test.ts` ("2024 origin languages").
  *Rejected:* a `missing` note when fewer than two are written (sparse pastes are valid); applying it to 2014 pastes (2014 species and backgrounds grant their own).
- **D273 — Underscores in a book's index name read as spaces. DECIDED (2026-11-20).** (T6.3) `site/scripts/books.mjs` tidies titles as it writes `books.ts`; the only one on the current data was "Project_Lamordia" → "Project Lamordia". A stored render holds the Sources line, so `RENDER_VERSION` is 7 and saved shares re-render on read.
- **D274 — `/codes` sorts at phone width: the head stays as one row of sort buttons. DECIDED (2026-11-20).** (T6.3) Under 600px the table head was hidden, so no column could be sorted (the report named Type). The head is now a row of the four sort buttons above the list; the types popover anchors to that row so it stays on screen.
- **D275 — A plain names line can give a feat's ability pick: `Feat: Fey Sentinel|MYHB [General; INT, WIS, CHA]`. DECIDED (2026-11-20); amends D258.** (T6.3) The second bracket group lists the abilities the pick takes; a first group of abilities alone works too. The editor then opens those abilities inside `[ ]`, as a JSON file already did. Ability codes only (`STR`…`CHA`).
  *Raw note:* "Yes, after the category (Recommended)".
  *Rejected:* JSON only for ability picks.
- **D276 — Spellfire Spark and Fey Sentinel ask for an ability pick; the fixtures write CHA. DECIDED (2026-11-20); closes the ⚑ in STATE ⑥ and `fixtures/README.md`.** (T6.3) The book data gives Spellfire Spark INT/WIS/CHA; Fey Sentinel is a D&D Beyond Drops feat (General, INT/WIS/CHA, level 4, needs Fey Pact), not homebrew. `shigen` writes `Spellfire Spark|FRHoF [CHA]`, `vice` writes `Fey Sentinel|HB [CHA]` (the code stays `HB`: the loaded data has no code for that collection), and the README's example follows. Checked on `/sources` with a hand-written JSON file: `Fey Sentinel` opens CHA/INT/WIS inside `[ ]`.
  *Raw note:* "CHA"; "It's not homebrew, it comes from D&DBeyond Drops (you can check in the local homebrew or mirror folders). If it asks an ability, it is CHA".
- **D277 — `/sources` copy pass: fewer sentences, dry fields as lists. DECIDED (2026-11-20); answers D266's r1 note "The copy could use a general pass".** (T6.3, /humanize) The intro drops "A source is a file, a folder or a GitHub link" (the Add bar says it); the file hint is one line with no semicolon; the plain format's bracket rules are a list, one line per kind (Feature moved there from the third fold, now "Classes and folders"); the folder limits are one line; the SRD hint says "replace", as the book rows do; the no-site-data error is two sentences.
- **D278 — Psion and Arcane Shots stay out of the bundled names list. DECIDED (2026-11-20).** (T6.3) Psion is Unearthed Arcana and the Arcane Shot options are the Arcane Archer's book: neither is SRD or Basic Rules, so D141/D159 keep them out. Since M6 a visitor gets both from their own file on `/sources` (tested with a JSON and a plain file: Psion in the classes, the arrows under `Arcane Shots`).

## Lineage format, SPEC 0.10 (2026-11-20) — mechanism: /interview, AskUserQuestion, 2 rounds (6 questions), overseer; T7.1

- **D280 — A species' defining pick goes in brackets on the `Species` line. DECIDED (2026-11-20); amends SPEC §5.1 ("`Subclass`, `Species`, `Background` items carry no details", the `Species` row's "2024 lineages are a `Feature` line in the block") and D26 for that one pick.** The defining pick is the species feature that splits it into lineages or ancestries: Elven Lineage, Gnomish Lineage, Fiendish Legacy, Draconic Ancestry, Giant Ancestry, and their like in other books or homebrew. `Species: Elf [Drow]`, `Species: Dragonborn [Black]`, `Species: Goliath [Fire]`. Its `Feature` line goes away. Every other species pick (skills, Size, origin feat, a species spell) stays a block line.
  *Raw note:* "we could update the dndpaste format in general to allow for Elf [Drow] or Dragonborn [Black], with lineage-like variants folded inside the name instead of Feature. We still need a place for other related choices, ex. spellcast ability" (⚑ under D268); then "The defining pick (Recommended)". *Rejected:* lineages only, with ancestries left as `Feature` lines.

- **D281 — The lineage's spellcasting ability is canonical inside the same brackets, after the lineage: `Species: Elf [Drow; WIS]`. DECIDED (2026-11-20).** Three forms read: the brackets; `Species: Elf [Drow]` with an `Ability: WIS` block line (silent, no warning); the 0.9 `Feature` line (D283). Emit and Tidy write the brackets. Lineage first, then ability: the name part leads, unlike feats (ability first, O4).
  *Raw note:* "Both accepted. Current format also accepted"; then "In the brackets (Recommended)". *Rejected:* the `Ability:` line as the canonical form.

- **D282 — 2014 subraces use the same form: `Species: Elf [Wood]|PHB`. DECIDED (2026-11-20); amends D38.** `Elf (Wood)|PHB`, the data's own name, still reads with a warning, and Tidy rewrites it. The checker maps `Elf [Wood]` to the data's `Elf (Wood)`. One canonical form for both editions.
  *Picked:* "One form for both (Recommended)". *Rejected:* keeping 2014 names as they are (each edition written its own way).

- **D283 — 0.9 pastes with `Feature: Elven Lineage [WIS; Wood]` (or any defining-pick `Feature` line) read with a W-code, and Tidy moves the pick onto the `Species` line. DECIDED (2026-11-20).** As the 0.7 keys did (W005). Saved shares keep working and render as written.
  *Picked:* "Read, warn, Tidy fixes (Recommended)". *Rejected:* both forms valid with no warning (breaks one canonical form).

- **D284 — T7.2 (SPEC 0.10, library, site) starts after T6.3 merges. DECIDED (2026-11-20).** One writer on `src/check.ts` at a time; T7.2 branches from a main that holds T6.3. Then /ui-review, release 0.10.0 per D57, deploy.
  *Picked:* "After T6.3 merges (Recommended)". *Rejected:* both in parallel (a likely conflict in the checker and the site's autocomplete).


## Reddit post review (2026-11-20) — mechanism: /start review of the live site and the r/3d6 draft, AskUserQuestion, 1 round (2 questions), overseer

- **D285 — The r/3d6 post waits for 0.10; its sample and the Shigen fixture take Pact of the Blade at L2 and Agonizing Blast at L3. DECIDED (2026-11-20).** The draft's sample (and `fixtures/shigen.dndpaste`, README) took Agonizing Blast at Warlock 1; the 2024 invocation needs Warlock 2 and the checker flags it (C002). The draft also writes `Invocations:` (D180) and `Spellfire Spark|FRHoF [CHA]` (D276), and names autocomplete and `/sources`; its homebrew question points at `/sources`. T3.11 posts after 0.10.0 is live, so first readers see `Species: Elf [Drow]` and the guide's new species example. T7.2 decision ids start at D286.
  *Picked:* "Pact of the Blade at L2 (Recommended)", "After 0.10 ships (Recommended)".
  *Rejected:* a sample cut to L1 (loses the level-block point); another build; posting before 0.10 (the guide's Tiefling example changes under readers).
  *Enforced by:* `fixtures/shigen.dndpaste` (the checker run is clean of C002), `test/parse.test.ts` ("shigen: structure").


## Lineage format build, T7.2 (2026-11-20) — mechanism: AskUserQuestion, worker; ids D286–D294

- **D286 — The species' source goes after its name, as on every item: `Species: Elf|PHB [Wood]`, `Species: Elf|XPHB [Drow; WIS]`. DECIDED (2026-11-20); amends D282's example (`Elf [Wood]|PHB`).** The item grammar (§3.1) stays the same for every key: `Name|SOURCE [details] xN`. A hand-written `Elf [Wood]|PHB` gets a one-click fix that Tidy also makes.
  *Raw note:* "After the name (Recommended)"; then "Actually, maybe the source should always come last" and a pick of "Last, everywhere"; then "I'm still debating. Perhaps for now let's keep it as we always did it for everything, I may open this up for revision later."
  *Rejected for now (open for a later revision, owner Francesco):* the source last on every item (`Spellfire Spark [CHA]|FRHoF`), with the old order read with a warning (it changes every sourced item with details and makes saved builds warn); the source last on Species only (a Species-only exception to the item grammar); both orders read silently (two canonical forms, against D283).
  *Enforced by:* SPEC §3.1 and §5.1 (0.10), `test/` once T7.2 lands.

- **D287 — A lineage written before the species' name reads as the bracket form when data says so: `Wood Elf` → `Elf [Wood]`, `Black Dragonborn` → `Dragonborn [Black]`, `Hill Dwarf` → `Dwarf [Hill]`. DECIDED (2026-11-20).** Only when the whole name is no species and the rest is one that offers that lineage (or prints it as a 2014 subrace). The parser has no species list, so it keeps the name: the checker reads it with an info, `normalise` writes it, and `tidy` does when the caller passes `TidyOptions.species` (the checker's `speciesLineage`). The site's Tidy wires it (site worker).
  *Raw note:* "A note: the parser could also accept but tidy a format like Wood Elf, or Black Dragonborn".
  *Rejected:* a data-free split in the parser (it can't tell `Wood Elf` from `Simic Hybrid` or `Custom Lineage`).
  *Enforced by:* `test/spec10.test.ts` ("D287").

- **D288 — The data-free rules for the 0.9 forms: a Species-block `Feature` whose name ends in Lineage, Legacy or Ancestry is the defining pick (W006); a Species name's one trailing parenthesised group is the variant (W007). DECIDED (2026-11-20), worker's call.** W006 moves the pick only when the `Species` line has no brackets yet, and never from a level block or the header (`Feature: Draconic Ancestry [Red]` is a Draconic Sorcerer's pick there). W007 moves only the last group (`Elf (Kaladesh) (Vahadar)|PSK` → `Elf (Kaladesh)|PSK [Vahadar]`) and leaves quoted names with `;` or `,`; it covers every 2014 subrace, `Human (Mark of Making)|ERLW` → `Human|ERLW [Mark of Making]` included (the guide's example of parentheses in a name changes, site worker). Both are W-codes with a safe fix, as W005 (D113): the AST holds the new form.
  *Rejected:* a fixed list of trait names (misses other books' and homebrew lineages); moving header-scope lineage features (ambiguous with class picks).
  *Enforced by:* `test/spec10.test.ts` ("D283", "D282").

- **D289 — The editor and the checker's messages write a lineage short; the checker reads short or long. DECIDED (2026-11-20), worker's call, from D280's examples.** `Elf [Wood]`, `Goliath [Fire]`, `Gnome [Rock]`: the option's last word goes when it repeats the species or the trait's first word (`shortLineage`). The data's `Wood Elf`, `Fire Giant` still match.
  *Rejected:* the data's long names as canonical (`Elf [Wood Elf]` repeats the species).
  *Enforced by:* `test/spec10.test.ts` ("shortLineage", "a missing lineage names the bracket form").

- **D290 — The supplement gives Gnomish Lineage's spellcasting ability (INT, WIS or CHA): `lineageAbility` (D35). DECIDED (2026-11-20), worker's call.** The slot table has no `spellAbility` for `Gnome|XPHB`, so `Gnome [Rock]` never asked for one. Names only, no rules text.
  *Enforced by:* `test/spec10.test.ts` ("a missing ability is info").

- **D291 — The editor's names are keyed by species: 2014 subraces and a source's `Base (Variant)` species are lineage options of their base, not species names. DECIDED (2026-11-20), worker's call; closes the D268 check and its PLAN follow-up.** (T7.2 site) `LINEAGES` rows are `[species, books, trait, ability bits, short options]`: `Elf|XPHB` → Elven Lineage, INT/WIS/CHA, Drow/High/Wood; `Elf|PHB` → `""`, High/Wood. `SPECIES` drops `Elf (High)`, `Dwarf (Hill)`, `Human (Variant)` and their like. A visitor's table keeps its variants (no longer dropped when stored); `merge` folds them into their base, and a 2024 book's variants count as an owed lineage. The bracket list follows the parent's `|SOURCE`, else `Rules:`, else the newest printing, as the checker reads a bare name. The hint word is the trait's last word (lineage, legacy, ancestry), `subrace` for a 2014 one. `shortLineage` moves to the data-free library (the checker re-exports it) so the client has it without the checker.
  *Rejected:* keeping the subraces as species names (they read with W007 since 0.10); a `Lineage` hint for 2014 subraces (the book's word is subrace).
  *Enforced by:* `site/test/names.test.ts`, `site/test/complete.test.ts` ("D156", "D163"), `site/test/sources.test.ts` ("D291").

- **D292 — The editor writes the lineage on the Species line: a pick of an owing species opens `[]`, the species-lines fix writes `Species: Elf []`, and a lineage trait is no `Feature` name. DECIDED (2026-11-20), worker's call, from D280. AMENDED by D296 (2014 subraces open too) and D298 (Feature offers the traits again).** (T7.2 site) A 2024 species that owes its lineage (`DETAILS` names it by book) comes with its brackets and its list (D242); a pick writes `; ` and opens the abilities when the lineage asks one; a 2014 species opens none (its subrace is not owed). `SPECIES_PRESETS` hold `["Species", trait]` instead of `["Feature", trait]`; the fix's label stays `Add Skills, Elven Lineage`, the cursor goes inside the brackets (D270). The `Feature` key offers no lineage traits, and a 0.9 `Feature: Elven Lineage [` offers nothing (W006 moves it). A Species line whose species owes its lineage shows the ghost text `[lineage]` at the cursor (D174); the `Species` key text names the brackets. Species presets look up a 2014 subrace's own row (`Elf|PHB [High]` → `Elf (High)`, one language) before the base's.
  *Rejected:* a ghost chip (`0/1`) on the Species line (chips count list picks, D130).
  *Enforced by:* `site/test/fixes.test.ts` ("D211 (T11), D291"), `site/test/complete.test.ts` ("D242", "D243"). 🔍 /ui-review done (2026-11-20); amended by D296.

- **D293 — The site writes `Wood Elf` as `Elf [Wood]` from its names table: a fix on the Species line and a Tidy change. DECIDED (2026-11-20), worker's call; does D287's site part. AMENDED by D295 (Tidy only, no line fix).** (T7.2 site) The site runs no checker and has no slot table, so `TidyOptions.species` with `speciesLineage` has nothing to call; `lineageSplit` reads the names table instead (the species list, then the lineage options short or long). The fix says `Change to Elf [Wood]`; Tidy lists it as `Species: Change to Elf [Wood]`; a source and an ability stay (`High Elf [INT]` → `Elf [High; INT]`). A 0.9 `Feature` lineage line tidies through the parser's W006 into the long name it was written with (`[Wood Elf; WIS]`), which the checker reads (D289).
  *Rejected:* bundling the SRD slot table into the client for `speciesLineage` (size, and the names table already holds the lineages).
  *Enforced by:* `site/test/fixes.test.ts` ("D287, D291").

- **D294 — `/guide` and the example build in the 0.10 form. DECIDED (2026-11-20), worker's call (copy, /humanize).** (T7.2 site) The example's species is `Species: Tiefling|XPHB [Infernal; CHA]` (no Feature line); the blocks section says a lineage goes in brackets on the Species line, its ability after a semicolon, a 2014 subrace the same way (`Elf|PHB [Wood]`), and that a feat's ability comes first. "open a new paste" → "open New build" (D232). The parentheses example is `Arrows (20)`, and `Human|ERLW [Mark of Making]` shows a lineage is not part of the name. `RENDER_VERSION` 8.
  *Enforced by:* `site/test/guide.test.ts` ("example"), `site/test/cache.test.ts` (LOCK). 🔍 /ui-review done (2026-11-20).

## T7.2 site /ui-review (2026-11-20) — mechanism: /ui-review round 1, AskUserQuestion; ids D295–

- **D295 — `Wood Elf` → `Elf [Wood]` is Tidy's alone: no mark on the Species line; Tidy turns on for it. DECIDED (2026-11-20); amends D293.** Raw note (item lin-wood, Change): "Leave it only to Tidy, don't underline Species to fix Wood elf". The name is valid, so the line shows no fix; Tidy still lists `Species: Change to Elf [Wood]`. Found while preparing the review: Tidy stayed off when a names-table change was its only one (the status plans without names); the form now plans with names after the typing pause and turns Tidy on (`tidyByName`).
  *Rejected:* the one-click fix on the line (built in D293; he reads a mark on a valid name as an error).
  *Enforced by:* `site/test/fixes.test.ts` ("D287, D291": the Tidy label); the form wiring has no DOM test.

- **D296 — A 2014 species with subraces opens `[]` on a pick and shows the ghost `[subrace]`, as a 2024 lineage does. DECIDED (2026-11-20); amends D292 ("a 2014 species opens none (its subrace is not owed)").** Raw note (general, round 1): "Adding Dwarf from 2014 didn't add the brackets. I fear that some of these QoL solutions weren't applied everywhere." Picked "Yes, open [] for 2014 too" in AskUserQuestion. Every `LINEAGES` row makes its species a `DETAILS` name in its books: `Dwarf|PHB` → `Dwarf []` with Hill, Mountain; the 2014 Human's Variant too. The format is unchanged: the brackets can be deleted, the checker still reads a bare 2014 species.
  *Rejected:* 2024 only (D292 as built: consistent with "owed", but he expects the same help in both editions).
  *Enforced by:* `site/test/names.test.ts` ("D242"), `site/test/complete.test.ts` ("D242", "D174").

- **D297 — Tab on a Species line's ghost text writes the brackets and opens their list. DECIDED (2026-11-20).** Raw note (round 3, lin-2014-ghost): "Clicking tab resolve the ghost suggestion, create the brackets and open the dropdown"; picked "Build it now" in AskUserQuestion. With the cursor after `Species: Dwarf` and the ghost `[subrace]` showing, Tab writes `Dwarf []`, the cursor inside, the list open; only when the list has no row to take. The counted lines' ghost words (D174) are unchanged. Found in round 2: the standalone ghost word showed a row low (an empty zero-width box sat on its bottom edge); a zero-width space keeps it on its line (`ghostWordHtml`).
  *Enforced by:* `site/test/ghost.test.ts` ("D178"); the Tab key has no DOM test (checked in the pane).

- **D298 — The `Feature` key offers the lineage traits again, written the 0.9 way; the line still reads with W006. DECIDED (2026-11-20); amends D292 ("The `Feature` key offers no lineage traits").** Raw note (round 3, Also changed): "feature in species should still offer lineage traits, still accepted formatting". Asked in AskUserQuestion with the W006 conflict; picked "Offer them, still warn" over rewriting the pick onto the Species line (recommended) and keeping D292. `Feature: Elven Lineage [` lists the abilities first, then the lineages (`[WIS; Drow]`); a trait with no ability lists the lineages (`Draconic Ancestry [Red]`); the block's own species' trait leads the Feature list. Tidy still moves the line (W006, D283).
  *Rejected:* the pick rewriting itself onto the Species line (nothing flagged, but he wants the accepted form offered as written); D292 as built.
  *Enforced by:* `site/test/complete.test.ts` ("D156", "D242", "D243"), `site/test/names.test.ts` ("D242").

⚑ Follow-ups from round 1 (Francesco, 2026-11-20), not built: ① ability lists could mark the casting stat the build already uses (a warlock's CHA when picking a lineage's or a feat's ability); ② Tidy's list could separate "cleans up formatting" from "replaces your valid form with the canonical one" (round 4: the W006 move shows as the generic reorder too); ③ typing a key (`Species:`) could add the space and open its list; ④ a fully typed name (`Tiefling`) shows "No matches · Add sources" (also in 0.9).

## M8 — r/3d6 feedback round 1 and scores, SPEC 0.11 (2026-11-21) · moved from DECISIONS.md 2026-11-21 · Landed: d9f0a89 (D302–D319, deployed), 0828dfb (D320–D333, released 0.11.0)

- **D302 — First r/3d6 feedback (NLwino) triaged into M8. DECIDED (2026-11-21).** One bug (T8.1, dropdowns only on
  menu-inserted lines, fixed first in its own session), three builds (T8.2 level-up button, T8.3 score labels in the editor,
  T8.4 point buy / standard array in the wizard), one evaluation (T8.5 strict toggle + totals, write-up before any build).
  *Raw note:* "Let's only evaluate strict toggle for now and see what it would do for us" · bug fix in a new session.
  *Rejected:* character sheet generation (not a character sheet, CLAUDE.md "What it is / is not"; character-forge's job);
  building the strict toggle straight away (open-format stance first).
  *Enforced by:* PLAN M8.

- **D303 — Name lists open wherever a name goes, however the line got there; they close on a name written in full.
  DECIDED (2026-11-21).** Amends D154 (only typing opens) and D229 (a click opens only an empty `[ ]`). T8.1: the
  wizard, Tidy and a paste write an empty key as `Spells:` (no space), where neither typing nor a click found a spot,
  so only menu lines (`Spells: `) had a list. Now the list opens: as soon as a key's `:` is typed; on a click at an empty
  key, after a list's `, `, or in an empty `[ ]`; on a bare level header (`L2`, `L2 `), with the `Classes:` classes
  first. A name typed glued to the `:` (`Spells:fi`) is still that key's; the pick writes the space. Arrow keys still
  don't open it (the list would take ArrowDown). A name already written in full (`Spells: Shield`) closes the list
  instead of showing D256's "No matches" line. AMENDED by D304: that holds while typing; a click on it lists its
  alternatives. Review note (2026-11-21): a name that a longer one starts with (`Shield`, Shield of Faith) keeps the
  list open, the written name first ("Shield shouldn't close because for example there's Shield of Faith").
  *Raw note:* "we should also be more 'generous' with the spawn of the dropdowns, ex. making them spawn also after : of a
  header and not only after the space".
  *Rejected:* opening on every caret arrival (arrows through a wizard's empty lines would open a list on each and trap
  ArrowDown); inserting the missing space on click (changes the text and the undo history on a mere click).
  *Enforced by:* `site/test/complete.test.ts` (D302, D303 tests).

- **D304 — A click on a written name lists its alternatives; a pick swaps the whole name. DECIDED (2026-11-21).**
  A click in, at the start or at the end of a name already written (`Wizard`, `Shield`, `Elf`, `Drow` in `[ ]`, the
  `2024` of `Rules:`) opens the regular list, titled "Swap for", with what goes there instead: the empty spot's list
  minus the name itself and the line's other names. A pick replaces the whole name and keeps its `|SOURCE` and `[ ]`.
  The swap list is mouse or tap only: any key closes it and does what it always does, so a click never takes over the
  arrows, Enter or Tab (a code editor never opens completion on a click). Enum keys (`Rules`) now list their values,
  so typing `Rules: 2` offers both editions too (reverses the D164 test's "never an enum"). Swapping a class leaves
  `Classes:` and the level headers as they are; the checker flags a mismatch. The swap list holds every alternative
  and scrolls (up to 60), not 8 rows: at 8, a class swapped away (Wizard sorts last) could not be swapped back.
  *Raw note:* "clicking on a fully typed option should show the alternatives (ex. clicking on 2024 should show 2014,
  clicking on Wizard should show the other classes, in our regular dropdown) so that you can easily change your choice."
  *Rejected:* closing the list on a written name only (D303's first form; no way to change a pick but retyping);
  arrow keys browsing the swap list (they'd stop moving the caret after every click).
  *Enforced by:* `site/test/complete.test.ts` (D304 test). Follow-up note: "The swap seems to lose wizard if done with a
  class and then try to come back".

- **D305 — T8.2 level-up: a lens line after the last block, plus a Tab route; the new block holds its owed keys.
  DECIDED (2026-11-21), built (round 2: A kept, B deleted; look and cap in D309). AMENDED by D316: the next level is
  the one after the last header, not the Classes: total + 1.** Placement: at the end of the editor, modelled on code editors (CodeLens).
  Variant A, his pick: a faint sans line after the last block, one action per class (`+ L6 Wizard | Fighter 2 |
  Another class…`); typing `L6` on a new last line and taking a class from the list (D303 puts the build's classes
  first) does the same. Variant B, built next to A for /ui-review: one `+ Level 6` lens that writes `L6 ` and opens
  the class list. The block: `L<n> <Class>` plus the empty keys that level owes, from the same rule as the wizard
  (`owedKeys` in `site/src/preset.ts`), and `Classes:` goes up by one (a new class joins as `/ <Class> 1`).
  *Raw note:* "I lean towards end of the editor, but we need to design it accurately. I like the idea of having more
  affordances inside the builder to make the building process flow more naturally, taking inspiration perhaps from coding
  environments" · "Lens + Tab, but try also an alternative to compare in review".
  *Rejected:* a toolbar split button and a row in the Keys column (away from where the block lands); a Copilot-style
  ghost line only (hard to find with a mouse or on a phone); a header-only block (the owed keys show what to pick).
  *Enforced by:* `site/test/levelup.test.ts`; `site/src/levelup.ts` (pure), form.ts lens + acTake Tab route.

- **D306 — Every dropdown holds up to 60 rows and scrolls; past 60, a last row counts the rest. DECIDED (2026-11-21).**
  Name lists, key lists and the swap list share one limit, `LIST_LIMIT` (60); the desktop box still shows 8 rows and
  scrolls, the phone's chip row scrolls sideways. A list with more ends on a quiet row, `214 more · keep typing`, not
  an option (arrows and Tab skip it). Short lists (classes, species, lineages, editions, keys) always show in full, so
  an empty `Classes: ` lists Wizard. Amends D304's swap-only 60.
  *Raw note:* "let's rethink the dropdown caps" · (AskUserQuestion) row limits, not pick caps; "60 rows everywhere".
  *Rejected:* by list size (closed lists in full, big lists at 8: two behaviours to learn); keep 8 and add the count
  (an empty `Classes: ` still hides Wizard).
  *Enforced by:* `site/test/complete.test.ts` (D306 test).

- **D307 — A pick at the end of a counted line that still owes picks writes `, ` and opens the next list.
  DECIDED (2026-11-21).** Outside `[ ]` (where D163's `afterPick` already does it), on a line whose ghost count is short
  (`Cantrips: Fire Bolt` 1/3), taking a name from the list adds `, ` and reopens the list for the next pick, until the
  count is met. Not on a swap (D304), not where text follows the name on the line, not on a line with no count.
  *Raw note:* "When a list requires more choices, an auto fill from a dropdown could also add comma and space, ready
  for the next pick loading the dropdown" (/ui-review round 1, general note).
  *Rejected:* on every list line (a `Spells:` line with no count would trail a comma after its last pick).
  *Enforced by:* prose only (form.ts acTake); /ui-review round 2.

- **D308 — The fix that adds a level's or species' owed lines is an action at the line's end, not an underline.
  DECIDED (2026-11-21).** Amends D190/D196's look for the two add fixes (`level-lines`, `species-lines`): no dashed
  underline and no popover; a faint sans `+ Add Subclass, Spells` after the line's text, in the level-up lens's look
  (D305), and one click writes the lines. Where the label doesn't fit, `+ Add 3 lines`. The other fixes (move, change)
  keep the underline and popover: they correct something, these add.
  *Raw note:* "Considering we are adding ex. the level button, I think I want to change the way we suggest adding fields
  after ex. the level header, making it more look like an action rather than a typo as it is now" · (AskUserQuestion)
  "End-of-line action".
  *Rejected:* a `+` button in the gutter (easy to miss, hides the line number); a solid link underline with a `+`
  (still a popover, still on the name).
  *Enforced by:* `site/test/fixes.test.ts` (markFixes `wa`).

- **D309 — Suggestions are faint chips that sit behind the text; the lens offers the last two classes. DECIDED
  (2026-11-21).** The level-up lens (D305) and the add actions (D308) share one look: 11px sans in `--mute` on a faint
  `--chip` fill, no border, never an accent colour. A chip says it short (`Feat (Fighting Style)` → `Fighting Style`;
  `Add N lines` where it doesn't fit). The lens lists the last two classes of `Classes:` and "Another class…".
  *Raw note:* "the suggestion style is too similar to the actual text, in particular the header even if different
  font. We need a dedicated clear style" · "Test variants directly in review. In general, no strong accents, they need to
  take a backseat compared to the actual text" · (round 2) faint chips, "In faint chips, try to always be concise" ·
  "Cap to the last two classes, not all used".
  *Rejected:* dashed outline pills (A) and small caps on a band (C), both built in round 2; lens variant B (one
  `+ Level N`); every class of the build in the lens.
  *Enforced by:* prose only (site.css `.ed .lens .lb`, `.ed .wla`).

- **D310 — After a write or a completed pick, the caret goes to the next open choice, its list open. DECIDED
  (2026-11-21).** After any action that writes lines (an `+ Add …` chip, the level-up lens, the Tab route, Start a build)
  and after a pick that completes a line (its count met, or a one-pick key such as `Subclass`), the caret moves to the
  next empty key in that block, then in the blocks below, and opens its list. An empty `[ ]` counts as an empty key.
  *Raw note:* "The cursor should consistently move to the next open choice" (/ui-review round 2, add-action) ·
  (AskUserQuestion) "Writes and completed picks".
  *Rejected:* only after writes (a pick that completes a line would leave the caret where it is).
  Round-3 fix: an add chip's click also ran the form's jump-to-line click (the chip carries `data-line`), which put the
  caret back on the chip's line; the chip's click no longer bubbles.
  *Enforced by:* `site/test/fixes.test.ts`, `site/test/levelup.test.ts` (`nextOpen`); /ui-review round 3 (approved).

- **D311 — A build with no Species or Background block gets `+ Add Species, Background` on `Classes:`. DECIDED
  (2026-11-21).** A faint chip in the D309 look at the end of the `Classes:` line; one click writes the empty blocks the
  way Start a build lays them out (2024: the background's `Scores`, `Skills`, `Tools`, `Gear`), caret on the first (D310).
  *Raw note:* "Are the starting headers ever suggested (ex. background, species, classes etc.)?" (round 2) ·
  (AskUserQuestion) "Chip on Classes:".
  *Rejected:* no chip (Start a build and the key list already offer them, but a build typed by hand never sees them).
  *Enforced by:* `site/test/fixes.test.ts` (D311 test).

- **D312 — T8.4: ability scores are a section under the classes in Start a build. ~~DECIDED (2026-11-21)~~ SUPERSEDED → D318
  (round 3: built, then taken off the branch unreleased).** Below the class
  rows: a method switch (Skip, Point buy, Standard array, Custom), then six cells STR…CHA whose control follows the
  method. Standard array: a native select per ability holding the six numbers; one taken elsewhere swaps. Skip (the
  default) leaves `Scores:` empty, as before. It writes the base `Scores:` only; bonuses stay on their own lines.
  The point-buy control is built in two variants for /ui-review.
  *Raw note:* "Section under classes, we need to figure out how to support the inputing of one or the other types" ·
  (array) "Select per ability".
  *Rejected:* a folded section; a second step; dragging numbers onto abilities (keyboard and phone).
  *Enforced by:* nothing (removed, D318).

- **D313 — A level writes a feature with a pick by name, its brackets open. DECIDED (2026-11-21), approved in /ui-review round 3.**
  The class tables carry the names of the features with a pick, by class level (`features` in presets.ts, from the SRD
  slot table: 2024 Cleric Divine Order 1, Blessed Strikes 7; Druid Primal Order 1, Elemental Fury 7). Start a build,
  the level-up and the add chip write `Feature: Divine Order []` (as a species feature comes, D242), and the chip names
  it (`Add Cantrips, Divine Order, Prepared`). An empty `[]` on its own no longer turns Tidy on: it is an open choice,
  like an empty key (round 3: nor does it count in Tidy's badge, `tidyPlan`). Names only, never a feature's text (content boundary).
  *Raw note:* "When auto filling a series of options from a level (ex. cleric 1), it shouldn't only write Feature: it
  should also auto add Divine Order (which is the mandatory feature you get) and leave only the true choice open."
  *Rejected:* a bare `Feature:` line (the round-2 form: the name was the user's to look up).
  *Enforced by:* `site/test/preset.test.ts` (content boundary), `site/test/levelup.test.ts`, `site/test/fixes.test.ts` (D313).

- **D314 — `Classes:` and the level headers hold the levels twice; how they stay in step. DECIDED (2026-11-21), /ui-review
  round 3: the Match chip (B) kept; the lens as before (A) but blocks first (D316); the remove chip, the note and the level
  list rejected.** Options built as round-3 variants: Finding: in his note's build (`Classes: Wizard 6 / Fighter 2`, blocks
  L1, L3, L6) the format reads L7 Fighter and L8 Wizard as levels with no block, so the lens's "Fighter 3" is right and
  the checker sees nothing wrong; Ctrl+Z already undoes a lens add. Built: lens `− L8` chip (`levelDown`), a note naming
  the blockless levels (`blockless`), a `Match the levels` chip on Classes: that only raises (`matchLevels`), a level list
  on a Classes: number (`levelNumberAt`). None edits the text without a click.
  *Raw note:* "It could update automatically, but it could risk editing a choice from the user. Let's delve deeper into
  the issue and solutions." · "Show these options directly in review."
  *Raw note (round 3):* lens "As now, no need to go back. However, my issue was with the fact that the example build has
  not printed L7 or L8, making it unclear what those levels are and what they add" · Classes: "B · Match chip".
  *Rejected:* removing a block's header by hand lowers Classes: (automatic; retyping a header trips it); the `− L8` chip
  (B: no need to go back, Cmd+Z does); the blockless note (C, D: reads as a warning on any sparse build, a Start-a-build
  Barbarian 7 showed L5–L7); the level list on a Classes: number (C).
  *Enforced by:* `site/test/levelup.test.ts` (D314 Match test); form.ts drawRows (`alert`, D319).
  Two chips on Classes: (his round-3 question): settled by D319, both show, the mismatch as an alert chip.

- **D315 — T8.3 score labels: STR…CHA for the header's six `Scores:` numbers, display only. ~~OPEN (2026-11-21)~~
  SUPERSEDED → D318 (all three looks rejected in round 3). Three looks built as /ui-review round-3 variants** (labels over the numbers while the caret or mouse is on the line; a chip after
  the line; a tip per number with its modifier). The format doesn't change.
  *Raw note:* (AskUserQuestion) "Show various options in review".
  *Rejected:* A over the numbers (crowded: STR runs into DEX over a one-digit score), B a chip after the line, C a tip
  per number; replaced by D318's direction.

- **D316 — The level-up lens goes by the blocks: it offers the level after the last header. DECIDED (2026-11-21),
  /ui-review round 3.** Amends D305 (the next level was the `Classes:` total + 1). The lens and the Tab route add `L<n>`
  for n = the last level header + 1 (L1 with none). Inside the `Classes:` total that is a level Classes: already counts,
  so the lens offers the classes its levels without a block read as (his build, Wizard 6 / Fighter 2 with blocks at L1,
  L3, L6: `+ L7 Fighter 2 | Wizard 6 | Another class…`) and a pick leaves `Classes:` as it is; "Another class…" there
  adds the class to `Classes:` as `/ <Class> 1`. Once the blocks reach the total, it offers total + 1 and `Classes:`
  goes up, as before. Each level gets its block, so what it adds shows.
  *Raw note:* "I think the bottom lens should offer the next level based on those present in the builder, not those
  forecasted in the classes section. If the level coincide, then also classes gets updated." · (AskUserQuestion) "Also
  allow another class".
  *Rejected:* only the classes Classes: already reads there, no "Another class…" inside the total (offered; he kept it);
  the D314 round-3 variants (D314).
  *Enforced by:* `site/test/levelup.test.ts` (D316 tests: `lensOffer`, `levelUp`).

- **D317 — An add chip writes each line at its canonical place in the block. DECIDED (2026-11-21), /ui-review round 3.**
  The `+ Add …` chips (D308, D311, D313) and the move fixes put each line where Tidy would (KEYS order, SPEC §5.5),
  before the block's first key that sorts after it, not after the block's last line. Tidy has nothing to reorder after
  a click (it lit up with 1 change after a Cleric's `+ Add Cantrips, Divine Order, Prepared`).
  *Raw note:* (AskUserQuestion) "Yes, canonical place".
  *Rejected:* lines at the block's end (D215's way: every add left Tidy one change).
  *Enforced by:* `site/test/fixes.test.ts` (D317 test; T01's move now lands Subclass before Spells).

- **D318 — T8.3 and T8.4 reopened: ability scores move into the editor. DECIDED (2026-11-21), /ui-review round 3;
  designed in D320–D326 (jam 2026-11-21-scores); build owed (PLAN T8.3, T8.4).** Supersedes D312 and D315; the round-3 builds came off the branch unreleased.
  Direction: the named form becomes Tidy's canonical `Scores:` (`STR 8, DEX 14, …`, a SPEC and emit change); a click
  on an ability score opens a popover with the final score (base plus bonuses) and, where there are any, the options
  (swap with another standard-array number); Start a build keeps only a method choice (point buy, standard array, …),
  also changeable in the editor; the editor shows a chip saying whether the scores are a standard array, point-buy
  legal or neither, maybe also on the shared and printed pages.
  *Raw note:* (labels) "I think we need to make the extended version the standard notation for tidy (STR 8/DEX 14 etc.).
  On click on an ability score, the popover should show the computed final score and if available the various options
  (ex. switch with a different standard array score)." · (point buy) "I don't like the idea of having the ability scores
  selector in the start a build. I think we need to design it so that it can be operated inside the builder via our
  current lens and dropdown system. In start a build we could have only the ability choice type selector (which should
  be changeable also in the editor). In the editor, regardless of your choice, we could show as chip if the current
  scores array is standard array, point buy legal or neither. We could consider showing this mark in the shared and
  printed versions as well." · (AskUserQuestion) "Ship T8.2, reopen 8.3/8.4".
  *Rejected:* D312's scores section in Start a build (steppers A, selects B); D315's three label looks.

- **D319 — A Classes: mismatch is an alert chip; its panel holds `Match the levels`. DECIDED (2026-11-21), /ui-review
  rounds 4–6.** Amends D314's Match chip (an add chip in the D309 look). When the headers prove `Classes:` too low, an
  icon-only alert chip (the alert icon on the count chip's fill, `--err`) sits at the end of `Classes:`, before
  `+ Add Species, Background` when that is owed too (both show; the add chip shortens to `Add N lines` where it doesn't
  fit). A click opens the fix panel: `Classes: counts fewer levels than the headers.` on two lines, then `Match the
  levels` as the panel's row action, the way the other fix panels act. The lens offers the class its level reads as
  first, then the build's other recent class (round 4: "the example slide 2 should also feature fighter in the lens");
  a class taken past its `Classes:` count raises it, as "Another class…" adds one (round 5: "Approve, raise Classes:").
  *Raw note:* "instead of match the levels as lens, it could be an alert chip, moving the match the levels cta inside the
  alert panel on click" · "Show both, one becomes an alert chip" · (round 5) "Shorter chip, only icon. Also shorter,
  dried copy inside the panel, with clearer button like elsewhere" · (round 6) "Approve, but wrap in two lines the
  panel. Not sure that match the levels button style is the one we use in panels".
  *Rejected:* Match as an add chip (D314 B's first look); one chip per line with Match first (round 4); a labelled alert
  chip (`Levels don't match`, cut short on a phone); the primary button in the panel (round 6: panels use row actions);
  leaving `Classes:` alone when the lens takes a class past its count (the alert would then fire after every such pick).
  *Enforced by:* `site/test/levelup.test.ts` (D316 round-4 case); form.ts `alertButton`, site.css `.ed .wlx`, `.wlpop .wlw`.

- **D320 — Tidy writes the base `Scores` line named, slash-separated, full or partial; the bare six numbers still read,
  with no warning. DECIDED (2026-11-21), jam 2026-11-21-scores round 1.1.** Amends SPEC §5.5 rule 2 (six known →
  `8/13/14/12/10/15`; fewer → named with `,`). Canonical now: `Scores: STR 8/DEX 14/CON 13/INT 12/WIS 10/CHA 15`, and a
  partial base `Scores: DEX 16/CHA 17`, in `STR…CHA` order. Reading is unchanged (§5.2: six numbers, or named with `,` or
  `/`), so every saved paste means the same; Tidy rewrites the old forms and its badge counts the change, with no
  diagnostic. The increase line keeps its commas (`+2 WIS, +1 DEX`). Kind (FORMAT-UPDATES §1): a canonical-form change,
  new row there: minor (SPEC 0.11, library 0.11.0), old pastes mean the same, no alias (nothing renamed, D142/D143 do not
  apply). The shared page renders the canonical form (`render.ts` scores case), so it shows the named form too; the site
  bumps `RENDER_VERSION`. Consumers: reading is free; a writer's emit snapshot tests see the new line (Migrating list).
  *Raw note:* (D318) "make the extended version the standard notation for tidy (STR 8/DEX 14 etc.)" · (board) picked
  B, slash · (AskUserQuestion) "Reads, no warning".
  *Rejected:* comma, `STR 8, DEX 14` (A, my pick: one rule with the partial form already canonical; he kept his slash);
  a W-code on the bare form (it would flag every older paste).
  *Enforced by:* `test/spec11.test.ts` D320 (emit, Tidy, `fixtures/v0.10/` converting); SPEC 0.11 §5.2, §5.5, §13.

- **D321 — A click on a score opens the regular list: the final in its title, the method chip in its corner, the
  options as rows. DECIDED (2026-11-21), round 2.1 A with his pins.** A click on a base score (its ability or its
  number) on the `Scores` line opens the D304 list, mouse or tap only, any key closes it. Title: `WIS 15 → 19 (+4)`, an
  arrow icon, not the word "final"; at the title's right, the method chip (D324, with its chevron). Rows by method:
  standard array, the other five numbers, each `14 ⇄ DEX` (a swap icon before the ability, no "swap with" text), a pick
  swaps both; point buy, the numbers 8–15 with their cost only (`15 · 9 pts`; points left are in the chip, not repeated);
  custom, no rows. Foot: where the final comes from, one line (`15 base, +2 Background, +2 L4 feat`). With no rows, one
  divider only, and no "not a standard array" sentence. On a phone, the dock's chip row, as every list. The final comes
  from the library's `finalScores()` (overseer, T8.5: no strict toggle, D330): a hint, never a check (D66).
  *Raw note:* (D318) "the popover should show the computed final score and if available the various options (ex. switch
  with a different standard array score)" · (pins) "Instead of swap for, write Std. Array" · "Instead of final, use an
  arrow icon" · "Instead of repeating swap, use an icon before ex. DEX" · "write 2 points left in a number only notation
  ex. 2/27" · "Don't mention points left, already in header" · "Don't repeat divider twice, avoid the std array comment."
  *Rejected:* a panel with the final big and row actions (B); a sheet of all six with − and + (C, close to D312).
  *Enforced by:* `site/test/scores.test.ts`, T8.4 /ui-review 6 rounds (0828dfb).

- **D322 — Start a build picks the method from a dropdown that remembers the last choice. DECIDED (2026-11-21),
  round 3.1 pin.** One row, `Ability scores`, a select: Standard array, Point buy, Custom, Skip; it starts on the last
  choice made on this browser (first time: Skip, which leaves `Scores:` empty as before). No score cells (D312 stays
  rejected). Start writes `Scores:` and the caret waits there (D310) with the method's list open; the fill goes one
  ability at a time, a pick writes `STR 15/DEX ` and reopens the list (D307, in the slash form of D320).
  *Raw note:* "In the start a build, instead of a toggle it should be an option with dropdown which remembers last
  choice".
  *Rejected:* a segmented switch (every option on the board).
  *Enforced by:* `site/test/scores.test.ts`, T8.4 /ui-review 6 rounds (0828dfb).

- **D323 — The method is not written by default; the paste may state it in brackets, `Scores (point buy): …`.
  DECIDED (2026-11-21), round 3.1 (no pick; his notes, then AskUserQuestion). AMENDED by D332: a pick rewrites a
  marker already written; the clash look is D333.** The chip's chevron (D324) and the
  popover's corner chip (D321) set the method for this draft: it steers the lists and the popover and writes nothing.
  The format accepts an optional marker on a base `Scores` line, `(standard array)`, `(point buy)` or `(custom)`; a
  typed marker is read and kept by Tidy (in lower case, like a level cap, SPEC §5.5 rule 6), and when present it wins over the
  draft's pick. Kind: an addition, minor, in the same SPEC 0.11 as D320. A marker the numbers break gets no
  parse diagnostic (no checker, D66); how the chip shows the clash is a /ui-review call in T8.4.
  *Raw note:* "In the builder, it's accepted between () after scores, but by default a chip appears after scores with a
  chevron that lets you select the type. The same choice could be in a small chip in the top right corner inside the
  panel of the scores" · (AskUserQuestion) "Nothing written".
  *Rejected:* derived only, no marker (A, my pick); the chevron writing the marker (a longer line, a second place to
  disagree with the numbers); a site-only setting (C: a share drops it).
  *Enforced by:* `test/spec11.test.ts` D323 (parse, emit, Tidy, E002/E005/E012); SPEC 0.11 §5.2; `site/test/scores.test.ts`, T8.4 /ui-review 6 rounds (0828dfb).

- **D324 — The method chip: dry words at the `Scores` line's end, with a chevron. DECIDED (2026-11-21), round 4.1 A
  with his pin.** A faint chip in the D309 look after the line: `Std. Array`, `Point Buy 2/27` (points left of 27),
  `Custom`. It reads the numbers (a standard array costs 27 points, so it is point-buy legal too: the chip says the
  narrower kind); with a marker (D323), the marker's method. The chevron opens the method list (D323). Not an alert:
  custom scores are fine (D319's alert chip is for problems).
  *Raw note:* (D318) "we could show as chip if the current scores array is standard array, point buy legal or neither" ·
  (pin) "Keep it dry and condensed: Std. Array, Point Buy 2/27, Custom".
  *Rejected:* a count chip in the ghost lane (B); the chip only while the caret is on the line (C, close to D315 A).
  *Enforced by:* `site/test/scores.test.ts`, T8.4 /ui-review 6 rounds (0828dfb).

- **D325 — The shared page and the printed page carry the same mark. DECIDED (2026-11-21), round 4.1.** The chip's
  dry words, as plain small text after the `Scores` row on the view and in print, read from the numbers (or the marker),
  a hint, never a check (D66).
  *Raw note:* (D318) "We could consider showing this mark in the shared and printed versions as well." ·
  (AskUserQuestion) "Shared page and print".
  *Rejected:* shared page only; editor only.
  *Enforced by:* `site/test/scores.test.ts`, T8.4 /ui-review 6 rounds (0828dfb).

- **D326 — The library owns the score kind: a data-free `scoreKind` beside `finalScores`. DECIDED (2026-11-21), jam
  close-out (build split).** Standard array and point buy are checked nowhere today (overseer, T8.5 survey). The
  library gets a pure function from the six base values to `{ kind: "standard-array" | "point-buy" | "custom", left }`
  (the array, the 8–15 costs and the 27-point budget as numbers only: SRD numbers, no rules text, content boundary);
  the site's chip, popover rows and view mark all call it. `finalScores()` (src/check.ts) feeds the popover's final.
  *Raw note:* none (follows D321, D324, D325 and the overseer's note: "Point buy and standard array are checked nowhere:
  that's new, about 15 constants").
  *Rejected:* the constants in the site only (the view and other apps would each need their own copy).
  *Enforced by:* `test/spec11.test.ts` D326 (and the UMD load test); SPEC 0.11 §6.

## T8.5 strict toggle evaluation (2026-11-21) — mechanism: digest survey of `src/check.ts` and `site/` + write-up, then AskUserQuestion, 1 round, overseer

- **D330 — T8.5: no strict rules toggle; final totals and score legality come through T8.3 and T8.4. DECIDED (2026-11-21).**
  The T8.3 popover shows the library's `finalScores()` as a hint; T8.4's chip says standard array, point-buy legal or neither.
  Running `check` on the site stays D66 step 1, unscheduled. Write-up: `.claude/drafts/t8-5-strict-eval.md`.
  *Raw note:* picked "No toggle; totals via T8.3/T8.4 (Recommended)".
  *Rejected:* a toggle after T8.3/T8.4 (S library + M+M site; noisy on non-SRD builds; a second mode, and "strict" reads as
  the site judging builds, against SPEC §6, D34, D132, D199); always-on checker hints (same site cost, a D66 step-1 call for later).
  *Enforced by:* PLAN T8.5 ticked; prose only.

## T8.4 scores in the site (2026-11-21) — mechanism: build constraint found by the T8.4 worker, no user call

- **D331 — The popover's final is the site's mirror of `finalScores()`, fed by the names table. DECIDED (2026-11-21).**
  D321 and D326 have the popover's final come from the library's `finalScores()`, but `src/check.ts` may not ship in a
  site bundle (the IP gate, `site/scripts/check-bundle.mjs`, D9, D45), and it needs a slot table the browser doesn't
  carry. `site/src/scores.ts` `finalOf` repeats its arithmetic (species fixed increases, increase lines, ASI and
  half-feat picks, played levels only, the 20 and Epic Boon 30 caps) from the names table: `FEATS` (category, ability
  bits) and a new `SPECIES_FIXED` (a 2014 printing's fixed increases, numbers only; `namerows.ts`, your own sources too).
  A test bundles `src/check.ts` with esbuild and holds the two equal on every fixture plus four 2014/2024 builds.
  *Raw note:* none (build constraint).
  *Rejected:* shipping `src/check.ts` to the client (the IP gate); no final in the popover (D321's title is the final).
  *Enforced by:* `site/test/scores.test.ts` (D331 parity); `check:bundle`.

- **D332 — A method picked in the chip's list rewrites a marker already written. DECIDED (2026-11-21), T8.4 /ui-review r1.**
  Amends D323: with `Scores (point buy):` on the line, the method list offers all three methods, and a pick changes the
  words in the parentheses. With no marker, a pick still writes nothing. The list's "The line says (…)" note and the
  dimmed rows are gone.
  *Raw note:* "Remove the note altogether. If the user changes the method after writing the method in parenthesis, the
  method updates in parenthesis as well".
  *Rejected:* the marker locking the list (the r1 build).
  *Enforced by:* /ui-review r2; prose only (form.ts `takeScore`).

- **D333 — Numbers that break the method keep its words and count; the alert icon takes the chevron's place. DECIDED
  (2026-11-21), T8.4 /ui-review r1, variant A.** The open item of D323. A marker, a pick, or a kind the numbers read as
  before in this draft (standard array or point buy) stays on the chip when the numbers break it: `Std. Array`, or
  `Point Buy −3/27` counting below zero past the budget, with the alert icon in the chevron's place (same click, the
  method list). The chip turns to `Custom` only for numbers that never read as one of the two. The shared page keeps
  the marker's words with a dotted underline (D325).
  *Raw note:* "Go with alert, align this state with the note mentioned earlier. Alert shouldn't replace the count but
  highlight how it becomes negative. If not enough space, we can consider either writing Pt. Buy or replace the chevron
  with the alert icon (still same behavior)" · (general) "Maybe instead of immediately reverting to custom if point buy
  or std. array break, we should instead have an alert state of both when the numbers are off".
  *Rejected:* B, the marker struck with the numbers' own kind; `Pt. Buy` (the chevron swap left room).
  *Enforced by:* `site/test/scores.test.ts` (the count below zero); /ui-review r2.

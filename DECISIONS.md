# DECISIONS — dndpaste

> Append-only. Tags: **DECIDED (date)** / **OPEN** / **SUPERSEDED → D-id**.
> All entries below: 2026-09-04 · mechanism: AskUserQuestion, 8 rounds (scoping interview).

- **D1 — Apps first, humans second. DECIDED (2026-09-04).** Strict grammar, one canonical form, Pokepaste-dry.
  *Raw note:* "Follow the style of Pokepaste: a human can read it, but it's extremely dry and efficient."
  *Rejected:* humans-first tolerant parsing (typos degrade instead of failing, more parser to build); Claude-only prompt convention (a doc, not a system).

- **D2 — Spec before integrations. DECIDED (2026-09-04).** No tool is edited in the first milestone. Later producers/consumers, in this order of intent: my-spellbook export (closes its L5.5 / A-03), character-forge interview seeding, my-spellbook import. monster-forge is out (PCs are not its domain).
  *Raw note:* "no need to edit the tools right away".

- **D3 — Home is a new public repo `~/Documents/GitHub/dndpaste`. DECIDED (2026-09-04).** Own CLAUDE.md, own conventions; consumers copy a built file or install a package. *Rejected:* inside my-spellbook or character-forge (each would make the other depend on a repo whose conventions it must not adopt).

- **D4 — One paste = one build, described as a timeline by level blocks, with flat and mixed forms equally valid. DECIDED (2026-09-04).** **AMENDED → D22/D32 (a `@n` stamp exists, on details only).** A `Key: value` line under a level header is placed at that level. A line before any header, or in a paste with no headers, is **unplaced**: kept by the parser, reported by the checker, **never inferred**.
  *Raw note:* "As with Pokepaste, the goal is to make the tool functional almost regardless of the amount of details provided. Ex. I can generate a dndpaste even after selecting only a class. Nothing is strictly required, as long as what is present follows the same structured pattern."
  *Rejected:* flat snapshot only (cannot replay a multiclass or a swap); inference "unstamped = earliest legal level" (challenged: needs rules data to be correct, tools would disagree); inline `@level` on flat lines (two spellings for one fact).

- **D5 — Ability scores and ASI splits are in the format. DECIDED (2026-09-04).** **AMENDED → D46 (a named, partial form of base scores).** A `Scores:` line for the array; an ASI is a choice at its level like a feat. my-spellbook (no score model) simply omits the line.

- **D6 — Variants and parties are not in v1; the blank-line-block rule is reserved for them. DECIDED (2026-09-04).** **AMENDED → D18 (separator is `---`, not the blank line).** *Rejected for now:* variant override blocks (chassis §10 style) in v1; party pastes in v1.

- **D7 — Entity references are `Name` with an optional `|SOURCE` suffix using 5etools source codes; case-insensitive match. DECIDED (2026-09-04).** One-to-one with 5etools UIDs and my-spellbook keys. *Rejected:* header-declared sources only (two allowed books with the same name are ambiguous); always `name|SOURCE` (noise).

- **D8 — `Rules:` header sets the default edition when present; a line's source overrides it. DECIDED (2026-09-04).** Editions never mix silently: the mix is visible on the line. The core grammar must stay game-neutral so other editions or games can be added as profiles.
  *Raw note:* "Ideally, the same system could be even applied to previous version of dnd or even other games (we could even turn it into 'trpgpaste', but I'm not expert enough in other games to evaluate what would be required)."

- **D9 — Homebrew is a reference with a homebrew source code, never rules text. DECIDED (2026-09-04).** Consistent with "the paste doesn't include the features". *Rejected:* one-line gloss comments (blurs the line); homebrew out of v1 (his characters are full of it).

- **D10 — 5e profile coverage for v1: all four groups. DECIDED (2026-09-04).** Chassis (species + lineage/options, background incl. custom detail, class order/levels, subclass, scores); level picks (ASI/feat with sub-choices, fighting style, invocations, metamagic, masteries, expertise, skills/tools/languages); spells (cantrips, learned, prepared defaults, drop/learn swaps); equipment (starting option letter + named items).
  *Raw note (round 5c):* "keep in mind backgrounds could be custom and have more details" → a value may carry parenthesised detail groups, `;`-separated, `,`-separated items inside.

- **D11 — Two layers: a data-free parser and a data-driven checker. DECIDED (2026-09-04).** The checker derives choice slots from 5etools-format data (`choose`, `featProgression`, `optionalfeatureProgression`, `additionalSpells`, equipment options) so new books and homebrew files work with no table to maintain. **The checker is out of the first milestone** (designed, not built). *Rejected:* parser only; hand-maintained profile table (goes stale).

- **D12 — No free text, except one optional identifier line at the top. DECIDED (2026-09-04).** No comments, no notes, no concept line. *Rejected:* `#` comments; structured per-line notes.

- **D13 — An unmade choice is omitted; absence is the only "unknown". DECIDED (2026-09-04).** **AMENDED → D24 (absence = default when one exists).** A half-made pick is written as far as it goes. *Rejected:* explicit `?` placeholder.

- **D14 — Keys are full English words, case-insensitive, one canonical spelling; emitters always write the canonical form. DECIDED (2026-09-04).** *Rejected:* short aliases (two spellings to test); 5etools codes (`EI:`) as keys (opaque).

- **D15 — Syntax shape A: header lines, then level blocks `L<n> <Class>` each holding `Key: value` lines. DECIDED (2026-09-04, mockup + 2 rounds).** List values are `,`-separated; a leading `-` on a list item means "dropped here" (spell swaps). *Rejected:* B one-line-per-level (alias table, unreadable past 3–4 picks); C grouped-by-kind with `@level` stamps (scatters the level-up sequence, awkward swaps).

- **D16 — Reference implementation in TypeScript, zero dependencies, ESM plus a single-file UMD build. DECIDED (2026-09-04).** character-forge imports the ESM types; my-spellbook (no-build) copies the UMD file. *Rejected:* vanilla JS single file (no types at the character-forge boundary); Python first (not runnable in the browser).

- **D17 — First milestone = SPEC v0 + parser + fixtures, proven against two real builds (Vice, Shigen) written by hand as dndpastes. DECIDED (2026-09-04).** No app touched. *Rejected:* spec-only with panel first (chosen instead: a panel gate inside M1 after the spec draft, before the parser); spec + spellbook export in one go (edits a tool now).

## OPEN

- **O1 — trpgpaste.** Game-neutral core + per-game profiles is a design constraint from D8; which other games, and what a "level" means there, is unevaluated. Unblocked by: someone with expertise in a second system.
- ~~**O2 — Checker data source.**~~ **DECIDED → D35.**
- ~~**O3 — Package distribution.**~~ **DECIDED → D44.**

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

- **O4 — Feat detail slot order.** Ability first, then printed order, is the rule; a per-feat table in the checker supplement will be needed for feats whose printed order is unclear. Decide at M2.

- **D33 — `Items` key for magic items and gear acquired in play, distinct from starting `Equipment`. DECIDED (2026-09-04).** Placed at the level gained, details for the item's own picks; never owed, so never "missing". *Raw note:* "include the possibility to mark magic items". *Rejected:* folding them into `Equipment` (conflates a rules choice with a table event); a `Magic Items` key (2024 has non-magic acquired gear too).

- **D34 — Extras are accepted and flagged at info severity. DECIDED (2026-09-04).** A pick with no slot (extra feat, second fighting style, bonus invocation) is reported as `extra` and otherwise treated as part of the build. Every checker finding is warning or info; only grammar is an error. *Raw note:* "allow the checker to accept for example extra feats or other extras (they are flagged, but nonetheless accepted, perhaps a boon from the dm)". *Rejected:* an explicit `boon` marker in the syntax (adds vocabulary for a case the checker can classify by itself).

- **D35 — The checker's data is a compact slot table extracted from the 5etools mirror, plus a hand-kept supplement. DECIDED (2026-09-04, closes O2).** `scripts/extract-slots.mjs` emits names, counts, levels and option lists per class, subclass, species, background, feat, optional feature, spell and magic item — no rules text. Edition is taken from the entity when present, else inferred from the source's publication date (XPHB shipped 2024-09-17); ties between sources prefer the core group. `data/slots.json` is gitignored; `data/srd/slots.json` (SRD-flagged entities) is committed and drives the tests. `data/supplement.json` holds prose-only slots (Divine Order options come from data; lineage trait names, spellbook sizes, invocation sub-picks, Mystic Arcanum do not). *Rejected:* reading raw 5etools JSON at check time (schema coupling, not shippable); a hand-maintained profile table (D11).

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

The wave converted 24 posted 2024 builds into pastes; its evidence stays local (names only here). Its format gaps are F1–F8, its checker findings C1–C3.

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

- **D52 — One paste is one build: no change. DECIDED (2026-09-30).** Alternatives, tentative picks and variants ("Human or Aasimar", "Topple or Sap", "Version B: Rogue 1 first") are separate pastes. Closes F7 (8 builds).
  *Rejected:* an alternative or tentative marker; multi-build documents (`---` stays reserved, D18).

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

- **D57 — Releases are annotated `vX.Y.Z` tags, made by hand, matching `package.json` and a dated CHANGELOG heading; a tag is never moved. DECIDED (2026-09-30).** Francesco asked for a strict tagging convention when 0.6.0 went out, then chose the lighter of three drafts. A release is one commit on `main` (`chore(release): X.Y.Z`) that turns `## Unreleased` into `## X.Y.Z — YYYY-MM-DD` and matches `package.json`; `npm run build` and `npm run verify` pass on it; the tag `vX.Y.Z` is annotated, points at that commit, and its message is `dndpaste X.Y.Z · SPEC A.B` plus the CHANGELOG section. A pushed tag is never moved, deleted or re-pointed: a bad release is fixed by the next patch. SemVer before 1.0: minor for a grammar or behaviour change, patch for fixes and data only. Consumers copy a tagged build and cite the tag (amends D44's "version stamped in `CHANGELOG.md`"). Tag history starts at v0.6.0 (no backfill).
  *Rejected:* a `npm run release` script that refuses unless every rule holds, plus a verify test for a version bump with no CHANGELOG heading (the strict draft; more machinery than this repo needs today); the same without backfilling v0.4.0 and v0.5.0.
  *Enforced by:* prose (this entry, CLAUDE.md Conventions).

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

Closes D45's open list and `SHARE-SITE-SIZING.md`'s seven open calls for a one-shot build; the brief is `SITE.md`. D63–D64 are left unused: "a D64 crossing" in D58–D61 means cf-D64. D80–D89 are reserved for the look jam.

- **D65 — A share holds the paste, a title and an author; it is immutable and kept forever. DECIDED (2026-11-15); REOPENED → D96 (owner-device edits); AMENDED → D97 (editable by its owner as revisions; each revision immutable).** No notes field (D45: never notes). Every save makes a new id; revisions go through "Duplicate and edit". No expiry, no delete link; takedown is a manual KV delete (D71).
  *Rejected:* a pokepaste-style notes box (invites rules text, against D45 and the IP check); text only (no credit, nothing to show in tabs); editable via a secret link or versions under one id (an import link could change under its reader; secret-token handling); expiry after a year unread (old forum links die); a self-service delete link.

- **D66 — No checker on the site in v1; later, an SRD checker, then a checker on data the visitor supplies. DECIDED (2026-11-15).** v1 shows parse diagnostics only: `E###` blocks a save, warnings show. Follow-ups, in order: (1) the SRD checker on the committed subset, after the library gets a "data unavailable" mode that suppresses unknown-name findings, plus a release; (2) "Check against data": the visitor enters a 5etools-format data URL or loads files, the browser fetches them and builds the slot table locally (the extractor refactored into a pure library function), nothing passes through or is stored by the site, and the site names and links no source.
  *Raw note:* "Leaning no checker in v1, but could we implement technically an SRD and 5etools checker?" · "None in v1. For 5etools, can we connect it to the 5etools repo, without republishing anything?"
  *Rejected:* SRD checker in v1 (a library session and release first breaks the one-shot); a preset that pulls from the 5etools repo (the public site would name a repo that is taken down and moved, and break each time); a hosted full table (publishing WotC-derived data, out by the IP check).

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

Frames and build brief: `jams/2026-11-15-site-look/` (local only, `.git/info/exclude`). D80–D89 amend D68 (D84) and D72 (D82).

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

- **D88 — Build-wide look rules. DECIDED (2026-11-15).** (a) Every text/background pair meets WCAG AA (4.5:1, 3:1 for large text and UI parts) in light and dark, checked in the build, not eyeballed; the jam already darkened item, subclass, species and source-code hues for this. (b) No clashing hue pairs: a status glyph takes the colour of the control it sits on (no green check on the garnet button). (c) The About page copy is dry, plain and free of AI tells. (d) Form errors use amber plus the E-code, never the accent (from 1.2).
  *Raw note:* "When building, make sure no colors without enough contrast or with clashing hues like the check" · "A note: make sure the about is dry, and doesn't have AI tells."
  *Enforced by:* build brief Done-when (contrast check), fresh-eyes review.

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

- ⚑ **Parked, not decided (2026-11-16, owner: overseer):** an empty value (`Spells:` with nothing) as "unspecified / any" instead of E006 → SPEC 0.8 discussion (pin: "Empty lines shouldn't necessarily be an error"); Tidy fixing the case of known names → after launch, once a name list ships with the site; favicon "ok for now". Writing help in the form (note: "can we have the option to prefill it with at least the starting keys? How much can we help the user while writing?") → overseer, after 3.2d: a "Start a build" skeleton, smarter key hints, value suggestions once a name list ships.

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

- **D103 — The site never names 5etools; source codes are "the short code of the book" (PHB, XPHB, TCE), and the site lists them. DECIDED (2026-11-16).** No "usual" or "standard" wording. The list of codes lives on the site and is kept in step with 5etools silently. Content boundary unchanged (codes only, no data).
  *Raw note:* "Drop the name, list codes, don't mention them 'as usual', we silently update the list from 5etools."
  *Rejected:* naming 5etools on the guide (the line it replaces).
  *Enforced by:* `site/src/guide.ts` line (297dc24); the code list page is not built yet.

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

- **D113 — 0.8 reads 0.7 keys with a "renamed key" warning and writes the 0.8 form. DECIDED (2026-11-16); AMENDED → D142 (aliases stay for as long as `Paste: 1`, not until 1.0).** Aliases `ASI`, `Ability`, `Fighting Style`, `Equipment`, `Items` stay ~~until 1.0~~ for as long as `Paste: 1`. An old `Ability` line that the parser can't move into its owner's details without data stays as written, with the warning. character-forge and the 0.7 fixtures keep working.
  *Raw note:* "Read old, write new feels better, unless the cost is too high. In general, we need an action plan for dndpaste format updates."
  *Rejected:* a clean break.
  ⚑ **OPEN (owner: overseer → Francesco, 2026-11-16): a format-update policy** ("an action plan for dndpaste format updates"): how a SPEC change is proposed, aliased, released, announced to consumers and retired. Drafted with the 0.8 build for his read.

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

## Name and licence (2026-11-17) — mechanism: /panel, 4 personas (Skeptic, Domain Purist on opus; Maintainer on sonnet; End User + web check on sonnet), split 2–2; then AskUserQuestion, 1 round, overseer

- **D135 — The name stays dndpaste; a rename is planned only with a custom domain, and then toward a game-neutral name. DECIDED (2026-11-17).** The panel's verified facts: the repo is already public (main, `v0.6.0` pushed), so the old name stays in history whatever happens; the format covers D&D only (`Rules:` is `2014`/`2024`, sources are 5etools codes), so "5epaste" would promise Tales of the Valiant, A5E and Black Flag support it lacks; the live store held 1 share. When a custom domain is bought (D70 `CANONICAL_ORIGIN`), reconsider: a game-neutral core name, with `dnd5e` as one profile among community-added ones (O1), TTRPGs and video games alike, "anything that could work as a recipe".
  *Raw note:* "is it worth is changing the whole tool to 5epaste instead, considering that's the only edition we support?" → "for now we can keep as is, and plan this step only when we eventually get a custom domain, wt which point we may consider making it game-neutral and support the addition from the community of a wide variety of games, both ttrpg and videogames as well, anything that could work as a \"recipe\"".
  *Rejected:* 5epaste now (Maintainer, End User: cheap before a push, "5e" is an established tool prefix as in 5etools; but the push had already happened and the scope claim is false); a neutral name picked now (no second profile to test it against).
  *Amends:* O1 (scope widened to any game with a build "recipe", community-added). *Enforced by:* prose only.

- **D136 — SRD-derived data carries the CC-BY-4.0 attribution in `NOTICE.md`; generated data never records local paths. DECIDED (2026-11-17).** Found by the panel: `data/srd/slots.json` was public with no attribution and with the maintainer's local mirror path in `meta.mirror`. The extract script no longer writes `mirror`; the committed file lost the field (no other change); README links `NOTICE.md`.
  *Raw note:* picked "Fix both now (Recommended)".
  *Rejected:* attribution only; queueing both.
  *Enforced by:* prose only (no test checks `meta`). ⚑ (overseer → Francesco, 2026-11-17): ~~check the two attribution sentences against WotC's SRD pages; `isSrd` in `scripts/extract-slots.mjs` also counts Basic Rules entities (`basicRules`, `basicRules2024`), which are free but not CC-licensed: names and counts only, but decide whether the committed subset keeps them.~~ Closed by D141. The public history still holds the old `meta.mirror` value.

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

- **O5 — A community showcase: a public list of builds with likes, filters and search by build element (class, species, feats, spells). OPEN (2026-11-17), revisit after a few hundred shares.** Francesco's idea, "not necessarily now". Constraints found at /start, to carry into its design: (a) only builds their author opts into, never retroactively: `/about` promises "anyone with the link", and listing and search are v1 non-goals in `SITE.md`; (b) the index and likes go in D1 (SQLite), not KV: the free KV tier has about 1k writes a day, which saves already use; (c) likes with no accounts need anti-abuse (per browser and per IP, D91-style), and stay a soft signal; (d) public listing makes the site a curator, so a takedown must also leave the index and reports need a regular read (D71); (e) facets come free from `parse`, which already gives classes, species, feats and spells as data.
  *Raw note:* "we should consider a community showcase page with all builds created, a way to live likes, filter and search by specific elements of the build etc. not necessarily now though"; picked "Log as OPEN, later (Recommended)".
  *Rejected:* an opt-in "list publicly" checkbox from launch (commits the site to a showcase before there is volume to fill one); not recording it.

- **D141 — The committed SRD subset keeps its ~~36~~ (AMENDED → D166: 17 on the current data) Basic-Rules-only names; `NOTICE.md` says the CC-BY licence doesn't cover them. DECIDED (2026-11-17); closes D136's ⚑.** The two attribution sentences match WotC's published SRD 5.1 and 5.2 wording (dndbeyond.com/srd now lists 5.2.1 as the latest, each version licensed on its own; 5etools flags `srd52`, so the 5.2 sentence stays). The 36 (`basicRules`/`basicRules2024` without `srd`/`srd52`): 13 PHB (subraces such as Wood Elf, Mountain Dwarf, Stout Halfling; backgrounds Criminal, Folk Hero, Noble, Sage, Soldier), 1 DMG, 22 XPHB item categories. Names and counts only.
  *Raw note:* "Keep, add as a note. Ideally, for the name and counts only, we should parse the full 5etools library, is the name enough to break cc-by?"
  *Rejected:* dropping the 36 (loses ghost counts on common 2014 picks for no real gain). The full-library question is answered in chat, not decided: CC-BY doesn't apply to non-SRD names at all; the risks are the EU database right on a substantial extraction and a GitHub takedown, and the content boundary in `CLAUDE.md` stands until he says otherwise. D66's "check against data" is the planned route to full coverage.
  *Enforced by:* prose only (`NOTICE.md`).

- **D142 — Aliases never retire within `Paste: 1`; 1.0 breaks nothing. DECIDED (2026-11-17); amends D113 ("until 1.0").** A paste written today keeps reading in every 1.x library. Retirement can only be opened by a `Paste: 2` major. SPEC §2.6 and §5.6, `FORMAT-UPDATES.md` §3 and §6, the alias comment in `src/dndpaste.ts`. Makes the launch promise simple: "a paste you write today keeps working".
  *Raw note:* "Ideally never retire, we can open it up at paste: 2."
  *Rejected:* retiring at 1.0 as D113 said (breaks every share saved on the public site); retiring at `Paste: 2` by default (he wants them kept; `Paste: 2` only opens the question).
  *Enforced by:* `fixtures/v0.7/` and its conversion test.

- **D143 — An alias lives at least two minor releases and at least six months, whichever is later, before a `Paste: 2` may retire it. DECIDED (2026-11-17).** `FORMAT-UPDATES.md` §6.
  *Raw note:* picked "2 minors and 6 months (Recommended)".
  *Rejected:* releases only (a burst of releases could shorten it to weeks); time only.
  *Enforced by:* prose only.

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
  *Enforced by:* `site/test/author.test.ts` (a9cc543, unmerged). Note: the /about privacy line still omits drafts and the author; fix with D152.

- **D151 — Name autocomplete in the editor, from the committed SRD subset, before launch, on desktop and phone. DECIDED (2026-11-19); amends D83 (the popup was queued for later).** Suggests names for value keys (spells, feats, items, species and the rest) as you type. It never blocks a name it doesn't know: any book works, and the UI must not suggest otherwise. Names from a visitor's own 5etools data come later, with D66's visitor-data step. The names list counts against the bundle check.
  *Raw note:* "when writing, could we have an autocomplete, at least from the SRD and possibly later if one connects the 5etools repo"; picked "Before launch, SRD only".
  *Rejected:* after launch (he wants it in the first impression); desktop only (two layouts that behave differently).
  *Enforced by:* pending.

- **D152 — One copy pass on the site's functional copy before launch: dry, short, minimal. DECIDED (2026-11-19).** Buttons, labels, the toolbar summary, the phone dock, empty states, error and status messages, menus. A before/after table on a review board, then applied. `/guide` and `/about` prose are out of scope. It runs last, after D149–D151, so it covers their new strings.
  *Raw note:* "we need one more pass on copy especially functional copy ex. buttons to keep the dry and short, minimal"; picked "Functional copy only (Recommended)".
  *Rejected:* the whole site including `/guide` and `/about` prose (more to review; the guide reads longer by design).
  *Enforced by:* pending.

- **D153 — 2024 Paladin, Ranger and Rogue get a Masteries ghost count of 2 from `data/supplement.json` (numbers only), since the SRD slot table has mastery but no progression for them. DECIDED (2026-11-19); amends D129 (those three had no count).** Mechanism: a /ui-review pin in the D149 build session. `presets.mjs` reads the supplement when the table has no progression.
  *Enforced by:* `site/test/ghost.test.ts` (42c6607, unmerged).

## Visitor data, safely (2026-11-19) — mechanism: overseer analysis, Francesco's "Yes, log it and fix the README line"

- **D160 — The later visitor-data step (D66 step 2; D151's "your own data") is a file the visitor picks, read in their browser only, never uploaded, never fetched by the site, and never named or linked as 5etools. DECIDED (2026-11-19).** The importer keeps names, sources and counts only, and drops any text the file carries before anything is kept or shown. It accepts a plain documented names format anyone can write by hand, so it is a generic importer, not a door to one site. The UI says "your own data" or "a names file". The repo's public docs describe data inputs generically; citing 5etools source codes (`XPHB`) as a naming convention stays. Not built: planned for later (PLAN Later).
  *Raw note:* "Is there any way that it's safe for me to suggest linking 5etools repo eventually? … I feel like just having a connection exposes me to legal issues" → "Yes, log it and fix the README line. We'll plan for later to try to implement the generic importer".
  *Why:* names and indexes carry little risk; a live connection to a mirror WotC has taken down points visitors at infringing material, and most D&D subreddits remove posts that promote it.
  *Rejected:* a "connect 5etools" button or a fetch from a mirror; naming 5etools as a supported source.
  *Enforced by:* prose only (README reworded in this commit).

## Name autocomplete (2026-11-19) — mechanism: /interview, AskUserQuestion, 3 rounds (9 questions), D151 worker

- **D154 — The name list opens on its own once the name under the cursor has ~~2 letters~~ (AMENDED → D164: the letters follow the list's size); Tab takes the top match, the arrows pick another and then Enter or Tab takes it, Enter without arrowing is a new line; Esc closes it. On phone, a tap takes a suggestion. DECIDED (2026-11-19).** It closes on a comma, a `|` (a source being typed), or when nothing matches. A name that isn't in the list is never swapped out by Enter (D151: any book works).
  *Raw note:* picked "After 2 letters (Recommended)" and "Tab, or Enter after arrows (Recommended)".
  *Rejected:* after 1 letter (hundreds of matches, opens on almost every keystroke); only on request, Ctrl+Space or a dock button (few find it); Tab or Enter both take the top match (Enter after a homebrew name would replace it); arrows and Enter only (two keys for every name).
  *Enforced by:* `site/test/complete.test.ts` (D154 tests) (2e5323b, unmerged).

- **D155 — A taken name gets `|SOURCE` only when it's needed: the list follows the paste's `Rules:`. DECIDED (2026-11-19).** A name in the `Rules:` edition goes in bare. A name only the other edition has goes in with its book (`|PHB`, `|XPHB`, `|DMG`, `|XDMG`), and its row shows that book. With no `Rules:` line, one row per name and bare names. A source already written after the name is left alone.
  *Raw note:* picked "Only when needed (Recommended)".
  *Rejected:* always write the source (longer lines; the canonical form doesn't need it); never (a 2014 pick in a 2024 paste silently means the 2024 entry).
  *Enforced by:* `site/test/complete.test.ts` ("D155: sources follow Rules") (2e5323b, unmerged).

- **D156 — Each key suggests its own kind of name; in a level block the block's class comes first and nothing is hidden; inside `[ ]` the list follows the slot where the SRD table knows it, else a general list. DECIDED (2026-11-19).** Spells and Prepared: spells of 1st level and up. Cantrips: cantrips. Feat: feats; `Feat (Fighting Style)`, `(Origin)`, `(Epic Boon)` narrow to that category (fighting styles include the 2014 optional features). Options: optional features. Species, Background, Subclass (printed or short name), Classes and the `L<n> …` header: their own kind. Gear: items and magic variants. Masteries: mundane items (the table has no weapon flag). Skills and Expertise: the 18 skills. Languages and Tools: the ones the table names (tools also from mundane items). Feature: the lineage and ancestry features the supplement names. Class first: in `L5 Wizard`, wizard spells, wizard subclasses and the wizard's option families lead; in the header, the `Classes:` line's classes. Known slots: a feat's ability choice, Magic Initiate's class then that class's cantrips then its 1st-level spells, an ASI's `+2 …` ability, a species lineage (Elven Lineage, Fiendish Legacy: ability then lineage; Draconic and Giant Ancestry: the supplement's list), `Spellcasting [ … ]`'s ability, an option with picks (cantrips). Elsewhere inside `[ ]`: abilities, skills and spells. Names already on the line aren't offered again.
  *Raw note:* picked "Class first, rest after (Recommended)". On sub-picks: "Content inside brackets too. Ideally, the suggestions should be prefiltered by context (header or option before brackets)"; for slots the table doesn't know, "A general list."
  *Rejected:* top-level names only (his call: sub-picks too); spells inside brackets only; everything inside brackets; class only (hides Magical Secrets and other valid picks, reads as "not allowed"); ignore the class.
  *Enforced by:* `site/test/complete.test.ts` (D156 tests) (2e5323b, unmerged).

- **D157 — Desktop: the list sits just under the cursor's line, up to 8 rows. Phone (the dock's width, ≤600 px): the matches are a chip row in the dock, above the keyboard, in place of the Keys row while it suggests. DECIDED (2026-11-19); amends D83's rejected "popup at the cursor" for desktop. AMENDED (2026-11-19, /ui-review round 1): the Keys row and the names are the dock's last row, right on the keyboard (problem line, then Keys · Save, then the chips), with a rule between every row; Keys pressed while the names show closes them and shows the Keys row. Both rows are one height (48 px), so switching never moves the dock (round 2).** Same keys and behaviour on both. Listbox semantics: the textarea carries `aria-autocomplete`, `aria-controls`, `aria-expanded` and `aria-activedescendant`.
  *Raw note:* picked "Cursor desktop, dock phone (Recommended)". Review: "I feel like the dock has become crowded. Also likely the suggestions should be closer to the keyboard. Always have dividers if rows in the dock are unrelated."; picked "Chips at the bottom (Recommended)". Pin: "What is this button doing on mobile? It seems unresponsive" (Keys did nothing while the names hid its row: a bug, fixed).
  *Rejected:* under the cursor on both (a popup fights the phone keyboard and scroll, D83's reason); a dock-style strip on desktop too (the eye leaves the line); in review, the problem line stepping aside while names show (the error text goes while typing); the names taking the Keys · Save row's place (Save goes mid-word).
  *Enforced by:* `site/public/assets/site.css` `.ac` rules, checked in /ui-review 2026-11-19; no automated layout test (2e5323b, unmerged).

- **D158 — The names ship as their own module, `/assets/names.js`, loaded the first time the editor gets focus (as Share loads share.js). DECIDED (2026-11-19); amends SITE.md "IP" (the bundle may carry SRD names, nothing else).** Generated by `site/scripts/names.mjs` from the committed SRD table and supplement into `site/src/names.gen.ts` (names, books and the few links the ranking needs: spell level and classes, subclass class, option family, feat category and slots), committed like `presets.ts`. A test fails while it's stale. The bundle gate checks it as its own client bundle; no data file goes in `public/`.
  *Raw note:* picked "Own module, loaded on focus (Recommended)".
  *Rejected:* inline in form.js (~30 KB more on every form load); a fetched text file (loosens the gate's no-data-files rule).
  *Enforced by:* `site/test/names.test.ts`; `site/scripts/check-bundle.mjs` still bans `data/` inputs (2e5323b, unmerged).

- **D159 — The list offers PHB, XPHB, DMG and XDMG entries only: the SRD plus the Basic Rules names D141 kept. DECIDED (2026-11-19).** The subset's 44 species variants from MTF, ERLW, SCAG, EGW, PSD and the DMG Eladrin are left out of the list; you can still type them.
  *Raw note:* "Drop them for now."
  *Rejected:* keep them (names from books the site covers nowhere else).
  *Enforced by:* `site/test/complete.test.ts` ("D159: no names from books other than …") (2e5323b, unmerged). ⚑ (worker → overseer, 2026-11-19): those 44 carry `srd: true` in `data/srd/slots.json` though their books aren't SRD; NOTICE.md (D141) counts only 36 non-SRD names. → closed by D166: the subset no longer holds them.

- ~~**D161 — Family keys or aliases for options and features (`Invocations:`, `Maneuvers:`, `Divine Order:`), or a marker on the existing key. OPEN (2026-11-19).**~~ **DECIDED → D180–D185 (SPEC 0.9).** Raised in the D151 interview. A format change: it reverses D27 (`Options` covers every family, so the format never needs a new key) and lands after v0.8.0 (D142). A marker like `Options (Invocation)` would stay inside the D110 grammar. The autocomplete takes a family filter if one lands. Unblocks with: a spec decision, overseer with Francesco. ⚑ (worker → overseer, 2026-11-19): plan it together with a level cap in the key's parentheses, `Spells (3rd):`, an optional limiter on the highest level the line picks from (/ui-review round 1 note); the autocomplete would read it in place of D162's cap.
  *Raw note (review, the limiter):* "We should use the bracket next to header format more: for example, Spells could have (3rd) indicating the highest level possible to choose as an optional bracket limiter"; picked "Flag for the overseer, it should go together with the earlier comment about reworking invocations, maneuvers etc."
  *Raw note:* "I'm considering though reinstating specific options as headers or header aliases of options (so that both work the same, one just gives an additional detail), and masteries would become aligned with them. Ex. Invocations, Maneuvers, Divine Order etc. should work as well as header (or a compromise could be to have them in parenthesis like origin, but it would become long for no reason)."

## Name autocomplete, review round 1 (2026-11-19) — mechanism: /ui-review notes + AskUserQuestion, 2 rounds (6 questions), D151 worker

- **D162 — Spell rows show their level (`2nd`, `cantrip` only in a mixed list); spells above the highest level the spot's class can pick at its level there rank last and are dimmed, still offered and pickable. DECIDED (2026-11-19).** The class level is the level block's (that class's levels so far, by the reading rule, D49), else the `Classes:` line's. The cap comes from the class's casting progression in the SRD table (full, half, 2024 half from level 1, pact with Mystic Arcanum), per the `Rules:` edition. No class, or a class with no table (Fighter, Rogue): nothing is dimmed. Order: the class's castable spells, then other castable ones, then the dimmed. A hint, never a check (D66): nothing is blocked or flagged.
  *Raw note:* "Can we have a way to signal a not legitimate choice, ex. spell of a level I can't take? Should we show ex. the level for spells in the autocomplete or at least tell which are legal?"; picked "Level tag + castable first, not castable should have a subtle difference as well".
  *Rejected:* the level tag only (no ranking); hiding what you can't cast (a wrong class line or a multiclass edge hides valid picks, as D156 rejected "class only"); parking it for the checker.
  *Enforced by:* `site/test/complete.test.ts` ("D162: …") (2e5323b, unmerged).

- **D163 — Brackets: typing `[` writes its `]` when only a separator, a space or the line's end follows; `]` steps over the one there; deleting back between an empty pair takes both. Inside `[ ]` the list opens with a hint line naming each `;` group the table knows, the cursor's group in bold (`ability; class; 2 cantrips; 1st-level spell`), shown even before a name fits. Class features with a choice (Divine Order, Primal Order, Elemental Fury) join `Feature:` and offer their options inside `[ ]`. DECIDED (2026-11-19).** Handled on `beforeinput`, so phone keyboards pair it too. A slot the table doesn't know keeps the general list and no hint (D156). Round 2: a pick inside `[ ]` writes `, ` while its group wants more names and `; ` when the next group follows, then opens that group's list; Thaumaturge (Divine Order) and Magician (Primal Order) add a second group, a cantrip of that class, from `featureOptionCantrips` in `data/supplement.json` (names only). Round 3: on phone the hint is only the cursor's group and where it is (`Class 2/4`), ruled off from the chips; the full line stays on desktop.
  *Raw note:* "When opening square brackets that require a specific order and type of info, is there any way to "suggest" or nudge the right fill? It should also auto type the closing bracket."; picked "Auto ] + slot hint (Recommended)". On ac-general: "Divine Order should specify Warden/Thaumaturge, that is the main choice" (the 2024 Cleric's Divine Order is Protector or Thaumaturge; Warden is the Druid's Primal Order; both now offered).
  Round 2: "on autocomplete in brackets with multiple choices, add also the ; and space and start the next choice immediately"; "Picking Thaumaturge also should add the cantrip choice after it"; picked "Second group, cleric cantrips (Recommended)". Round 3: "On mobile, the suggestion row is a bit confused, the text placement is unclear and after inserting the first part, ability text lingers. Make each choice clearer, dry".
  *Rejected:* the closing bracket only; the hint only; parking both; parking the Thaumaturge group with D161. A ghost hint inside the empty brackets (it would sit over the `]`): the hint lives in the list instead.
  *Enforced by:* `site/test/complete.test.ts` ("D163: …"); the pairing itself is in `site/src/client/form.ts`, checked in /ui-review (2e5323b, unmerged).

- **D164 — When the list opens follows how many names fit the spot: 12 or fewer open on the empty spot (abilities, a feature's options, one class's cantrips), up to 40 at 1 letter (skills, languages, classes, subclasses, tools), more at 2 (spells, items, feats, the general list). DECIDED (2026-11-19); amends D154.** Same on desktop and phone. Only typing opens it (D154): reaching a spot with the arrows doesn't.
  *Raw note:* "We should probably start the suggestions at one letter instead of two."; then "Can we have it depend on array size? For example, typing two letters to get WIS doesn't make much sense, but for a general list or wide spell list may be too broad. Is it ever tied to an array list or what is the standard?"; picked "Small lists open at 0".
  *Rejected:* 1 letter everywhere (hundreds of spells on every first letter); 1 letter on phone only; keeping 2 everywhere; 40-and-under at 1 letter with no empty-spot opening.
  *Enforced by:* `site/test/complete.test.ts` ("D164: …") (2e5323b, unmerged).
  ⚑ (worker → overseer, 2026-11-19, from /ui-review rounds 2–4, not in this branch): (1) "We should set autocomplete also for main headers (ex. species etc.)": Francesco means both the values on the empty spot (`Species: ` opens before a letter) and the key names themselves (`Spe` → `Species:`). (2) After a pick in a group that wants more names (`Guidance, `) nothing says another is expected: "I think we should consider having a ghost text before typing directly in the text box." (3) "The count chip shouldn't reset to 0/4 immediately after typing a comma. Also, the too-quick-to-signal error note hasn't be tackled yet." (ghost counts D130, error hold D90).

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

- **D190 — Whole-list preparers get guided to `Prepared`; the format stays. DECIDED (2026-11-19).** SPEC's key table and D23: a 2024 Cleric, Druid or Paladin prepares from its whole class list, so it has no `Spells` lines, only `Prepared`; a Wizard keeps both (`Spells` the spellbook, `Prepared` the loadout). Before, a `Spells:` line in such a block expected 0 picks and its chip turned red, and presets never laid out `Prepared` (D126). The site, for whole-list preparers: (1) the 2024 preset lays out an empty `Prepared:` line with its ghost count where the loadout first appears or grows (Cleric 1–11 and 13, not 12, where it stays 16); (2) the key suggestions (D170) and the hint strip don't offer `Spells` in those blocks; (3) a `Spells` line there shows ~~a plain hint in its chip, "Cleric prepares from its list. Use Prepared.", never red~~ no chip; its `Spells` key gets a dedicated hint underline (dashed, accent; not an error's wavy red) and is clickable. AMENDED (2026-11-19, /ui-review rounds 1–2): the key opens a popover with one button, Switch to Prepared (the class's reason is the button's accessible label only): it renames the line (`Spells (3rd)` → `Prepared (3rd)`), or adds its names to the block's `Prepared` line (no repeats) and removes it; Undo brings it back (the D152 copy pass reviews the wording). Whole-list is read from the class table, not listed: a 2024 class that counts a `Prepared` loadout and never `Spells`. That is Cleric, Druid, Paladin and Ranger. 2014 is unchanged: its tables count no loadout (D129).
  *Raw note:* "For the prepared header what to do? In particular, I see the value for wizard, but what about classes that only prepare? Currently prepared works but spells effectively doesn't (chip marks error)." Picked "Keep the rule, guide to it (Recommended)" (overseer, relayed to the wire-0.9 worker).
  *Rejected:* accepting `Spells` as `Prepared` for those classes (a format change where one key means two things by class); leaving it as is (no guide from the preset).
  *Review note (round 1, Change):* "Instead of a long prose, there should be a silent icon that opens a popover suggesting the switch and also enabling the switch on click."
  *Review note (round 2, Change):* "The copy is way too long. Just say Switch to prepared. Instead of having an icon where the chip would be, instead let's have a dedicate underline/highlight type for this type of issues that also makes the wrong header clickable, returning then the button."
  *Enforced by:* `site/test/ghost.test.ts` ("D190: a 2024 whole-list preparer's Spells line shows a plain hint…", "D190: the 2024 preset lays out Prepared…", "D190 review: Switch to Prepared renames…"), `site/test/complete.test.ts` ("D190: a 2024 whole-list preparer's block offers no Spells key…").

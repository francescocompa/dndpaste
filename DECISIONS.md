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

- **D5 — Ability scores and ASI splits are in the format. DECIDED (2026-09-04).** A `Scores:` line for the array; an ASI is a choice at its level like a feat. my-spellbook (no score model) simply omits the line.

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

- **D20 — No `Level:` header. DECIDED (2026-09-04, Francesco's spec review).** `Classes` states levels as played; a level block above their sum is planned. Supersedes the `Level:` half of D19.
  *Raw note:* "what is the level mentioned at the top or Classes mentions Warlock 10? Likely both redundant info: always prune redundancy" → spec rule 7.

- **D21 — Custom and homebrew backgrounds are fully specified inline in the fixed four-group order. DECIDED (2026-09-04).** **AMENDED → D26 (a homebrew background is a block, not inline groups).** *Raw note:* "archer priest is a custom background, everything about it should be listed under the bg".

- **D22 — A choice belongs to the entity that asks it, as that entity's details, not to a level; a later sub-choice is stamped `@n` inside the details. DECIDED (2026-09-04).** **AMENDED → D26 (species/background picks are block lines; details remain for feats, options, features).** Species, background, feat, subclass and invocation picks are details; `Option` shrinks to class features only. Supersedes the "unplaced/`Option`" reading of D19 for non-class entities. Narrows the D4 rejection of inline `@level`: the stamp exists, but only on details.
  *Raw notes:* "if a feature gained ex. in bg or at a certain level upgrades or offers a choice something at later level mark the choice directly under the original one with @5 for example"; "specialized design is a species trait, why is it under L1 warlock? All choices pertaining a certain feature should be under it, not necessarily in levels"; "missing ability scores mentions in feats and bg".

- **D23 — `Prepared` is written only when the repertoire exceeds the prepare count; never for a caster that picks prepared spells on level-up. DECIDED (2026-09-04).** *Raw note:* "prepared spells also redundant info if the class chooses on level up (ex. warlock)".

- **D24 — Defaults are silent: an absent choice that has a rules default means the default; only default-less choices are undecided when absent. DECIDED (2026-09-04).** Amends D13. The checker must know which slots carry a default. *Raw note:* "only if a choice has a default option, no choice mentioned means default selected".

## Panel round (2026-09-04) — mechanism: /panel, 5 personas (Skeptic, Domain Purist, Maintainer on opus; End User on sonnet; Fresh Eyes on haiku), verdict 5–0 *change*; then AskUserQuestion, 2 rounds

- **D25 — Details use square brackets; names containing `, ; : [ ]` are double-quoted. DECIDED (2026-09-04).** Verified on the mirror: 7,168 names, none contains `"` `[` `]` `{` `}` `<` `>` `=` `@`; 291 items and 36 class features contain parentheses, 120 items contain commas, 51 class features contain colons. Parentheses become ordinary characters (`Arrows (20)`). *Rejected:* quotes alone (his pick was brackets); brackets alone (leaves commas/colons unwritable); changing the list separator.

- **D26 — `Species` and `Background` open entity blocks; their picks are ordinary key lines inside the block. DECIDED (2026-09-04).** Removes nested details and the "which slot is which" problem for the two multi-pick entities. Feats, options and features keep bracket details with a fixed slot order (feat: ability first). *Raw note:* "Species can be its own row similarly to class levels, which should circumvent the issue." *Rejected:* fixed positional slots with empty `;` placeholders; named `key=value` slots; untyped picks classified by the checker.

- **D27 — One `Options` key for every optional-feature family; `Option` renamed `Feature` for named features with a pick. DECIDED (2026-09-04).** Invocations, metamagic, manoeuvres, infusions, arcane shots, runes, disciplines and 2014 pact boons are all `Options`; 5etools tags the family, so no new key per book. `Fighting Style` stays (a feat in 2024, an optional feature in 2014). *Rejected:* keep `Invocations`/`Metamagic` beside a generic key (two spellings); a key per family (stale).

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

- **D40 — A `+N ` prefix on `Items`/`Equipment` is stripped for resolution. DECIDED (2026-09-04, Francesco).** `+1 Longsword` resolves as `Longsword`; the paste keeps the prefix. Named variants still need a data source.

## M2 tail scoping (2026-09-05) — mechanism: AskUserQuestion, 3 rounds

- **D41 — The M2 tail ships as 0.5.0 before M3, built by parallel worktree agents with a fresh-eyes review before merge. DECIDED (2026-09-05).** Scope: spell-list legality · 2014 starting-equipment picks · `bin/dndpaste` CLI · ability-score arithmetic · dangling `Class 0` · name-alias fallback. Homebrew merge stays queued (needs a real homebrew file). *Rejected:* CLI + spell-list only (leaves the checker half-blind on 2014 builds); sequential build (no reason to serialise independent modules).

- **D42 — A `Classes` entry at level 0 with no level block is reported as `unplaced` info, kept in the paste, never dropped by `normalise`. DECIDED (2026-09-05, closes stress call 6).** *Rejected:* warning severity (noise on planned-but-unstarted classes); dropping it on emit (loses the author's plan).

- **D43 — Unresolved names fall back to a unique contains-match within the same entity kind, resolved at info severity ("resolved as X"); two or more hits stay unresolved. A cross-edition hit still resolves, with the edition mismatch stated in the same finding. DECIDED (2026-09-05, closes stress call 9).** Fallback only fires on the full `Name|SRC` miss and never on refs shorter than 4 characters, so `Shield` cannot swallow `Shield Master`. *Rejected:* an alias table in `supplement.json` (hand upkeep per rename); table-then-contains (two mechanisms for one problem); refusing cross-edition hits (breaks builds that mix books on purpose).

- **D44 — Consumers get the library as a copied `dist/dndpaste.umd.cjs`, the version stamped in `CHANGELOG.md`; M3 runs as a separate session inside my-spellbook after 0.5.0 lands. DECIDED (2026-09-05, closes O3).** *Rejected:* public npm package (needs the remote and an account first; can revisit once there is a third consumer); git submodule/subtree (Drive-synced folders); running M3 from this repo's context in parallel (crosses the CLAUDE.md boundary and targets a moving UMD).

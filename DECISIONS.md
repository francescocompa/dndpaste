# DECISIONS — dndpaste

> Append-only. Tags: **DECIDED (date)** / **OPEN** / **SUPERSEDED → D-id**.
> All entries below: 2026-09-04 · mechanism: AskUserQuestion, 8 rounds (scoping interview).

- **D1 — Apps first, humans second. DECIDED (2026-09-04).** Strict grammar, one canonical form, Pokepaste-dry.
  *Raw note:* "Follow the style of Pokepaste: a human can read it, but it's extremely dry and efficient."
  *Rejected:* humans-first tolerant parsing (typos degrade instead of failing, more parser to build); Claude-only prompt convention (a doc, not a system).

- **D2 — Spec before integrations. DECIDED (2026-09-04).** No tool is edited in the first milestone. Later producers/consumers, in this order of intent: my-spellbook export (closes its L5.5 / A-03), character-forge interview seeding, my-spellbook import. monster-forge is out (PCs are not its domain).
  *Raw note:* "no need to edit the tools right away".

- **D3 — Home is a new public repo `~/Documents/GitHub/dndpaste`. DECIDED (2026-09-04).** Own CLAUDE.md, own conventions; consumers copy a built file or install a package. *Rejected:* inside my-spellbook or character-forge (each would make the other depend on a repo whose conventions it must not adopt).

- **D4 — One paste = one build, described as a timeline by level blocks, with flat and mixed forms equally valid. DECIDED (2026-09-04).** A `Key: value` line under a level header is placed at that level. A line before any header, or in a paste with no headers, is **unplaced**: kept by the parser, reported by the checker, **never inferred**.
  *Raw note:* "As with Pokepaste, the goal is to make the tool functional almost regardless of the amount of details provided. Ex. I can generate a dndpaste even after selecting only a class. Nothing is strictly required, as long as what is present follows the same structured pattern."
  *Rejected:* flat snapshot only (cannot replay a multiclass or a swap); inference "unstamped = earliest legal level" (challenged: needs rules data to be correct, tools would disagree); inline `@level` on flat lines (two spellings for one fact).

- **D5 — Ability scores and ASI splits are in the format. DECIDED (2026-09-04).** A `Scores:` line for the array; an ASI is a choice at its level like a feat. my-spellbook (no score model) simply omits the line.

- **D6 — Variants and parties are not in v1; the blank-line-block rule is reserved for them. DECIDED (2026-09-04).** *Rejected for now:* variant override blocks (chassis §10 style) in v1; party pastes in v1.

- **D7 — Entity references are `Name` with an optional `|SOURCE` suffix using 5etools source codes; case-insensitive match. DECIDED (2026-09-04).** One-to-one with 5etools UIDs and my-spellbook keys. *Rejected:* header-declared sources only (two allowed books with the same name are ambiguous); always `name|SOURCE` (noise).

- **D8 — `Rules:` header sets the default edition when present; a line's source overrides it. DECIDED (2026-09-04).** Editions never mix silently: the mix is visible on the line. The core grammar must stay game-neutral so other editions or games can be added as profiles.
  *Raw note:* "Ideally, the same system could be even applied to previous version of dnd or even other games (we could even turn it into 'trpgpaste', but I'm not expert enough in other games to evaluate what would be required)."

- **D9 — Homebrew is a reference with a homebrew source code, never rules text. DECIDED (2026-09-04).** Consistent with "the paste doesn't include the features". *Rejected:* one-line gloss comments (blurs the line); homebrew out of v1 (his characters are full of it).

- **D10 — 5e profile coverage for v1: all four groups. DECIDED (2026-09-04).** Chassis (species + lineage/options, background incl. custom detail, class order/levels, subclass, scores); level picks (ASI/feat with sub-choices, fighting style, invocations, metamagic, masteries, expertise, skills/tools/languages); spells (cantrips, learned, prepared defaults, drop/learn swaps); equipment (starting option letter + named items).
  *Raw note (round 5c):* "keep in mind backgrounds could be custom and have more details" → a value may carry parenthesised detail groups, `;`-separated, `,`-separated items inside.

- **D11 — Two layers: a data-free parser and a data-driven checker. DECIDED (2026-09-04).** The checker derives choice slots from 5etools-format data (`choose`, `featProgression`, `optionalfeatureProgression`, `additionalSpells`, equipment options) so new books and homebrew files work with no table to maintain. **The checker is out of the first milestone** (designed, not built). *Rejected:* parser only; hand-maintained profile table (goes stale).

- **D12 — No free text, except one optional identifier line at the top. DECIDED (2026-09-04).** No comments, no notes, no concept line. *Rejected:* `#` comments; structured per-line notes.

- **D13 — An unmade choice is omitted; absence is the only "unknown". DECIDED (2026-09-04).** A half-made pick is written as far as it goes. *Rejected:* explicit `?` placeholder.

- **D14 — Keys are full English words, case-insensitive, one canonical spelling; emitters always write the canonical form. DECIDED (2026-09-04).** *Rejected:* short aliases (two spellings to test); 5etools codes (`EI:`) as keys (opaque).

- **D15 — Syntax shape A: header lines, then level blocks `L<n> <Class>` each holding `Key: value` lines. DECIDED (2026-09-04, mockup + 2 rounds).** List values are `,`-separated; a leading `-` on a list item means "dropped here" (spell swaps). *Rejected:* B one-line-per-level (alias table, unreadable past 3–4 picks); C grouped-by-kind with `@level` stamps (scatters the level-up sequence, awkward swaps).

- **D16 — Reference implementation in TypeScript, zero dependencies, ESM plus a single-file UMD build. DECIDED (2026-09-04).** character-forge imports the ESM types; my-spellbook (no-build) copies the UMD file. *Rejected:* vanilla JS single file (no types at the character-forge boundary); Python first (not runnable in the browser).

- **D17 — First milestone = SPEC v0 + parser + fixtures, proven against two real builds (Vice, Shigen) written by hand as dndpastes. DECIDED (2026-09-04).** No app touched. *Rejected:* spec-only with panel first (chosen instead: a panel gate inside M1 after the spec draft, before the parser); spec + spellbook export in one go (edits a tool now).

## OPEN

- **O1 — trpgpaste.** Game-neutral core + per-game profiles is a design constraint from D8; which other games, and what a "level" means there, is unevaluated. Unblocked by: someone with expertise in a second system.
- **O2 — Checker data source.** Recommended: a compact "choice slots" extract built from the 5etools mirror, SRD subset committed, rest gitignored (same content boundary as my-spellbook). Decide at M2.
- **O3 — Package distribution.** npm package vs. copied file into consumers. Decide at M3 when the first consumer lands.

- **D18 — Blank lines are insignificant; the multi-build separator reserved by D6 is the line `---`. DECIDED (2026-09-04, spec drafting).** Level blocks already use blank lines cosmetically, so the blank line cannot double as the variant/party separator D6 reserved. Amends D6; `---` is an error (E010) in v0.

- **D19 — The 5e profile has a generic `Option: <Feature> (<picks>)` key plus a `Level:` header. DECIDED (2026-09-04, spec drafting).** Evidence from the 5etools mirror: option-bearing class features such as Divine Order or the 2014 Pact Boon are prose `entries`, not `choose` nodes, so no key-per-feature list and no data-driven checker could stay current on its own. Dedicated keys cover the cross-class mechanics; `Option` covers the rest by feature name, and canonical emit folds it back into a dedicated key when one exists. `Level:` (current character level) lets a paste carry planned levels above the played one, which character-forge seeding needs. *Rejected:* a key per feature (stale on every book); a `Choice:` key without the feature name (unresolvable).

- **D20 — No `Level:` header. DECIDED (2026-09-04, Francesco's spec review).** `Classes` states levels as played; a level block above their sum is planned. Supersedes the `Level:` half of D19.
  *Raw note:* "what is the level mentioned at the top or Classes mentions Warlock 10? Likely both redundant info: always prune redundancy" → spec rule 7.

- **D21 — Custom and homebrew backgrounds are fully specified inline in the fixed four-group order. DECIDED (2026-09-04).** *Raw note:* "archer priest is a custom background, everything about it should be listed under the bg".

- **D22 — A choice belongs to the entity that asks it, as that entity's details, not to a level; a later sub-choice is stamped `@n` inside the details. DECIDED (2026-09-04).** Species, background, feat, subclass and invocation picks are details; `Option` shrinks to class features only. Supersedes the "unplaced/`Option`" reading of D19 for non-class entities. Narrows the D4 rejection of inline `@level`: the stamp exists, but only on details.
  *Raw notes:* "if a feature gained ex. in bg or at a certain level upgrades or offers a choice something at later level mark the choice directly under the original one with @5 for example"; "specialized design is a species trait, why is it under L1 warlock? All choices pertaining a certain feature should be under it, not necessarily in levels"; "missing ability scores mentions in feats and bg".

- **D23 — `Prepared` is written only when the repertoire exceeds the prepare count; never for a caster that picks prepared spells on level-up. DECIDED (2026-09-04).** *Raw note:* "prepared spells also redundant info if the class chooses on level up (ex. warlock)".

- **D24 — Defaults are silent: an absent choice that has a rules default means the default; only default-less choices are undecided when absent. DECIDED (2026-09-04).** Amends D13. The checker must know which slots carry a default. *Raw note:* "only if a choice has a default option, no choice mentioned means default selected".

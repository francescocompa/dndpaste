# DECISIONS — dndpaste

> Append-only. Tags: **DECIDED (date)** / **OPEN** / **SUPERSEDED → D-id**.
> All entries below: 2026-09-04 · mechanism: AskUserQuestion, 8 rounds (scoping interview).
>
> **Split by binding status (2026-11-20, /clean).** This file is the cold read: OPEN items and ⚑ flags, the standing
> rules (format principles D1, D7–D9, D11–D12; non-goals D52, D199; checker data D35; release and alias policy D57, D113,
> D142–D143; name and licence D135–D136; SRD names D141; site rules D88, D103, D231–D232, D240) and the work in progress (M6 "your own sources":
> D66, D151, D154–D164, D160, D194, D205, D219, D221, D241–D243). Landed decisions that a test, hook or gate enforces
> are in `DECISIONS-settled.md`, verbatim and in their original order; each `↪` stub here names the moved ids and gist.
> Find any id: `grep -n "D146" DECISIONS*.md`.
> **Open the settled file** to cite a decision, to check that an idea was not already rejected, or before you change
> a surface a settled entry owns (SPEC grammar; the site's look and flows, which `SITE.md` cites by id).
> **New entries** go at the end of this file (/decision). The /handoff after an entry lands and is enforced, or after
> its phase closes, moves it to the settled file and leaves a stub. Ids are never reused.

- **D1 — Apps first, humans second. DECIDED (2026-09-04).** Strict grammar, one canonical form, Pokepaste-dry.
  *Raw note:* "Follow the style of Pokepaste: a human can read it, but it's extremely dry and efficient."
  *Rejected:* humans-first tolerant parsing (typos degrade instead of failing, more parser to build); Claude-only prompt convention (a doc, not a system).

- ↪ D2–D6 · spec-first scope, repo home, one paste = one build as level blocks, scores in the format, variants reserved · `DECISIONS-settled.md`

- **D7 — Entity references are `Name` with an optional `|SOURCE` suffix using 5etools source codes; case-insensitive match. DECIDED (2026-09-04).** One-to-one with 5etools UIDs and my-spellbook keys. *Rejected:* header-declared sources only (two allowed books with the same name are ambiguous); always `name|SOURCE` (noise).

- **D8 — `Rules:` header sets the default edition when present; a line's source overrides it. DECIDED (2026-09-04).** Editions never mix silently: the mix is visible on the line. The core grammar must stay game-neutral so other editions or games can be added as profiles.
  *Raw note:* "Ideally, the same system could be even applied to previous version of dnd or even other games (we could even turn it into 'trpgpaste', but I'm not expert enough in other games to evaluate what would be required)."

- **D9 — Homebrew is a reference with a homebrew source code, never rules text. DECIDED (2026-09-04).** Consistent with "the paste doesn't include the features". *Rejected:* one-line gloss comments (blurs the line); homebrew out of v1 (his characters are full of it).

- ↪ D10 · 5e profile coverage for v1 · `DECISIONS-settled.md`

- **D11 — Two layers: a data-free parser and a data-driven checker. DECIDED (2026-09-04).** The checker derives choice slots from 5etools-format data (`choose`, `featProgression`, `optionalfeatureProgression`, `additionalSpells`, equipment options) so new books and homebrew files work with no table to maintain. **The checker is out of the first milestone** (designed, not built). *Rejected:* parser only; hand-maintained profile table (goes stale).

- **D12 — No free text, except one optional identifier line at the top. DECIDED (2026-09-04).** No comments, no notes, no concept line. *Rejected:* `#` comments; structured per-line notes.

- ↪ D13–D17 · absence as unknown, full-word keys, syntax shape A, TypeScript build, M1 scope (in SPEC) · `DECISIONS-settled.md`

## OPEN

- **O1 — trpgpaste.** Game-neutral core + per-game profiles is a design constraint from D8; which other games, and what a "level" means there, is unevaluated. Unblocked by: someone with expertise in a second system.

- ~~**O2 — Checker data source.**~~ **DECIDED → D35.**

- ~~**O3 — Package distribution.**~~ **DECIDED → D44.**

- ↪ D18–D24 · spec-drafting grammar: `---` separator, `Feature`/no `Level:`, details belong to their entity, `Prepared` rule, silent defaults (in SPEC) · `DECISIONS-settled.md`

## Panel round (2026-09-04) ↪ D25–D32 · panel round: brackets and quotes, Species/Background blocks, `Options`, unplaced lines, emit data-free, `Paste:` and `X-` keys (in SPEC) · `DECISIONS-settled.md`

## OPEN (added)

- **O4 — Feat detail slot order.** ⚑ re-logged 2026-11-20 (D271): still OPEN; M2 shipped without a per-feat table and nothing settled it. Decide when a feat whose printed order is unclear shows up in a real paste. Ability first, then printed order, is the rule; a per-feat table in the checker supplement will be needed for feats whose printed order is unclear. ~~Decide at M2~~.

- ↪ D33, D34 · `Items` key, extras flagged at info · `DECISIONS-settled.md`

- **D35 — The checker's data is a compact slot table extracted from the 5etools mirror, plus a hand-kept supplement. DECIDED (2026-09-04, closes O2).** `scripts/extract-slots.mjs` emits names, counts, levels and option lists per class, subclass, species, background, feat, optional feature, spell and magic item — no rules text. Edition is taken from the entity when present, else inferred from the source's publication date (XPHB shipped 2024-09-17); ties between sources prefer the core group. `data/slots.json` is gitignored; `data/srd/slots.json` (SRD-flagged entities) is committed and drives the tests. `data/supplement.json` holds prose-only slots (Divine Order options come from data; lineage trait names, spellbook sizes, invocation sub-picks, Mystic Arcanum do not). *Rejected:* reading raw 5etools JSON at check time (schema coupling, not shippable); a hand-maintained profile table (D11).

- ↪ D36–D40 · missing vs extras, unplaced `Feature`, 2014 subraces, Medium default, `+N` prefix (in SPEC) · `DECISIONS-settled.md`

## M2 tail scoping (2026-09-05) ↪ D41–D44 · M2 tail as 0.5.0, level-0 classes, contains-match fallback, UMD distribution · `DECISIONS-settled.md`

## Share links (2026-09-29) ↪ D45 · the share service (Worker + KV, short links); its open list closed by D65–D74 · `DECISIONS-settled.md`

## Real-build stress wave (2026-09-30) — mechanism: Francesco's calls on the report of the real-build stress wave (cf-D81), relayed by the character-forge session

The wave converted 24 posted 2024 builds into pastes; its evidence stays local (names only here). Its format gaps are F1–F8, its checker findings C1–C3.

- ↪ D46–D51 · real-build wave: named partial `Scores`, unnamed picks, `Classes` runs, option-granted feats, pick data · `DECISIONS-settled.md`

- **D52 — One paste is one build: no change. DECIDED (2026-09-30).** Alternatives, tentative picks and variants ("Human or Aasimar", "Topple or Sap", "Version B: Rogue 1 first") are separate pastes. Closes F7 (8 builds).
  *Rejected:* an alternative or tentative marker; multi-build documents (`---` stays reserved, D18).

- ↪ D53–D56 · class order a claim, origin feat at ASI, magic variants, `X-` keys as authored · `DECISIONS-settled.md`

- **D57 — Releases are annotated `vX.Y.Z` tags, made by hand, matching `package.json` and a dated CHANGELOG heading; a tag is never moved. DECIDED (2026-09-30).** Francesco asked for a strict tagging convention when 0.6.0 went out, then chose the lighter of three drafts. A release is one commit on `main` (`chore(release): X.Y.Z`) that turns `## Unreleased` into `## X.Y.Z — YYYY-MM-DD` and matches `package.json`; `npm run build` and `npm run verify` pass on it; the tag `vX.Y.Z` is annotated, points at that commit, and its message is `dndpaste X.Y.Z · SPEC A.B` plus the CHANGELOG section. A pushed tag is never moved, deleted or re-pointed: a bad release is fixed by the next patch. SemVer before 1.0: minor for a grammar or behaviour change, patch for fixes and data only. Consumers copy a tagged build and cite the tag (amends D44's "version stamped in `CHANGELOG.md`"). Tag history starts at v0.6.0 (no backfill).
  *Rejected:* a `npm run release` script that refuses unless every rule holds, plus a verify test for a version bump with no CHANGELOG heading (the strict draft; more machinery than this repo needs today); the same without backfilling v0.4.0 and v0.5.0.
  *Enforced by:* prose (this entry, CLAUDE.md Conventions).

- ↪ D58 · character-forge v2 consumes 0.6.0 ESM · `DECISIONS-settled.md`

## HP key (2026-10-10) ↪ D59, D60 · the `HP` key and character-forge's switch from `X-HP` (in SPEC) · `DECISIONS-settled.md`

## Release 0.7.0 (2026-11-10) ↪ D61, D62 · 0.7.0 ships `HP` + `Producer`; the `Producer` header (in SPEC) · `DECISIONS-settled.md`

## Share site scoping (2026-11-15) — mechanism: /interview, AskUserQuestion, 6 rounds

Closes D45's open list and `SHARE-SITE-SIZING.md`'s seven open calls for a one-shot build; the brief is `SITE.md`. D63–D64 are left unused: "a D64 crossing" in D58–D61 means cf-D64. D80–D89 are reserved for the look jam.

- ↪ D65 · shares immutable and kept (reopened by D96, AMENDED → D97) · `DECISIONS-settled.md`

- **D66 — No checker on the site in v1; later, an SRD checker, then a checker on data the visitor supplies. DECIDED (2026-11-15).** v1 shows parse diagnostics only: `E###` blocks a save, warnings show. Follow-ups, in order: (1) the SRD checker on the committed subset, after the library gets a "data unavailable" mode that suppresses unknown-name findings, plus a release; (2) "Check against data": the visitor enters a 5etools-format data URL or loads files, the browser fetches them and builds the slot table locally (the extractor refactored into a pure library function), nothing passes through or is stored by the site, and the site names and links no source.
  *Raw note:* "Leaning no checker in v1, but could we implement technically an SRD and 5etools checker?" · "None in v1. For 5etools, can we connect it to the 5etools repo, without republishing anything?"
  *Rejected:* SRD checker in v1 (a library session and release first breaks the one-shot); a preset that pulls from the 5etools repo (the public site would name a repo that is taken down and moved, and break each time); a hosted full table (publishing WotC-derived data, out by the IP check).

- ↪ D67–D74 · plain-text names, v1 QoL set, link shapes, workers.dev hosting, abuse limits, jam first, `site/`, M3 scope (landed; SITE.md) · `DECISIONS-settled.md`

## Site look jam (2026-11-15) — mechanism: /jam, 4 rounds on an Artifact board + AskUserQuestion, in a session started by the overseer

Frames and build brief: `jams/2026-11-15-site-look/` (local only, `.git/info/exclude`). D80–D89 amend D68 (D84) and D72 (D82).

- ↪ D80–D87 · dry-text look, hanging keys, colour by kind, key hints, no preview pane, import bar, form layout, split button (landed; SITE.md) · `DECISIONS-settled.md`

- **D88 — Build-wide look rules. DECIDED (2026-11-15).** (a) Every text/background pair meets WCAG AA (4.5:1, 3:1 for large text and UI parts) in light and dark, checked in the build, not eyeballed; the jam already darkened item, subclass, species and source-code hues for this. (b) No clashing hue pairs: a status glyph takes the colour of the control it sits on (no green check on the garnet button). (c) The About page copy is dry, plain and free of AI tells. (d) Form errors use amber plus the E-code, never the accent (from 1.2).
  *Raw note:* "When building, make sure no colors without enough contrast or with clashing hues like the check" · "A note: make sure the about is dry, and doesn't have AI tells."
  *Enforced by:* build brief Done-when (contrast check), fresh-eyes review.

- ↪ D89, D90 · frame notes, E001 hold while typing · `DECISIONS-settled.md`

## T3.3 review fixes (2026-11-16) ↪ D91, D92 · daily cap in a Durable Object, starting limits · `DECISIONS-settled.md`

## /ui-review of the share site (2026-11-16) — mechanism: /ui-review round 1 (24 items, all approved) + AskUserQuestion, 2 rounds (7 questions), worker session on branch `claude/site-m3-ee11e4`

- ↪ D93–D96 · phone sheets, problem row, save needs one key, D96 edit reopen (closed by D97) · `DECISIONS-settled.md`

- ~~⚑ **Parked, not decided (2026-11-16, owner: overseer):**~~ **Closed 2026-11-20 (D271):** empty value → D112; writing help → D121–D125 (Start a build), D151 and D170–D174 (names, keys, ghost text); favicon → the logo follow-up (D148). Still open, re-logged as O6: Tidy fixing the case of known names. an empty value (`Spells:` with nothing) as "unspecified / any" instead of E006 → SPEC 0.8 discussion (pin: "Empty lines shouldn't necessarily be an error"); Tidy fixing the case of known names → after launch, once a name list ships with the site; favicon "ok for now". Writing help in the form (note: "can we have the option to prefill it with at least the starting keys? How much can we help the user while writing?") → overseer, after 3.2d: a "Start a build" skeleton, smarter key hints, value suggestions once a name list ships.

## Editing shares (2026-11-16) ↪ D97 · owner edits as revisions · `DECISIONS-settled.md`

## UI review round 3 (2026-11-16) ↪ D98 · phone dock status row · `DECISIONS-settled.md`

## Format guide (2026-11-16) ↪ D99, D100 · `/guide` and Start from an example, copy edit link · `DECISIONS-settled.md`

## Pre-deploy review of edits and guide (2026-11-16) ↪ D101, D102 · edit counts as 2 saves, unsaved draft restore · `DECISIONS-settled.md`

## Short /ui-review of 3.2d + 3.2e (2026-11-16) — mechanism: /ui-review, 1 round (11 items, all approved), worker session local_175b755f; logged by the overseer

- **D103 — The site never names 5etools; source codes are "the short code of the book" (PHB, XPHB, TCE), and the site lists them. DECIDED (2026-11-16).** No "usual" or "standard" wording. The list of codes lives on the site and is kept in step with 5etools silently. Content boundary unchanged (codes only, no data).
  *Raw note:* "Drop the name, list codes, don't mention them 'as usual', we silently update the list from 5etools."
  *Rejected:* naming 5etools on the guide (the line it replaces).
  *Enforced by:* `site/src/guide.ts` line (297dc24); the code list page is not built yet.

- ↪ D104, D105 · example build shape, SPEC 0.8 before T3.4 · `DECISIONS-settled.md`

## SPEC 0.8 format calls (2026-11-16) — mechanism: /interview, AskUserQuestion, 6 rounds, overseer; topics from the short /ui-review (D105)

- ↪ D106–D112 · SPEC 0.8: `/` in scores, `Ability` gone, `Scores` holds increases, ASI as feat, slot markers, `Gear`, empty value = not chosen yet (in SPEC) · `DECISIONS-settled.md`

- **D113 — 0.8 reads 0.7 keys with a "renamed key" warning and writes the 0.8 form. DECIDED (2026-11-16); AMENDED → D142 (aliases stay for as long as `Paste: 1`, not until 1.0).** Aliases `ASI`, `Ability`, `Fighting Style`, `Equipment`, `Items` stay ~~until 1.0~~ for as long as `Paste: 1`. An old `Ability` line that the parser can't move into its owner's details without data stays as written, with the warning. character-forge and the 0.7 fixtures keep working.
  *Raw note:* "Read old, write new feels better, unless the cost is too high. In general, we need an action plan for dndpaste format updates."
  *Rejected:* a clean break.
  ⚑ **OPEN (owner: overseer → Francesco, 2026-11-16): a format-update policy** ("an action plan for dndpaste format updates"): how a SPEC change is proposed, aliased, released, announced to consumers and retired. Drafted with the 0.8 build for his read.

## T3.6 site on 0.8 (2026-11-16) ↪ D114–D118 · /codes table, book-code list, slot-marker look, live site and KV ids, workers.dev subdomain · `DECISIONS-settled.md`

## Share image (2026-11-16) ↪ D119, D120 · share image + Post to Reddit, cited books list · `DECISIONS-settled.md`

## Class presets (2026-11-17) ↪ D121–D125 · Start a build mini-builder and class presets from the SRD table · `DECISIONS-settled.md`

## Start a build review (2026-11-17) ↪ D126–D128 + a closed ⚑ · presets follow the owed-slot ledger, Other class, builder copy; ghost-count flag (closed by D129–D133) · `DECISIONS-settled.md`

## Ghost pick counts (2026-11-17) ↪ D129–D134 · ghost pick counts: what, look, where, over-count, generation, chip review · `DECISIONS-settled.md`

## Name and licence (2026-11-17) — mechanism: /panel, 4 personas (Skeptic, Domain Purist on opus; Maintainer on sonnet; End User + web check on sonnet), split 2–2; then AskUserQuestion, 1 round, overseer

- **D135 — The name stays dndpaste; a rename is planned only with a custom domain, and then toward a game-neutral name. DECIDED (2026-11-17).** The panel's verified facts: the repo is already public (main, `v0.6.0` pushed), so the old name stays in history whatever happens; the format covers D&D only (`Rules:` is `2014`/`2024`, sources are 5etools codes), so "5epaste" would promise Tales of the Valiant, A5E and Black Flag support it lacks; the live store held 1 share. When a custom domain is bought (D70 `CANONICAL_ORIGIN`), reconsider: a game-neutral core name, with `dnd5e` as one profile among community-added ones (O1), TTRPGs and video games alike, "anything that could work as a recipe".
  *Raw note:* "is it worth is changing the whole tool to 5epaste instead, considering that's the only edition we support?" → "for now we can keep as is, and plan this step only when we eventually get a custom domain, wt which point we may consider making it game-neutral and support the addition from the community of a wide variety of games, both ttrpg and videogames as well, anything that could work as a \"recipe\"".
  *Rejected:* 5epaste now (Maintainer, End User: cheap before a push, "5e" is an established tool prefix as in 5etools; but the push had already happened and the scope claim is false); a neutral name picked now (no second profile to test it against).
  *Amends:* O1 (scope widened to any game with a build "recipe", community-added). *Enforced by:* prose only.

- **D136 — SRD-derived data carries the CC-BY-4.0 attribution in `NOTICE.md`; generated data never records local paths. DECIDED (2026-11-17).** Found by the panel: `data/srd/slots.json` was public with no attribution and with the maintainer's local mirror path in `meta.mirror`. The extract script no longer writes `mirror`; the committed file lost the field (no other change); README links `NOTICE.md`.
  *Raw note:* picked "Fix both now (Recommended)".
  *Rejected:* attribution only; queueing both.
  *Enforced by:* prose only (no test checks `meta`). ⚑ (overseer → Francesco, 2026-11-17): ~~check the two attribution sentences against WotC's SRD pages; `isSrd` in `scripts/extract-slots.mjs` also counts Basic Rules entities (`basicRules`, `basicRules2024`), which are free but not CC-licensed: names and counts only, but decide whether the committed subset keeps them.~~ Closed by D141. The public history still holds the old `meta.mirror` value.

## Build stamp and update notice (2026-11-17) ↪ D137–D140 · version line, update toast, reload restore, toast copy · `DECISIONS-settled.md`

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

- ↪ D144–D148 · old keys on the site, GitHub releases, Issues feedback, feedback link, temp logo · `DECISIONS-settled.md`

## Empty lines in the edit form (2026-11-19) ↪ D149 · W004 lines in their own To choose list · `DECISIONS-settled.md`

## Pre-launch form notes (2026-11-19) — mechanism: AskUserQuestion, 1 round (3 questions), overseer

- ↪ D150 · remembered author · `DECISIONS-settled.md`

- **D151 — Name autocomplete in the editor, from the committed SRD subset, before launch, on desktop and phone. DECIDED (2026-11-19); amends D83 (the popup was queued for later).** Suggests names for value keys (spells, feats, items, species and the rest) as you type. It never blocks a name it doesn't know: any book works, and the UI must not suggest otherwise. Names from a visitor's own 5etools data come later, with D66's visitor-data step. The names list counts against the bundle check.
  *Raw note:* "when writing, could we have an autocomplete, at least from the SRD and possibly later if one connects the 5etools repo"; picked "Before launch, SRD only".
  *Rejected:* after launch (he wants it in the first impression); desktop only (two layouts that behave differently).
  *Enforced by:* pending.

- ↪ D152, D153 · copy pass scope (done by D230), 2024 Masteries count · `DECISIONS-settled.md`

## Visitor data, safely (2026-11-19) — mechanism: overseer analysis, Francesco's "Yes, log it and fix the README line"

- **D160 — The later visitor-data step (D66 step 2; D151's "your own data") is a file the visitor picks, read in their browser only, never uploaded, never fetched by the site, and never named or linked as 5etools. DECIDED (2026-11-19); AMENDED → D244 (generic JSON too), D248 (GitHub links, fetched browser-side).** The importer keeps names, sources and counts only, and drops any text the file carries before anything is kept or shown. It accepts a plain documented names format anyone can write by hand, so it is a generic importer, not a door to one site. The UI says "your own data" or "a names file". The repo's public docs describe data inputs generically; citing 5etools source codes (`XPHB`) as a naming convention stays. Not built: planned for later (PLAN Later).
  *Raw note:* "Is there any way that it's safe for me to suggest linking 5etools repo eventually? … I feel like just having a connection exposes me to legal issues" → "Yes, log it and fix the README line. We'll plan for later to try to implement the generic importer".
  *Why:* names and indexes carry little risk; a live connection to a mirror WotC has taken down points visitors at infringing material, and most D&D subreddits remove posts that promote it.
  *Rejected:* a "connect 5etools" button or a fetch from a mirror; naming 5etools as a supported source.
  *Enforced by:* prose only (README reworded in this commit).

## Name autocomplete (2026-11-19) — mechanism: /interview, AskUserQuestion, 3 rounds (9 questions), D151 worker

- **D154 — The name list opens on its own once the name under the cursor has ~~2 letters~~ (AMENDED → D164: the letters follow the list's size); Tab takes the top match, the arrows pick another and then Enter or Tab takes it, Enter without arrowing is a new line; Esc closes it. On phone, a tap takes a suggestion. DECIDED (2026-11-19); AMENDED → D256 (while no source is added, a no-match list stays open on one line).** It closes on a comma, a `|` (a source being typed), or when nothing matches. A name that isn't in the list is never swapped out by Enter (D151: any book works).
  *Raw note:* picked "After 2 letters (Recommended)" and "Tab, or Enter after arrows (Recommended)".
  *Rejected:* after 1 letter (hundreds of matches, opens on almost every keystroke); only on request, Ctrl+Space or a dock button (few find it); Tab or Enter both take the top match (Enter after a homebrew name would replace it); arrows and Enter only (two keys for every name).
  *Enforced by:* `site/test/complete.test.ts` (D154 tests) (2e5323b, unmerged).

- **D155 — A taken name gets `|SOURCE` only when it's needed: the list follows the paste's `Rules:`. DECIDED (2026-11-19).** A name in the `Rules:` edition goes in bare. A name only the other edition has goes in with its book (`|PHB`, `|XPHB`, `|DMG`, `|XDMG`), and its row shows that book. With no `Rules:` line, one row per name and bare names. A source already written after the name is left alone.
  *Raw note:* picked "Only when needed (Recommended)".
  *Rejected:* always write the source (longer lines; the canonical form doesn't need it); never (a 2014 pick in a 2024 paste silently means the 2024 entry).
  *Enforced by:* `site/test/complete.test.ts` ("D155: sources follow Rules") (2e5323b, unmerged).

- **D156 — Each key suggests its own kind of name; in a level block the block's class comes first and nothing is hidden; inside `[ ]` the list follows the slot where the SRD table knows it, else a general list. DECIDED (2026-11-19); AMENDED → D266 (an unknown `Feature:` offers nothing inside `[ ]`; an unknown feat keeps the general list).** Spells and Prepared: spells of 1st level and up. Cantrips: cantrips. Feat: feats; `Feat (Fighting Style)`, `(Origin)`, `(Epic Boon)` narrow to that category (fighting styles include the 2014 optional features). Options: optional features. Species, Background, Subclass (printed or short name), Classes and the `L<n> …` header: their own kind. Gear: items and magic variants. Masteries: mundane items (the table has no weapon flag). Skills and Expertise: the 18 skills. Languages and Tools: the ones the table names (tools also from mundane items). Feature: the lineage and ancestry features the supplement names. Class first: in `L5 Wizard`, wizard spells, wizard subclasses and the wizard's option families lead; in the header, the `Classes:` line's classes. Known slots: a feat's ability choice, Magic Initiate's class then that class's cantrips then its 1st-level spells, an ASI's `+2 …` ability, a species lineage (Elven Lineage, Fiendish Legacy: ability then lineage; Draconic and Giant Ancestry: the supplement's list), `Spellcasting [ … ]`'s ability, an option with picks (cantrips). Elsewhere inside `[ ]`: abilities, skills and spells. Names already on the line aren't offered again.
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

- **D163 — Brackets: typing `[` writes its `]` when only a separator, a space or the line's end follows; `]` steps over the one there; deleting back between an empty pair takes both. Inside `[ ]` the list opens with a hint line naming each `;` group the table knows, the cursor's group in bold (`ability; class; 2 cantrips; 1st-level spell`), shown even before a name fits. Class features with a choice (Divine Order, Primal Order, Elemental Fury) join `Feature:` and offer their options inside `[ ]`. DECIDED (2026-11-19); AMENDED → D266 (the hint line only for two groups or more).** Handled on `beforeinput`, so phone keyboards pair it too. A slot the table doesn't know keeps the general list and no hint (D156). Round 2: a pick inside `[ ]` writes `, ` while its group wants more names and `; ` when the next group follows, then opens that group's list; Thaumaturge (Divine Order) and Magician (Primal Order) add a second group, a cantrip of that class, from `featureOptionCantrips` in `data/supplement.json` (names only). Round 3: on phone the hint is only the cursor's group and where it is (`Class 2/4`), ruled off from the chips; the full line stays on desktop.
  *Raw note:* "When opening square brackets that require a specific order and type of info, is there any way to "suggest" or nudge the right fill? It should also auto type the closing bracket."; picked "Auto ] + slot hint (Recommended)". On ac-general: "Divine Order should specify Warden/Thaumaturge, that is the main choice" (the 2024 Cleric's Divine Order is Protector or Thaumaturge; Warden is the Druid's Primal Order; both now offered).
  Round 2: "on autocomplete in brackets with multiple choices, add also the ; and space and start the next choice immediately"; "Picking Thaumaturge also should add the cantrip choice after it"; picked "Second group, cleric cantrips (Recommended)". Round 3: "On mobile, the suggestion row is a bit confused, the text placement is unclear and after inserting the first part, ability text lingers. Make each choice clearer, dry".
  *Rejected:* the closing bracket only; the hint only; parking both; parking the Thaumaturge group with D161. A ghost hint inside the empty brackets (it would sit over the `]`): the hint lives in the list instead.
  *Enforced by:* `site/test/complete.test.ts` ("D163: …"); the pairing itself is in `site/src/client/form.ts`, checked in /ui-review (2e5323b, unmerged).

- **D164 — When the list opens follows how many names fit the spot: 12 or fewer open on the empty spot (abilities, a feature's options, one class's cantrips), up to 40 at 1 letter (skills, languages, classes, subclasses, tools), more at 2 (spells, items, feats, the general list). DECIDED (2026-11-19); amends D154.** Same on desktop and phone. Only typing opens it (D154): reaching a spot with the arrows doesn't.
  *Raw note:* "We should probably start the suggestions at one letter instead of two."; then "Can we have it depend on array size? For example, typing two letters to get WIS doesn't make much sense, but for a general list or wide spell list may be too broad. Is it ever tied to an array list or what is the standard?"; picked "Small lists open at 0".
  *Rejected:* 1 letter everywhere (hundreds of spells on every first letter); 1 letter on phone only; keeping 2 everywhere; 40-and-under at 1 letter with no empty-spot opening.
  *Enforced by:* `site/test/complete.test.ts` ("D164: …") (2e5323b, unmerged).
  ~~⚑ (worker → overseer, 2026-11-19, from /ui-review rounds 2–4, not in this branch):~~ **Closed 2026-11-20 (D271):** (1) → D170, D172; (2) → D174; (3) → D175, D176. (1) "We should set autocomplete also for main headers (ex. species etc.)": Francesco means both the values on the empty spot (`Species: ` opens before a letter) and the key names themselves (`Spe` → `Species:`). (2) After a pick in a group that wants more names (`Guidance, `) nothing says another is expected: "I think we should consider having a ghost text before typing directly in the text box." (3) "The count chip shouldn't reset to 0/4 immediately after typing a comma. Also, the too-quick-to-signal error note hasn't be tackled yet." (ghost counts D130, error hold D90).

## SRD subset data fixes (2026-11-19) ↪ D165, D166 · Masteries list weapons with mastery only, 2014 subraces on their own SRD flag · `DECISIONS-settled.md`

## Editor polish (2026-11-19) ↪ D170–D176 · editor polish: key autocomplete, empty-spot lists, Suggestions switch, ghost kind text, chip hold, 3 s error hold · `DECISIONS-settled.md`

## Family keys and the spell level cap (2026-11-19) ↪ D180–D185 · SPEC 0.9: family keys, `Options (<family>)`, Masteries family, `Feature` picks, spell level caps, checker per family (in SPEC) · `DECISIONS-settled.md`

## The editor reads SPEC 0.9 (2026-11-19) ↪ D177, D178, D186, D190 · editor on 0.9: family key hints, group count chip, family-aware autocomplete, whole-list preparers · `DECISIONS-settled.md`

## Wide user test before the 0.9 release (2026-11-19) ↪ D191 · the wide user test before 0.9 · `DECISIONS-settled.md`

## Wide user test triage (2026-11-19) — mechanism: T3.12 board (37 reproduced cards T01–T37, private Artifact) marked by Francesco, then AskUserQuestion, 1 round (4 questions); user-test worker on `claude/editor-polish-44bc86`

Run per D191: 19 vault builds, 5 headless personas + phone and desktop editor sessions; results, logs and the board's card text stay untracked in `.claude/user-test/` (board: claude.ai/artifact/FWu5y1YUh7wACGQeXemTtL). Card ids below are the board's.

- ↪ D192, D193 · fix-now checker messages, granted spells not written · `DECISIONS-settled.md`

- **D194 — Any element can be homebrewed or taken from Unearthed Arcana without breaking the builder. DECIDED (2026-11-19).** (T03) A guide section on UA and homebrew sources; /codes lists the UA codes (start from the custom UA codes character-forge uses); the share page says "Sources" and sets unknown codes apart from books; the checker gives an info on a code not on /codes. (T23) `Options (<name>)` stays a free marker and the guide lists the known families. (T30) Names may contain parentheses (`Human (Mark of Making)`); one dragonmark example per edition. (T29) Autocomplete ranks the build's edition first and marks other-edition names.
  *Raw note:* T03: "Check character-forge, I think we used custom UA codes there". T23: "Yes, the name in parenthesis should stay free so that any homebrew has a way to be typed regardless. In general, we need to make sure that there is a way to homebrew any element (ex. class, species etc.) without breaking the builder."
  *Rejected:* none offered.
  *Enforced by:* prose only.

- ↪ D195–D198 · 0.9 format additions, editor chips, library/README, guide examples · `DECISIONS-settled.md`

- **D199 — Not for 0.9: the kit key and To choose labels wait; a header pick is never rerouted to another class. DECIDED (2026-11-19).** (T13, later) `Gear` stays the catch-all for the kit in use. (T36, later) To choose chips keep bare line numbers (D149). (T18, no) The checker doesn't reassign a header pick to the class whose list has it: a DM may allow an off-list pick.
  *Raw note:* T13: "For now, Gear is a catch all for kit". T18: "I'm not sure if to fix this, I don't want in general to reroute user choices. A user may want to force select a cantrip for a class that doesn't have because the dm allowed it for example."
  *Rejected:* T13 an `Equipped:` key or Gear details now; T18 the board's fix.
  *Enforced by:* prose only.

## Wide user test fixes (2026-11-19) — mechanism: AskUserQuestion, 1 round (2 questions) for D200–D201; the rest delegated to the lib-fixes worker on `claude/lib-fixes-0-9` under D192–D197

Built in caa63f7 (library, checker, CLI, SPEC), 7d7196c (README), 30480f7 (guide). Tests: `test/usertest.test.ts`.

- ↪ D200–D204 · `Note:` key, granted highlights, emit keeps failed lines, hints and fixes, `dndpaste/check` export (in SPEC) · `DECISIONS-settled.md`

- **D205 — A source code no entity of the slot table carries is accepted with one info: homebrew (`HB`), Unearthed Arcana (the library's `UA_SOURCES`, from the local UA collection by `scripts/ua-sources.mjs`, the codes character-forge reads), or not a known book code. DECIDED (2026-11-19).** (D194 T03.) A known book the table lacks resolves as before: the extract writes `meta.sources`, every book code the full table cites, into both tables.
  *Raw note:* T03: "Check character-forge, I think we used custom UA codes there". (character-forge uses the collection's own `XUA…` codes, no custom ones.)
  *Rejected:* a warning for an unknown code (D194: any element can be homebrew without breaking the builder).
  *Enforced by:* `test/usertest.test.ts` (D194, D205), SPEC §6.

- ↪ D206 · 2024 half-feat ability slot · `DECISIONS-settled.md`

### Wide user test: editor and share-page fixes (D196, D192 T01, D194; /ui-review rounds 1–3, reviews/2026-11-19-user-test-fixes)

- ↪ D210–D218 · over chips, species owed lines, 2014 preparers, move-line fixes, old-key fixes, level owed lines, empty lines hidden, Sources, /codes UA · `DECISIONS-settled.md`

- **D219 — Key hints follow the written subclass; autocomplete dims other-edition names. DECIDED (2026-11-19).** (T28) Maneuvers, Arcane Shots, Runes and Disciplines show only for their subclass once the class has a `Subclass` line (a header line counts for a single-class build); a half-typed key still finds any. (T29) Under `Rules:`, a name only the other edition has ranks after the edition's own and is dimmed like an over-level spell; its `|SOURCE` says which book (review round 1 dropped the `2014` chip).
  *Enforced by:* `site/test/form.test.ts` ("D219 (T28)…"), `site/test/complete.test.ts` ("D219 (T29, review)…").

- ↪ D225–D229 · fixes from the library, one UA list, greyed skills, /codes dates and filters, Tidy badge · `DECISIONS-settled.md`

### Subclass placement and bare names (2026-11-19) — mechanism: Francesco's calls via the lib-fixes brief (D213, D214 raw notes) + AskUserQuestion, 1 round (1 question), lib-fixes round 2 worker on `claude/lib-fixes-0-9`

- ↪ D220 · `Subclass` placement (in SPEC) · `DECISIONS-settled.md`

- **D221 — A bare name means its newest printing within `Rules` (newest of all with no `Rules`); a setting book's or adventure's printing gives way to a core book's of the same edition; a name only Unearthed Arcana prints always carries its code. DECIDED (2026-11-19).** Resolution order: published before UA, then the `Rules` edition (D8 stands), then setting/adventure printings drop when a core book of the same edition prints the name, then the newest release date. The extract writes `meta.sourceDates` (book code → `published`, 85 of 92 codes; undated ones rank oldest) and `meta.settingSources` (groups setting, setting-alt, adventure); a table with no dates falls back to core-first. A bare name that resolves only to UA content (`isUaSource`: `UA_SOURCES` or a `UA`/`XUA` prefix) is `unresolved`/warning, "write it as Mystic|UATheMysticClass". In the full table only the Mystic class and its 6 subclasses are UA; other UA codes are not in the table and stay accepted at info (D205). "Several sources" remains only for same-date printings. Closes D214's default-source ⚑.
  *Raw note:* "it should always defaults to the most recent iteration except UA which must be specified" (D214). Brief: "latest within `Rules`". Round 1 (setting books): "Newest, setting below core (Recommended)".
  *Options:* A newest, setting below core / B pure newest / C core first, then newest.
  *Chosen:* A — fixes both failures. *Rejected:* B — bare `Elf` (2024 or no Rules) became Lorwyn: First Light's setting elf. C — the old order: bare Goblin, Kobold, Kenku, Aasimar (2014) resolved to the DMG's monster versions, not Monsters of the Multiverse.
  *Enforced by:* `test/resolve.test.ts` (D221; full-table cases skip without `data/slots.json`), SPEC §5 preamble, §3.2, §6, README checker section, guide "Names, sources and details".

### D152 copy pass (2026-11-19) — mechanism: review board (private Artifact, 2 rounds, 324 strings inventoried, 53 proposals) marked by Francesco + AskUserQuestion, 1 round (1 question); copy-pass worker on `claude/copy-pass-d152`

- ↪ D230 · the approved functional copy set · `DECISIONS-settled.md`

- **D231 — UI copy uses contractions, and a failure names who failed. DECIDED (2026-11-19).** "Couldn't save the build", "The site couldn't read that file", "can't", "didn't", never "could not be saved". Prose pages follow when next edited. *Rejected:* full forms (the site mixed both). *Enforced by:* prose only — advisory.

- **D232 — The editor link and its page are "New build"; nothing in the UI says "paste". DECIDED (2026-11-19).** Header, `<title>`, error pages. The brand stays dndpaste. *Rejected:* "New paste" (every other string says build). *Enforced by:* prose only — advisory.

- ↪ D233, D234 · tidied-text copy menu, /about privacy line · `DECISIONS-settled.md`

### Editor bugs from the live 0.9.0 test (2026-11-20) — mechanism: Francesco's live test, relayed in the overseer's brief; editor-bugs worker on `claude/editor-bugs-091`

- **D240 — Client code never writes a `style` attribute; positions go through CSSOM. DECIDED (2026-11-20).** The fix buttons over the hint underlines (D190, D211, D213, D215, D225) were placed with `style="…"` in `innerHTML`; the live CSP (`style-src 'self'`) drops that, so every button stayed 0×0 at the editor's corner and no one-click fix could be clicked on the live site. The /ui-review dev CSP (`src/devreview.ts`) allows inline styles, which is why review never saw it. `placeNotes` now builds the buttons and sets `left/top/width/height` through `element.style`; it also re-places them when the editor reflows without a column change and when the web font arrives.
  *Raw note:* (brief) "clicking it does nothing … the `.wlb` button over the mark was left 0x0 at the editor's top-left."
  *Rejected:* re-placing after layout only (rAF, pointerdown), as the brief guessed: the measurements were right, the CSP dropped them; `'unsafe-inline'` in the live CSP (weakens it for one overlay).
  *Enforced by:* `site/test/form.test.ts` ("D240: client code never writes a style attribute…"). *Landed:* 751c739.

- **D241 — A `Subclass` line lists its class's subclasses first; other classes' follow, dimmed, still pickable. DECIDED (2026-11-20).** The class: the level block's, else the header's `Classes` (all of them). The class's own subclass from the other edition (dimmed, D219) comes before another class's; outside a short list now ranks after the other edition, for skills (D227) as well. No class known: nothing dimmed.
  *Raw note:* (brief) "On a `Subclass` line, the list offers every subclass. It should list the subclasses of the class that line belongs to first … Dim the rest, still pickable."
  *Rejected:* hiding other classes' subclasses (a DM may allow it, D199); ranking the edition before the class (the 2014 Wizard subclass would sit behind every 2024 subclass).
  *Enforced by:* `site/test/complete.test.ts` ("D241…"). *Landed:* 51b7a13.

- **D242 — A pick that asks a detail is written with its brackets, the cursor inside, and the list opens on its first group. DECIDED (2026-11-20).** Which names: `DETAILS` in `names.gen.ts` (names only, by printing): feats with an ability, version, cantrips or spells to pick; options with picks (a pact boon in both books); class features with options; lineage traits; the chosen forms of D195 (Pact of the Chain, Pact of the Blade, Find Familiar, Find Steed, Find Greater Steed, the Summon spells). The printing is the `|SOURCE` the pick writes, else `Rules:`, else any. Never inside brackets, never where brackets or a source already follow. Written `Name []`, the same as typing `[` (D163); a form's brackets offer no names.
  *Raw note:* (brief) "Picking a name that takes a detail … should insert `Name [ ]` with the cursor inside the brackets … Don't add brackets to names that take none."
  *Rejected:* brackets on every name of a kind (2014 Grappler and 2014 Agonizing Blast ask nothing); `[ ]` with a space (typing `[` writes `[]`, and a pick inside trims the spaces anyway; `Name []` approved at /ui-review round 1).
  *Enforced by:* `site/test/complete.test.ts` ("D242…"), `site/test/names.test.ts` ("D242…"). *Landed:* 206ad04.

- **D243 — Every list with a clear class filter dims what falls outside it, as the Subclass list does (D241). DECIDED (2026-11-20).** Where the line's class is clear (a level block, or the header with `Classes`), `Cantrips`, `Spells` and `Prepared` dim another class's spells, `Feature` dims another class's features and, in a level block, the species' lineage traits (review round 2; a Species block leads with the lineage traits and dims every class feature), and a plain `Options` line dims options of another class's families. All still pickable, ranked after the class's own. No filter in a Species or Background block. Ranking among dimmed rows: over the level cap last (D162), then outside the class, then the other edition. Family keys, `Feat (…)` markers, `Masteries` and a feat's class slot already list only what fits.
  *Raw note:* (/ui-review round 1, on the Subclass item) "Make sure this change affects every line where there's a clear filter in the dropdown"; then AskUserQuestion: Spells off the class list, Class features, Plain Options line, and "Something else" (read as: any other clear filter; none left).
  *Raw note (round 2, Feature):* "I feel like if a feature header is inside a level block, it may grey out species options for example"
  *Rejected:* hiding another class's names (D199: a DM may allow them); dimming spells in a Species block (a species spell can come from any list).
  *Enforced by:* `site/test/complete.test.ts` ("D243…"; the D184 test now checks the cap on Warlock spells). *Landed:* 51b7a13. /ui-review: 3 rounds, all approved (`reviews/2026-11-20-editor-bugs`).

## Your own sources scoping (2026-11-20) ↪ D244–D251 · importer shapes, browser storage, names+options+counts, /sources page, GitHub links, ranking, per-book SRD hiding · Landed: 1031bf4 (M6, deployed 2026-11-20) · `DECISIONS-settled.md`

## /sources page jam (2026-11-20) ↪ D252–D257 · one column, three lenses, switches, SRD hidden per book and kind, ways in, build frames · Landed: 1031bf4 (M6, deployed 2026-11-20) · `DECISIONS-settled.md`

## T6.2 your own sources, build calls (2026-11-20) ↪ D258–D265 · plain names format, row books, folder rule and the build calls · Landed: 1031bf4 (M6, deployed 2026-11-20) · `DECISIONS-settled.md`

## T6.2 your own sources, /ui-review (2026-11-20) ↪ D266–D270 · review rounds 1–3: copy, Book/Source grouping with Kinds, species variants, local folders, no-match divider · Landed: 1031bf4 (M6, deployed 2026-11-20) · `DECISIONS-settled.md`

## 0.10 scope (2026-11-20) — mechanism: AskUserQuestion, 2 rounds (6 questions), overseer, after the M6 deploy

- **D271 — 0.10 is the lineage format release; the small fixes ship now as a site deploy. DECIDED (2026-11-20).** The headline of SPEC/library 0.10 is the lineage idea parked under D268 (`Elf [Drow]`, `Dragonborn [Black]`; species suggest their lineage feature; a place for related choices such as the spellcasting ability), scoped by /interview next (ids from D280). A worker builds four small items now on its own branch, with /ui-review, merge and a site deploy (ids D272–D279): the checker counting 2024 origin languages as extras; raw book titles from data ("Project_Lamordia"), no sort by Type at phone width, Psion UA and Arcane Shots missing from the names list; the Spellfire Spark / Fey Sentinel ability-pick ⚑, tested with a homebrew file on `/sources`; a copy pass on `/sources` (r1 note, D266: "The copy could use a general pass"). The checker fix waits in Unreleased for 0.10.0. Stale flags closed in place: the parked ⚑ under D96, the ui-review ⚑ under D164; O4 re-logged; O6 added.
  *Raw note:* "None of this seems worth a 0.10 version right now. The child session also parked other notes for later right?"; then "Yes, scope it now (Recommended)", "Now, site deploy only (Recommended)", "Yes, add it (Recommended)", "Close, citing what settled each (Recommended)".
  *Rejected:* cutting 0.10.0 now with extract + M6, picks in 0.10.1; holding the small fixes for 0.10; a format-update policy in 0.10 (the ⚑ stays open).

- **O6 — Tidy fixes the case of known names. OPEN (2026-11-20; from the parked ⚑ of 2026-11-16).** Now that a names list ships (D151, D158) and visitors add their own (M6), Tidy could correct `fireball` → `Fireball`. Not scheduled.


- ↪ D272–D278 · T6.3 small fixes: origin languages, book titles, /codes phone sort, names-line ability pick, Spellfire Spark / Fey Sentinel CHA, /sources copy, Psion and Arcane Shots out · Landed: cd1ed0c (deployed 2026-11-20; released 0.10.0) · `DECISIONS-settled.md`

## Lineage format, SPEC 0.10 (2026-11-20) ↪ D280–D284 · lineage in the Species brackets, ability after it, 2014 subraces same form, 0.9 forms warn and Tidy, T7.2 after T6.3 · Landed: 828d7ab (released 0.10.0) · `DECISIONS-settled.md`

## Reddit post review (2026-11-20) ↪ D285 · the r/3d6 post waits for 0.10; Shigen takes Agonizing Blast at Warlock 2 · Landed: 8f846bf · `DECISIONS-settled.md`

## Lineage format build, T7.2 (2026-11-20) ↪ D286–D294 · source after the name, `Wood Elf`, W006/W007 rules, short lineage names, Gnome ability, names by species, editor lineage list, site Tidy, guide · Landed: 828d7ab (released 0.10.0) · `DECISIONS-settled.md`

## T7.2 site /ui-review (2026-11-20) ↪ D295–D298 · Wood Elf Tidy-only, 2014 subraces open `[]`, Tab on ghost, Feature keeps lineage traits · Landed: 828d7ab (released 0.10.0) · `DECISIONS-settled.md`

## Who publishes a release (2026-11-20) — mechanism: Francesco's question in chat, overseer

- **D299 — From now on, the overseer that cuts a release also pushes it and publishes its GitHub release. DECIDED (2026-11-20).** After the D57 release commit and tag, the overseer runs `git push origin main vX.Y.Z` and `gh release create vX.Y.Z --title "dndpaste X.Y.Z" --notes-file .claude/drafts/release-vX.Y.Z.md`. The notes are drafted and humanized first. The CHANGELOG section stays the canonical record (D57), and the GitHub release is its reader-facing copy (D145). Deploy as before. The Reddit and community posts stay his (T3.11).
  *Raw note:* "Where should I write the release changelog? Can you do it yourself as well as the push next time?"
  *Rejected:* keeping push and release on the Manual-for-Francesco list (they were the only manual steps left in a release).
  *Enforced by:* prose only (CLAUDE.md Conventions).

- **D300 — The r/3d6 post (T3.11) links Troll Bandit, a Defiled Sorcerer 10 on Troll|WoW [Amani]. DECIDED (2026-11-21).**
  Chosen in a /start pick from the vault's 53 build notes (`Compendio/Personaggi`), not from the builds Francesco played (Shigen,
  Vice, Hazama Ryō, Heavenly Archer). The Sorcerer/Warlock Version A was reworked into a mostly-Sorcerer build at his call: origin
  feat Raised by Cultists (UA), built around Vampiric Touch, lineage Amani. Paste: `.claude/drafts/troll-bandit.dndpaste`; it
  checks clean apart from the two UA infos.
  *Raw note:* "Let's rework it trying to make it mostly a Defiler Sorcerer, Warlock multiclass only if needed" · "Must be Amani, the
  whole build relies on it" · "the origin feat must be raised by cultists, the build should focus on vampiric touch as well".
  *Rejected:* Sir Oswyl v2 (the screen's top pick, likely a played character); Eldritch Knight and Pop Fizzbang (sound but less
  novel); Heavenly Archer, Hazama Ryō, Vice (played); a Warlock 2 dip (not needed for the loop); Zandalari lineage (his call);
  Necromancy Adept (its spells duplicate the Defiler list, and Life Manipulation spends the Hit Dice the loop needs).
  *Enforced by:* prose only (STATE Manual ①).

- **D301 — No edit-link panel after a save; the private edit link lives only in the Copy link menu. DECIDED (2026-11-21).**
  Amends D97's "the save screen also offers a private edit link once". The green Saved panel on the view (link field +
  Copy edit link) is gone; "Copy edit link" in the Copy link menu stays the one place to get it. When storage is blocked the
  `#new=` key still reaches the page, so Edit and that menu item work for that visit.
  *Raw note:* "the edit link is too prominent and one could easily mistake it for the main link when saving a build. Remove
  that message and leave the edit link only in the dropdown."
  *Rejected:* keeping the panel with weaker styling (still sits right under the share link at the moment of copying).
  *Enforced by:* prose only (SITE.md).

## M8 r/3d6 feedback (2026-11-21) ↪ D302–D319 · triage, lists open on any line, swap list, 60-row lists, level-up lens and Tab route, `, ` after a pick, add chips, faint chip look, next open choice, Species/Background chip, feature names on a level, Classes mismatch alert, canonical-place adds; D312/D315 superseded by D318 · Landed: d9f0a89 (deployed 2026-11-21) · `DECISIONS-settled.md`

## Scores, SPEC 0.11 (2026-11-21) ↪ D320–D326, D330–D333 · slash-named base `Scores`, method marker, score popover, method dropdown and chip, shared/print mark, `scoreKind`; no strict toggle (D330); site mirror of `finalScores`, chip rewrites the marker, clash keeps words and count · Landed: 0828dfb (released 0.11.0) · `DECISIONS-settled.md`

## Editor round 2 notes (2026-11-22) — mechanism: Francesco's notes in chat for the next session, overseer

- **D334 — His testing notes after 0.11.0 become M9; the direct calls are settled, two are open. DECIDED (2026-11-22).**
  Settled: "Custom" is always the first Background row; Start a build has no "Skip" and a new build starts on Custom
  (amends D322); a gear `+N` prefix shows after the name as a chip; feat bonuses count with no `+x` written (half feat
  +1; ASI one ability +2, two abilities +1/+1). Open (🔶, PLAN M9): a mundane/magic switch for Gear; whether Masteries
  accumulate across levels like Spells.
  *Raw note:* "Background need to be correctly parsed and suggest scores, skills and tools, first option in backgrounds
  should always be "Custom"; scores in background should in general suggest you to pick scores and bonus; remove skip as
  option, by default start in new build with custom; gear suggestion is too crowded: first, all +1, 2 etc. should be
  removed from the start of a name and placed after it as a chip, so they sort in the list correctly, then we should
  consider a way to switch between mundane and magic items; masteries still had the issue of error right after inserting
  the first option, this needs to be fixed everywhere; gear should suggest packs or in general background and class
  options in the respective blocks; should masteries repeat themselves each time you get a new option? They should likely
  work like spells instead; ASI feat is offering to insert only the ability score and not the +1 or +2 bonus, therefore not
  computing in the calc (I feel like feats should compute even without the +x bonus explicit, half feats always grant a
  +1, for asi if you add a single choice it means +2, if you add two it means +1 +1)"
  *Rejected:* none offered.
  *Enforced by:* PLAN M9.

## M9 scoping (2026-11-22) — mechanism: /start, AskUserQuestion, 1 round (3 questions), overseer

- **D335 — `form.js` makes room by a split, not a bigger cap: the autocomplete and the popovers move into their own module,
  loaded the first time the editor gets focus (as `names.js`, D158). DECIDED (2026-11-22); closes the `form.js` cap ⚑.** The
  150 KB gate in `site/scripts/check-bundle.mjs` stays as it is, and the new module is checked as its own client bundle.
  It is the first M9 site task, before T9.1–T9.3.
  *Raw note:* picked "Split, lazy-load (Recommended)".
  *Rejected:* raising the cap to 200 KB (every form load keeps growing, and the gate stops pushing back); a split plus a 175 KB cap (more work up front for headroom nobody has asked for yet).
  *Enforced by:* `site/scripts/check-bundle.mjs` (the 150 KB cap, now per bundle).

- **D336 — The Gear list has a Mundane · Magic toggle: two chips in the list's header, remembered per visitor, Mundane by
  default. DECIDED (2026-11-22).** The toggle sets which items the list shows. A `+N` prefix shows as a chip after the name
  (D334). In a Background or class block, that block's gear options and packs lead the list. Typing still filters inside
  the chosen half.
  *Raw note:* picked "Mundane · Magic toggle".
  *Rejected:* mundane first with a "Magic items" divider and no control (cheaper, but he wants the intent explicit); jamming it first.
  *Risk carried to /ui-review:* the phone dock is already full (D157). Where the toggle sits on phone is a review item.
  *Enforced by:* pending (T9.3 site tests).

- **D337 — Masteries are additive, like Spells: a level line lists only the new masteries, `-Name` drops one (like `-Item`),
  and a name the build already holds is ignored. SPEC 0.12. DECIDED (2026-11-22); amends SPEC §4 (`Masteries` "a
  snapshot") and §5.4 (`Prepared` and `Masteries` as a loadout).** `Prepared` stays a snapshot. Old snapshot pastes read the
  same as long as they only add. A snapshot that left a name out with no `-Name` keeps that name, and the parser warns
  when a later `Masteries` line repeats earlier names but leaves one out (the snapshot shape). Tidy rewrites a snapshot as
  additive lines. Aliases and old forms keep reading (D142).
  *Raw note:* picked "Additive, -Name to swap (Recommended)"; from D334: "should masteries repeat themselves each time you
  get a new option? They should likely work like spells instead".
  *Rejected:* keeping the snapshot with an editor ghost of the earlier loadout (the lines stay long); `Prepared` additive
  as well (a wider format change and more migration than he asked for).
  *Enforced by:* `test/spec12.test.ts` (library: parse, `W008`, Tidy, `loadoutAt`); SPEC 0.12 §5.1, §5.4, §14; site side pending (T9.4 site, site-b).

## M9 lib worker (2026-11-22) — mechanism: AskUserQuestion, 1 round (2 questions), lib worker; ids D340–D349

- **D340 — A half feat with a fixed increase and no pick counts in `finalScores`: the slot table's feats carry
  `abilityFixed` (`{ "con": 1 }`), abilities only, written only when present. DECIDED (2026-11-22).** 25 feats in 5etools
  (Durable, Keen Mind, Actor, the 2024 Great Weapon Master, Sharpshooter, Crossbow Expert, …) added nothing before. A fixed
  increase counts whatever the feat's category, capped at 20 (30 on an Epic Boon), beside a picked one. Numbers only.
  *Raw note:* picked "Count them (Recommended)"; from D334: "half feats always grant a +1".
  *Rejected:* picked half feats only (they counted already; the fixed ones would stay silently uncounted).
  *Enforced by:* `test/spec12.test.ts` (D340 suite), `test/extract.test.ts`. *Affects:* the site's mirror (D331) needs
  the field in its names table (site-b); `data/slots.json` must be regenerated on each machine.

- **D341 — An ASI's bare ability counts: alone it is +2 (`[CHA]`), beside another it is +1 (`[INT, CON]`,
  `[+1 INT, CON]`). DECIDED (2026-11-22); amends SPEC §5.3 (D109).** One group still; a second slot, three abilities, a
  lone `+1`, or a total other than 2 stay the info finding. `emit` keeps what was written; `[+2 CHA]` stays valid.
  *Raw note:* from D334: "for asi if you add a single choice it means +2, if you add two it means +1 +1".
  *Rejected:* `[STR; CON]` (two slots) as +1/+1: an ASI holds its increases as one group (§5.3), and `;` would read as
  a second slot everywhere else.
  *Enforced by:* `test/spec12.test.ts` (D341 suite), `test/spec08.test.ts`.

- **D342 — Tidy leaves a `W008` line as written; the warning's fix, not safe, writes the new names and the drop
  (`Masteries: Flail, -Sap`). DECIDED (2026-11-22); AMENDED → D364 (Tidy folds the `W008` line too, keeping the swap).** `W008`: a later level line repeats held masteries and leaves one
  out (the 0.11 snapshot shape). Tidy and `normalise` fold only the snapshot lines that just add (`foldMasteries`), so a
  swap-by-omission keeps its warning until the author answers it.
  *Raw note:* picked "Leave it as written (Recommended)".
  *Rejected:* fold it and keep the name (the warning would vanish and the 0.11 author's swap would be lost silently);
  fold it and drop the name (changes the 0.12 reading, so not a safe fix, D202).
  *Enforced by:* `test/spec12.test.ts` (D342 suite), SPEC §7.

- **D343 — `loadoutAt(paste, level)` is the data-free way to read a level's loadout: `{ masteries, prepared }`.
  DECIDED (2026-11-22); delegated to the lib worker.** Masteries: the header's unplaced line, then each level line up to
  the level, additively (`-Name` may drop a header name). Prepared: the last level block up to the level with a
  `Prepared` line (capped lines included), else the header's. Also `masteryWalk` (each level line read: added, repeated,
  left out, held) and `foldMasteries`; `loadoutAt` is exported from `dndpaste/check` too, as `scoreKind` is (D326).
  *Rejected:* a masteries-only helper (the loadout rule in §5.4 covers both keys, and a viewer shows both); folding in
  `emit` (§0 rules 6 and 9: emit never drops).
  *Enforced by:* `test/spec12.test.ts` (D343 suite).

- **D344 — "Reading change" is a format-change kind of its own: a minor release, old pastes mean the same in the common
  shape, the moved shape warns. DECIDED (2026-11-22); delegated to the lib worker, from D337.** 0.12's `Masteries` is the
  first. It is not a Break (no major): D337 kept it in `Paste: 1` because the common 0.11 shape (lines that only add)
  reads the same. It follows the fixture rule, plus a test that the old form reads the same at every level.
  *Rejected:* calling it a Break (`Paste: 2` for one key whose common shape is unchanged); calling it an Addition (the
  swap-by-omission shape does change meaning).
  *Enforced by:* `FORMAT-UPDATES.md` §1; `test/spec12.test.ts` (the `fixtures/v0.11/` check).

## M9 site-a (2026-11-22) — mechanism: worker build, D350–D359

- **D350 — `ac.js` holds the editor's lists: names, keys, swaps and the base Scores line's popover and method list.
  DECIDED (2026-11-22); builds D335.** `site/src/client/ac.ts` exports `mountAc(host)`. form.ts imports it with
  `names.js` the first time the editor gets focus, and keeps every editor listener in its old place and order. The
  listeners call the lists once they have loaded. A click before then (the method chip) waits for the load. form.js
  went from 149.4 KB to 124.6 KB, and ac.js is 78.7 KB. Both sit under the same 150 KB check. The Keys tooltip, the Tidy
  list and the fix panel stay in form.js, because they open without the editor's focus. ghost.ts keeps your own
  presets in module state, and each bundle has its own copy of it. So form.js sets your presets in ac.js's copy too:
  then the key list and the level-up see your classes.
  *Rejected:* esbuild code splitting (a shared chunk, so the one-output-per-bundle build and check change for a
  one-off); moving the Keys tooltip too (it shows on hover before any focus, so it would load later than it does now).
  *Enforced by:* `site/test/names.test.ts` ("D335: the editor's lists ship as their own bundle…"),
  `site/scripts/check-bundle.mjs` (the 150 KB cap per client bundle).

- **D351 — The Background block follows the background picked: Custom first in the list, counts from the SRD table, and
  a pick fits the block. DECIDED (2026-11-22), T9.1; his pick in an AskUserQuestion round.** "Custom" is the first row
  of every Background list. It has no book and is a known name, so it never shows "No matches". `presets.ts` gets
  `BACKGROUND_PRESETS` from the SRD table: the abilities a background's increase takes (2024) and the Skills, Tools
  and Languages it leaves to choose. What it grants is no line. The block shows counts: `Scores` counts bonus points
  (`+2 INT, +1 WIS` is 3/3); Custom 2024 owes Scores 3, Skills 2, Tools 1 and Feat 1, and Custom 2014 owes Skills 2.
  A background picked or swapped in fits its block. It adds the lines that background asks for, in the key table's
  order. It drops the empty Scores, Skills, Tools, Languages and Feat lines it doesn't ask for. A line with names in
  it, and any other key, stays. A background the table doesn't know (a variant, your own, a homebrew one) gets no
  counts and no fitting.
  *Raw note:* picked "Fit the block (Recommended)"; from D334: "Background need to be correctly parsed and suggest
  scores, skills and tools, first option in backgrounds should always be "Custom"".
  *Rejected:* keeping the lines with a "granted: Arcana, History" note (the block still carries lines the format says
  it doesn't hold); counts only (empty granted lines stay in To choose).
  *Review r1 (approved):* a rule under Custom sets it apart from the backgrounds ("I think it needs a divider between
  custom and the next option"), desktop list only.
  *Enforced by:* `site/test/background.test.ts`, `site/test/complete.test.ts` ("D351 (D334): Custom is always…").

- **D352 — A Background block's `Scores` line lists bonus and ability rows: `+2 INT`, `+1 WIS`. DECIDED (2026-11-22),
  T9.2; his pick in the same round.** At the line's end, the list offers the bonuses that still fit the +3, from the
  background's abilities (any for Custom). The increase is +2 and +1 on two abilities, or +1 on three. An ability
  already given a bonus is not offered again. A pick with points left writes `, ` and opens the list again (D307).
  The last pick moves on to the next open choice (D310). Typing narrows the rows by bonus or by ability (`w` →
  `+1 WIS`). A click on the empty line opens it too (D302). The list's head says what is left: `+3 to add from CON,
  INT, WIS`. No list on 2014 backgrounds, which give no increase.
  *Raw note:* picked "Bonus + ability rows (Recommended)"; from D334: "scores in background should in general suggest
  you to pick scores and bonus".
  *Rejected:* the split first (`+2 / +1` or `+1 / +1 / +1`), then each ability (two lists for one line).
  *Enforced by:* `site/test/background.test.ts`.

- **D353 — Start a build has no Skip; a new build starts on Custom. DECIDED (2026-11-22) in D334; built in T9.2. Amends
  D322.** The `Ability scores` select offers Standard array, Point buy and Custom. It still starts on the last choice
  made on this browser. The first time, and where an old Skip was kept, it starts on Custom.
  *Raw note:* from D334: "remove skip as option, by default start in new build with custom".
  *Rejected:* none offered.
  *Enforced by:* `site/test/preset.test.ts` ("D353 (amends D322)…").

- **D354 — A pick holds its line's error the way typing does. DECIDED (2026-11-22), T9.4 bug.** Every pick writes
  through form.ts's `insert`, and that ran the edit with the `bulk` flag set, so the input handler that holds a line
  being typed (D90, D176) never ran. A first pick on a counted line writes `, ` for the next pick (D307). The line
  then reads as an error, and the error showed at once: on Masteries, as he saw, and on every other counted line.
  `insert` now holds the caret's line as a keystroke does, until the caret leaves it or typing pauses.
  Review r1: the pause doesn't let go while a list is open on that line and the line ends open (`, `); leaving the
  line, Escape or a click elsewhere still does.
  *Raw note:* from D334: "masteries still had the issue of error right after inserting the first option, this needs to
  be fixed everywhere".
  *Rejected:* a hold in each pick path (the score fill already had one of its own; the next path would miss it).
  *Enforced by:* `site/test/form.test.ts` ("D354 (T9.4)…").

## M9 site-b (2026-11-22) — mechanism: worker build, AskUserQuestion (2 rounds), /ui-review r1; ids D360–D369

- **D360 — A Custom base `Scores` line opens a stepper: −, the number, +. DECIDED (2026-11-22); his answer to site-a's
  open flag.** While the line is filled, and on a click on a written score, the list is one row: the typed number, else
  the score written, else 10, held inside 1–30. The arrow keys step it (Shift: by 5); Tab, Enter after a step, or a
  click on the number writes it, and a fill moves on to the next ability. Typing still works.
  *Raw note:* "A custom panel with for example steppers or a slider, something that can aide type a number" (over the
  offered 3–18 list, a short common-values list, or no list).
  *Rejected:* a 3–18 list (rows to scroll for one number); common values only; no list.
  *Enforced by:* `site/test/scores.test.ts` ("D360…"); /ui-review r1 approved.

- **D361 — The editor reads Masteries as additive (D337): a level's line counts the slots new at that class level, one
  more per `-Name`, and only the names new to the build. DECIDED (2026-11-22), T9.4 site.** `ghost.ts` takes `have`
  from the library's `masteryWalk` (`added`); the list on a level line leaves out held weapons, and after a `-` lists
  the held ones (`loadoutAt`, level − 1). A swap (D304) over a held name writes `New, -Old`. The W008 fix reaches the
  line through `libraryFixes`. The key tip says a level lists only its new ones.
  *Rejected:* counting the loadout total (the 0.11 snapshot reading).
  *Enforced by:* `site/test/ghost.test.ts`, `site/test/complete.test.ts`, `site/test/fixes.test.ts` ("D361…"); r1 approved.

- **D362 — The Gear list shows one half, Mundane or Magic, switched by two chips in its head; a block's starting gear
  leads. DECIDED (2026-11-22), builds D336.** The pick is kept in `localStorage` (`dndpaste.gear`, try/catch). On phone
  the switch leads the dock's chip row (r1 approved). A name only the other half has shows "None in Mundane · N in
  Magic". In a Background block or the build's L1 block: the option letters (tag `option`, both halves), then the
  class's or background's choice items (2014), then the packs. Names table: `GEAR_OPTIONS` (letters and item names per
  class and background, names only).
  *Review r1:* "A, B and C aren't clear enough by themselves, can we offer more info?" and "lists where some options
  are given priority … should have a divider between the parts" → owed, round 2 (hand-over note).
  *Review r2:* both answered: D365 (the letters' contents) and D366 (the rule). Approved.
  *Enforced by:* `site/test/complete.test.ts`, `site/test/prefs.test.ts` ("D362…").

- **D363 — A Gear item's `+N` prefix shows as a chip after its name, and the list sorts by the name. DECIDED
  (2026-11-22), builds D334.** `+1 Ammunition` reads "Ammunition +1"; the pick writes the name as it is. A `+1
  Longsword` on the line no longer hides the plain Longsword. The site's `finalOf` mirrors D340 (a feat row's fixed
  +1s) and D341 (an ASI's bare ability).
  *Enforced by:* `site/test/complete.test.ts`, `site/test/scores.test.ts` ("D340…", "D341…"); r1 approved.

- **D364 — Tidy folds a W008 line too, keeping the 0.11 author's swap: `Longsword, Handaxe, Lance, Flail` becomes
  `Flail, -Sickle`, and the warning goes. DECIDED (2026-11-22); amends D342.** His r1 note: "Remove the warning from
  the header, simply make it a step for Tidy". He picked dropping the left-out name.
  *Rejected:* Tidy keeps the name (the swap lost silently); D342 as it was.
  *Enforced by:* `test/spec12.test.ts` ("D364…" tests), SPEC §5.4, §7, §14; site: `site/test/fixes.test.ts` ("D364…");
  /ui-review r2 approved.

- **D365 — Each 2024 starting-gear letter shows what it holds: the contents after the letter, cut to the list's width,
  and a chevron that opens them in full in the list's place. W008 stays in the library but is a Tidy step on the site.
  DECIDED (2026-11-22); builds D362 and D364.** Data: the extractor keeps `equipmentSets` per class and background
  (`{ "A": { "items": [["Javelin", 8], …], "cp": 400 } }`): item names, a kind for a generic entry (`Musical
  Instrument`), a short special name (`Spellbook`, 24 characters at most, longer specials are prose and are left out),
  and the coin. Names and numbers only. The committed SRD subset gained only this field (grafted, so the mirror's other
  drift stays out). The names table's `GEAR_OPTIONS` rows carry the sets as display lines: `Javelin ×8` (a count, no
  plurals to get wrong) and `4 GP`. The list: `A  Chain Mail, Greatsword, …` in muted text that never widens the list
  (r2: "Keep the panel narrower as it was before"); the chevron, or Right on a highlighted letter, opens the detail view:
  a back chevron at the top left with "Option A", one entry a line, then "Take A" (Enter or Tab). Left or Escape goes
  back. On phone the detail is one sideways row. The site side of D364: `status` leaves W008 out of Problems, the
  summary and the underlines, Tidy is on while a snapshot line is there, and its badge lists one step per line
  ("Masteries: Only the new ones at L4", "Masteries: Drop Sickle at L10"); a struck-through step leaves its line, and
  `foldMasteries` takes an `only` filter for that. The library keeps W008: apps with no Tidy still need to see the swap
  (D344). The no-JS form keeps listing it (it has no Tidy).
  *Raw note:* r1: "A, B and C aren't clear enough by themselves, can we offer more info?"; his pick: "Inline, cut to fit
  + a chevron that opens it fully into the panel (with a top left chevron to go back and an option to select from this
  detail panel)"; r1 mast-snap: "Remove the warning from the header, simply make it a step for Tidy".
  *Rejected:* the full contents on a second line (taller rows); the first two items and a count; retiring W008 from
  the library (breaks D344's "the moved shape warns" for other apps).
  *Parked:* r2 gear-bg: "For B, we could consider selecting which items you buy with that amount" (⚑ PLAN M9).
  *Enforced by:* `test/extract.test.ts` ("D365…"), `site/test/complete.test.ts` ("D365…"), `site/test/fixes.test.ts`
  ("D364…"); /ui-review r2 approved.

- **D366 — A group that leads a list, not dimmed, gets a rule under its last row. DECIDED (2026-11-22); his r1 rule;
  generalises D351's Custom rule.** `suggestList` marks `sep` on the last row of each leading group, a starting-gear
  part (`lead`) or the names ranked first (D156), when the next row is not dimmed. Gear in an L1 or Background block:
  after the letters or a 2014 class's items, and after the packs; a level header: after the build's own classes;
  Background: after Custom. A dimmed tail (Skills' short list, another class's spells) parts itself: no rule. Desktop
  list only, as before.
  *Raw note:* r1: "When you have lists where the order isn't simply alphabetical but some options are given priority
  (but still the second part isn't greyed out), we should have a divider between the parts."
  *Rejected:* a rule per list by hand (Custom's own case, D351): the next list would miss it.
  *Enforced by:* `site/test/complete.test.ts` ("D366…"); /ui-review r2 approved.

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
  *Enforced by:* owed (T8.4: site tests, /ui-review).

- **D322 — Start a build picks the method from a dropdown that remembers the last choice. DECIDED (2026-11-21),
  round 3.1 pin.** One row, `Ability scores`, a select: Standard array, Point buy, Custom, Skip; it starts on the last
  choice made on this browser (first time: Skip, which leaves `Scores:` empty as before). No score cells (D312 stays
  rejected). Start writes `Scores:` and the caret waits there (D310) with the method's list open; the fill goes one
  ability at a time, a pick writes `STR 15/DEX ` and reopens the list (D307, in the slash form of D320).
  *Raw note:* "In the start a build, instead of a toggle it should be an option with dropdown which remembers last
  choice".
  *Rejected:* a segmented switch (every option on the board).
  *Enforced by:* owed (T8.4).

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
  *Enforced by:* `test/spec11.test.ts` D323 (parse, emit, Tidy, E002/E005/E012); SPEC 0.11 §5.2; owed (T8.4).

- **D324 — The method chip: dry words at the `Scores` line's end, with a chevron. DECIDED (2026-11-21), round 4.1 A
  with his pin.** A faint chip in the D309 look after the line: `Std. Array`, `Point Buy 2/27` (points left of 27),
  `Custom`. It reads the numbers (a standard array costs 27 points, so it is point-buy legal too: the chip says the
  narrower kind); with a marker (D323), the marker's method. The chevron opens the method list (D323). Not an alert:
  custom scores are fine (D319's alert chip is for problems).
  *Raw note:* (D318) "we could show as chip if the current scores array is standard array, point buy legal or neither" ·
  (pin) "Keep it dry and condensed: Std. Array, Point Buy 2/27, Custom".
  *Rejected:* a count chip in the ghost lane (B); the chip only while the caret is on the line (C, close to D315 A).
  *Enforced by:* owed (T8.4).

- **D325 — The shared page and the printed page carry the same mark. DECIDED (2026-11-21), round 4.1.** The chip's
  dry words, as plain small text after the `Scores` row on the view and in print, read from the numbers (or the marker),
  a hint, never a check (D66).
  *Raw note:* (D318) "We could consider showing this mark in the shared and printed versions as well." ·
  (AskUserQuestion) "Shared page and print".
  *Rejected:* shared page only; editor only.
  *Enforced by:* owed (T8.4: render tests).

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

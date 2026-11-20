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

- **O4 — Feat detail slot order.** Ability first, then printed order, is the rule; a per-feat table in the checker supplement will be needed for feats whose printed order is unclear. Decide at M2.

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

- ⚑ **Parked, not decided (2026-11-16, owner: overseer):** an empty value (`Spells:` with nothing) as "unspecified / any" instead of E006 → SPEC 0.8 discussion (pin: "Empty lines shouldn't necessarily be an error"); Tidy fixing the case of known names → after launch, once a name list ships with the site; favicon "ok for now". Writing help in the form (note: "can we have the option to prefill it with at least the starting keys? How much can we help the user while writing?") → overseer, after 3.2d: a "Start a build" skeleton, smarter key hints, value suggestions once a name list ships.

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
  ⚑ (worker → overseer, 2026-11-19, from /ui-review rounds 2–4, not in this branch): (1) "We should set autocomplete also for main headers (ex. species etc.)": Francesco means both the values on the empty spot (`Species: ` opens before a letter) and the key names themselves (`Spe` → `Species:`). (2) After a pick in a group that wants more names (`Guidance, `) nothing says another is expected: "I think we should consider having a ghost text before typing directly in the text box." (3) "The count chip shouldn't reset to 0/4 immediately after typing a comma. Also, the too-quick-to-signal error note hasn't be tackled yet." (ghost counts D130, error hold D90).

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

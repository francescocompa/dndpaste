# PLAN — dndpaste

> The queue. Decisions in `DECISIONS.md` (D1–D116). Status lines: ⏳ next · 🔶 decide-gate · 🔍 review gate.

## What it is (one paragraph)

A plain-text, Pokepaste-style format that replicates a D&D 5e build through every meaningful
choice point, by reference only (names, optional `|SOURCE`), never rules text. Sparse pastes are
first-class: a class name alone is valid. Two layers: a data-free **parser** (grammar, canonical
emit, round-trip) and a data-driven **checker** (which choices a build owes, from 5etools-format
data, official or homebrew). Core grammar is game-neutral; D&D 5e is the first **profile**.

## Grammar sketch (SPEC 0.3 is the truth; this is the shape)

```
<identifier line>?
<Key>: <value>                 header scope: Rules · Scores · Classes · unplaced choices

Species: <ref>                 entity block — its picks as key lines
<Key>: <value>
Background: <ref>              entity block
<Key>: <value>

L<n> <Class>                   level block, n = character level
<Key>: <value>
```
- Item: `[-]Name[|SRC] [slot; slot] x<qty>`; brackets for details, quotes for names containing `, ; : [ ]`.
- Choice keys: Subclass · Skills · Tools · Languages · Expertise · ASI · Ability · Feat · Fighting Style ·
  Masteries · Options (all optional-feature families) · Feature (named feature with a pick) · Cantrips ·
  Spells · Prepared · Equipment. Reserved: `---`, `Game:`, `Paste:`, `X-` keys.

## Milestones

### M0 — Seed the repo · size S
- [x] `~/Documents/GitHub/dndpaste` public repo (2026-09-04, not yet on GitHub): CLAUDE.md, PLAN.md, DECISIONS.md, STATE.md, SPEC.md skeleton, LICENSE (MIT), `.gitignore` reserving `data/` for future non-SRD extracts.
- [x] Content boundary stated up front: fixtures name WotC entities, never quote rules text.

### M1 — SPEC v0 + parser + fixtures (D17) · ✅ DONE 2026-09-04
- [x] **SPEC.md v0** (0.1 → 0.3 after his review and the panel, 2026-09-04): core grammar (EBNF), 5e profile (keys, value shapes, detail-group orders), canonical emit rules, error classes, versioning (`formatVersion` in spec, not in paste).
- [x] 🔍 **/panel on SPEC 0.2** (5 personas, 5–0 change) → D25–D32, SPEC 0.3. A second, cheaper panel pass on 0.3 is optional; his read is the gate.
- [x] `src/dndpaste.ts` `parse` → AST (SPEC §4); never throws; line on every diagnostic. (2026-09-04)
- [x] `emit` → canonical text, data-free (SPEC §5.5); fixtures round-trip byte-for-byte.
- [x] Zero deps; ESM + `dist/dndpaste.umd.cjs` (derived by `scripts/umd.mjs`; `.cjs` because the package is `type: module`); strict TS; `npm run verify` = typecheck + lint + test (33 tests).
- [x] Tests cover: sparse, identifier, quoting, quantity, drop, empty groups, `@n`, case, `X-` keys, every E-code. Fixture files: vice, shigen, flat-multiclass, druid-custom-background.
- [x] **Vice** and **Shigen** hand-written as dndpastes (`fixtures/`), parse clean and round-trip byte-for-byte from `~/Documents/D&D/D&D Character Builder/Characters` and round-tripped. Done-when: every choice on those sheets has a line, no invented key.
- [x] 🔶 Francesco read SPEC 0.3 + fixtures: "looks right" (2026-09-04).

### M2 — Checker · size M/L · ✅ 0.5.0 shipped 2026-09-05 (D35, D36, D41–D44)
- [x] `scripts/extract-slots.mjs` → `data/slots.json` + `data/srd/slots.json` (D35).
- [x] `src/check.ts` → missing / misplaced / unresolved / redundant / unplaced / **extra** findings + `normalise` (D30, D34). 15 tests on the SRD table; the two real builds run against the full table when present.
- [x] Stress wave 2026-09-04 (`stress/REPORT.md`): 65 pastes, 11 fixes, 9 open calls.
- [x] `+N` magic-variant prefix (D40); Medium default size (D39); six stress pastes promoted to fixtures (2026-09-04).
- [x] **M2 tail → 0.5.0** ✅ shipped 2026-09-05 (D41) · parallel worktree agents, sonnet@high, fresh-eyes review on the strong model before merge:
  - [x] T2.1 spell-list legality — extractor emits per-spell class lists; `Cantrips`/`Spells`/`Prepared` off the class's (or subclass's granted) list → warning. Done when: fixtures pass, a wrong-list spell on Vice-style paste is reported.
  - [x] T2.2 2014 starting-equipment picks — class + background `Equipment` choices from the extract (2014 only; 2024 letters already covered). Done when: a 2014 paste missing its pick is `missing`, a valid one is clean.
  - [x] T2.3 `bin/dndpaste` CLI — `check <file>` / `emit <file>` / `normalise <file>`, loads `data/slots.json` else `data/srd/slots.json`, exit 1 on warnings. Done when: runs on every fixture; `npm run verify` green.
  - [x] T2.4 ability-score arithmetic — `Scores` + species/background/ASI/feat increments → final scores, cap 20, warn on overflow or on an ASI that names an unknown ability. Done when: Vice and Shigen compute to the sheet values.
  - [x] T2.5 dangling `Class 0` → unplaced info (D42) + name-alias contains fallback (D43). Done when: both have a fixture line and a test.
- [x] 🔍 T2.6 fresh-eyes review (opus): 1 blocker + 4 should-fixes, all fixed; 0.5.0 cut.
- [x] T2.7 cleanup from the review nits ✅ 2026-09-05 (87 tests, fixture output byte-identical) · sonnet@medium · size S: one `+N` stripper and one name lookup (`findByName` → `Index.resolve`; `finalScores` reuses `check()`'s indexes); `--slots` as last argument errors instead of silently defaulting; Epic Boon feats cap at 30, not 20. Done when: verify green, no behaviour change on fixtures.
- [ ] Homebrew: run the extract over a 5etools-format homebrew file and merge its slots (a homebrew file brings its own slots).

### M3 — Share site (D45, D65–D74; brief `SITE.md`) · ✅ DONE 2026-11-16, live (D117)
- [x] T3.1 Look jam ✅ 2026-11-15 · D80–D89, 12 frames + build brief in `jams/2026-11-15-site-look/` (local only).
- [ ] ⏳ T3.2 Build · branch `claude/site-m3-ee11e4` (worktree `release-0-7-0-5b6161`), Opus@high, Mac · one session per slice (jam brief) · Done when: `SITE.md` done-when, up to local + reviewed.
  - [x] 3.2a Worker core + no-JS view ✅ 2026-11-15 (6572fa9, ff9484d, 7712889)
  - [x] 3.2b form with JS ✅ 2026-11-15 (d444fb0, 7a03bfe)
  - [x] 3.2c view interactions + chrome + `/about` + D90's fix ✅ 2026-11-16 (86d5415, c3f8e9a)
  - [x] 3.2d editable shares as revisions ✅ 2026-11-16 (56f3f64, f09b1cc; D97, D100)
  - [x] 3.2e ✅ 2026-11-16 (c5ba8fa, 1fb219c) `/guide` page + "Start from an example" on the empty form (D99) · Opus@high · after 3.2d, same worktree · Done when: guide built with the profile key table, linked from form and /about, copy humanized, both gates green, committed.
- [x] 🔍 T3.3 Fresh-eyes review ✅ 2026-11-16: no blockers; fixes b679c33 (D91–D92). 
- [x] 🔍 /ui-review ✅ 2026-11-16 (71ccde4, f9af319; D93–D95, D98). Then a fresh-eyes pass on 3.2d's edit routes + 3.2e and a short /ui-review of both, before T3.4.
- [x] 🔍 Fresh-eyes on 3.2d + 3.2e ✅ 2026-11-16: no blockers; fixes 9fe4df1…05d556b (D101), D102 drafts 7136922, b924ff1. Short /ui-review ✅ 297dc24 (D103–D104).
- [x] T3.5 ✅ 2026-11-16 (813b7dd, a575721, 1c76d9d) SPEC 0.8 + library 0.8.0 (D106–D113) · Opus@high · shared worktree, branch `claude/site-m3-ee11e4` (disk too low for a new worktree; the site needs it next) · Done when: SPEC 0.8, parser/emitter/checker per D106–D113 with 0.7 aliases (D113), fixtures migrated, `npm run verify` green, CHANGELOG + `v0.8.0` heading (tag his, D57), a drafted format-update policy for his read (⚑ D113).
- [x] T3.6 ✅ 2026-11-16 (866da84, cfcfbdd; D114–D116) Site on 0.8 (D105) · after T3.5, branch `claude/site-m3-ee11e4` · the 0.8 library in, the D104 multiclass example + guide rewrite, the D103 book-code page linked from the guide, the Keys popover with each key's guide text, guide key table on 0.8 · Done when: site tests green, then a short /ui-review.
- [x] T3.4 ✅ 2026-11-16 Deployed to `https://dndpaste.fcomfy.workers.dev` (D117), smoke-tested; branch merged into `main` (423ac7b). GitHub push and the `v0.8.0` tag his.
- [x] T3.7 ✅ 2026-11-16 (c2c9270, 18a7fd0; merged 746734c, deployed ffd80c9c) Share image + Post to Reddit on the view page (D119) + Books line (D120) · Opus@high · Done when: Tall/Wide full-build PNG drawn in the browser (Download, Copy image, Share sheet), Reddit button, site tests green, `npm run verify` green, a /ui-review approved; deploy again on Francesco's go.
- [x] T3.8 ✅ 2026-11-17 (3e28685, 0d23c85; merged 9f8c697, deployed 16fea8f4) Class presets: "Start a build" on the empty form replaces "Start from an example" (D121–D128); /ui-review 3 rounds, all approved; 179 + 185 tests.
- [x] T3.9 ✅ 2026-11-17 (fb682b9, 9275fd0; merged 6c78f01, deployed f4c67871) Ghost pick counts in the editor: a `have/of` tag on lines that owe picks, from the SRD table (D129–D134); /ui-review 2 rounds, all approved; 179 + 197 tests.
- [x] T3.10 ✅ 2026-11-18 Launch prep (D141–D147): SRD licence check, format-update policy decided, feedback route (README, issue forms, `/about` + `/guide` links; merged 4c34e26). Deploy, tag + push and the GitHub release are his.
- [ ] 🔍 T3.12 Wide user test (D191) · after the 0.9 keys are wired, before the D152 copy pass and the 0.9 release · 4 personas, ~15 Obsidian builds, mixed headless + browser, triage board → fix sessions
- [ ] 🎲 T3.11 Community feedback round · after the deploy and push · soft round with his table, then r/3d6, then r/onednd · Done when: feedback triaged into issues or decisions.
- Follow-ups (D66, D70, D71): SRD checker → "check against data" → domain + `abuse@` + canonical-origin flip.

### M4 — character-forge interview seeding · size M in that repo
- ⚑ **Retarget (Francesco, 2026-09-29):** character-forge v1 is archived. v2 imports pastes directly (its D61 phase 1, T2.1), so the chassis-seeding flow below is retired unless he says otherwise.
- [ ] Paste → pre-filled chassis sections; interview asks only what the paste left unplaced or missing. References resolve against the KB at compile time as today.

### M5 — my-spellbook import · size M in that repo
- [ ] Paste → build, resolving refs against loaded sources; unresolved refs use the existing "not loaded" path (its D56).

### Later
- My-spellbook export (was M3, L5.5 / A-03): copy `dist/dndpaste.umd.cjs`, `levelGains`/`timelinePicks` → AST → `emit`. Moved here by D74: My Spellbook went independent (cf-D1986), so it is that repo's call (ms-D176).
- Community showcase (O5): opt-in public list, likes, filters by build element; D1 index. Revisit after a few hundred shares.
- Generic names importer (D160): load your own names file in the browser, names, sources and counts only; a plain documented format. Plugs into autocomplete (D151) and the later visitor-data checker (D66).
- Variants / party blocks (D6). `Game:` header and a second profile (O1). Python port only if extract.py needs it.

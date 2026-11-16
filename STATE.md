# STATE — dndpaste

## TL;DR (2026-11-16 · main 746734c + handoff docs commit · read 105k)
- **State:** M3 done and live at `https://dndpaste.fcomfy.workers.dev` (D117, D118), deployed version ffd80c9c: library 0.8.0
  + site + T3.7 share image, Post to Reddit, Books line (D119, D120). 179 library + 175 site tests pass on main; KV empty.
  Not pushed to GitHub; `v0.8.0` not tagged.
- **Single next action:** 🔶 T3.8 class presets (PLAN M3): `/interview` Francesco on its open questions, log the calls, then
  spawn the build. Parallel, his: tag + push.
- **Manual for Francesco:** ① tag `v0.8.0` on 423ac7b (D57; the site commits after it are not library changes), push `main`,
  `v0.7.0`, `v0.8.0`; ② ⚑ read `FORMAT-UPDATES.md` (DRAFT, D113 flag; 4 questions, chiefly: aliases "until 1.0" make 1.0
  breaking); ③ archive the T3.7 session (done and merged); ④ the Notion "Character Ideas" defects (stress/REPORT.md
  § Theirs), if you care to; ⑤ ⚑ do Spellfire Spark / Fey Sentinel ask an ability pick (homebrew); ⑥ the homebrew merge (M2
  queue) needs a real 5etools-format homebrew file; ⑦ free disk (5.7 GB; a new worktree needs 5.4 GB).

Working set: `PLAN.md` T3.8 · `site/src/example.ts` (today's "Start from an example") · `.claude/launch.json` "site" = wrangler dev :8787

Spawned: T3.7 share image · local_011deed3 · branch `claude/share-image` (this checkout) · done, merged 746734c, deployed · owed: archive (his yes).

- **Library:** 0.8.0 on main (SPEC 0.8, D106–D113; 0.7 keys read with a warning). Releases per D57.
  The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66). Book codes: `node site/scripts/books.mjs` by hand (D115).
- **Follow-ups (post-launch):** checker counts 2024 origin languages as extras; some book titles raw from data
  ("Project_Lamordia"); no sort by Type at phone width; `package-lock.json` still says 0.3.0.
- **Gotchas:** On a turn a child's report started, the app
  refuses `start_session`: propose a card; briefs `cd` into the worktree. Handover notes:
  `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`. Google Drive hung reading
  `ClaudeConfig/bin` (review server script) on 2026-11-16; the review ran a connector-fetched copy.


⟳ Rename previous session → "Share site deploy and share image"  · session: local_467d39d0-a951-462b-86bf-f4ce4cf671c2

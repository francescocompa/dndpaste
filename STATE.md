# STATE — dndpaste

## TL;DR (2026-11-17 · main 6c78f01 · read 105k)
- **State:** M3 done and live at `https://dndpaste.fcomfy.workers.dev` (D117, D118), deployed: library 0.8.0
  + site + T3.7 share image, Post to Reddit, Books line (D119, D120) + T3.8 "Start a build" class presets (D121–D128)
  + T3.9 ghost pick counts (D129–D134), deployed f4c67871 on 2026-11-17. 179 library + 197 site tests pass on main.
  Not pushed to GitHub; `v0.8.0` not tagged.
- **Single next action:** 🔶 Francesco: rename to 5epaste or keep dndpaste (trademark + 5e-game scope vs 335 mentions,
  localStorage keys, a new origin); decide before the first push. Then his: tag + push.
- **Manual for Francesco:** ① tag `v0.8.0` on 423ac7b (D57; the site commits after it are not library changes), push `main`,
  `v0.7.0`, `v0.8.0`; ② ⚑ read `FORMAT-UPDATES.md` (DRAFT, D113 flag; 4 questions, chiefly: aliases "until 1.0" make 1.0
  breaking); ③ archive the T3.7, T3.8 and T3.9 sessions (done and merged); ④ the Notion "Character Ideas" defects (stress/REPORT.md
  § Theirs), if you care to; ⑤ ⚑ do Spellfire Spark / Fey Sentinel ask an ability pick (homebrew); ⑥ the homebrew merge (M2
  queue) needs a real 5etools-format homebrew file; ⑦ free disk (2.0 GB on 2026-11-17; a new worktree needs 5.4 GB).

Working set: none

Spawned: T3.9 ghost counts · local_3bdc7be8 · merged 6c78f01, deployed · owed: archive. T3.8 · local_919dd4a8 · merged · owed: archive. T3.7 · local_011deed3 · merged · owed: archive.

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



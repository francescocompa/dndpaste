# STATE — dndpaste

## TL;DR (2026-11-16 · main 423ac7b merge + T3.4 docs commit · read 96k)
- **State:** M3 is done. The share site is live at `https://dndpaste.fcomfy.workers.dev` (D117), smoke-tested, KV empty.
  `claude/site-m3-ee11e4` is merged into `main` (423ac7b): library 0.8.0 + site, 179 library + 157 site tests pass on main.
  Not pushed to GitHub; `v0.8.0` not tagged.
- **Single next action:** Francesco tags `v0.8.0` on 423ac7b and pushes `main` + tags (D57, D61); then the ⚑ FORMAT-UPDATES
  read. M4 (character-forge seeding) runs in that repo, under its own CLAUDE.md.
- **Manual for Francesco:** ① tag `v0.8.0` (and push `v0.7.0`, `v0.8.0`, `main`); ② ⚑ read `FORMAT-UPDATES.md` (DRAFT, D113
  flag; 4 questions, chiefly: aliases "until 1.0" make 1.0 breaking); ③ (done: the workers.dev
  subdomain is now `fcomfy`, D118);
  ④ the Notion "Character Ideas" defects (stress/REPORT.md § Theirs), if you care to; ⑤ ⚑ do Spellfire Spark / Fey Sentinel
  ask an ability pick (homebrew); ⑥ the homebrew merge (M2 queue) needs a real 5etools-format homebrew file; ⑦ the
  worktrees removed 2026-11-16 (5.7 GB free); ⑧ free disk.

Working set: `SITE.md` (deploy + reports notes) · live site · `.claude/launch.json` "site" = wrangler dev :8787 from `site/`

Spawned: T3.7 share image local_011deed3 (branch `claude/share-image`, this checkout; running) → next: overseer merges, then T3.4-style redeploy on his go. Earlier (all done, merged 423ac7b, archived):
T3.6 site on 0.8 local_f964a965 (866da84, cfcfbdd) · T3.5 SPEC 0.8 local_9133bf7c (813b7dd…1c76d9d) · short /ui-review
local_175b755f (297dc24) · pre-deploy fixes local_9b723919 (9fe4df1…b924ff1) · 3.2e local_cad07eda · 3.2d local_4ac34b6d ·
/ui-review local_de264fb8 + local_6c4a58f3 · T3.3 local_657aff77 (archived) · slice 3 local_0d32913b · slices 1–2
local_39b2c186, local_3be9c204.

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


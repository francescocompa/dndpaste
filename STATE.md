# STATE — dndpaste

## TL;DR (2026-11-16 · main: this handoff's docs commit + build branch `claude/site-m3-ee11e4` cfcfbdd · read 96k)
- **State:** M3 share site and library 0.8.0 are complete on the branch, reviewed and approved: Worker + KV + DailyCap DO,
  form (with D102 drafts), view, editable shares (D97), `/guide` + Vesk example (D99, D104), `/codes` (D103, D114),
  Keys popover, SPEC 0.8 (D106–D113). 179 library + 157 site tests pass. Unmerged, unpushed, not deployed.
- **Single next action:** 🔶 T3.4 deploy on Francesco's go (PLAN M3: KV namespace + `wrangler deploy` + smoke test), then
  merge the branch to `main` (fixes main's `npm run verify`), then he tags `v0.8.0` on the merged release commit (D57).
- **Manual for Francesco:** ① the go for T3.4 (and creating the KV namespace / Cloudflare login if wrangler asks);
  ② ⚑ read `FORMAT-UPDATES.md` on the branch (DRAFT, D113 flag; 4 questions, chiefly: aliases "until 1.0" make 1.0
  breaking); ③ push `v0.7.0` and later `v0.8.0` tags (D57, D61); ④ the Notion "Character Ideas" defects
  (stress/REPORT.md § Theirs), if you care to; ⑤ ⚑ do Spellfire Spark / Fey Sentinel ask an ability pick (homebrew);
  ⑥ the homebrew merge (M2 queue) needs a real 5etools-format homebrew file; ⑦ archive the finished sessions below once
  merged (archiving one whose cwd is the worktree may clean it up); ⑧ free disk (5.3 GB, under the 5.4 GB a worktree needs).

Working set: worktree `.claude/worktrees/release-0-7-0-5b6161` (branch `claude/site-m3-ee11e4`; main repo `.claude/launch.json`
"site" = wrangler dev :8787 from that worktree) · `SITE.md` (deploy notes) · `site/wrangler.toml`

Spawned (all in the shared worktree, all done and verified, unmerged; owed: merge after T3.4, then archive):
T3.6 site on 0.8 local_f964a965 (866da84, cfcfbdd) · T3.5 SPEC 0.8 local_9133bf7c (813b7dd…1c76d9d) · short /ui-review
local_175b755f (297dc24) · pre-deploy fixes local_9b723919 (9fe4df1…b924ff1) · 3.2e local_cad07eda · 3.2d local_4ac34b6d ·
/ui-review local_de264fb8 + local_6c4a58f3 · T3.3 local_657aff77 (archived) · slice 3 local_0d32913b · slices 1–2
local_39b2c186, local_3be9c204.

- **Library:** 0.8.0 on the branch (SPEC 0.8, D106–D113; 0.7 keys read with a warning). Releases per D57.
  The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66). Book codes: `node site/scripts/books.mjs` by hand (D115).
- **Follow-ups (post-launch):** checker counts 2024 origin languages as extras; some book titles raw from data
  ("Project_Lamordia"); no sort by Type at phone width; `package-lock.json` still says 0.3.0.
- **Gotchas:** orphan worktrees `site-m3-f5c245`, `hp-key-ac725e` can go. On a turn a child's report started, the app
  refuses `start_session`: propose a card; briefs `cd` into the worktree. Handover notes:
  `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`. Google Drive hung reading
  `ClaudeConfig/bin` (review server script) on 2026-11-16; the review ran a connector-fetched copy.


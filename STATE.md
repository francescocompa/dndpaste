# STATE — dndpaste

## TL;DR (2026-11-20 · main 9a1ce7c + this commit · read 219k, overdue: DECISIONS.md is 86%)
- **State:** 0.9.0 released (tag `v0.9.0` on 273ff8b, pushed) and live at `https://dndpaste.fcomfy.workers.dev`
  (deploy fc111c84, `/version` commit e04074d, 2026-11-20): SPEC 0.9 family keys + level cap (D180–D186), SRD autocomplete
  (D151, D154–D164), editor polish (D170–D178, D190), wide user test fixes (D192–D229), copy pass (D230–D234), live-test
  editor bugs (D240–D243). Library 243 tests (with the full local table) + site 293 pass.
- **Single next action:** T6.1 — scope "your own sources" (D160): connect your own names source and manage sources in the
  app, to widen autocomplete and options. /interview first; read D160, D151, D66 and PLAN M6.
- **Manual for Francesco:** ① push main (1 commit ahead: STATE) ② publish the GitHub release v0.9.0 with
  `.claude/drafts/release-v0.9.0.md` ③ post (T3.11): save a real build for `[BUILD LINK]` in `.claude/drafts/reddit-3d6.md`,
  not Mon/Sat; rewrite by hand for r/onednd, r/dndnext ④ archive the copy-pass and editor-fixes-after-0.9 sessions
  ⑤ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`) ⑥ ⚑ Spellfire Spark / Fey Sentinel
  ability pick (homebrew); the homebrew merge needs a real homebrew file.
- **Before T6.1:** `/clean` — DECISIONS.md is 190k (86% of the cold read) with no settled split; /start reads it whole.

Working set: none

Spawned: none

- **Library:** 0.9.0 on main (SPEC 0.9; 0.7 keys still read with W005). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240).
- **Follow-ups (post-launch):** a real logo (D148); checker counts 2024 origin languages as extras; some book titles raw
  from data ("Project_Lamordia"); no sort by Type at phone width; Psion UA and Arcane Shots missing from the SRD names list.
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md.

⟳ Rename previous session → "0.9 release: autocomplete, user test and fixes"  · session: local_fca37e60-edcc-4a35-90aa-22609d4b288b

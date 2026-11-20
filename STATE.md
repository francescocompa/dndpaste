# STATE — dndpaste

## TL;DR (2026-11-20 · main 1031bf4 + this commit · read ~88k, healthy)
- **State:** 0.9.0 released (tag `v0.9.0` on 273ff8b, pushed). M6 "your own sources" merged (1031bf4, D244–D270) and
  live at `https://dndpaste.fcomfy.workers.dev` (deploy 1d8d0b13, `/version` commit 1031bf4, still reports 0.9.0):
  `/sources` adds names from a file, a local folder or a GitHub link (browser-only, IndexedDB), feeding autocomplete,
  `[ ]` options and ghost counts; built-in SRD names hidden per book and kind. Library 245 + site 306 pass.
- **Single next action:** scope 0.10 — Francesco: "check if we need other changes to dndpaste before 0.10". Review the
  queue (PLAN Later, post-launch follow-ups below, open O1/O4/O5 and the format-update ⚑) with him, then release per D57.
- **Manual for Francesco:** ① push main (several commits ahead: /clean, T6.1, T6.1b, T6.2 merge) ② publish the GitHub release v0.9.0 with
  `.claude/drafts/release-v0.9.0.md` ③ post (T3.11): save a real build for `[BUILD LINK]` in `.claude/drafts/reddit-3d6.md`,
  not Mon/Sat; rewrite by hand for r/onednd, r/dndnext ④ archive the copy-pass and editor-fixes-after-0.9 sessions, and the M6 ones (decisions split, sources jam, sources build, both reviews); remove the `data-fixes-208994` worktree
  ⑤ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`) ⑥ ⚑ Spellfire Spark / Fey Sentinel
  ability pick (homebrew); the homebrew merge needs a real homebrew file.
- **Ids:** live ones (OPEN, ⚑, standing rules, the M6 chain) are in `DECISIONS.md`; landed ones moved to
  `DECISIONS-settled.md` (on demand). One lookup: `grep -n "D146" DECISIONS*.md`.

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


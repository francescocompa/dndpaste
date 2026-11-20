# STATE — dndpaste

## TL;DR (2026-11-20 · main cd1ed0c + this commit · read 97k, healthy)
- **State:** 0.9.0 released (tag `v0.9.0`, pushed). Live at `https://dndpaste.fcomfy.workers.dev` (deploy b009285b,
  `/version` commit cd1ed0c, still reports 0.9.0): M6 your own sources on `/sources` (D244–D270) and T6.3 small fixes
  (D272–D278). Unreleased in CHANGELOG: `dndpaste/extract`, the origin-language checker fix. Library 246 + site 307 pass.
- **Single next action:** T7.2 — SPEC 0.10 lineage format (D280–D284; brief in PLAN M7): one worker in its own worktree,
  /ui-review, merge; then the overseer releases 0.10.0 per D57 and deploys.
- **Manual for Francesco:** ① push main (9 commits ahead) ② publish the GitHub release v0.9.0 with
  `.claude/drafts/release-v0.9.0.md` ③ post (T3.11): save a real build for `[BUILD LINK]` in `.claude/drafts/reddit-3d6.md`,
  not Mon/Sat; rewrite by hand for r/onednd, r/dndnext ④ archive the copy-pass and editor-fixes-after-0.9 sessions and
  the M6/T6.3 children (decisions split, sources jam, sources build, both reviews, small fixes); remove their worktrees
  (`data-fixes-208994`, the T6.3 one) ⑤ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`).

Working set: none

Spawned: none

- **Library:** 0.9.0 on main (SPEC 0.9; 0.7 keys still read with W005). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md.

⟳ Rename previous session → "Your own sources, small fixes and the 0.10 scope"  · session: local_3239e7bc-b6f1-486b-a2bf-8307d5d42585

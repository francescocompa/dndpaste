# STATE — dndpaste

## TL;DR (2026-11-20 · main 0cd3b57 + this commit · read 93k, healthy)
- **State:** 0.10.0 released (tag `v0.10.0`, local, not pushed) and live at `https://dndpaste.fcomfy.workers.dev`
  (`/version` 0.10.0, commit 0cd3b57). SPEC 0.10 lineage format (D280–D298): `Species: Elf|XPHB [Drow; WIS]`; 0.9 forms
  read with W006/W007 and Tidy rewrites them. Library 266 + site 309 pass. M7 done; nothing queued in PLAN past T3.11.
- **Single next action:** T3.11 community round (🎲, his): push, GitHub release, then the r/3d6 post (D285).
- **Manual for Francesco:** ① `git push origin main v0.10.0` ② publish the GitHub release v0.10.0 with
  `.claude/drafts/release-v0.10.0.md` ③ post (T3.11): save a real build for `[BUILD LINK]` in
  `.claude/drafts/reddit-3d6.md`, not Mon/Sat; rewrite by hand for r/onednd, r/dndnext ④ archive the done sessions
  (copy-pass, editor-fixes-after-0.9, M6/T6.3 children, lineage-0-10, lineage-site, t7-2-ui-review-and-merge) and remove
  their worktrees (7 under `.claude/worktrees/`, all merged or stale) ⑤ point the Zen Browser backup outside Google Drive
  (memory `mac-disk-worktrees`).

Working set: none

Spawned: none (T7.2's three workers done, merged 828d7ab)

- **Library:** 0.10.0 on main (SPEC 0.10; 0.7 keys read with W005, 0.9 lineage forms with W006/W007). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md. Size-L tasks (T7.2) ran out of room twice: split library and site into two workers up front.


⟳ Rename previous session → "Reddit post review and the 0.10 release"  · session: local_f0cf4e23-7468-4ac3-a9f9-6e7fb18a63f9

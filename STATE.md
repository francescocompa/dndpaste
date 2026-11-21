# STATE — dndpaste

## TL;DR (2026-11-21 · main 9a6206b + this commit · read 96k, healthy)
- **State:** 0.10.0 released (tag `v0.10.0` pushed, GitHub release published, D299) and live at `https://dndpaste.fcomfy.workers.dev`
  (`/version` 0.10.0, commit 0cd3b57). SPEC 0.10 lineage format (D280–D298): `Species: Elf|XPHB [Drow; WIS]`; 0.9 forms
  read with W006/W007 and Tidy rewrites them. Library 266 + site 309 pass. M7 done; nothing queued in PLAN past T3.11.
- **Single next action:** T3.11 community round (🎲, his): the r/3d6 post (D285).
- **Manual for Francesco:** ① post (T3.11): the build is chosen, Troll Bandit (D300; paste in
  `.claude/drafts/troll-bandit.dndpaste`, notes in the vault `Compendio/Personaggi/Troll Bandit.md` Version D). Save it on the
  site for `[BUILD LINK]`, swap the Shigen paste in `.claude/drafts/reddit-3d6.md` for it, finish your own-words rewrite of the body;
  post not Mon/Sat; rewrite by hand for r/onednd, r/dndnext ② archive the done sessions
  (copy-pass, editor-fixes-after-0.9, M6/T6.3 children, lineage-0-10, lineage-site, t7-2-ui-review-and-merge) and remove
  their worktrees (7 under `.claude/worktrees/`, all merged or stale) ③ point the Zen Browser backup outside Google Drive
  (memory `mac-disk-worktrees`).

Working set: none

Spawned: none (T7.2's three workers done, merged 828d7ab)

- **Library:** 0.10.0 on main (SPEC 0.10; 0.7 keys read with W005, 0.9 lineage forms with W006/W007). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed. The Mac mirror is 5etools v2.41.2 (has `WoW`,
  2026-11-21; old copy `5etools-src-main.bak-2.38.0`). The extract script also rewrites `data/srd/slots.json` meta: revert it
  (`git checkout -- data/srd/slots.json`) unless the SRD subset is meant to change.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md. Size-L tasks (T7.2) ran out of room twice: split library and site into two workers up front.
  A Bash command that spells out the Google Drive path is refused by the privacy plugin (the folder name holds the account
  address): use a glob (`"$HOME"/Library/CloudStorage/GoogleDrive-*/…`) or the Obsidian vault tools for vault notes.



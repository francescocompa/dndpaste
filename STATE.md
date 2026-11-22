# STATE — dndpaste

## TL;DR (2026-11-21 · main 22dcfb6 + handoff commit · read 104k, healthy)
- **State:** 0.11.0 released (tag `v0.11.0` pushed, GitHub release published) and live at `https://dndpaste.fcomfy.workers.dev`
  (`/version` 0.11.0, commit 22dcfb6). M8 done: the r/3d6 round-1 feedback (D302–D319) plus scores, SPEC 0.11 (D320–D333):
  `Scores: STR 8/DEX 14/…`, optional `Scores (point buy)` marker, score popover and method chip; no strict toggle (D330).
  Library 290 + site 346 pass. M9 queued (D334).
- **Single next action:** M9 site-b (running, Spawned line); then merge, release 0.12.0 and deploy. T3.11 posts (his) run alongside.
- **Manual for Francesco:** ① T3.11 posts: rewrite the r/3d6 body by hand for r/onednd and r/dndnext (draft
  `.claude/drafts/reddit-3d6.md`, Troll Bandit paste `.claude/drafts/troll-bandit.dndpaste`, D300); not Mon/Sat
  ② archive the done sessions (M8: scores jam, T8.3 library, T8.4 site, plus the older copy-pass, editor-fixes, M6/T6.3,
  lineage children) and remove the stale worktrees under `.claude/worktrees/` (7, all merged or stale)
  ③ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`).

Working set: none

Spawned: m9-site-b proposed as card `task_9fefe0f6` (site-a hit ~380k, he picked a fresh session), on **site-b** (T9.3 Gear toggle, T9.4 additive Masteries + T9.5 site mirror, D360–D369; main checkout, branch `claude/m9-site-b`) → next: overseer merges, releases 0.12.0 (D57, D299), deploys. lib and site-a merged afadd6a (root 315, site 361, check:bundle ok)

- **Library:** 0.11.0 on main (SPEC 0.11; 0.7 keys read with W005, 0.9 lineage forms with W006/W007). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed. The Mac mirror is 5etools v2.41.2 (has `WoW`,
  2026-11-21; old copy `5etools-src-main.bak-2.38.0`). The extract script also rewrites `data/srd/slots.json` meta: revert it
  (`git checkout -- data/srd/slots.json`) unless the SRD subset is meant to change.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240). `form.js` 127.8 KB and
  `ac.js` 84.4 KB after the T9.0 split (D335, D350).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md. Size-L tasks (T7.2) ran out of room twice: split library and site into two workers up front.
  A Bash command that spells out the Google Drive path is refused by the privacy plugin (the folder name holds the account
  address): use a glob (`"$HOME"/Library/CloudStorage/GoogleDrive-*/…`) or the Obsidian vault tools for vault notes.




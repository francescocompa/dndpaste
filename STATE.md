# STATE — dndpaste

## TL;DR (2026-11-21 · main 22dcfb6 + handoff commit · read 104k, healthy)
- **State:** 0.11.0 released (tag `v0.11.0` pushed, GitHub release published) and live at `https://dndpaste.fcomfy.workers.dev`
  (`/version` 0.11.0, commit 22dcfb6). M8 done: the r/3d6 round-1 feedback (D302–D319) plus scores, SPEC 0.11 (D320–D333):
  `Scores: STR 8/DEX 14/…`, optional `Scores (point buy)` marker, score popover and method chip; no strict toggle (D330).
  Library 290 + site 346 pass. M9 queued (D334).
- **Single next action:** M9, scoped (D335–D337): start the **lib** ∥ **site-a** workers (PLAN M9 workers line); next
  **site-b** after both merge, then release 0.12.0. T3.11 posts (his) run alongside.
- **Manual for Francesco:** ① T3.11 posts: rewrite the r/3d6 body by hand for r/onednd and r/dndnext (draft
  `.claude/drafts/reddit-3d6.md`, Troll Bandit paste `.claude/drafts/troll-bandit.dndpaste`, D300); not Mon/Sat
  ② archive the done sessions (M8: scores jam, T8.3 library, T8.4 site, plus the older copy-pass, editor-fixes, M6/T6.3,
  lineage children) and remove the stale worktrees under `.claude/worktrees/` (7, all merged or stale)
  ③ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`).

Working set: none

Spawned: disk-free `local_f322ed00-31c9-4539-bcaf-343e9fe963ef` (running, Mac, frees disk to ≥ 15 GB) → next: lib ∥ site-a (PLAN M9), each in its own worktree

- **Library:** 0.11.0 on main (SPEC 0.11; 0.7 keys read with W005, 0.9 lineage forms with W006/W007). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed. The Mac mirror is 5etools v2.41.2 (has `WoW`,
  2026-11-21; old copy `5etools-src-main.bak-2.38.0`). The extract script also rewrites `data/srd/slots.json` meta: revert it
  (`git checkout -- data/srd/slots.json`) unless the SRD subset is meant to change.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240). `form.js` is 149.4 KB
  of the 150 KB cap: T9.0 splits it (D335).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Merges into one release branch conflict only in DECISIONS.md. Size-L tasks (T7.2) ran out of room twice: split library and site into two workers up front.
  A Bash command that spells out the Google Drive path is refused by the privacy plugin (the folder name holds the account
  address): use a glob (`"$HOME"/Library/CloudStorage/GoogleDrive-*/…`) or the Obsidian vault tools for vault notes.




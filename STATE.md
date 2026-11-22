# STATE — dndpaste

## TL;DR (2026-11-22 · main 04734be + handoff commit · read 113k, healthy)
- **State:** M9 built and merged on main (04734be): SPEC 0.12 draft (additive Masteries, W008, `loadoutAt`, Tidy fold;
  feat bonuses with no `+x`), the `form.js`/`ac.js` split, Background block, Gear Mundane·Magic halves and `+N` chip,
  Custom scores stepper (D335–D366, settled file). Root 318 + site 371 pass, check:bundle ok. Not released, not deployed.
- **Single next action:** release 0.12.0 (D57, D299): CHANGELOG `Unreleased` → `0.12.0 — date`, `package.json`, build +
  verify, annotated tag, push main + tag, GitHub release from `.claude/drafts/release-v0.12.0.md` (humanized), then deploy
  the site. After it: scope the two M9 ⚑ (PLAN M9: gold-only gear pick, Classes self-update on level removal).
- **Manual for Francesco:** ① T3.11 posts: rewrite the r/3d6 body by hand for r/onednd and r/dndnext (draft
  `.claude/drafts/reddit-3d6.md`, Troll Bandit paste `.claude/drafts/troll-bandit.dndpaste`, D300); not Mon/Sat
  ② archive the done sessions (M9: disk-free, lib, site-a, site-b, site-b2; older: M8 scores jam, T8.3, T8.4, copy-pass,
  editor-fixes, M6/T6.3, lineage children) and remove the stale worktrees under `.claude/worktrees/` (the lib branch reused
  `format-0-9-b72b82`) ③ point the Zen Browser backup outside Google Drive (memory `mac-disk-worktrees`).

Working set: none

Spawned: none (lib, site-a, site-b, site-b2 merged 04734be; disk-free done, 60 GB free). site-b2's dev server may still hold :8787.

- **Library:** 0.11.0 on main (SPEC 0.11; 0.7 keys read with W005, 0.9 lineage forms with W006/W007). Releases per D57. The full slot table is
  gitignored (`data/slots.json`, regenerate with `node scripts/extract-slots.mjs "$HOME/Documents/D&D/5etool_mirror/5etools-src-main/data"`
  when a test fails on a missing `meta` field); the SRD subset is committed. The Mac mirror is 5etools v2.41.2 (has `WoW`,
  2026-11-21; old copy `5etools-src-main.bak-2.38.0`). The extract script also rewrites `data/srd/slots.json` meta: revert it
  (`git checkout -- data/srd/slots.json`) unless the SRD subset is meant to change.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Deploy: `cd site && npm run build && npx wrangler deploy`
  (a push does not deploy). The live CSP drops inline `style=` attributes: set positions through CSSOM (D240). `form.js` 129.9 KB and
  `ac.js` 92.3 KB of their 150 KB caps (D335, D350).
- **Follow-ups (post-launch):** a real logo (D148). Open: O1, O4, O5, O6, the format-update ⚑ (DECISIONS.md).
- **Gotchas:** On a turn a child's report started, the app refuses `start_session`: propose a card; briefs `cd` into the
  worktree. Workers past ~300k hand off with a brief in `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  Reserve a decision-id range per parallel worker. Parallel merges conflict in DECISIONS.md and CHANGELOG.md (keep both sides). A new fixture moves the render hash: bump `RENDER_VERSION` and the LOCK in `site/test/cache.test.ts`. M9 site workers with /ui-review ran past 300k (site-a 380k, site-b 320k): give each one task set plus one review. Size-L tasks (T7.2) ran out of room twice: split library and site into two workers up front.
  A Bash command that spells out the Google Drive path is refused by the privacy plugin (the folder name holds the account
  address): use a glob (`"$HOME"/Library/CloudStorage/GoogleDrive-*/…`) or the Obsidian vault tools for vault notes.

⟳ Rename previous session → "M9 scoping, workers and merges"  · session: local_402b26d8-bf7f-4898-a579-5a45805119a1

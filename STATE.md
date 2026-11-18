# STATE — dndpaste

## TL;DR (2026-11-18 · main 4c34e26 + this commit · read 131k)
- **State:** M3 live at `https://dndpaste.fcomfy.workers.dev` (D117, D118), last deploy f80cf721. Launch prep for a
  community feedback round is done on main, **not deployed**: SRD licence check closed (D141), aliases never retire
  within `Paste: 1` and `FORMAT-UPDATES.md` decided (D142–D145), feedback via GitHub Issues + "Send feedback" on
  `/about` and `/guide` (D146, D147; merged 4c34e26). Library 179 + site 212 tests pass. Showcase idea logged as O5.
  GitHub: `origin/main` at e339b61; later commits, `v0.7.0` and `v0.8.0` not pushed; `v0.8.0` not tagged.
- **Single next action:** his deploy go for the feedback route (`cd site && npx wrangler deploy`), then the launch:
  tag + push, a GitHub release for v0.8.0 (D145), a soft round with his table, then r/3d6, then r/onednd (check each
  sub's self-promotion rule; skip r/dnd).
- **Manual for Francesco:** ① say go on the deploy; ② tag `v0.8.0` on 423ac7b (D57), push `main`, `v0.7.0`, `v0.8.0`;
  ③ create the v0.8.0 GitHub release with the CHANGELOG's Migrating list (D145); ④ archive the feedback-plumbing,
  T3.9 and build-stamp sessions (all merged); ⑤ point the Zen Browser backup outside Google Drive (it refilled the
  disk via Drive's lost_and_found; memory `mac-disk-worktrees`); ⑥ the Notion "Character Ideas" defects, if you care
  to; ⑦ ⚑ Spellfire Spark / Fey Sentinel ability pick (homebrew); ⑧ the homebrew merge needs a real homebrew file.

Working set: mockup `.claude/mockups/logo/dndpaste-logo.svg` (temp logo, his Affinity drawing; untracked, not on the site)

Spawned: none

- **Library:** 0.8.0 on main (SPEC 0.8, D106–D113; 0.7 keys read with a warning). Releases per D57.
  The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66). Book codes: `node site/scripts/books.mjs` by hand (D115).
- **Follow-ups (post-launch):** placing the temp logo (header, favicon; needs a decision); checker counts 2024 origin languages as extras; some book titles raw from data
  ("Project_Lamordia"); no sort by Type at phone width; `package-lock.json` still says 0.3.0.
- **Gotchas:** On a turn a child's report started, the app
  refuses `start_session`: propose a card; briefs `cd` into the worktree. Handover notes:
  `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`. Google Drive hung reading
  `ClaudeConfig/bin` (review server script) on 2026-11-16; the review ran a connector-fetched copy.

⟳ Rename previous session → "Launch readiness, format policy and temp logo"  · session: local_fca37e60-edcc-4a35-90aa-22609d4b288b

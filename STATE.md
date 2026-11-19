# STATE — dndpaste

## TL;DR (2026-11-18 · main d9bf405 + this commit · read 131k)
- **State:** M3 live at `https://dndpaste.fcomfy.workers.dev` (D117, D118). Launch prep for a
  community feedback round is done and **deployed** (2381df0, version c5b4ebca, 2026-11-18; favicon URL versioned `?v=2`, with the temp logo in the header
  and as the favicon, D148): SRD licence check closed (D141), aliases never retire
  within `Paste: 1` and `FORMAT-UPDATES.md` decided (D142–D145), feedback via GitHub Issues + "Send feedback" on
  `/about` and `/guide` (D146, D147). Library 179 + site 214 tests pass. Showcase idea logged as O5.
  GitHub: main, `v0.7.0`, `v0.8.0` pushed; release v0.8.0 published (2026-11-18); repo description, homepage, topics set.
- **Single next action:** the launch: a soft round with his table, then r/3d6, then r/onednd (check each
  sub's self-promotion rule; skip r/dnd).
- **Manual for Francesco:** ① save a real build on the site for the r/3d6 draft (`.claude/drafts/reddit-3d6.md`, `[BUILD LINK]`); check the sub's rules; ② archive the feedback-plumbing,
  logo-deploy, T3.9 and build-stamp sessions (all merged); ③ point the Zen Browser backup outside Google Drive (it refilled the
  disk via Drive's lost_and_found; memory `mac-disk-worktrees`); ④ the Notion "Character Ideas" defects, if you care
  to; ⑤ ⚑ Spellfire Spark / Fey Sentinel ability pick (homebrew); ⑥ the homebrew merge needs a real homebrew file.

Working set: none

Spawned: none running. Main at 6abf05f has every 0.9 fix (merge 1b54399 + T34 defect fixes 1725d99, 6abf05f; root 243 with the full local table, site 287). Branch `claude/editor-polish-44bc86` is merged; its worktree can go when the editor-polish session is archived · next: D152 copy pass card (also the /about privacy line: drafts and the author, D150) → 0.9 release (Francesco, D57) → deploy → post · archive: editor-polish, wire, finish-srd, editor-fixes, lib-fixes, editor-round-2, lib-round-2, wide-user-test

- **Library:** 0.8.0 on main (SPEC 0.8, D106–D113; 0.7 keys read with a warning). Releases per D57.
  The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D116, look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66). Book codes: `node site/scripts/books.mjs` by hand (D115).
- **Follow-ups (post-launch):** a real logo to replace the temp one (D148); checker counts 2024 origin languages as extras; some book titles raw from data
  ("Project_Lamordia"); no sort by Type at phone width.
- **Gotchas:** On a turn a child's report started, the app
  refuses `start_session`: propose a card; briefs `cd` into the worktree. Handover notes:
  `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`. Google Drive hung reading
  `ClaudeConfig/bin` (review server script) on 2026-11-16; the review ran a connector-fetched copy.

⟳ Rename previous session → "Launch readiness, format policy and temp logo"  · session: local_fca37e60-edcc-4a35-90aa-22609d4b288b

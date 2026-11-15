# STATE — dndpaste

## TL;DR (2026-11-15 · 0.7.0 · M1 ✅ · M2 ✅ · M3 share site scoped · 143 tests green · v0.7.0 tagged locally, not pushed)
- **Where it stands.** SPEC 0.5 + D1–D57. Library = parser + canonical emitter + data-driven checker
  (`check`/`normalise`/`finalScores`/`classSequence`) + `bin/dndpaste.mjs` CLI, zero deps, ESM + UMD.
  0.6.0 (2026-09-30) carries the fixes from character-forge's real-build stress wave (cf-D81):
  named partial `Scores`, `Classes` runs with switch-point headers, granted feats, magic variants,
  and two fixes (D46–D56). Releases follow D57 (annotated `vX.Y.Z` tags, never moved). Ten fixtures;
  the full slot table lives in the gitignored `data/slots.json`, the SRD subset is committed.
- **0.7.0 (2026-11-10):** SPEC 0.7 = optional `HP` key (D59–D60) + optional `Producer` stamp (D62), released together for character-forge's P8 (D61). Tagged locally; **push awaits Francesco**. character-forge copies `dist/` in its own crossing and drops `X-HP`.
- **Share site scoped (2026-11-15):** D65–D74 close D45's open list; `SITE.md` is the one-shot build brief.
  Free workers.dev launch with a canonical-origin redirect, plain names, no checker in v1, full QoL set.
- **Look jam done (2026-11-15):** D80–D89; frames + build brief in `jams/2026-11-15-site-look/` (untracked, local).
- **Single next action:** M3 T3.2a, Worker core + no-JS view, branch `site-m3` (own worktree, Opus@high, Mac).
  **Chain:** 3.2a → 3.2b form with JS → 3.2c view interactions + chrome + `/about` → T3.3 fresh-eyes → /ui-review
  → T3.4 deploy on Francesco's go. The overseer starts each slice when the previous one reports.
- **Manual for Francesco:** ② the
  Notion "Character Ideas" defects (stress/REPORT.md § Theirs) if you care to; ③ ⚑ do Spellfire
  Spark / Fey Sentinel ask an ability pick (homebrew feats, only you know); ④ homebrew merge (M2
  queue) needs a real 5etools-format homebrew file from you.


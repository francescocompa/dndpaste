# STATE — dndpaste

## TL;DR (2026-09-30 · 0.6.0 · M1 ✅ · M2 ✅ · 128 tests green · on GitHub, tagged v0.6.0)
- **Where it stands.** SPEC 0.5 + D1–D57. Library = parser + canonical emitter + data-driven checker
  (`check`/`normalise`/`finalScores`/`classSequence`) + `bin/dndpaste.mjs` CLI, zero deps, ESM + UMD.
  0.6.0 (2026-09-30) carries the fixes from character-forge's real-build stress wave (cf-D81):
  named partial `Scores`, `Classes` runs with switch-point headers, granted feats, magic variants,
  and two fixes (D46–D56). Releases follow D57 (annotated `vX.Y.Z` tags, never moved). Ten fixtures;
  the full slot table lives in the gitignored `data/slots.json`, the SRD subset is committed.
- **Single next action:** M3 — the my-spellbook export (its L5.5), as a **separate session in that
  repo** under its own CLAUDE.md (D44): copy `dist/dndpaste.umd.cjs` (run `npm run build` first),
  map `levelGains`/`timelinePicks` → AST → `emit`. Copy 0.6.0 or later: 0.5.0 sums `Classes` runs silently.
- **Manual for Francesco:** ② the
  Notion "Character Ideas" defects (stress/REPORT.md § Theirs) if you care to; ③ ⚑ do Spellfire
  Spark / Fey Sentinel ask an ability pick (homebrew feats, only you know); ④ homebrew merge (M2
  queue) needs a real 5etools-format homebrew file from you.


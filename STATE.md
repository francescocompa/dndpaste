# STATE — dndpaste

## TL;DR (2026-09-05 · 0.5.0 · M1 ✅ · M2 ✅ · 84 tests green · not on GitHub yet)
- **Where it stands.** SPEC 0.4 + D1–D44. Library = parser + canonical emitter + data-driven checker
  (`check`/`normalise`/`finalScores`) + `bin/dndpaste.mjs` CLI, zero deps, ESM + UMD. The M2 tail
  shipped as 0.5.0 today: five worktree agents in parallel, fresh-eyes review (1 blocker, 4
  should-fixes, all fixed). `data/supplement.json` is now tracked. Ten fixtures; the full slot
  table lives in the gitignored `data/slots.json`, the SRD subset is committed.
- **Single next action:** M3 — the my-spellbook export (its L5.5), as a **separate session in that
  repo** under its own CLAUDE.md (D44): copy `dist/dndpaste.umd.cjs` (run `npm run build` first),
  map `levelGains`/`timelinePicks` → AST → `emit`. T2.7 (review-nit cleanup) shipped 2026-09-05, unreleased on top of 0.5.0.
- **Manual for Francesco:** ① create the GitHub remote and push (public repo, names only); ② the
  Notion "Character Ideas" defects (stress/REPORT.md § Theirs) if you care to; ③ ⚑ do Spellfire
  Spark / Fey Sentinel ask an ability pick (homebrew feats, only you know); ④ homebrew merge (M2
  queue) needs a real 5etools-format homebrew file from you.


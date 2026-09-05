# STATE — dndpaste

## TL;DR (2026-09-04 · commit after `28ff18f` · M1 ✅ · M2 first cut ✅ + stress-tested · 52 tests green · not on GitHub yet)
- **Where it stands.** SPEC 0.4 signed off; D1–D40 logged. Library = parser + canonical emitter +
  data-driven checker (`check`/`normalise`), zero deps, ESM + UMD. Slot table from the 5etools mirror
  (`data/slots.json` local, `data/srd/slots.json` committed) + `data/supplement.json`. Ten fixtures
  incl. Francesco's Vice, Shigen and Heavenly Archer; `fixtures/noncanonical/` holds tolerance inputs.
  Stress wave of 65 pastes: `stress/REPORT.md` (11 fixes done; the checker caught real defects in his
  Notion sheets, listed there).
- **Single next action:** M3 — the my-spellbook export (its L5.5): copy `dist/dndpaste.umd.cjs`, map
  `levelGains`/`timelinePicks` → AST → `emit`. Runs in that repo under its own CLAUDE.md. The M2 tail
  in PLAN.md is optional before it.
- **Manual for Francesco:** ① create the GitHub remote and push (public repo, names only); ② fix the
  Notion "Character Ideas" defects the checker found (stress/REPORT.md § Theirs) if you care to;
  ③ remaining open calls from the report (empty-block semantics, dangling `Class 0`, name-alias
  fallback) — recommendations given, no change made; ④ ⚑ do Spellfire Spark / Fey Sentinel ask an
  ability pick (homebrew feats, only you know).


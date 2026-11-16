# STATE — dndpaste

## TL;DR (2026-11-16 · 0.7.0 · M1 ✅ · M2 ✅ · M3 slices 1–3 ✅ · 143 + 93 site tests green · v0.7.0 tagged locally, not pushed)
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
- **Slice 1 done (2026-11-15, T3.2a):** `site/` = one Worker + assets + KV, every SITE.md route works under `wrangler dev`
  with JS off; shared renderer `site/src/render.ts`; 75 site tests (fixture round trips, hostile input, limits, AA contrast)
  + `check:bundle` IP gate; fidelity per frame in `site/FIDELITY.md`. Commits on branch `claude/site-m3-ee11e4`, not pushed.
- **Slice 2 done (2026-11-16, T3.2b):** the paste form with JS in `site/src/client/` (editor over a highlight layer with the
  renderer's span classes, Problems with line links, key hints D83, Tidy, Open file and drop, link import D85, My recent
  shares, phone dock D86 with `visualViewport`), bundled by `scripts/build-client.mjs` to `public/assets/form.js`
  (gitignored; built by `npm run build`, wrangler's `[build]`, and `verify`); `check:bundle` scans it. 86 site tests.
  Fidelity per frame in `site/FIDELITY.md`.
- **Slice 3 done (2026-11-16, T3.2c):** `site/src/client/site.ts` → `public/assets/site.js`, a classic script in `<head>` on
  every page: Display menu (theme + Colour by kind + Colour abilities, saved in this browser, applied before first paint),
  split Copy link + ▾ (Copy text, Copy canonical, copied state, select-text fallback), fold all, report Cancel, phone view
  dock, popovers kept in the viewport and bottom sheets on phones (D87, D89). `/about` copy written (/humanize). D90 built:
  the line being typed holds its E001 until the cursor leaves or 1.5 s pass; Save still blocks. Contrast test widened
  (switch tracks, mixed surfaces, coverage of every text token); new `--tog` token. 93 site tests. Fidelity in
  `site/FIDELITY.md`; shots in the overseer's notes folder `slice3-shots/`. D90 lives in main's DECISIONS.md, not yet here.
- **Single next action:** M3 T3.3 fresh-eyes review of branch `claude/site-m3-ee11e4` (frames + slice shots), then
  /ui-review, then T3.4 deploy on Francesco's go. The overseer runs each step.
- **Manual for Francesco:** ② the
  Notion "Character Ideas" defects (stress/REPORT.md § Theirs) if you care to; ③ ⚑ do Spellfire
  Spark / Fey Sentinel ask an ability pick (homebrew feats, only you know); ④ homebrew merge (M2
  queue) needs a real 5etools-format homebrew file from you.


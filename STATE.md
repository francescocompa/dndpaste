# STATE — dndpaste

## TL;DR (2026-11-16 · main: handoff commit on a411b1c + build branch `claude/site-m3-ee11e4` 7a03bfe · read 72k)
- **State:** M3 share site paused after slice 2 of 3, at Francesco's call. The branch has the Worker core,
  routes, KV, renderer and no-JS view (slice 1), plus the JS form (slice 2). 143 library tests, 86 site tests and
  the bundle check pass. Unmerged, unpushed, not deployed. Its own STATE block is on the branch.
- **Single next action:** M3 T3.2c, slice 3: view interactions, site chrome, `/about`, **plus D90's fix** (hold an
  E001 on the line being typed). It runs as a **fresh session in the existing worktree**
  `.claude/worktrees/release-0-7-0-5b6161`, same branch (disk ~3 GB free; a new worktree needs 5.4 GB). Brief: jam
  `build-brief.md` slice 3 + `SITE.md` + D80–D90. Then T3.3 fresh-eyes → /ui-review → T3.4 deploy on his go → merge.
- **Manual for Francesco:** ① push the `v0.7.0` tag (D61) when you want; ② the Notion "Character Ideas" defects
  (stress/REPORT.md § Theirs), if you care to; ③ ⚑ do Spellfire Spark / Fey Sentinel ask an ability pick (homebrew,
  only you know); ④ the homebrew merge (M2 queue) needs a real 5etools-format homebrew file; ⑤ archive the two
  finished slice sessions and the jam session; ⑥ free disk (Downloads 1.5 GB, Chrome cache 1.9 GB) if slices
  should get their own worktrees again.

Working set: worktree `.claude/worktrees/release-0-7-0-5b6161` (branch `claude/site-m3-ee11e4`, `cd site && npx wrangler dev`) ·
jam `jams/2026-11-15-site-look/build-brief.md` + `frames/` (untracked, local only) · `SITE.md`

Spawned: slice 1 Worker core · local_39b2c186 · worktree `claude/site-m3-ee11e4` · done, unmerged · owed: merge after T3.4
Spawned: slice 2 form with JS · local_3be9c204 · same worktree (cwd), same branch · done, unmerged · owed: merge after T3.4
Spawned: site look jam · local_a6b79b97 · jam · done, folded (D80–D89) · owed: —
Spawned: T3.3 fixes · local_657aff77 · same worktree, same branch · done, unmerged (b679c33, 63759fd); its two flags settled as D91–D92 · owed: merge after T3.4
Spawned: /ui-review · local_de264fb8 + finisher local_6c4a58f3 · done, unmerged (71ccde4, f9af319; D93–D95, D98) · owed: merge after T3.4
Spawned: 3.2d editable shares (D97, D100) · local_4ac34b6d · same worktree · done, unmerged (56f3f64, f09b1cc; two KV writes per edit, see SITE.md) · owed: merge after T3.4
Spawned: 3.2e /guide + example (D99) · local_cad07eda · same worktree, same branch · building · next: verify → fresh-eyes on 3.2d edit routes + 3.2e → short /ui-review of 3.2d+3.2e → T3.4 deploy on his go → merge
Spawned: slice 3 view + chrome + /about + D90 · local_0d32913b · same worktree (cwd), same branch · done, unmerged (86d5415, c3f8e9a) · owed: merge after T3.4 · T3.3 review: no blockers, fixes went to a fresh worker (it hit the size limit) · owed: archive

- **Library:** 0.7.0 (SPEC 0.7 + D1–D62), parser + emitter + data-driven checker + CLI, zero deps, ESM + UMD.
  Releases per D57. The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74 + D90, look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66 follow-ups queued); plain names (D67).
- **Gotchas:** an orphan clean worktree `.claude/worktrees/site-m3-f5c245` (deleted session) can go. The app refuses
  to start a session in another folder on a turn a child's report started; it needs a message from Francesco.

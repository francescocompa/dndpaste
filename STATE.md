# STATE — dndpaste

## TL;DR (2026-11-16 · main 2350b64 + build branch `claude/site-m3-ee11e4` f09b1cc · read 84k)
- **State:** M3 share site is built through 3.2d on the branch: Worker + KV + DailyCap DO, form, view, chrome,
  `/about`, T3.3 security fixes, a 3-round /ui-review, editable shares as revisions (D97, D100). 143 library and
  137 site tests pass. 3.2e (`/guide` + "Start from an example", D99) is building. Unmerged, unpushed, not deployed.
- **Single next action:** when 3.2e reports (session [local_cad07eda], not linked to the next overseer: check it
  with `list_sessions` and the branch log), verify it, then run an Opus **fresh-eyes** pass (Agent `fresh-eyes`) on
  3.2d's edit routes (`/<id>/edit`, key hash, revisions, two KV writes per edit, 5-min cache) and 3.2e, route fixes
  to a worker, then a short **/ui-review** of 3.2d + 3.2e, then **T3.4 deploy on his go**, then merge the branch.
- **Manual for Francesco:** ① push the `v0.7.0` tag (D61) when you want; ② the Notion "Character Ideas" defects
  (stress/REPORT.md § Theirs), if you care to; ③ ⚑ do Spellfire Spark / Fey Sentinel ask an ability pick (homebrew,
  only you know); ④ the homebrew merge (M2 queue) needs a real 5etools-format homebrew file; ⑤ archive the finished
  sessions below once 3.2e commits (archiving one whose cwd is the worktree may clean it up: wait for no writer);
  ⑥ free disk (5.2 GB free, under the app's 5.4 GB for a new worktree) if builds should get their own worktrees.

Working set: worktree `.claude/worktrees/release-0-7-0-5b6161` (branch `claude/site-m3-ee11e4`; its
`.claude/launch.json` "site" = wrangler dev :8787) · `SITE.md` · `site/FIDELITY.md`

Spawned: 3.2e /guide + example (D99) · local_cad07eda · same worktree, same branch · running · owed: verify, then fresh-eyes
Spawned: 3.2d editable shares (D97, D100) · local_4ac34b6d · same worktree · done, unmerged (56f3f64, f09b1cc) · owed: merge after T3.4; archive
Spawned: /ui-review · local_de264fb8 + finisher local_6c4a58f3 · same worktree · done, unmerged (71ccde4, f9af319; D93–D95, D98) · owed: merge after T3.4; archive
Spawned: T3.3 fixes · local_657aff77 (archived) · done, unmerged (b679c33, 63759fd; D91–D92) · owed: merge after T3.4
Spawned: slice 3 · local_0d32913b · cwd = the worktree · done, unmerged (86d5415, c3f8e9a) · owed: merge after T3.4; archive
Spawned: slices 1–2 (local_39b2c186, local_3be9c204) · done, unmerged · owed: merge after T3.4

- **Library:** 0.7.0 (SPEC 0.7 + D1–D62), parser + emitter + data-driven checker + CLI, zero deps, ESM + UMD.
  Releases per D57. The full slot table is gitignored (`data/slots.json`); the SRD subset is committed.
- **Site:** scope D65–D74, D90–D100 (D91 DO cap, D97 edits, D99 guide), look D80–D89, brief `SITE.md`. Free workers.dev with a canonical-origin redirect
  (D70); no checker in v1 (D66 follow-ups queued); plain names (D67).
- **Gotchas:** an orphan clean worktree `.claude/worktrees/site-m3-f5c245` can go. On a turn a child's report or a
  peer message started, the app refuses `start_session` (any folder): propose a card instead; cards can't carry `cwd`,
  so propose in this project and have the brief `cd` into the worktree. Handover notes live in
  `~/Library/Application Support/Claude/side-session-notes/<overseer id>/`.
  `npm run verify` on main fails at the test step (`node --test dist/test/` is a directory, Node 22 rejects it; all 143
  pass by glob). The branch's `package.json` already uses `"dist/test/*.test.js"`: fixed at merge.

⟳ Rename previous session → "Share site slice 3 to editable shares"  · session: local_ae9b759a-6c13-42e0-a78f-6deee27f6a9c

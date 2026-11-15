# Fidelity — share site build vs the jam's frames

Frames: `jams/2026-11-15-site-look/frames/` (local, untracked). Screenshots, kept outside the repo in the overseer's notes
folder `side-session-notes/local_88ecda90-…/slice1-shots/`: `frame-*.png` (the frame) beside `site-*` (this build, served by
`wrangler dev`, light theme, colours on). Each row: **matches** · **deviates** (with the id that allows it) · **data gap**.

## Slice 1 (T3.2a, 2026-11-15) — Worker core and the no-JS view

### view-vice-desk (1024)
- **Matches:** wordmark with the Garnet dot and the top rule; title, byline and date (`by ash · 15 Nov 2026`); Hanging keys (D81):
  15ch right-aligned key margin, one Plex Mono value column, header → Species → Background → level blocks with the 0.9em gap,
  2px rule on block children, `L1`…`L5` in the Garnet accent at 600, class names at 600, chevron icon from the sprite (D89);
  colour by kind and abilities on (D82): scores per ability, `+2 CHA`, `[CHA]`, `|AAG` / `|HB` in the source grey; the report
  line under the build, same words (D87).
- **Deviates:** Display button, the Copy link split button and "Fold all levels · Expand all" are absent — view interactions and
  chrome are slice 3 (build brief). "Duplicate and edit" is a plain link to `/?from=<id>`, so it works without JS.
- **Deviates:** button labels render at 400; the frames ask for 500, the brief ships two weights per family (400, 600).
- **Deviates (D88 a):** four greys moved off the jam values to pass AA, checked by `test/contrast.test.ts`: light `--mute`,
  `--key`, `--warnc` #6e7280 → #696d7b (mute on chip and on the error tint were 4.20 and 4.37); light `--src` #737885 → #6f7481
  (4.27); dark `--src` #6c707b → #7c808b (3.85). Barely visible side by side.
- **Deviates:** the title sits about 8px higher: the header has no Display button yet (slice 3), so it is shorter.
- **Data gap:** the frame shows L4 and L5 folded (`› 1 line`) as a demo; the page opens every level. Folding works without JS
  (`<details>`); a folded level shows the right chevron and its line count, as framed.
- **Not in the frame:** with JS off only, a `<noscript>` line "Text as written · Canonical text" sits beside Duplicate and edit,
  so a no-JS reader can still get the text. A favicon (Garnet square, white dot) was added; ⚑ Francesco to confirm or replace.

### view-vice-phone (375)
- **Matches:** 11ch key margin with keys allowed to wrap, values wrapping under their own column ("Misty Visions"), 16px side
  gutter, 13px base, the same block order, colours and accents as the desk frame. No horizontal scroll at 375 (checked in the
  browser pane: document width 375).
- **Deviates:** no bottom dock (Copy link + Duplicate and edit): it is slice 3 (D87). Until then Duplicate and edit sits under
  the byline, as on the desk. Display button and fold controls: slice 3.
- **Data gap:** as on the desk, L4 and L5 open rather than folded.
- **Capture note:** headless Chrome cannot go below about 500px wide, so `site-view-vice-phone.jpg` comes from the browser pane
  at a real 375 viewport.

### Not framed in slice 1, built to the frames' words
- Report form (`view-sparse-report-dark-desk`, styled in slice 3): opens in place without JS via `<details>`; reason (required,
  500), contact (optional, 200), "Send report", the "never shown on this page" line. A sent report lands back on the view with
  a thank-you line. No Cancel button yet (closing the summary does it; slice 3 adds the button).
- No-JS paste form (`form-error-desk` wording): Title and Author on full-width lines, "Save and get link", the Problems list
  with E-code, line and message, amber errors (D88 d), "1 error · fix it to save". The editor layer, Tidy, Open file, key hints
  and recent shares are slice 2.

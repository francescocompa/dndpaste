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

## Slice 2 (T3.2b, 2026-11-16) — the paste form with JS

Screenshots in the overseer's notes folder `side-session-notes/local_88ecda90-…/slice2-shots/`: `frame-form-*.png` (headless
Chrome; phone frames at 500 wide, the 375 frame sits left) beside `site-form-*.jpg` (browser pane, `wrangler dev`, 1024 or a
real 375 viewport; the pane scales 1024 down to 800 in the capture). Light unless the frame name says dark; colours on.

Shared by all six frames:
- **Deviates (slice 3):** no Display button in the header; it comes with the site chrome (build brief, slice 3).
- **Deviates:** button labels at 400, not the frames' 500 (two weights per family, as in slice 1).
- **Deviates:** the editor keeps a minimum height (15em desk, 12em phone, about 9 and 7 lines) so an empty paste target stays
  obvious; the frames draw it as tall as its text (one line in the link frames).
- **Deviates:** the form page is 1120px wide at most (`.new .wrap`); the frames are full width at 1024, which this matches.
- **Not in the frames, built to their words:** "Nothing to save yet" for an empty paste; "No errors · N warnings, ready to
  save" when only warnings stand; a Size row in Problems past 32 KB ("Over 32 KB · shorten it to save", Save off); past 100
  problems the list says how many more are not listed.

### form-error-desk (1024)
- **Matches:** Title and Author on full-width lines; toolbar Open file · Tidy (off) · "1 error · fix it to save" · Save (off);
  editor with line numbers, identifier bold, level headers with the Garnet `L<n>`, colour by kind and abilities, line 18 in the
  amber row with `Spels` wavy-underlined (D88 d); side column 270px: Problems (`E002 line 18 Unknown key: Spels`, the line
  number underlined and jumping to the line), "Keys you can add to L5 Warlock" with the frame's 17 chips in table order,
  My recent shares with Today / 12 Nov and the italic Untitled build, "Kept in this browser only."
- **Data gap:** the frame's caret mark is a mock; the real caret is the textarea's.

### form-drop-dark-desk (1024, dark)
- **Matches:** the dashed Garnet drop overlay over the editor with "Replaces the text in the editor. Undo brings it back.";
  "No problems · ready to save"; "No problems. Warnings show here; they don't block saving."; "Keys you can add to the
  header" with the frame's 16 chips; the empty recent-shares line.
- **Deviates:** the overlay says "Drop to open the file", not "Drop to open shigen.dndpaste": browsers hide a dragged file's
  name until the drop. A file that is not .txt/.dndpaste/text is refused with a line above the form.
- **Deviates:** Tidy is off here: the frame's text is already canonical, and Tidy is on only when it would change something
  (the link frames show it off for the same reason).

### form-link-desk (1024)
- **Matches:** the import bar between toolbar and editor (D85): "That's a dndpaste link. Open **Vice** by ash in the editor?",
  Open it (import icon, primary) and Keep as text; 24 header keys; Open it fills title, author and text (Undo restores the text).
- **Deviates:** the pasted link renders bold: the parser reads a lone first line as the identifier, and the editor bolds the
  identifier as the error frame does. The frame draws it plain.
- **Data gap:** the build's own link reads `127.0.0.1:8787/<id>` under `wrangler dev`. A missing id gets "That looks like a
  dndpaste link, but there is no build with the id <b>…</b>." with Keep as text only; a link to another host is ignored.

### form-error-phone (375)
- **Matches:** 16px gutter; Open file · Tidy only in the toolbar; Problems and My recent shares stacked below; the bottom dock
  (D86) with "Keys 17" + chevron-up, the first error (`E002 line 18`, wrapping onto two lines as framed, tap jumps to it) and
  Save (off). No horizontal scroll (document width 375).

### form-keys-dark-phone (375, dark)
- **Matches:** Keys open: one chip row above the dock row, narrowed by the half-typed `Spe` to `Spells:`; the toggle shows the
  chevron-down and drops its count. A tap replaces `Spe` with `Spells: ` and focus stays in the editor (controls cancel
  mousedown), so the keyboard stays up. The dock rides `--kb` above the keyboard from `visualViewport` (checked by setting
  `--kb: 250px`: the dock's bottom moved to 250px above the viewport's).
- **Deviates:** the dock reads "E001 line 31" while `Spe` is half-typed, and line 31 is amber: `parse` calls a key without a
  separator malformed. The frame shows "No problems" at that moment. ⚑ Open question for Francesco: hide the error on the
  line being typed while the hints are narrowed?
- **Data gap:** the browser pane has no on-screen keyboard; the frame's keyboard stand-in is absent, and the page is scrolled
  to its end rather than to the editor's last lines.

### form-link-phone (375)
- **Matches:** the import bar wraps its sentence over two lines with the buttons right-aligned beneath; "Keys 24"; the dock's
  "No problems" wraps as framed; Save on.
- **Deviates:** as on the desk, the link line is bold and the editor keeps its minimum height.

### Data checks (build brief), slice 2
- All fixtures: each highlighted line's text equals the source line exactly, in every fixture, the noncanonical set and hostile
  lines; a canonical line's value markup equals `renderValue`'s (97 lines). Every fixture can save and is already tidy.
- Long: `heavenly-archer-v3` and a 75-line Vice through `?from=`: coloured on load, Problems box capped at 22em with its own
  scroll. A 30 KB, 1,861-line paste with 1,300 problems: a drop takes about 0.5 s, a keystroke about 0.1 s (the first one
  after a replace about 0.4 s), measured with the pane in the background. Real builds are well under 100 lines.
- Quoting, `X-` keys and drops (lines from `st-quoting`, `st-extension`, `st-drops`, looked at in the editor at 1024 and
  unit-tested): quotes in the punctuation grey with the name in its kind colour, `x2` as a quantity; the `X-` key italic,
  W001 listed, the row's number in the warning grey, "No errors · 1 warning, ready to save", Save on; `-` in the drop colour
  and the name struck through, as in the view.
- Save with the real button: lands on the view; back on the form the share heads My recent shares ("Today"), its hostile
  title `Drops <check>` escaped.
- Empty paste: Save off, "Nothing to save yet". 32 KB exactly saves; 32 KB + 1 turns Save off client-side (the server's 413
  stays, slice 1's tests).
- Title at 99–100 and author at 60 characters: the fields grow to three and two lines at 375; Enter is ignored and pasted
  newlines become spaces (the server flattens them too).
- Link to a missing id: the bar says so. Storage blocked or full: recent shares keep the visit's saves in memory, the page
  works (unit tests; the pane cannot block storage before load).
- JS off: the server's form is unchanged apart from Title and Author becoming one-row textareas; the worker tests still post
  it, and pages carry no inline script (the one `<script>` is `/assets/form.js`, allowed once by the hostile-markup check).
- CSP holds: the pane refused `eval` under `script-src 'self'`; the client sets only CSSOM properties (height, `--kb`).

## Slice 3 (T3.2c, 2026-11-16) — view interactions, site chrome, /about, D90

Screenshots of this build in the overseer's notes folder `side-session-notes/local_ae9b759a-…/slice3-shots/` (`site-*.jpg`,
browser pane, `wrangler dev`, 1024 or a real 375 viewport, scaled in the capture). Compared against the frames' HTML and
`project.css` in `jams/2026-11-15-site-look/`. Every "slice 3" deviation in the slice 1 and 2 rows above is now built: the
Display button in the header, the split Copy link button, fold controls, the phone view dock.

Shared:
- **Deviates:** button labels at 400, not 500 (two weights per family, as in slices 1–2).
- **Not in the frames:** without JavaScript the Display button, the Copy split button, the fold controls and the report's
  Cancel are hidden (`njs`); Duplicate and edit stays a link and the `<noscript>` text links stay. `site.js` is a classic
  script in `<head>` (CSP `'self'`), so the saved theme and colour switches apply before the first paint.

### view-vice-desk (1024) and view-vice-phone (375), now complete
- **Matches:** header with Display (contrast icon, chip); Copy link split button (link icon, ▾ as a chevron icon, D89 a),
  Duplicate and edit beside it; "Fold all levels · Expand all" above the build, underlined mute. Phone: the bottom dock with
  the split button left and Duplicate and edit right, fold controls under the byline, no horizontal scroll (375).
- **Data gap:** L4 and L5 open on load, as in slice 1; Fold all folds every level (`site-foldall-dark-phone.jpg`).

### view-copymenu-dark-desk (1024, dark)
- **Matches:** the menu drops from the split button, aligned to its left edge; "Copy text / as written", "Copy canonical /
  tidied, for apps"; no icons on the desktop menu.
- **Deviates:** the frame draws the first item highlighted; here an item highlights on hover or keyboard focus (focus moves
  to the first item when the menu opens). The ▾ turns to point up while open.
- **D89 b:** the menu is `position: fixed`, placed under its button and shifted or flipped to stay inside the viewport,
  with a max height and its own scroll when neither side fits (checked at 640×260: Display menu clamped at 8px from the
  bottom, the Copy menu flipped above its button; `site-bounds-640x260.jpg`).

### view-sparse-report-dark-desk (1024, dark)
- **Matches:** "Link copied" with a check in the button's own colour (D88 b); the report form takes the line's place,
  Reason, Contact (optional), Send report + a ghost Cancel, the "never shown" line.
- **Not in the frame:** the copied state lasts 2 s, then the button reads Copy link again; from the menu it reads "Text
  copied" or "Canonical copied". An `aria-live` line announces it. Opening the form focuses Reason; Cancel closes it and
  returns focus to the report line. Without JS the form stays a `<details>` under its line (slice 1).
- **Clipboard:** `navigator.clipboard.writeText`, then `execCommand("copy")`, then a panel with the text selected and "Select
  the text and copy it" (`site-copy-fallback-phone.jpg`). Raw and canonical texts are fetched once at idle, so a copy does
  not wait on the network. Checked: Copy canonical writes exactly `/<id>/canon`, Copy link the canonical URL.

### view-display-desk (1024, light)
- **Matches:** Display, the Auto/Light/Dark segment, Colour by kind with its line and seven swatches, Colour abilities with
  STR–CHA in their hues, "Saved in this browser."; under the Display button, right-aligned.
- **Deviates (D88 a):** a switch's off track is a new token `--tog` (light #868a96, dark #666a75, 3.3 and 3.5 on the menu);
  the frame's `--rule` track is 1.2:1, under 3:1 for a UI part. The selected theme segment is set at 600 as well as in the
  foreground colour, so the choice does not rest on a colour step alone.
- **Not in the frame:** with storage blocked the line reads "This browser blocks storage: kept for this visit only." and the
  settings hold for the visit. Another tab's change follows through the `storage` event.
- **Checked live:** Dark + kinds off survive a reload while the system is light (`data-theme="dark"`, `html.ca` only).

### view-copysheet-dark-phone (375, dark)
- **Matches:** the sheet from the bottom with the grab bar, Copy text (copy icon) / as written, Copy canonical (tidy icon) /
  tidied, for apps, Cancel in mute.
- **Deviates:** a scrim dims the page behind the sheet (the frame shows the page undimmed); a tap on it closes the sheet.

### Not framed, built to the decisions
- **Display on the phone (D89 b):** a bottom sheet like the copy sheet, with a Close row (`site-display-sheet-dark-phone.jpg`).
- **/about (D71, D88 c, D89 c):** what the site is, names only, saved builds are immutable (Duplicate and edit), no accounts
  and what is stored, the three app addresses, the report route; one "not affiliated with Wizards of the Coast" sentence; no
  footer disclaimer anywhere. Copy drafted under /humanize (no dashes, sentence-case headings, its checker clean). The
  maintainer's `wrangler kv` commands stay in `site/README.md`, where SITE.md puts them, not on the public page.

### D90 (form-keys-dark-phone, closes slice 2's ⚑)
- Typing on a line holds that line's `E001`: the row is not amber, the dock reads "No problems" and Save looks ready, as in
  the frame. The hold ends when the cursor leaves the line (arrows, click, a jump, Enter), when the editor loses focus, or
  after 1.5 s without typing; the E001 then shows. Pressing Save while one is held lets go of the hold, shows the error and
  posts nothing (checked live: no POST, the dock reads "E001 line 31"). Pastes, Tidy, imports and opened files never hold.

### Contrast (D88 a), in code
- `test/contrast.test.ts` now also checks: switch track on and off against the menu and the knob against each track (3:1);
  the import bar's and the open Display button's mixed surfaces against their text (4.5:1, computed as the browser mixes
  them); and that every token `site.css` uses as a text colour is in the checked list. Light and dark both pass.

## UI review (2026-11-16) — three rounds, all approved

`/ui-review` on the dev build (review folder `reviews/2026-11-16-share-site/`, local only). Round 1: 24 items, round 2:
4, round 3: 2 plus the digest. Departures from the frames it decided (D93–D95, D98 in main's `DECISIONS.md`):

- **view-copysheet-dark-phone → D93, D98.** Sheets (Copy, Display, copy-by-hand) close with a ghost × on the grab-bar
  line (no fill, 36 × 36 tap area); the frame's bottom Cancel / Close row is gone. Scrim tap and Escape still close;
  focus lands on the first item. The desk copy menu now carries the sheet's icons, its `small` lines indented under them.
- **form-error-phone, form-keys-dark-phone → D94, D98.** Every dock status sits on its own row above Keys · Save,
  ruled off by a 1px `--rule` line: Nothing to save yet, No problems, No errors · N warnings, Only a name, and errors
  (code, line, message cut to one line; a tap still jumps to the line). Nothing sits between Keys and Save, and the dock
  keeps one height while typing. The frames put the status between the buttons.
- **Not framed → D95.** A name-only paste does not save: Save is off with "Only a name · Add a key, such as Species:",
  and the server answers 422. SPEC still allows it; this is a site rule.

Parked by the review (⚑ under D96 in main's `DECISIONS.md`, owner overseer): an empty value as "any" instead of E006 →
SPEC 0.8; Tidy fixing name case → after launch; writing help / a starting skeleton → after 3.2d. The favicon is
**ok for now** (no change).

Dev-only wiring kept for later reviews: `site/src/devreview.ts` (overlay script + loopback-only CSP when `UI_REVIEW` is
set in the gitignored `site/.dev.vars`; `uir-fault` cookie for the 503, daily-cap and 403 paths) and
`ui-review.tools.js` at the root. Never active in a deploy; covered by `test/devreview.test.ts`.

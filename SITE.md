# SITE — the dndpaste share site (M3 build brief)

> Owner of the site's scope. Decisions: D45 (amended), D65–D74 (2026-11-15), look D80–D89 (jam), editable shares D97 (amends D65).
> The look and the slice plan: `jams/2026-11-15-site-look/build-brief.md` + its 12 frames (local only, untracked:
> read them from `/Users/francescocompagnoni/Developer/dndpaste/jams/2026-11-15-site-look/`). On the look and the form, D80–D89 win.
> Background and IP reasoning: `SHARE-SITE-SIZING.md` (2026-11-10; its open calls are closed here).

## Goal
A pokepaste-like website: paste a build, get a short link, anyone can view it, and apps import it.
Functionality first, then the jam's look, then the QoL set. Names only, never rules text (D9, D45).

## Done when
- Live on `https://<worker>.<subdomain>.workers.dev` with Francesco's go (D73), smoke-tested there.
- Every route below works, including with JavaScript off for viewing and saving.
- Every fixture in `fixtures/` saves, views, and round-trips through `/raw` and `/canon`.
- Hostile input (HTML, script, quotes, very long lines, 32 KB + 1) is escaped or rejected, covered by tests.
- Nothing from `data/` or any 5etools file ships in the bundle (a build check fails the build).
- Root `npm run verify` green; `site/` tests green; fresh-eyes review findings fixed.
- README gains a "Share site" section; STATE, PLAN, CHANGELOG (an "Unreleased: site" note, no library tag) updated.

## Sequence
1. ✅ **Look jam** (2026-11-15): D80–D89, 12 approved frames in `jams/2026-11-15-site-look/`.
2. **Build** on branch `site-m3`, its own worktree, Opus@high, Mac, in the jam brief's slices: (1) Worker core + no-JS view,
   (2) the paste form with JS, (3) view interactions + site chrome + `/about`. One session per slice, each under ~200k, chained by the overseer.
3. **Fresh-eyes review** (`fresh-eyes` agent on Opus, inside the build session, before deploy): XSS and escaping, CSP, abuse paths (size, rate, id guessing, KV write exhaustion), the IP check, the redirect logic.
4. **Deploy** after Francesco's go: create the KV namespace, `wrangler deploy`, smoke test. GitHub push stays his.

## Architecture (D70, D73)
- `site/` in this repo: own `package.json` (wrangler + test tooling as devDependencies; the library stays zero-dep), `wrangler.toml`, `src/`, `public/`, `test/`.
- **One Worker** serves pages, static assets (Workers static assets) and the API, with **one KV namespace** bound as `PASTES`.
- Imports the library from `../src` (parse, emit). **One renderer module** (AST → escaped HTML string), shared by the Worker (server-rendered view, works without JS, carries OG tags) and the browser (live preview).
- `CANONICAL_ORIGIN` var: empty = serve any host; set = 301 every other host to it, path and query kept, CORS headers on the redirect.

## Routes (D69)
| Route | Does |
|---|---|
| `GET /` | Paste form: title, author, editor. `?from=<id>` pre-fills it (Duplicate and edit); `?from=<id>/<n>` with revision n. |
| `POST /` | Save. Form-encoded (no-JS) or JSON (fetch). Rejects empty, over 32 KB, title over 100 / author over 60 chars, any `E###` from `parse`, a name-only build (D95); warnings pass. 303 → `/<id>` (or JSON `{ id, url, key, edit }`: a JSON save gets an edit key, D97). |
| `GET /<id>` | View page of the latest revision, server-rendered from the AST; "edited <date>" once edited. |
| `GET /<id>/raw` | Text as written (latest). `text/plain; charset=utf-8`, `nosniff`, CORS `*`. |
| `GET /<id>/canon` | `emit(parse(text))`, same headers. |
| `GET /<id>/json` | `{ title, author, paste, created, edited, revision }` (`edited` null until the first edit), CORS `*`. |
| `GET /<id>/<n>` (+ `/raw`, `/canon`, `/json`) | Revision n (1–999999, no leading zero), fixed forever (D97); same types and CORS. Past the latest: 404. |
| `GET /<id>/edit` | The paste form filled with the latest, saving to `/<id>/edit`. The key comes from the browser (localStorage, or `#k=<key>` in the private edit link, read and cleared by form.js; a link's key is tried first, then the kept one, and kept only after an edit it opened succeeds). Without JS it says editing needs JS. |
| `POST /<id>/edit` | Edit: `title`, `author`, `paste`, `key`, optional `base` (the revision the form opened on). Order: key (403 without, wrong, or on a share that has none), `base` (409 if the share moved on), the save checks, then the save limits; an unchanged build answers 200 and writes nothing. 201 JSON `{ id, url, revision }` or 303 → `/<id>`. |
| `POST /<id>/report` | Report: reason (required, ≤ 500 chars), contact (optional), `rev` (the revision the reader was on; a pinned page sends it). Stored, never shown. |
| `GET /about` | What the site is; names only; unaffiliated with Wizards of the Coast; how reporting works. |
| `GET /guide` | Format guide (D99): how a paste is laid out, one annotated example (`site/src/example.ts`, also the form's "Start from an example"), and the key table built from the library's `KEYS` at bundle time. Links SPEC.md as the authority. Fixed path, 5 chars: cannot collide with a 10-char id. |
| anything else | 404 page. |

- **Id:** 10 random base62 chars from `crypto.getRandomValues`; check-then-put, retry on collision.
- **KV (D97):** `p:<id>` → the head, the latest revision: `{ v: 1, title, author, paste, created, r, n?, edited?, k? }` (ISO dates;
  `r` = the view body and canon text rendered at save, stamped with `RENDER_VERSION`, re-rendered on read when the stamp is old:
  free-plan CPU, T3.3; `n` = revision number, absent = 1; `edited` = when this revision was saved; `k` = SHA-256 hex of the
  edit key, absent = no one can edit). `p:<id>:<n>` → revision n as it was, frozen when revision n + 1 is saved (no `k`).
  A record from before D97 is revision 1 with no key. Reports `r:<iso>:<id>:<nonce>` → `{ id, reason, contact, created, revision }`. No TTL.
  - **Why this layout (two writes per edit, one read per view):** the brief asked for one write per edit if possible. With KV
    that means either no head (find the latest by probing `p:<id>:2`, `:3`… on every view: reads grow with edits, and a probe
    that misses a just-written revision overwrites it with other text) or the whole history in one value (every view reads
    it all). Both trade the common path, views, for the rare one. So an edit writes the frozen copy of the current head, then
    the new head: a save is still one write, a view one read, a revision URL two reads (the head first, so a frozen key is
    never read, and its miss cached, before it exists). If the second write fails, the share is unchanged. An edit costs
    two of the free plan's ~1k daily writes, so it counts twice against the D92 daily cap (D101: 25 edits a day per rate
    key) and once against the D71 per-minute limit.
  - **Known limit:** KV has no compare-and-set. Two edits of one share from two places within KV's ~60 s spread can read the
    same head; the later one wins and the earlier's revision number is reused. `base` turns the common case (a second tab
    or device with an older form) into a 409; the race left is the owner editing from two places within a minute.
- **Edit keys (D97):** 32 random bytes, base64url (43 chars), made at a JSON save and returned once (`key`, and `edit` =
  `<origin>/<id>/edit#k=<key>`). The fragment never reaches a server or a Referer. KV keeps only the SHA-256; the check hashes
  any submitted key (malformed ones too) and compares in constant time. The browser keeps keys in localStorage
  (`dndpaste.keys`, id → key); the view shows Edit and a "Copy edit link" item in the Copy link menu when it has one
  (Francesco, 2026-11-16, extends D97's "once"), and the private edit link in a panel after the save (from a
  `#new=<key>` fragment, shown only if it is the key this browser just kept, or when storage is blocked; cleared from the
  address at once). An edit link's `#k=` key stays in memory until an edit with it succeeds, so a crafted link never replaces
  a kept key (and "Copy edit link" never copies an untested one). A no-JS save gets no key: it has nowhere to keep one. A lost key leaves Duplicate and edit.
- **Cache (D97):** `/<id>` and its raw/canon/json `public, max-age=300` (an edit shows everywhere within ~5 min plus KV's
  spread; the editing browser re-fetches them with `cache: "reload"` before it lands on the share). `/<id>/<n>` raw/canon/json
  `public, max-age=31536000, immutable`; its page `public, max-age=86400` (the page also carries the chrome, which can change).
  Pinned only once frozen: `/<id>/<n>` for the latest revision caches like `/<id>` (5 min), since the edit race above can
  still overwrite it.
  `/<id>/edit`, errors and 404s `no-store`.
- **Reading reports (for Francesco):** `npx wrangler kv key list --binding PASTES --prefix r: --remote`, then `kv key get` per key; take a share down with `kv key list --prefix "p:<id>"` and `kv key delete` on each key it lists (the head and every frozen revision); one older revision alone: delete `p:<id>:<n>`. The latest revision lives only at
  `p:<id>`, so it comes down only with the whole share. A takedown doesn't reach copies browsers and proxies already
  cached: up to 5 minutes for the link and the latest revision, up to a year for an older revision's data. In README.
- **Limits (D71):** each edit counts as a save for every limit below (D97), and as two saves for the daily cap (D101). 32 KB; per-IP save limit about 10 a minute (Workers rate-limiting binding; if the free plan lacks it, a Cloudflare rate-limiting rule, documented for Francesco); reports limited the same way. Turnstile: a stubbed check behind an unset `TURNSTILE_SECRET`, off. Note: KV free tier is about 1k writes a day, pastes and reports together. T3.3 added: rate keys by IPv6 /64; a daily cap per key (50 saves, 20 reports, a `DailyCap` Durable Object); a failed KV write is a 503 page with the text kept; cross-site POSTs refused (403). Details in `site/README.md`.

## Form (D68)
- **Editor** with **syntax colouring** (keys, level headers, references, `|SOURCE`, quantities, `X-` keys) plus colour by kind and abilities (D82): a transparent textarea over a highlighted layer, so the textarea stays the source of truth (accessibility, undo, mobile keyboards). **No preview pane** (D84): the coloured editor is the preview.
- **Live diagnostics** in a Problems list (side column; phone: the dock's problem line): parse on input (debounced), errors and warnings with line numbers; clicking one jumps to the line. Save is disabled while any `E###` stands. Errors amber + E-code, never the accent (D88).
- **Key hints** (D83): the keys the current line's block allows (profile key table, no game data), minus those used; a tap inserts `Key: `. Phone: behind a "Keys" toggle in the dock (D86).
- **Format guide and example** (D99): the side column links `/guide` (no JS too). A new, empty form (not an edit, not Duplicate and edit: the server marks it `data-example`) shows "Start from an example" inside the empty editor; it fills the guide's example (one constant, `site/src/example.ts`), Undo empties it again, and the offer goes as soon as the editor has text.
- **Link import** (D85): pasting only a link to this site or a bare 10-char id offers "Open it" / "Keep as text"; fetches `/<id>/json`.
- **Layout** (D86): title and author on full-width lines, toolbar (Open file · Tidy · problem count · Save and get link), side column with Problems, Keys you can add, My recent shares.
- **Tidy**: replaces the text with `emit(parse(text))`; enabled only without errors; undoable.
- **Open or drop** a `.txt` / `.dndpaste` file into the editor.
- **Unsaved draft** (D102): the form keeps its title, author and text in localStorage (`dndpaste.drafts`) as you type
  (debounced, and on leaving the page), so a closed tab or a crash loses nothing and nobody saves a revision just to keep
  progress. One draft for a new build (Duplicate and edit included), one per share being edited, with the revision the
  form opened on; at most 20, oldest dropped. When the form opens with a draft that differs from what it loaded, a bar
  says "You have unsaved changes from <when>." with Restore · Discard (a draft made on an older revision adds that
  restoring replaces the changes saved since); the old draft stays until you pick. A successful save or edit clears it.
  Nothing goes to the server; storage blocked or full → no draft, no error. JS only (`src/client/drafts.ts`).
- Without JS: plain textarea + Save still work; the server returns the form with diagnostics on an error.

## View page (D67, D68)
- Title, author, date; the build rendered from the AST: identifier, header keys, species and background blocks, one block per level. **Names are plain text, no links** (D67). Only what the user wrote: no descriptions, stat lines, images or icons.
- Rendered in **Hanging keys** (D81): keys right-aligned in a margin, values in one mono column, level numbers in the Garnet accent.
- **Fold** each level block (`<details>`), plus fold/expand all.
- **Copy** (D87): split button "Copy link" with a menu for Copy text and Copy canonical (clipboard API with a select-text fallback); menus stay in the viewport, phones get a sheet (D89).
- **Duplicate and edit** → `/?from=<id>` (`/?from=<id>/<n>` on a revision page). **Edit** (D97) beside it when this browser keeps the
  share's edit key; not on revision pages. A revision page (`/<id>/<n>`) says which revision it is and links the latest.
  **Report**: a quiet line under the build, opening the form in place (D87).
- **Display menu** (D82): theme Auto/Light/Dark, Colour by kind, Colour abilities, each remembered in localStorage.
- Icons from one self-hosted SVG sprite, never text glyphs (D89). Fonts IBM Plex Sans/Mono self-hosted (D81). WCAG AA checked for every token pair (D88).
- **My recent shares**: the ids and titles you saved, in localStorage only, listed on the form page; reads and writes wrapped in try/catch so the page works without storage.
- **What this browser keeps** (localStorage only, never sent): `dndpaste.display` (Display menu), `dndpaste.recent` (My
  recent shares), `dndpaste.keys` (edit keys, D97), `dndpaste.drafts` (unsaved drafts, D102).
- OG/meta tags: title, "a D&D build on dndpaste", escaped.

## Security (review gate)
- Escape every user value in every context (HTML text, attributes, OG tags, JSON). Never user HTML.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. No inline scripts or styles. ~~`Referrer-Policy: no-referrer`~~ `Referrer-Policy: same-origin` (T3.3: no-referrer makes browsers send `Origin: null` on the site's own POSTs, which breaks the cross-site check; same-origin still sends nothing to other sites), `X-Content-Type-Options: nosniff`.
- Raw and canon are always `text/plain`. JSON is `application/json`.
- Tests with hostile pastes, titles and authors.

## IP (from the sizing note, binding)
- No `data/slots.json`, `data/srd/`, 5etools files or KB extracts in the bundle, KV or assets; a build check greps the bundle and fails.
- No checker in v1 (D66). Rendering never enriches. `/about` carries one plain unaffiliated sentence; no footer disclaimer (D89). Its copy is dry, no AI tells (D88).

## Out of scope for v1
Accounts, ~~editing~~ (D97: owner edits as revisions), delete links, search, listing, comments, the checker (D66 follow-ups), name links (D67), a custom domain (D70), Turnstile on (D71).

## Follow-ups (queued, not this build)
1. SRD checker: the library's "data unavailable" mode + release, then a findings panel (D66).
2. "Check against data": visitor-supplied 5etools-format data URL or files, built in the browser (D66).
3. A domain + `abuse@` alias + `CANONICAL_ORIGIN` flip (D70, D71).

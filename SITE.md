# SITE — the dndpaste share site (M3 build brief)

> Owner of the site's scope. Decisions: D45 (amended), D65–D74 (2026-11-15), look D80–D89 (jam).
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
| `GET /` | Paste form: title, author, editor. `?from=<id>` pre-fills it (Duplicate and edit). |
| `POST /` | Save. Form-encoded (no-JS) or JSON (fetch). Rejects empty, over 32 KB, title over 100 / author over 60 chars, any `E###` from `parse`; warnings pass. 303 → `/<id>` (or JSON `{ id, url }`). |
| `GET /<id>` | View page, server-rendered from the AST. |
| `GET /<id>/raw` | Text as written. `text/plain; charset=utf-8`, `nosniff`, CORS `*`. |
| `GET /<id>/canon` | `emit(parse(text))`, same headers. |
| `GET /<id>/json` | `{ title, author, paste, created }`, CORS `*`. |
| `POST /<id>/report` | Report: reason (required, ≤ 500 chars), contact (optional). Stored, never shown. |
| `GET /about` | What the site is; names only; unaffiliated with Wizards of the Coast; how reporting works. |
| anything else | 404 page. |

- **Id:** 10 random base62 chars from `crypto.getRandomValues`; check-then-put, retry on collision.
- **KV:** `p:<id>` → `{ v: 1, title, author, paste, created }` (ISO date). Reports `r:<iso>:<id>` → `{ id, reason, contact, created }`. Immutable, no TTL (D65).
- **Reading reports (for Francesco):** `npx wrangler kv key list --binding PASTES --prefix r: --remote`, then `kv key get` per key; delete a paste with `kv key delete "p:<id>"`. Write these in README.
- **Limits (D71):** 32 KB; per-IP save limit about 10 a minute (Workers rate-limiting binding; if the free plan lacks it, a Cloudflare rate-limiting rule, documented for Francesco); reports limited the same way. Turnstile: a stubbed check behind an unset `TURNSTILE_SECRET`, off. Note: KV free tier is about 1k writes a day, pastes and reports together.

## Form (D68)
- **Editor** with **syntax colouring** (keys, level headers, references, `|SOURCE`, quantities, `X-` keys) plus colour by kind and abilities (D82): a transparent textarea over a highlighted layer, so the textarea stays the source of truth (accessibility, undo, mobile keyboards). **No preview pane** (D84): the coloured editor is the preview.
- **Live diagnostics** in a Problems list (side column; phone: the dock's problem line): parse on input (debounced), errors and warnings with line numbers; clicking one jumps to the line. Save is disabled while any `E###` stands. Errors amber + E-code, never the accent (D88).
- **Key hints** (D83): the keys the current line's block allows (profile key table, no game data), minus those used; a tap inserts `Key: `. Phone: behind a "Keys" toggle in the dock (D86).
- **Link import** (D85): pasting only a link to this site or a bare 10-char id offers "Open it" / "Keep as text"; fetches `/<id>/json`.
- **Layout** (D86): title and author on full-width lines, toolbar (Open file · Tidy · problem count · Save and get link), side column with Problems, Keys you can add, My recent shares.
- **Tidy**: replaces the text with `emit(parse(text))`; enabled only without errors; undoable.
- **Open or drop** a `.txt` / `.dndpaste` file into the editor.
- Without JS: plain textarea + Save still work; the server returns the form with diagnostics on an error.

## View page (D67, D68)
- Title, author, date; the build rendered from the AST: identifier, header keys, species and background blocks, one block per level. **Names are plain text, no links** (D67). Only what the user wrote: no descriptions, stat lines, images or icons.
- Rendered in **Hanging keys** (D81): keys right-aligned in a margin, values in one mono column, level numbers in the Garnet accent.
- **Fold** each level block (`<details>`), plus fold/expand all.
- **Copy** (D87): split button "Copy link" with a menu for Copy text and Copy canonical (clipboard API with a select-text fallback); menus stay in the viewport, phones get a sheet (D89).
- **Duplicate and edit** → `/?from=<id>`. **Report**: a quiet line under the build, opening the form in place (D87).
- **Display menu** (D82): theme Auto/Light/Dark, Colour by kind, Colour abilities, each remembered in localStorage.
- Icons from one self-hosted SVG sprite, never text glyphs (D89). Fonts IBM Plex Sans/Mono self-hosted (D81). WCAG AA checked for every token pair (D88).
- **My recent shares**: the ids and titles you saved, in localStorage only, listed on the form page; reads and writes wrapped in try/catch so the page works without storage.
- OG/meta tags: title, "a D&D build on dndpaste", escaped.

## Security (review gate)
- Escape every user value in every context (HTML text, attributes, OG tags, JSON). Never user HTML.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`. No inline scripts or styles. `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.
- Raw and canon are always `text/plain`. JSON is `application/json`.
- Tests with hostile pastes, titles and authors.

## IP (from the sizing note, binding)
- No `data/slots.json`, `data/srd/`, 5etools files or KB extracts in the bundle, KV or assets; a build check greps the bundle and fails.
- No checker in v1 (D66). Rendering never enriches. `/about` carries one plain unaffiliated sentence; no footer disclaimer (D89). Its copy is dry, no AI tells (D88).

## Out of scope for v1
Accounts, editing, delete links, search, listing, comments, the checker (D66 follow-ups), name links (D67), a custom domain (D70), Turnstile on (D71).

## Follow-ups (queued, not this build)
1. SRD checker: the library's "data unavailable" mode + release, then a findings panel (D66).
2. "Check against data": visitor-supplied 5etools-format data URL or files, built in the browser (D66).
3. A domain + `abuse@` alias + `CANONICAL_ORIGIN` flip (D70, D71).

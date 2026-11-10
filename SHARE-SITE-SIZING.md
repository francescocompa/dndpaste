# Share site sizing — a pokepaste-like site for dndpaste (2026-11-10)

Sizing only, nothing built. Serves D45 (PLAN "Later"): a Cloudflare Worker + KV, short links, anyone can paste.

## What "minimal and very similar to pokepaste" is
Four routes, one Worker, one KV namespace:
1. **Paste form** (`GET /`): a textarea, an optional title, a Submit button.
2. **Save** (`POST /`): parse with the library, store the text, redirect to the short link. Rejects empty or oversized input (cap about 64 KB) and refuses a paste with parse *errors* (`E###`); warnings pass.
3. **View page** (`GET /p/<id>`): the build rendered dry, pokepaste-style: identifier, header keys, species and background blocks, one block per level, names as plain text or links (see IP below). Built from the AST, not from the raw text.
4. **Raw** (`GET /p/<id>/raw`): the stored text as `text/plain`, plus a canonical-form variant (`/canon`, `emit`), which is what consuming apps import ("Import from link", D45).

Short id: 8 to 10 random base62 characters; KV value is the text, key is the id. A paste is immutable (no edit, no accounts). Rate-limit the POST with Cloudflare's built-in rate-limiting rule, not code. TTL: none, or a long one (a year, refreshed on read) if Francesco wants cleanup.

Out of scope for the minimum: accounts, editing, deletion links, search, listing, comments, diff, themes, embedded checker results.

## Effort
| Session | Model | Work |
|---|---|---|
| 1 | Sonnet 5.5, medium | Worker + KV routes, form, save, raw, canon, id generation, size and error limits, local `wrangler dev` setup, tests. Imports the built UMD/ESM (zero deps). |
| 2 | Sonnet 5.5, medium | View page renderer from the AST, CSS in whatever look the jam picks, mobile layout, OG tags, 404, error page. |
| 3 | Sonnet 5.5, low | Deploy, custom domain, rate-limit rule, smoke test, README/STATE/decision entries. Needs Francesco's account items in place. |
| Review | Opus (fresh-eyes) | One read before the first public deploy: abuse paths, XSS in the renderer, the IP check. |

**About 3 build sessions plus one review**, each a few hours of wall clock. The code is small (a few hundred lines). Add one **design jam** session before session 2 (below).

## What Francesco must create himself (keys are his)
- A **Cloudflare account** (free plan is enough: Workers free tier 100k requests a day; KV free tier 1k writes and 100k reads a day, which caps new pastes at about 1k a day, ample at launch).
- A **KV namespace** (e.g. `PASTES`), created in the dashboard or via `wrangler`, and a **Worker** name.
- **`wrangler login`** done by him on the deploying machine (or an API token scoped to Workers and KV, kept in a local `.env`, never in chat or the repo).
- A **domain** (or accept `*.workers.dev`): buy or point one, add it to Cloudflare. A public domain is outward-facing, so the name and the first deploy are his call.
- Optional: a Turnstile (CAPTCHA) site key if spam shows up.

## Open design calls (need Francesco)
1. **Its own look** (needs a **jam**, options on a board he marks): pokepaste is dry, one column, monospace paste beside a rendered card. Open: identity (name, mark, tone), light/dark, card vs plain document, how level blocks fold, mobile. Walled off from every other project's look.
2. **Name and domain** for the service.
3. **Linking names**: plain names only (safest) or links to a rules reference (see IP). The link target is a product call.
4. **Retention**: forever, expiring, or deletable by a secret link.
5. **Import action**: the exact "Import from link" contract with My Spellbook and character-forge (their side, their CLAUDE.md; this site only offers `/raw` and `/canon`).
6. **Who may paste**: anyone (D45) means abuse handling: the rate limit and a takedown route (an email, manual KV deletion).
7. The milestone position relative to M3 (my-spellbook export), already his call per PLAN.

## IP check: a public site must carry no WotC data
The format is references only (names and source codes), so a stored paste is not rules text. The risks are in what the site *adds*:
- **No `data/slots.json`** (derived from the 5etools mirror, gitignored, not publishable) in the Worker bundle, KV, or any static asset. Same for 5etools data files and KB extracts.
- **Parse and emit need no data**, so save, view, raw and canon work with the library alone. The view page shows names exactly as written.
- **The checker is the only part that needs data.** Options:
  1. **Do not run it on the site in v1** (recommended): no findings on the view page; consumers run their own check on import.
  2. Run it on the committed **SRD subset** (`data/srd/slots.json`, about 456 KB): findings are partial (anything outside the SRD reads as unknown), so the checker needs a **"data unavailable" mode** that suppresses unknown-name findings. It does not exist today; roughly half a session in the library plus a release.
  3. A full table is out: not publishable.
- **Rendering must not enrich**: no descriptions, stat lines, spell text, or official images and icons. Only names and numbers the user wrote.
- **What users paste**: naming WotC entities is fine (as the fixtures do). The format has no free-text field except `Producer` and the identifier line, both short and escaped. Keep a take-down route for anything that slips in.
- **Security, same review**: escape every value in the renderer (the AST is user-controlled), `text/plain` with `nosniff` on raw, a strict CSP, never user HTML.
- A short **about/terms** line: names only, unaffiliated with Wizards of the Coast.

## Headline
About **3 Sonnet sessions + 1 Opus review + 1 design jam**. Blockers: Francesco's Cloudflare account, KV namespace, deploy login and a domain, plus the look jam. Keep the checker off the site in v1 and the IP position stays clean.

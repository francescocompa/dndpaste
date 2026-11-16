# dndpaste share site

One Cloudflare Worker with static assets and one KV namespace (`PASTES`). Scope: `../SITE.md`. Look: D80–D89.

```bash
npm install
npm run dev        # wrangler dev on http://127.0.0.1:8787, local KV and local rate limits
npm run verify     # typecheck + tests (node --test, no runner) + the IP bundle check
npm run fonts      # re-copy IBM Plex woff2 from @fontsource into public/assets/fonts (committed)
```

- `src/render.ts` — the shared renderer (AST → escaped HTML, Hanging keys). Pure: the browser bundle reuses it (slice 2).
- `src/app.ts` — routes, limits, headers. `src/worker.ts` is only the entry (Workers reads its named exports as handlers).
- `src/pages.ts` — server-rendered pages; `src/store.ts` — KV records, ids, limits.
- `src/client/` — the browser bundles, built by `scripts/build-client.mjs` into `public/assets/` (not committed):
  `form.js` (the paste form, ESM) and `site.js` (every page, a classic script in `<head>`: Display settings before the first
  paint, the Display menu, Copy link / Copy text / Copy canonical, fold all, report Cancel, menus and phone sheets).
- `scripts/check-bundle.mjs` — fails if anything from `data/`, `src/check.ts` or a 5etools file reaches the bundle or `public/`.

## Reading reports and taking a paste down
```bash
npx wrangler kv key list --binding PASTES --prefix r: --remote
npx wrangler kv key get "r:<iso>:<id>:<nonce>" --binding PASTES --remote
npx wrangler kv key list --binding PASTES --prefix "p:<id>" --remote      # the share and its frozen revisions (D97)
npx wrangler kv key delete "p:<id>" --binding PASTES --remote              # the latest; repeat for each "p:<id>:<n>" listed
```
Deleting only `p:<id>:<n>` takes down an older revision n and leaves the share. The latest revision has no key of its own
(it lives only at `p:<id>`), so it comes down only with the whole share. Deleting `p:<id>` alone takes down the share's link
and its edit key; the frozen revisions' URLs then answer 404 too, but their keys stay in KV until deleted.
A takedown doesn't reach copies that browsers and proxies already cached: up to 5 minutes for the link and the latest
revision, up to a year for an older revision's raw, canon and JSON (a day for its page).

## Rate limits
`SAVE_LIMITER` and `REPORT_LIMITER` (Workers rate-limiting binding, 10 a minute per IP) in `wrangler.toml`. If the plan lacks the
binding at deploy, delete both blocks: the Worker then skips the check, and a Cloudflare WAF rate-limiting rule takes its place
(dashboard → Security → WAF → Rate limiting rules: `http.request.method eq "POST"` on this hostname, 10 requests per minute
per IP, action Block for 1 minute). KV free tier is about 1,000 writes a day, saves and reports together.

Rate keys are the IPv4 address, or the IPv6 /64. On top of the minute limits, a daily cap per key (`LIMITS.savesPerDay`
50, `reportsPerDay` 20, UTC days; an edit counts as 2 saves, so 25 edits a day, D101) runs in the `DailyCap` Durable Object (`src/daily.ts`, SQLite-backed, on the Free plan;
the `migrations` block creates it on first deploy). It stores a day and a count per key, never the address, and deletes
itself the day after. Delete its two `wrangler.toml` blocks to run without it. When KV writes run out anyway, saves and
reports answer 503 with the site's own page and keep the text in the form.

POSTs from another site are refused (403): `Sec-Fetch-Site: cross-site`, or an `Origin` that is neither this host nor
`CANONICAL_ORIGIN`. This is why the site sends `Referrer-Policy: same-origin`: under `no-referrer`, browsers send
`Origin: null` on the site's own POSTs.

`CANONICAL_ORIGIN` must be `https://host` (http only for localhost), with no path; anything else answers every request
with a 500 naming the setting, so a typo cannot switch the redirect off quietly. The 301 carries `max-age=3600`.

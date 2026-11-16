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
npx wrangler kv key get "r:<iso>:<id>" --binding PASTES --remote
npx wrangler kv key delete "p:<id>" --binding PASTES --remote
```

## Rate limits
`SAVE_LIMITER` and `REPORT_LIMITER` (Workers rate-limiting binding, 10 a minute per IP) in `wrangler.toml`. If the plan lacks the
binding at deploy, delete both blocks: the Worker then skips the check, and a Cloudflare WAF rate-limiting rule takes its place
(dashboard → Security → WAF → Rate limiting rules: `http.request.method eq "POST"` on this hostname, 10 requests per minute
per IP, action Block for 1 minute). KV free tier is about 1,000 writes a day, saves and reports together.

/**
 * The dndpaste share site: one Worker serving pages and the API over one KV namespace (SITE.md, D69–D71).
 * Static files under public/ are served by Workers static assets before this runs.
 * The Worker entry is worker.ts: it may only export handlers, so everything else lives here.
 */
import { parse } from "../../src/dndpaste.ts";
import { guidePage } from "./guide.ts";
import { aboutPage, formPage, messagePage, notFoundPage, prerender, rendered, viewPage } from "./pages.ts";
import type { FormState, ViewState } from "./pages.ts";
import {
  BARE, ID_RE, LIMITS, REV_RE, getPaste, getRevision, hashKey, isBare, keyOpens, newEditKey, newId, putPaste, putReport,
  putRevision, revOf,
} from "./store.ts";
import type { KVLike, PasteRecord } from "./store.ts";

/** Workers rate-limiting binding (D71). Absent → no check here; a WAF rule stands in (site/README.md). */
export interface RateLimiter { limit(o: { key: string }): Promise<{ success: boolean }> }

/** The Durable Object namespace behind the daily cap (daily.ts). Only `fetch` on a stub is used. */
export interface DailyCapNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: string): Promise<Response> };
}

export interface Env {
  PASTES: KVLike;
  SAVE_LIMITER?: RateLimiter;
  REPORT_LIMITER?: RateLimiter;
  /** Writes per rate key per UTC day (D71, T3.3). Absent → no daily cap. */
  DAILY_CAP?: DailyCapNamespace;
  /** Empty = serve any host; set = 301 every other host to it, path and query kept (D70). */
  CANONICAL_ORIGIN?: string;
  /** Unset = Turnstile off (D71). */
  TURNSTILE_SECRET?: string;
  /** Dev only (`.dev.vars`): the /ui-review kit origin; see devreview.ts. */
  UI_REVIEW?: string;
}

/** Injection points for tests. */
export interface Deps { makeId?: () => string; now?: () => Date; reportNonce?: () => string; makeKey?: () => string }

export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const BASE_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  // Not no-referrer: under no-referrer browsers send `Origin: null` on our own POSTs, and the cross-site check needs it.
  // same-origin still sends nothing to other sites.
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function respond(body: string | null, status: number, type: string | null, extra: Record<string, string> = {}): Response {
  const h = new Headers(BASE_HEADERS);
  if (type) h.set("Content-Type", type);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(body, { status, headers: h });
}
const HTML = "text/html; charset=utf-8";
const TEXT = "text/plain; charset=utf-8";
const JSON_T = "application/json; charset=utf-8";
const html = (body: string, status = 200, extra: Record<string, string> = {}) => respond(body, status, HTML, { "Cache-Control": "no-store", ...extra });
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) => respond(JSON.stringify(data), status, JSON_T, { "Cache-Control": "no-store", ...extra });
const redirect = (location: string, status: number, extra: Record<string, string> = {}) => respond(null, status, null, { Location: location, ...extra });
/** The latest revision moves when its owner edits (D97): five minutes, so an edit shows everywhere soon after. */
const SHARED = { "Cache-Control": "public, max-age=300" };
/**
 * A revision URL never changes (D97). Its data (raw, canon, json) caches for a year; its page for a day, since the
 * page also carries the site's chrome, which can change under it.
 */
const PINNED_PAGE = { "Cache-Control": "public, max-age=86400" };
const PINNED_DATA = { "Cache-Control": "public, max-age=31536000, immutable" };

export async function handle(request: Request, env: Env, deps: Deps = {}): Promise<Response> {
  const url = new URL(request.url);

  let canonical: string | null;
  try {
    canonical = canonicalOrigin(env.CANONICAL_ORIGIN);
  } catch (e) {
    // A bad setting must not quietly turn the redirect off (D70): every request says so until it is fixed.
    console.error(e);
    return respond(`${(e as Error).message}\n`, 500, TEXT, { "Cache-Control": "no-store" });
  }
  // Browsers keep a 301 with no Cache-Control indefinitely; an hour lets a wrong setting be undone.
  if (canonical && url.origin !== canonical) return redirect(canonical + url.pathname + url.search, 301, { "Cache-Control": "public, max-age=3600", ...CORS });

  const origin = canonical ?? url.origin;
  const head = request.method === "HEAD";
  const method = head ? "GET" : request.method;
  let res: Response;
  try {
    res = await route(request, env, deps, url, method, origin, canonical);
  } catch (e) {
    // KV over its daily quota (or down) throws; answer with the site's own page, not Cloudflare's 1101.
    console.error(e);
    res = unavailable();
  }
  return head ? new Response(null, { status: res.status, headers: res.headers }) : res;
}

/** Empty → null. Otherwise an https origin (http only for localhost), with nothing after it; anything else throws. */
export function canonicalOrigin(v: string | undefined): string | null {
  if (!v) return null;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`CANONICAL_ORIGIN is not a URL: "${v}". Use the form https://host.`);
  }
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  if (u.protocol !== "https:" && !(local && u.protocol === "http:")) {
    throw new Error(`CANONICAL_ORIGIN must start with https:// (got "${v}").`);
  }
  if (u.pathname !== "/" || u.search || u.hash || u.username || u.password) {
    throw new Error(`CANONICAL_ORIGIN must be an origin only, with no path, query or login (got "${v}").`);
  }
  return u.origin;
}

const RETRY = { "Retry-After": "3600" };
const UNAVAILABLE = "The site can't take this right now. Try again in an hour.";
const unavailable = () => html(messagePage("Try again later", UNAVAILABLE), 503, RETRY);

async function route(request: Request, env: Env, deps: Deps, url: URL, method: string, origin: string, canonical: string | null): Promise<Response> {
  const path = url.pathname;
  if (method === "POST" && crossSite(request, url, canonical)) return refuseCrossSite(request);
  if (path === "/") {
    if (method === "GET") return newForm(env, url);
    if (method === "POST") return save(request, env, deps, origin);
    return notAllowed("GET, HEAD, POST");
  }
  if (path === "/guide") return method === "GET" ? html(guidePage(), 200, { "Cache-Control": "public, max-age=3600" }) : notAllowed("GET, HEAD");
  if (path === "/about") return method === "GET" ? html(aboutPage(), 200, { "Cache-Control": "public, max-age=3600" }) : notAllowed("GET, HEAD");

  // `/<id>`, `/<id>/<n>` (revision n, D97), each with /raw, /canon, /json; `/<id>/report` and `/<id>/edit` on the share.
  const m = /^\/([0-9A-Za-z]{10})(?:\/([0-9]{1,7}))?(?:\/(raw|canon|json|report|edit))?$/.exec(path);
  if (!m) return notFound();
  const [, id, revText, sub] = m;
  if (revText !== undefined && (!REV_RE.test(revText) || sub === "report" || sub === "edit")) return notFound();
  const rev = revText === undefined ? null : Number(revText);

  if (sub === "report") return method === "POST" ? report(request, env, deps, id, origin) : notAllowed("POST");
  if (sub === "edit") {
    if (method === "GET") return editForm(env, id);
    if (method === "POST") return edit(request, env, deps, id, origin);
    return notAllowed("GET, HEAD, POST");
  }
  if (sub) {
    if (method === "OPTIONS") return respond(null, 204, null, CORS);
    if (method !== "GET") return notAllowed("GET, HEAD, OPTIONS", CORS);
    return api(env, id, rev, sub);
  }
  if (method !== "GET") return notAllowed("GET, HEAD");
  const found = await load(env, id, rev);
  if (!found) return notFound();
  const reported = url.searchParams.get("reported") === "1";
  return html(viewPage(id, found.rec, origin, { reported, pinned: rev !== null }), 200, reported ? {} : rev === null ? SHARED : PINNED_PAGE);
}

/** The latest revision (`rev` null) or revision `rev`. */
async function load(env: Env, id: string, rev: number | null): Promise<{ rec: PasteRecord } | null> {
  if (rev === null) {
    const rec = await getPaste(env.PASTES, id);
    return rec ? { rec } : null;
  }
  return getRevision(env.PASTES, id, rev);
}

const notFound = () => html(notFoundPage(), 404);
const notAllowed = (allow: string, extra: Record<string, string> = {}) =>
  respond("Method not allowed\n", 405, TEXT, { Allow: allow, "Cache-Control": "no-store", ...extra });

async function api(env: Env, id: string, rev: number | null, sub: string): Promise<Response> {
  const found = await load(env, id, rev);
  if (!found) {
    return sub === "json"
      ? json({ error: "not_found" }, 404, CORS)
      : respond("Not found\n", 404, TEXT, { "Cache-Control": "no-store", ...CORS });
  }
  const { rec } = found;
  const extra = { ...(rev === null ? SHARED : PINNED_DATA), ...CORS };
  if (sub === "raw") return respond(rec.paste, 200, TEXT, extra);
  if (sub === "canon") return respond(rendered(rec).canon, 200, TEXT, extra);
  // D69's four fields, then D97's: when this revision was saved (null for revision 1) and its number, to pin it.
  return json({ title: rec.title, author: rec.author, paste: rec.paste, created: rec.created, edited: rec.edited ?? null, revision: revOf(rec) }, 200, extra);
}

// ─── GET / ──────────────────────────────────────────────────────────────────

async function newForm(env: Env, url: URL): Promise<Response> {
  const from = url.searchParams.get("from");
  if (from === null) return html(formPage({ example: true }));
  // `?from=<id>` copies the latest revision, `?from=<id>/<n>` revision n (D97).
  const [fid, frev] = from.split("/");
  const ok = ID_RE.test(fid) && (frev === undefined || REV_RE.test(frev)) && from.split("/").length <= 2;
  const found = ok ? await load(env, fid, frev === undefined ? null : Number(frev)) : null;
  if (!found) return html(formPage({ missingFrom: from.slice(0, 40) }));
  const { rec } = found;
  return html(formPage({ title: rec.title, author: rec.author, paste: rec.paste }));
}

// ─── GET /<id>/edit ─────────────────────────────────────────────────────────

/** The paste form, filled with the latest revision, saving to the same id (D97). The key comes from the browser. */
async function editForm(env: Env, id: string): Promise<Response> {
  const rec = await getPaste(env.PASTES, id);
  if (!rec) return notFound();
  return html(formPage({ title: rec.title, author: rec.author, paste: rec.paste, edit: { id, rev: revOf(rec), title: rec.title } }));
}

// ─── Request bodies ─────────────────────────────────────────────────────────

type Fields = Record<string, string>;
type Body = { ok: true; json: boolean; fields: Fields } | { ok: false; json: boolean; status: number; error: string };

const isJson = (req: Request) => (req.headers.get("Content-Type") ?? "").toLowerCase().includes("application/json");

/** Reads at most `max` bytes; null past that (checked on Content-Length first, then while streaming). */
async function readCapped(req: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(req.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

async function readFields(req: Request, names: readonly string[], tooLarge: string): Promise<Body> {
  const json = isJson(req);
  const bytes = await readCapped(req, LIMITS.bodyBytes);
  if (!bytes) return { ok: false, json, status: 413, error: tooLarge };
  const type = (req.headers.get("Content-Type") ?? "").toLowerCase();
  const fields: Fields = {};
  try {
    if (json) {
      const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object");
      for (const n of names) {
        const v = (data as Record<string, unknown>)[n];
        if (v !== undefined && v !== null && typeof v !== "string") throw new Error(`${n} is not a string`);
        fields[n] = (v as string | undefined) ?? "";
      }
    } else if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
      const form = type.includes("multipart/form-data")
        ? await new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "Content-Type": req.headers.get("Content-Type") ?? "" } }).formData()
        : new URLSearchParams(new TextDecoder().decode(bytes));
      for (const n of names) {
        const v = form.get(n);
        fields[n] = typeof v === "string" ? v : "";
      }
    } else {
      return { ok: false, json, status: 415, error: "Send the form, or JSON." };
    }
  } catch {
    return { ok: false, json, status: 400, error: "The request could not be read." };
  }
  return { ok: true, json, fields };
}

/**
 * One line of plain text: control characters (newlines, tabs, NUL…) become spaces; zero-width and bidi controls
 * (U+200B–200F, U+202A–202E, U+2060, U+2066–2069, U+FEFF) are dropped, so a title cannot hide or reorder text; then trimmed.
 */
export const oneLine = (s: string) =>
  s.replace(/[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
const chars = (s: string) => [...s].length;
const ipOf = (req: Request) => req.headers.get("CF-Connecting-IP") ?? "unknown";

/**
 * The key a client is limited by: an IPv4 address as is, an IPv6 address by its /64 (one subscriber's block; keying
 * the full address lets a client rotate through 2^64 of them). IPv4-mapped IPv6 counts as the IPv4 address.
 */
export function rateKey(ip: string): string {
  const addr = ip.trim().toLowerCase().replace(/%.*$/, "");
  if (!addr.includes(":")) return addr;
  const words = (part: string) => (part ? part.split(":").flatMap((w) => (w.includes(".") ? ["0", "0"] : [w])) : []);
  let groups: string[];
  if (addr.includes("::")) {
    const [a, b] = addr.split("::");
    const head = words(a);
    const tail = words(b);
    groups = [...head, ...Array<string>(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  } else {
    groups = words(addr);
  }
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return addr;
  const v4 = /:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(addr);
  if (v4 && groups.slice(0, 5).every((g) => parseInt(g, 16) === 0) && parseInt(groups[5], 16) === 0xffff) return v4[1];
  return `${groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}

/**
 * A POST from another site (a hostile page auto-submitting a form from its visitors' browsers, to spread saves over
 * their IPs). Refused when the browser says cross-site, or sends an Origin that is neither the canonical origin nor
 * this host. No Origin and no Sec-Fetch-Site (curl, scripts) passes: those are limited per IP like anything else.
 */
export function crossSite(req: Request, url: URL, canonical: string | null): boolean {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return true;
  const o = req.headers.get("Origin");
  return o !== null && o !== url.origin && o !== canonical;
}
const CROSS_SITE = "This form was sent from another site. Open dndpaste and send it from there.";
const refuseCrossSite = (req: Request) =>
  isJson(req) ? json({ error: CROSS_SITE }, 403) : html(messagePage("Not sent", CROSS_SITE), 403);

/** One more write for `key` today, if under `limit` (daily.ts). Fails open, like the per-minute limiters. */
async function underDailyCap(env: Env, key: string, limit: number, now: Date): Promise<boolean> {
  if (!env.DAILY_CAP) return true;
  try {
    const stub = env.DAILY_CAP.get(env.DAILY_CAP.idFromName(key));
    const day = now.toISOString().slice(0, 10);
    const r = await stub.fetch(`https://daily-cap/?limit=${limit}&day=${day}`);
    return ((await r.json()) as { ok?: unknown }).ok !== false;
  } catch {
    return true;
  }
}

async function allowed(limiter: RateLimiter | undefined, key: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}

/** Turnstile, stubbed and off while TURNSTILE_SECRET is unset (D71). The form does not render the widget yet. */
async function turnstileOk(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const out = (await r.json()) as { success?: boolean };
  return out.success === true;
}

// ─── POST / and POST /<id>/edit ─────────────────────────────────────────────

const TOO_LARGE = `This build is over ${LIMITS.pasteBytes / 1024} KB. Shorten it to save.`;
const SAVE_FIELDS = ["title", "author", "paste", "cf-turnstile-response"] as const;

type Build = { title: string; author: string; paste: string };
type Checked =
  | { ok: true; build: Build; parsed: ReturnType<typeof parse> }
  | { ok: false; build: Build; status: number; error: string; diagnostics?: FormState["diagnostics"] };

/** The checks a save and an edit share: text, size, title and author, parse errors, D95. */
function checkBuild(f: Fields): Checked {
  const title = oneLine(f.title);
  const author = oneLine(f.author);
  // Browsers send textarea text with CRLF; store LF so /raw is the same whichever way it was saved.
  const paste = f.paste.replace(/\r\n?/g, "\n");
  const build = { title, author, paste };
  const no = (status: number, error: string, diagnostics?: FormState["diagnostics"]): Checked => ({ ok: false, build, status, error, diagnostics });
  if (!paste.trim()) return no(400, "Write or paste a build first.");
  if (new TextEncoder().encode(paste).byteLength > LIMITS.pasteBytes) return no(413, TOO_LARGE);
  if (chars(title) > LIMITS.title) return no(400, `The title is over ${LIMITS.title} characters.`);
  if (chars(author) > LIMITS.author) return no(400, `The author is over ${LIMITS.author} characters.`);
  const parsed = parse(paste);
  const errors = parsed.diagnostics.filter((d) => d.code.startsWith("E"));
  if (errors.length) return no(422, `${errors.length} error${errors.length === 1 ? "" : "s"} in the build.`, parsed.diagnostics);
  if (isBare(parsed)) return no(422, BARE);
  return { ok: true, build, parsed };
}

/** Turnstile, the per-minute limiter and the daily cap: an edit counts as a save for all three (D97). */
async function saveGate(request: Request, env: Env, token: string | undefined, now: Date): Promise<{ status: number; error: string } | null> {
  const ip = ipOf(request);
  const key = rateKey(ip);
  if (!(await turnstileOk(env, token, ip))) return { status: 403, error: "The check that you are a person failed. Try again." };
  if (!(await allowed(env.SAVE_LIMITER, `save:${key}`))) return { status: 429, error: "Too many saves from your connection. Wait a minute and try again." };
  if (!(await underDailyCap(env, `save:${key}`, LIMITS.savesPerDay, now))) return { status: 429, error: "Your connection has saved a lot of builds today. Try again tomorrow." };
  return null;
}

async function save(request: Request, env: Env, deps: Deps, origin: string): Promise<Response> {
  const body = await readFields(request, SAVE_FIELDS, TOO_LARGE);
  if (!body.ok) return body.json ? json({ error: body.error }, body.status) : html(formPage({ error: body.error }), body.status);

  const c = checkBuild(body.fields);
  const fail = (status: number, error: string, diagnostics?: FormState["diagnostics"]) =>
    body.json
      ? json({ error, ...(diagnostics ? { diagnostics } : {}) }, status)
      : html(formPage({ ...c.build, error: diagnostics ? undefined : error, diagnostics }), status);
  if (!c.ok) return fail(c.status, c.error, c.diagnostics);
  const { title, author, paste } = c.build;

  const now = deps.now?.() ?? new Date();
  const gate = await saveGate(request, env, body.fields["cf-turnstile-response"], now);
  if (gate) return fail(gate.status, gate.error);

  // Rendered now, kept in the same value: views then skip parse and render (free-plan CPU; no extra write).
  // A JSON save (the form with JS) gets an edit key (D97); the no-JS form has nowhere to keep one, so it gets none.
  const key = body.json ? (deps.makeKey ?? newEditKey)() : null;
  const rec: PasteRecord = { v: 1, title, author, paste, created: now.toISOString(), r: prerender(c.parsed), ...(key ? { k: await hashKey(key) } : {}) };
  let id: string;
  try {
    id = await putPaste(env.PASTES, rec, deps.makeId ?? newId);
  } catch (e) {
    // The free plan's ~1k KV writes a day are spent (or KV is down): keep the text in the form and say so.
    console.error(e);
    return body.json ? json({ error: UNAVAILABLE }, 503, RETRY) : html(formPage({ title, author, paste, error: UNAVAILABLE }), 503, RETRY);
  }
  // The key goes back once, in the body; the edit link carries it in the fragment, which never reaches a server.
  return body.json ? json({ id, url: `${origin}/${id}`, key, edit: `${origin}/${id}/edit#k=${key}` }, 201) : redirect(`/${id}`, 303);
}

export const NO_KEY = "This browser has no edit key for this build. Open the private edit link from when you saved it, or use Duplicate and edit.";
const WRONG_KEY = "This edit key doesn't open this build. Use Duplicate and edit to save a changed copy.";
const NOT_EDITABLE = "This build has no edit key, so it can't be edited. Use Duplicate and edit to save a changed copy.";
const STALE = "This build changed since you opened it. Copy your text, reload, and make your edit again.";

/**
 * An edit (D97): the key, then the same checks and limits as a save, then a new revision under the same id.
 * `base` (optional) is the revision the form was opened on; a newer head refuses the edit (409), so a second tab
 * can't quietly undo the first. An unchanged build answers 200 and writes nothing.
 */
async function edit(request: Request, env: Env, deps: Deps, id: string, origin: string): Promise<Response> {
  const head = await getPaste(env.PASTES, id);
  const body = await readFields(request, [...SAVE_FIELDS, "key", "base"], TOO_LARGE);
  if (!head) return body.json ? json({ error: "not_found" }, 404) : notFound();
  const editing = { id, rev: revOf(head), title: head.title };
  if (!body.ok) return body.json ? json({ error: body.error }, body.status) : html(formPage({ edit: editing, error: body.error }), body.status);

  const c = checkBuild(body.fields);
  const fail = (status: number, error: string, diagnostics?: FormState["diagnostics"]) =>
    body.json
      ? json({ error, ...(diagnostics ? { diagnostics } : {}) }, status)
      : html(formPage({ ...c.build, edit: editing, error: diagnostics ? undefined : error, diagnostics }), status);

  if (!head.k) return fail(403, NOT_EDITABLE);
  if (!(await keyOpens(head, body.fields.key))) return fail(403, body.fields.key ? WRONG_KEY : NO_KEY);
  const base = body.fields.base;
  if (base && (!REV_RE.test(base) || Number(base) !== revOf(head))) return fail(409, STALE);
  if (!c.ok) return fail(c.status, c.error, c.diagnostics);
  const { title, author, paste } = c.build;
  const done = (rev: number, status: number) =>
    body.json ? json({ id, url: `${origin}/${id}`, revision: rev }, status) : redirect(`/${id}`, 303);
  if (title === head.title && author === head.author && paste === head.paste) return done(revOf(head), 200);

  const now = deps.now?.() ?? new Date();
  const gate = await saveGate(request, env, body.fields["cf-turnstile-response"], now);
  if (gate) return fail(gate.status, gate.error);

  let rec: PasteRecord;
  try {
    rec = await putRevision(env.PASTES, id, head, { v: 1, title, author, paste, edited: now.toISOString(), r: prerender(c.parsed) });
  } catch (e) {
    console.error(e);
    return body.json ? json({ error: UNAVAILABLE }, 503, RETRY) : html(formPage({ title, author, paste, edit: editing, error: UNAVAILABLE }), 503, RETRY);
  }
  return done(revOf(rec), 201);
}

// ─── POST /<id>/report ──────────────────────────────────────────────────────

/** `rev` (optional) is the revision the reader was on (D97): the report records it, and the reader lands back on it. */
async function report(request: Request, env: Env, deps: Deps, id: string, origin: string): Promise<Response> {
  const body = await readFields(request, ["reason", "contact", "rev"], "The report is too long.");
  const revText = body.ok ? body.fields.rev : "";
  const pinned = REV_RE.test(revText) ? Number(revText) : null;
  const found = await load(env, id, pinned);
  if (!found) return body.json ? json({ error: "not_found" }, 404) : notFound();
  const { rec } = found;
  const page = (s: ViewState) => viewPage(id, rec, origin, { ...s, pinned: pinned !== null });
  if (!body.ok) return body.json ? json({ error: body.error }, body.status) : html(page({ reportError: body.error }), body.status);

  const reason = body.fields.reason.replace(/\r\n?/g, "\n").trim();
  const contact = oneLine(body.fields.contact);
  const fail = (status: number, error: string) =>
    body.json ? json({ error }, status) : html(page({ reportError: error, reportReason: reason, reportContact: contact }), status);

  if (!reason) return fail(400, "Write a reason first.");
  if (chars(reason) > LIMITS.reason) return fail(400, `The reason is over ${LIMITS.reason} characters.`);
  if (chars(contact) > LIMITS.contact) return fail(400, `The contact is over ${LIMITS.contact} characters.`);
  const key = rateKey(ipOf(request));
  const now = deps.now?.() ?? new Date();
  if (!(await allowed(env.REPORT_LIMITER, `report:${key}`))) return fail(429, "Too many reports from your connection. Wait a minute and try again.");
  if (!(await underDailyCap(env, `report:${key}`, LIMITS.reportsPerDay, now))) return fail(429, "Your connection has sent a lot of reports today. Try again tomorrow.");

  try {
    await putReport(env.PASTES, { id, reason, contact, created: now.toISOString(), revision: revOf(rec) }, deps.reportNonce?.());
  } catch (e) {
    console.error(e);
    if (body.json) return json({ error: UNAVAILABLE }, 503, RETRY);
    return html(page({ reportError: UNAVAILABLE, reportReason: reason, reportContact: contact }), 503, RETRY);
  }
  return body.json ? json({ ok: true }, 201) : redirect(`/${id}${pinned !== null ? `/${pinned}` : ""}?reported=1`, 303);
}

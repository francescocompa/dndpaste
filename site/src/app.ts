/**
 * The dndpaste share site: one Worker serving pages and the API over one KV namespace (SITE.md, D69–D71).
 * Static files under public/ are served by Workers static assets before this runs.
 * The Worker entry is worker.ts: it may only export handlers, so everything else lives here.
 */
import { emit, parse } from "../../src/dndpaste.ts";
import { aboutPage, formPage, notFoundPage, viewPage } from "./pages.ts";
import type { FormState, ViewState } from "./pages.ts";
import { ID_RE, LIMITS, getPaste, newId, putPaste, putReport } from "./store.ts";
import type { KVLike } from "./store.ts";

/** Workers rate-limiting binding (D71). Absent → no check here; a WAF rule stands in (site/README.md). */
export interface RateLimiter { limit(o: { key: string }): Promise<{ success: boolean }> }

export interface Env {
  PASTES: KVLike;
  SAVE_LIMITER?: RateLimiter;
  REPORT_LIMITER?: RateLimiter;
  /** Empty = serve any host; set = 301 every other host to it, path and query kept (D70). */
  CANONICAL_ORIGIN?: string;
  /** Unset = Turnstile off (D71). */
  TURNSTILE_SECRET?: string;
}

/** Injection points for tests. */
export interface Deps { makeId?: () => string; now?: () => Date }

export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const BASE_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "Referrer-Policy": "no-referrer",
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
/** Shares never change (D65), so a short public cache is safe; a takedown shows within the hour. */
const SHARED = { "Cache-Control": "public, max-age=3600" };

export async function handle(request: Request, env: Env, deps: Deps = {}): Promise<Response> {
  const url = new URL(request.url);

  const canonical = canonicalOrigin(env.CANONICAL_ORIGIN);
  if (canonical && url.origin !== canonical) return redirect(canonical + url.pathname + url.search, 301, CORS);

  const origin = canonical ?? url.origin;
  const head = request.method === "HEAD";
  const method = head ? "GET" : request.method;
  const res = await route(request, env, deps, url, method, origin);
  return head ? new Response(null, { status: res.status, headers: res.headers }) : res;
}

function canonicalOrigin(v: string | undefined): string | null {
  if (!v) return null;
  try {
    return new URL(v).origin;
  } catch {
    return null;
  }
}

async function route(request: Request, env: Env, deps: Deps, url: URL, method: string, origin: string): Promise<Response> {
  const path = url.pathname;
  if (path === "/") {
    if (method === "GET") return newForm(env, url);
    if (method === "POST") return save(request, env, deps, origin);
    return notAllowed("GET, HEAD, POST");
  }
  if (path === "/about") return method === "GET" ? html(aboutPage(), 200, { "Cache-Control": "public, max-age=3600" }) : notAllowed("GET, HEAD");

  const m = /^\/([0-9A-Za-z]{10})(?:\/(raw|canon|json|report))?$/.exec(path);
  if (!m) return notFound();
  const [, id, sub] = m;

  if (sub === "report") return method === "POST" ? report(request, env, deps, id, origin) : notAllowed("POST");
  if (sub) {
    if (method === "OPTIONS") return respond(null, 204, null, CORS);
    if (method !== "GET") return notAllowed("GET, HEAD, OPTIONS", CORS);
    return api(env, id, sub);
  }
  if (method !== "GET") return notAllowed("GET, HEAD");
  const rec = await getPaste(env.PASTES, id);
  if (!rec) return notFound();
  const reported = url.searchParams.get("reported") === "1";
  return html(viewPage(id, rec, origin, { reported }), 200, reported ? {} : SHARED);
}

const notFound = () => html(notFoundPage(), 404);
const notAllowed = (allow: string, extra: Record<string, string> = {}) =>
  respond("Method not allowed\n", 405, TEXT, { Allow: allow, "Cache-Control": "no-store", ...extra });

async function api(env: Env, id: string, sub: string): Promise<Response> {
  const rec = await getPaste(env.PASTES, id);
  if (!rec) {
    return sub === "json"
      ? json({ error: "not_found" }, 404, CORS)
      : respond("Not found\n", 404, TEXT, { "Cache-Control": "no-store", ...CORS });
  }
  const extra = { ...SHARED, ...CORS };
  if (sub === "raw") return respond(rec.paste, 200, TEXT, extra);
  if (sub === "canon") return respond(emit(parse(rec.paste)), 200, TEXT, extra);
  return json({ title: rec.title, author: rec.author, paste: rec.paste, created: rec.created }, 200, extra);
}

// ─── GET / ──────────────────────────────────────────────────────────────────

async function newForm(env: Env, url: URL): Promise<Response> {
  const from = url.searchParams.get("from");
  if (from === null) return html(formPage());
  const rec = ID_RE.test(from) ? await getPaste(env.PASTES, from) : null;
  if (!rec) return html(formPage({ missingFrom: from.slice(0, 40) }));
  return html(formPage({ title: rec.title, author: rec.author, paste: rec.paste }));
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

/** One line of plain text: control characters (newlines, tabs, NUL…) become spaces, then trimmed. */
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
const chars = (s: string) => [...s].length;
const ipOf = (req: Request) => req.headers.get("CF-Connecting-IP") ?? "unknown";

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

// ─── POST / ─────────────────────────────────────────────────────────────────

const TOO_LARGE = `This build is over ${LIMITS.pasteBytes / 1024} KB. Shorten it to save.`;

async function save(request: Request, env: Env, deps: Deps, origin: string): Promise<Response> {
  const body = await readFields(request, ["title", "author", "paste", "cf-turnstile-response"], TOO_LARGE);
  if (!body.ok) return body.json ? json({ error: body.error }, body.status) : html(formPage({ error: body.error }), body.status);

  const f = body.fields;
  const title = oneLine(f.title);
  const author = oneLine(f.author);
  // Browsers send textarea text with CRLF; store LF so /raw is the same whichever way it was saved.
  const paste = f.paste.replace(/\r\n?/g, "\n");
  const fail = (status: number, error: string, diagnostics?: FormState["diagnostics"]) =>
    body.json
      ? json({ error, ...(diagnostics ? { diagnostics } : {}) }, status)
      : html(formPage({ title, author, paste, error: diagnostics ? undefined : error, diagnostics }), status);

  if (!paste.trim()) return fail(400, "Write or paste a build first.");
  if (new TextEncoder().encode(paste).byteLength > LIMITS.pasteBytes) return fail(413, TOO_LARGE);
  if (chars(title) > LIMITS.title) return fail(400, `The title is over ${LIMITS.title} characters.`);
  if (chars(author) > LIMITS.author) return fail(400, `The author is over ${LIMITS.author} characters.`);

  const parsed = parse(paste);
  const errors = parsed.diagnostics.filter((d) => d.code.startsWith("E"));
  if (errors.length) return fail(422, `${errors.length} error${errors.length === 1 ? "" : "s"} in the build.`, parsed.diagnostics);

  const ip = ipOf(request);
  if (!(await turnstileOk(env, f["cf-turnstile-response"], ip))) return fail(403, "The check that you are a person failed. Try again.");
  if (!(await allowed(env.SAVE_LIMITER, `save:${ip}`))) return fail(429, "Too many saves from your connection. Wait a minute and try again.");

  const created = (deps.now?.() ?? new Date()).toISOString();
  const id = await putPaste(env.PASTES, { v: 1, title, author, paste, created }, deps.makeId ?? newId);
  return body.json ? json({ id, url: `${origin}/${id}` }, 201) : redirect(`/${id}`, 303);
}

// ─── POST /<id>/report ──────────────────────────────────────────────────────

async function report(request: Request, env: Env, deps: Deps, id: string, origin: string): Promise<Response> {
  const rec = await getPaste(env.PASTES, id);
  const body = await readFields(request, ["reason", "contact"], "The report is too long.");
  if (!rec) return body.json ? json({ error: "not_found" }, 404) : notFound();
  if (!body.ok) return body.json ? json({ error: body.error }, body.status) : html(viewPage(id, rec, origin, { reportError: body.error }), body.status);

  const reason = body.fields.reason.replace(/\r\n?/g, "\n").trim();
  const contact = oneLine(body.fields.contact);
  const fail = (status: number, error: string) =>
    body.json ? json({ error }, status) : html(viewPage(id, rec, origin, { reportError: error, reportReason: reason, reportContact: contact }), status);

  if (!reason) return fail(400, "Write a reason first.");
  if (chars(reason) > LIMITS.reason) return fail(400, `The reason is over ${LIMITS.reason} characters.`);
  if (chars(contact) > LIMITS.contact) return fail(400, `The contact is over ${LIMITS.contact} characters.`);
  if (!(await allowed(env.REPORT_LIMITER, `report:${ipOf(request)}`))) return fail(429, "Too many reports from your connection. Wait a minute and try again.");

  const created = (deps.now?.() ?? new Date()).toISOString();
  await putReport(env.PASTES, { id, reason, contact, created });
  return body.json ? json({ ok: true }, 201) : redirect(`/${id}?reported=1`, 303);
}

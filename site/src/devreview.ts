/**
 * Dev only: the /ui-review overlay (Francesco's review kit). With `UI_REVIEW` set in `.dev.vars` (gitignored, never
 * deployed) to the kit server's origin, HTML pages gain its script tag and a CSP that lets it load. Only a loopback
 * http origin is accepted, so a stray setting in production cannot load a script from anywhere else. Unset = the
 * response passes through untouched.
 */
import type { Env } from "./app.ts";
import { CONNECT_SRC } from "./app.ts";

const LOOPBACK = /^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}$/;

export function reviewOrigin(v: string | undefined): string | null {
  return v && LOOPBACK.test(v) ? v : null;
}

export async function withUiReview(res: Response, setting: string | undefined): Promise<Response> {
  const o = reviewOrigin(setting);
  if (!o || !(res.headers.get("Content-Type") ?? "").startsWith("text/html")) return res;
  const body = (await res.text()).replace("</head>", `<script src="${o}/ui-review.js?p=dndpaste" async></script>\n</head>`);
  const h = new Headers(res.headers);
  h.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' ${o}; style-src 'self' 'unsafe-inline' ${o}; img-src 'self' data: blob: ${o}; ` +
      `connect-src ${CONNECT_SRC} ${o}; frame-src ${o}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
  );
  return new Response(body, { status: res.status, headers: h });
}

/**
 * Dev only, and only with a valid `UI_REVIEW`: the review's fault switches, set as a `uir-fault` cookie by the dev
 * tools (ui-review.tools.js), so the 503, daily-cap and cross-site pages can be reached through their real code paths.
 * `kv` makes every KV write fail, `cap` answers every daily-cap check with "over", `xsite` marks POSTs cross-site;
 * `build` is read by fakeNewBuild.
 */
const faultsOf = (request: Request): Set<string> => {
  const m = /(?:^|;\s*)uir-fault=([a-z,]+)/.exec(request.headers.get("Cookie") ?? "");
  return new Set(m ? m[1]!.split(",") : []);
};

export function withFaults(request: Request, env: Env): { request: Request; env: Env } {
  if (!reviewOrigin(env.UI_REVIEW)) return { request, env };
  const f = faultsOf(request);
  if (!f.size) return { request, env };
  const e: Env = { ...env };
  if (f.has("kv")) e.PASTES = { get: (k) => env.PASTES.get(k), put: async () => { throw new Error("uir-fault: kv"); } };
  if (f.has("cap")) e.DAILY_CAP = { idFromName: () => null, get: () => ({ fetch: async () => Response.json({ ok: false }) }) };
  if (f.has("xsite") && request.method === "POST") {
    const h = new Headers(request.headers);
    h.set("Sec-Fetch-Site", "cross-site");
    request = new Request(request, { headers: h });
  }
  return { request, env: e };
}

/**
 * Dev only, with a valid `UI_REVIEW` and the `build` fault: GET /version answers a build other than this one, so the
 * update toast (D138) can be reviewed without a deploy. Null = no fault; the real route answers.
 */
export function fakeNewBuild(request: Request, env: Env, build: { version: string; commit: string; date: string }): Response | null {
  if (!reviewOrigin(env.UI_REVIEW) || !faultsOf(request).has("build") || new URL(request.url).pathname !== "/version") return null;
  return Response.json({ ...build, commit: "0000000" }, { headers: { "Cache-Control": "no-store" } });
}

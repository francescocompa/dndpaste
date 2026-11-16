import { test } from "node:test";
import assert from "node:assert/strict";
import { CSP } from "../src/app.ts";
import { reviewOrigin, withUiReview } from "../src/devreview.ts";

const page = () => new Response("<html><head><title>x</title></head><body></body></html>", { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP } });

test("ui-review: unset, or not a loopback http origin, passes the page through untouched", async () => {
  for (const v of [undefined, "", "https://127.0.0.1:4340", "http://evil.example:4340", "http://127.0.0.1:4340/x", "http://127.0.0.1.evil:4340"]) {
    assert.equal(reviewOrigin(v), null, String(v));
    const res = page();
    assert.equal(await withUiReview(res, v), res);
  }
});

test("ui-review: a loopback origin adds the script tag and widens the CSP for it only", async () => {
  const res = await withUiReview(page(), "http://127.0.0.1:4340");
  const body = await res.text();
  assert.match(body, /<script src="http:\/\/127\.0\.0\.1:4340\/ui-review\.js\?p=dndpaste" async><\/script>\n<\/head>/);
  const csp = res.headers.get("Content-Security-Policy") ?? "";
  assert.match(csp, /script-src 'self' http:\/\/127\.0\.0\.1:4340;/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("ui-review: non-HTML responses are never touched", async () => {
  const res = new Response("text", { headers: { "Content-Type": "text/plain" } });
  assert.equal(await withUiReview(res, "http://127.0.0.1:4340"), res);
});

test("ui-review faults: ignored without UI_REVIEW, applied with it", async () => {
  const { makeEnv } = await import("./helpers.ts");
  const { withFaults } = await import("../src/devreview.ts");
  const req = new Request("https://dndpaste.test/", { method: "POST", headers: { Cookie: "uir-fault=kv,xsite" } });
  const off = makeEnv();
  assert.equal(withFaults(req, off).env, off);
  const on = withFaults(req, makeEnv({ UI_REVIEW: "http://127.0.0.1:4340" }));
  await assert.rejects(on.env.PASTES.put("k", "v"));
  assert.equal(on.request.headers.get("Sec-Fetch-Site"), "cross-site");
});

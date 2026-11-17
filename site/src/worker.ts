/**
 * Worker entry. Workers reads every named export here as an entrypoint, so this file exports only the handler and the
 * Durable Object class bound in wrangler.toml.
 */
import { handle } from "./app.ts";
import type { Env } from "./app.ts";
import { BUILD } from "./build.gen.ts";
import { fakeNewBuild, withFaults, withUiReview } from "./devreview.ts";

export { DailyCap } from "./daily.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const dev = withFaults(request, env);
    return withUiReview(fakeNewBuild(dev.request, env, BUILD) ?? await handle(dev.request, dev.env), env.UI_REVIEW);
  },
};

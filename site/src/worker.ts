/**
 * Worker entry. Workers reads every named export here as an entrypoint, so this file exports only the handler and the
 * Durable Object class bound in wrangler.toml.
 */
import { handle } from "./app.ts";
import type { Env } from "./app.ts";

export { DailyCap } from "./daily.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
};

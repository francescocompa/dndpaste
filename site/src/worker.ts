/** Worker entry. Workers reads every named export here as an entrypoint, so this file exports only the handler. */
import { handle } from "./app.ts";
import type { Env } from "./app.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env);
  },
};

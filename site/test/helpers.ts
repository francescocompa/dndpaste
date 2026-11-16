import { readdirSync, readFileSync } from "node:fs";
import { handle } from "../src/app.ts";
import type { DailyCapNamespace, Deps, Env, RateLimiter } from "../src/app.ts";
import { DailyCap } from "../src/daily.ts";
import type { KVLike } from "../src/store.ts";

export class MemoryKV implements KVLike {
  map = new Map<string, string>();
  async get(key: string) { return this.map.get(key) ?? null; }
  async put(key: string, value: string) { this.map.set(key, value); }
}

/** In-memory Durable Object namespace for the daily cap: one DailyCap per name, over a Map-backed storage. */
export class MemoryCapNamespace implements DailyCapNamespace {
  objects = new Map<string, DailyCap>();
  alarms = new Map<string, number>();
  idFromName(name: string) { return name; }
  get(id: unknown) {
    const name = id as string;
    let o = this.objects.get(name);
    if (!o) {
      const data = new Map<string, unknown>();
      const alarms = this.alarms;
      o = new DailyCap({ storage: {
        async get<T>(k: string) { return data.get(k) as T | undefined; },
        async put(k: string, v: unknown) { data.set(k, structuredClone(v)); },
        async deleteAll() { data.clear(); },
        async setAlarm(t: number) { alarms.set(name, t); },
      } });
      this.objects.set(name, o);
    }
    const obj = o;
    return { fetch: (input: string) => obj.fetch(new Request(input)) };
  }
}

export class CountingLimiter implements RateLimiter {
  seen = new Map<string, number>();
  max: number;
  constructor(max = 10) { this.max = max; }
  async limit({ key }: { key: string }) {
    const n = (this.seen.get(key) ?? 0) + 1;
    this.seen.set(key, n);
    return { success: n <= this.max };
  }
}

export function makeEnv(over: Partial<Env> = {}): Env & { PASTES: MemoryKV } {
  return { PASTES: new MemoryKV(), ...over } as Env & { PASTES: MemoryKV };
}

export const ORIGIN = "https://dndpaste.test";

export function call(env: Env, method: string, path: string, init: { body?: string | FormData; type?: string; headers?: Record<string, string> } = {}, deps: Deps = {}) {
  const headers = new Headers(init.headers ?? {});
  if (init.type) headers.set("Content-Type", init.type);
  return handle(new Request(ORIGIN + path, { method, body: init.body, headers, redirect: "manual" }), env, deps);
}

export const form = (fields: Record<string, string>) => ({ body: new URLSearchParams(fields).toString(), type: "application/x-www-form-urlencoded" });
export const asJson = (data: unknown) => ({ body: JSON.stringify(data), type: "application/json" });

const FIX = new URL("../../fixtures/", import.meta.url);
export const FIXTURES: [string, string][] = readdirSync(FIX)
  .filter((f) => f.endsWith(".dndpaste"))
  .map((f) => [f, readFileSync(new URL(f, FIX), "utf8")]);

/** Text content of an HTML fragment (tags dropped, entities decoded). Enough for the renderer's own output. */
export function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

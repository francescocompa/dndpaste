/**
 * The daily write cap (D71, T3.3): one Durable Object per rate key ("save:<ip or /64>", "report:…") counts writes per
 * UTC day. The per-minute limiters alone let one client spend the free plan's ~1k KV writes a day in under two hours.
 * It holds a day and a count, never the address (the object id is a hash of the key), and an alarm deletes it once
 * its day is over and nobody came back. Kept free of Workers-only imports so tests run it under Node.
 */

/** The parts of DurableObjectState the counter uses. */
export interface CapStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  deleteAll(): Promise<void>;
  setAlarm(time: number): Promise<void>;
}
interface Count { day: string; n: number }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const nextDayStart = (day: string) => Date.parse(`${day}T00:00:00Z`) + 86_400_000;

export class DailyCap {
  storage: CapStorage;
  constructor(state: { storage: CapStorage }) {
    this.storage = state.storage;
  }

  /** `?limit=<n>&day=<YYYY-MM-DD>` → `{ ok }`: true and counted when under the limit, false (not counted) when at it. */
  async fetch(request: Request): Promise<Response> {
    const q = new URL(request.url).searchParams;
    const limit = Number(q.get("limit"));
    const day = q.get("day") ?? "";
    if (!Number.isInteger(limit) || limit < 0 || !DAY_RE.test(day)) return Response.json({ error: "bad request" }, { status: 400 });
    return Response.json({ ok: await this.hit(day, limit) });
  }

  async hit(day: string, limit: number): Promise<boolean> {
    const cur = await this.storage.get<Count>("c");
    const n = cur?.day === day ? cur.n : 0;
    if (n >= limit) return false;
    await this.storage.put("c", { day, n: n + 1 });
    // First write of a day: clean up an hour after it ends unless another day's write moves the alarm on.
    if (n === 0) await this.storage.setAlarm(nextDayStart(day) + 3_600_000);
    return true;
  }

  async alarm(): Promise<void> {
    const cur = await this.storage.get<Count>("c");
    if (!cur || nextDayStart(cur.day) <= Date.now()) await this.storage.deleteAll();
  }
}

/**
 * D173: the "Suggestions" switch (the editor's name and key lists), in this browser's localStorage only, never sent.
 * On unless turned off. Every read and write is in try/catch; with storage blocked it lives in memory for the visit.
 */
const KEY = "dndpaste.suggest";

export interface SuggestPref {
  get(): boolean;
  set(on: boolean): void;
}

/** `storage` is called on every access, so a getter that throws (blocked storage) is caught too. */
export function suggestPref(storage: () => Storage | null): SuggestPref {
  let mem: boolean | null = null;
  return {
    get() {
      if (mem !== null) return mem;
      try {
        return storage()?.getItem(KEY) !== "off";
      } catch {
        return true;
      }
    },
    set(on) {
      try {
        const s = storage();
        if (!s) throw new Error("no storage");
        if (on) s.removeItem(KEY);
        else s.setItem(KEY, "off");
        mem = null;
      } catch {
        mem = on;
      }
    },
  };
}

/**
 * D362 (D336): the Gear list's half, Mundane or Magic, remembered in this browser only; Mundane unless Magic was picked.
 * Every read and write is in try/catch; with storage blocked the pick lives in memory for the visit.
 */
const GEAR_KEY = "dndpaste.gear";
export interface GearPref { get(): "mundane" | "magic"; set(half: "mundane" | "magic"): void }
export function gearPref(storage: () => Storage | null): GearPref {
  let mem: "mundane" | "magic" | null = null;
  return {
    get() {
      if (mem !== null) return mem;
      try {
        return storage()?.getItem(GEAR_KEY) === "magic" ? "magic" : "mundane";
      } catch {
        return "mundane";
      }
    },
    set(half) {
      mem = half;
      try {
        const s = storage();
        if (!s) return;
        if (half === "magic") s.setItem(GEAR_KEY, "magic");
        else s.removeItem(GEAR_KEY);
        mem = null;
      } catch {
        // blocked storage: the pick stays in memory for the visit
      }
    },
  };
}

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

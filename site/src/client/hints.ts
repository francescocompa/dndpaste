/**
 * Key hints (D83): the keys the cursor's block allows, from the profile's key table (no game data), minus the keys
 * that block already has, narrowed by a half-typed key on the cursor's line. Blocks follow `parse`: the header, a
 * Species or Background block (opened by its key line), one block per level header.
 */
import { KEYS, keyDef } from "../../../src/dndpaste.ts";
import type { ScopeKind } from "../../../src/dndpaste.ts";
import { findSeparator, LEVEL_RE } from "./highlight.ts";

export interface Hints {
  /** "the header", "the Species block", "L5 Warlock". */
  label: string;
  scope: ScopeKind;
  keys: string[];
  /** True when a half-typed key on the cursor's line narrowed the list; a tap then replaces that line. */
  narrowed: boolean;
}

interface Block { scope: ScopeKind; label: string; used: Set<string> }

/** `cursorLine` is 0-based. */
export function keyHints(text: string, cursorLine: number): Hints {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [{ scope: "H", label: "the header", used: new Set() }];
  const opened = new Set<string>();
  let cur = 0;
  let cursorBlock = 0;
  let partial = "";
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const atCursor = i === cursorLine;
    const lv = t ? LEVEL_RE.exec(t) : null;
    const sep = t && !lv ? findSeparator(t) : -1;
    if (lv) {
      blocks.push({ scope: "L", label: `L${lv[1]} ${lv[2].split("|")[0].trim()}`, used: new Set() });
      cur = blocks.length - 1;
    } else if (sep >= 0) {
      const def = keyDef(t.slice(0, sep).trim());
      if (def?.opensBlock && blocks[cur].scope !== "L" && !opened.has(def.key)) {
        opened.add(def.key);
        blocks.push({ scope: def.opensBlock, label: `the ${def.key} block`, used: new Set() });
        cur = blocks.length - 1;
      } else if (def) {
        blocks[cur].used.add(def.key);
      }
    } else if (atCursor && t && t !== "---") {
      partial = t;
    }
    if (atCursor) cursorBlock = cur;
  }
  if (cursorLine >= lines.length) cursorBlock = cur;

  const b = blocks[cursorBlock];
  const all = KEYS.filter((d) => (d.opensBlock ? b.scope !== "L" && !opened.has(d.key) : d.scopes.includes(b.scope)))
    .map((d) => d.key)
    .filter((k) => !b.used.has(k));
  const p = partial.toLowerCase();
  const narrow = p ? all.filter((k) => k.toLowerCase().startsWith(p)) : [];
  return narrow.length
    ? { label: b.label, scope: b.scope, keys: narrow, narrowed: true }
    : { label: b.label, scope: b.scope, keys: all, narrowed: false };
}

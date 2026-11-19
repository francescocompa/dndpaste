/**
 * Key hints (D83): the keys the cursor's block allows, from the profile's key table (no game data), minus the keys
 * that block already has, narrowed by a half-typed key on the cursor's line. `Feat (…)` (D110) follows `Feat` and
 * stays offered: a block may hold several marked feats. Blocks follow `parse`: the header, a
 * Species or Background block (opened by its key line), one block per level header.
 *
 * The option family keys (SPEC 0.9) show only for their class (D177): a level block's class, else the `Classes:`
 * line's; with no class, none (plain `Options` stays). A half-typed key still finds every one of them.
 * A whole-list preparer's level block (2024 Cleric, Druid, Paladin, Ranger) never offers `Spells` (D190).
 */
import { KEYS, keyDef, splitMarker } from "../../../src/dndpaste.ts";
import { MARKED_FEAT } from "../keydocs.ts";
import type { ScopeKind } from "../../../src/dndpaste.ts";
import { findSeparator, LEVEL_RE } from "./highlight.ts";
import { wholeListClass } from "../ghost.ts";

export interface Hints {
  /** "the header", "the Species block", "L5 Warlock". */
  label: string;
  scope: ScopeKind;
  keys: string[];
  /** True when a half-typed key on the cursor's line narrowed the list; a tap then replaces that line. */
  narrowed: boolean;
}

interface Block { scope: ScopeKind; label: string; used: Set<string>; cls: string | null; src?: string | null; name?: string }

/** The class each option family key belongs to (D177), lower case. Key names and class names only. */
export const FAMILY_CLASS: Readonly<Record<string, string>> = {
  Invocations: "warlock", "Pact Boon": "warlock", Metamagic: "sorcerer", Maneuvers: "fighter", "Arcane Shots": "fighter",
  Runes: "fighter", Disciplines: "monk", Infusions: "artificer",
};
const className = (s: string) => s.replace(/\|.*$/, "").replace(/\s+\d+\s*$/, "").trim().replace(/^"|"$/g, "").toLowerCase();

/** `cursorLine` is 0-based. */
export function keyHints(text: string, cursorLine: number): Hints {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [{ scope: "H", label: "the header", used: new Set(), cls: null }];
  const header = new Set<string>();
  let rules: string | null = null;
  const opened = new Set<string>();
  let cur = 0;
  let cursorBlock = 0;
  let partial = "";
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const atCursor = i === cursorLine;
    const lv = t ? LEVEL_RE.exec(t) : null;
    const rl = /^rules:\s*(2014|2024)\s*$/i.exec(t);
    if (rl) rules = rl[1];
    const sep = t && !lv ? findSeparator(t) : -1;
    if (lv) {
      const [name, src] = lv[2].split("|").map((x) => x.trim());
      blocks.push({ scope: "L", label: `L${lv[1]} ${name}`, used: new Set(), cls: className(lv[2]), name, src: src || null });
      cur = blocks.length - 1;
    } else if (sep >= 0) {
      const def = keyDef(t.slice(0, sep).trim());
      if (def?.opensBlock && blocks[cur].scope !== "L" && !opened.has(def.key)) {
        opened.add(def.key);
        blocks.push({ scope: def.opensBlock, label: `the ${def.key} block`, used: new Set(), cls: null });
        cur = blocks.length - 1;
      } else if (def && !(def.key === "Feat" && splitMarker(t.slice(0, sep)).marker)) {
        if (def.key === "Classes") for (const c of t.slice(sep + 1).split("/")) if (className(c)) header.add(className(c));
        blocks[cur].used.add(def.key);   // a marked feat line leaves `Feat` free: a scope may hold both (D110)
      }
    } else if (atCursor && t && t !== "---") {
      partial = t;
    }
    if (atCursor) cursorBlock = cur;
  }
  if (cursorLine >= lines.length) cursorBlock = cur;

  const b = blocks[cursorBlock];
  const noSpells = b.scope === "L" && b.name ? wholeListClass(b.name, b.src ?? null, rules) !== null : false;
  const all = KEYS.filter((d) => (d.opensBlock ? b.scope !== "L" && !opened.has(d.key) : d.scopes.includes(b.scope)))
    .flatMap((d) => (d.key === "Feat" ? [d.key, MARKED_FEAT] : [d.key]))
    .filter((k) => !b.used.has(k) && !(noSpells && k === "Spells"));
  const p = partial.toLowerCase();
  const narrow = p ? all.filter((k) => k.toLowerCase().startsWith(p)) : [];
  const mine = b.cls ? new Set([b.cls]) : header;
  const shown = all.filter((k) => !FAMILY_CLASS[k] || mine.has(FAMILY_CLASS[k]));
  return narrow.length
    ? { label: b.label, scope: b.scope, keys: narrow, narrowed: true }
    : { label: b.label, scope: b.scope, keys: shown, narrowed: false };
}

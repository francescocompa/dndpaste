// D88 (a): every text/background pair meets WCAG AA, in light and dark, checked here rather than eyeballed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../public/assets/site.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2].toLowerCase();
  return out;
}
const light = tokens(/:root \{([^}]*)\}/.exec(css)![1]);
const darkMedia = tokens(/:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/.exec(css)![1]);
const darkForced = tokens(/:root\[data-theme="dark"\] \{([^}]*)\}/.exec(css)![1]);
const dark = { ...light, ...darkMedia };

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Text tokens and the surfaces they sit on.
const TEXT = ["fg", "mute", "key", "acc", "num", "src", "det", "drop", "warnc",
  "ab-str", "ab-dex", "ab-con", "ab-int", "ab-wis", "ab-cha",
  "kd-class", "kd-subclass", "kd-species", "kd-background", "kd-feat", "kd-spell", "kd-item"];
const SURFACES = ["bg", "field"];
const PAIRS: [string, string, number][] = [
  ...TEXT.flatMap((t) => SURFACES.map((s): [string, string, number] => [t, s, 4.5])),
  ["fg", "chip", 4.5], ["mute", "chip", 4.5], ["accfg", "acc", 4.5], ["err", "errbg", 4.5], ["err", "bg", 4.5], ["err", "field", 4.5],
  ["mute", "errbg", 4.5],
  // Slice 3. Menus and sheets sit on bg; a hovered item on chip (both above). A switch (D82) is a UI part: 3:1 for the
  // track against the menu, and for the knob (bg) against the track, on and off.
  ["tog", "bg", 3], ["bg", "tog", 3], ["acc", "bg", 3], ["bg", "acc", 3],
];
/** `color-mix(in srgb, a p%, b)` for opaque colours, as the browser computes it. */
function mix(a: string, p: number, b: string): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return "#" + [1, 3, 5].map((i) => Math.round(ch(a, i) * p / 100 + ch(b, i) * (1 - p / 100)).toString(16).padStart(2, "0")).join("");
}
/** Surfaces that site.css mixes from tokens, with the text tokens drawn on them. */
const MIXED: [string, (t: Record<string, string>) => string, string[]][] = [
  ["import bar (acc 8% on field)", (t) => mix(t.acc, 8, t.field), ["fg", "mute"]],
  ["open Display button and hovered key chip (acc 12% on chip)", (t) => mix(t.acc, 12, t.chip), ["fg"]],
];

for (const [name, t] of [["light", light], ["dark", dark]] as const) {
  test(`contrast: every token pair meets AA in ${name}`, () => {
    const fails = PAIRS.filter(([a, b, min]) => ratio(t[a], t[b]) < min).map(([a, b]) => `${a} on ${b} = ${ratio(t[a], t[b]).toFixed(2)}`);
    for (const [label, surf, texts] of MIXED) {
      for (const x of texts) if (ratio(t[x], surf(t)) < 4.5) fails.push(`${x} on ${label} = ${ratio(t[x], surf(t)).toFixed(2)}`);
    }
    assert.deepEqual(fails, []);
  });
}

test("contrast: every token site.css uses as a text colour is in the checked list", () => {
  const used = new Set([...css.matchAll(/(?:^|[\s;{])(?:-webkit-text-fill-)?color:\s*var\(--([a-z-]+)\)/g)].map((m) => m[1]));
  const unchecked = [...used].filter((u) => !TEXT.includes(u) && u !== "accfg" && u !== "err");
  assert.deepEqual(unchecked, []);
  for (const t of [light, dark]) for (const k of [...TEXT, ...SURFACES, "chip", "accfg", "err", "errbg", "tog"]) assert.ok(t[k], `token --${k}`);
});

test("contrast: the forced-dark block equals the prefers-dark block", () => {
  assert.deepEqual(darkForced, darkMedia);
});

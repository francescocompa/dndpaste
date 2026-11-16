/**
 * The share image (D119): the whole build drawn on a canvas in the browser, in the site's look (D80–D89). An ES module
 * that site.js imports only when the reader opens Share, so the parser never loads on a plain visit.
 *
 * - Tall: one column. Wide: the blocks flow into 2–4 columns, as many as keep the image about as wide as it is tall.
 * - Nothing is left out: title, byline, every block and line of the parsed paste (shareimg.ts, tested against the
 *   view's renderer), and the share link as a footer line.
 * - Colours come from the page itself (a hidden probe under <html>), so the image follows the colour switches of the
 *   Display menu and keeps the contrast checked for the site (D88). Its theme is its own: the probe carries
 *   .th-light or .th-dark (round 2 of the review).
 */
import { parse } from "../../../src/dndpaste.ts";
import { shareBlocks } from "../shareimg.ts";
import type { Block, Row, Run } from "../shareimg.ts";

export type Layout = "tall" | "wide";
/** `books` is the page's Books line as text (D120), "" when the build cites none. */
export interface Meta { title: string; untitled: boolean; byline: string; books: string; url: string }

const MONO = `"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace`;
const SANS = `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FS = 15;            // build text, px
const LH = 24;            // build line height
const PAD = 44;           // image margin
const BLOCK_GAP = 14;     // between blocks (0.9em on the site)
const TALL_W = 680;       // Tall: content width
const COL_W = 540;        // Wide: one column's width
const GUTTER = 48;        // Wide: between columns
const MAX_PX = 16_000_000; // canvas area browsers accept (iOS Safari's limit)
const MAX_SIDE = 16_000;

interface Look { color: string; weight: string; italic: boolean; strike: string | null }
interface Colors { bg: string; fg: string; mute: string; rule: string; acc: string }

/** Styles as the page draws them: a hidden copy of the view's markup, read once per class combination. */
class Probe {
  private box: HTMLElement;
  private cache = new Map<string, Look>();
  constructor(theme: "light" | "dark") {
    this.box = document.createElement("div");
    this.box.className = `build offscreen th-${theme}`;
    this.box.setAttribute("aria-hidden", "true");
    document.body.append(this.box);
  }
  look(side: "k" | "v", row: Row, r: Run): Look {
    const rc = side === "k" ? row.kc ?? "" : row.vc ?? "";
    const id = `${side}|${rc}|${r.w ?? ""}|${r.c}`;
    let l = this.cache.get(id);
    if (l) return l;
    const inner = r.c ? `<span class="${r.c}">x</span>` : "x";
    this.box.innerHTML = `<div class="bl"><span class="${side === "k" ? "hk" : "hv"} ${rc}">${r.w ? `<span class="${r.w}">${inner}</span>` : inner}</span></div>`;
    const el = this.box.querySelector(r.c ? `.${r.c.split(" ")[0]}` : side === "k" ? ".hk" : ".hv") as HTMLElement;
    const cs = getComputedStyle(el);
    l = {
      color: cs.color, weight: Number(cs.fontWeight) >= 550 ? "600" : "400", italic: cs.fontStyle === "italic",
      strike: cs.textDecorationLine.includes("line-through") ? cs.textDecorationColor : null,
    };
    this.cache.set(id, l);
    return l;
  }
  /** The image's base colours, from the probe's theme (site.css .th-light / .th-dark). */
  colors(): Colors {
    const cs = getComputedStyle(this.box);
    const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
    return { bg: v("--bg", "#fbfbfc"), fg: v("--fg", "#17181c"), mute: v("--mute", "#696d7b"), rule: v("--rule", "#e4e5ea"), acc: v("--acc", "#a51d4a") };
  }
  done(): void { this.box.remove(); }
}

/** Waits for the faces the image uses (D119: the site's fonts, not a fallback). */
async function fonts(): Promise<void> {
  const f = document.fonts;
  if (!f) return;
  await Promise.all([`400 ${FS}px ${MONO}`, `600 ${FS}px ${MONO}`, `400 16px ${SANS}`, `600 30px ${SANS}`].map((s) => f.load(s).catch(() => [])));
  await f.ready;
}

// ---- layout ----
interface Piece { t: string; look: Look; size?: number }
/** One drawn row: key lines (right-aligned) and value lines, each a list of pieces. */
interface LaidRow { keys: Piece[][]; vals: Piece[][]; grp: boolean; h: number }
interface LaidBlock { rows: LaidRow[]; h: number }

const fontOf = (l: Look, size = FS) => `${l.italic ? "italic " : ""}${l.weight} ${size}px ${MONO}`;

class Measure {
  private ctx: CanvasRenderingContext2D;
  constructor(ctx: CanvasRenderingContext2D) { this.ctx = ctx; }
  w(p: Piece): number { this.ctx.font = fontOf(p.look, p.size); return this.ctx.measureText(p.t).width; }
  sans(text: string, font: string): number { this.ctx.font = font; return this.ctx.measureText(text).width; }
}

/** Value runs into lines `cols` characters wide (monospace: every face has the same advance), breaking at spaces. */
function wrapValue(pieces: Piece[], cols: number): Piece[][] {
  const text = pieces.map((p) => p.t).join("");
  if (!text) return [[]];
  const owner: number[] = [];
  pieces.forEach((p, i) => { for (let j = 0; j < p.t.length; j++) owner.push(i); });
  const lines: [number, number][] = [];
  let s = 0;
  while (s < text.length) {
    if (text.length - s <= cols) { lines.push([s, text.length]); break; }
    const sp = text.lastIndexOf(" ", s + cols);
    if (sp > s) { lines.push([s, sp]); s = sp + 1; } else { lines.push([s, s + cols]); s += cols; }
  }
  return lines.map(([a, b]) => {
    const out: Piece[] = [];
    for (let i = a; i < b; i++) {
      const p = pieces[owner[i]];
      const last = out[out.length - 1];
      if (last && last.look === p.look && last.size === p.size) last.t += text[i];
      else out.push({ t: text[i], look: p.look, size: p.size });
    }
    return out;
  });
}

/** Key pieces into lines no wider than `w`, breaking at spaces (only long slot keys like `Feat (Fighting Style):`). */
function wrapKey(pieces: Piece[], w: number, m: Measure): Piece[][] {
  const words: Piece[][] = [[]];
  for (const p of pieces) {
    // The slot marker stays whole, as on the site (`.hk .km` does not wrap): `Feat` / `(Fighting Style):`.
    if (p.size) { words[words.length - 1].push(p); continue; }
    p.t.split(/( )/).forEach((part) => {
      if (part === " ") words.push([]);
      else if (part) words[words.length - 1].push({ ...p, t: part });
    });
  }
  const width = (ps: Piece[]) => ps.reduce((a, p) => a + m.w(p), 0);
  const lines: Piece[][] = [];
  let cur: Piece[] = [];
  for (const word of words.filter((x) => x.length)) {
    const next = cur.length ? [...cur, { ...word[0], t: " " }, ...word] : word;
    if (cur.length && width(next) > w) { lines.push(cur); cur = word; } else cur = next;
  }
  lines.push(cur);
  return lines;
}

function wrapSans(text: string, w: number, font: string, m: Measure): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && m.sans(next, font) > w) { out.push(cur); cur = word; } else cur = next;
    // A single word wider than the line breaks by character.
    while (m.sans(cur, font) > w && cur.length > 1) {
      let i = cur.length - 1;
      while (i > 1 && m.sans(cur.slice(0, i), font) > w) i--;
      out.push(cur.slice(0, i));
      cur = cur.slice(i);
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

interface Geometry { keyW: number; gap: number; cw: number; grpIndent: number }

function layBlocks(blocks: Block[], colW: number, g: Geometry, probe: Probe, m: Measure): LaidBlock[] {
  return blocks.map((b) => {
    const rows = b.map((row): LaidRow => {
      const grp = row.vc === "grp";
      const valW = colW - g.keyW - g.gap - (grp ? g.grpIndent : 0);
      const kp = row.k.map((r): Piece => ({ t: r.t, look: probe.look("k", row, r), size: r.c.includes("km") ? FS * 0.86 : undefined }));
      const vp = row.v.map((r): Piece => ({ t: r.t, look: probe.look("v", row, r) }));
      const keys = kp.length ? wrapKey(kp, g.keyW, m) : [[]];
      const vals = wrapValue(vp, Math.max(8, Math.floor(valW / g.cw)));
      return { keys, vals, grp, h: Math.max(keys.length, vals.length) * LH };
    });
    return { rows, h: rows.reduce((a, r) => a + r.h, 0) };
  });
}

/** Splits blocks, in order, into `c` columns with the shortest tallest column (n is small: a direct search). */
function partition(hs: number[], c: number): number[][] {
  const n = hs.length;
  const sum = (a: number, b: number) => hs.slice(a, b).reduce((x, y) => x + y, 0) + Math.max(0, b - a - 1) * BLOCK_GAP;
  const memo = new Map<string, [number, number[]]>();
  const best = (i: number, k: number): [number, number[]] => {
    if (k === 1) return [sum(i, n), [n]];
    const key = `${i},${k}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let r: [number, number[]] = [Infinity, []];
    for (let j = i + 1; j <= n - k + 1; j++) {
      const [h, cuts] = best(j, k - 1);
      const top = Math.max(sum(i, j), h);
      if (top < r[0]) r = [top, [j, ...cuts]];
    }
    memo.set(key, r);
    return r;
  };
  const cuts = best(0, c)[1];
  const cols: number[][] = [];
  let a = 0;
  for (const b of cuts) { cols.push(hs.slice(a, b).map((_, i) => a + i)); a = b; }
  return cols;
}

// ---- paint ----
/** Draws the build; returns the canvas (its pixel size is the image's). */
export async function drawShareImage(raw: string, layout: Layout, meta: Meta, theme: "light" | "dark"): Promise<HTMLCanvasElement> {
  await fonts();
  const paste = parse(raw);
  const blocks = shareBlocks(paste);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas");
  const m = new Measure(ctx);
  const probe = new Probe(theme);
  try {
    const col = probe.colors();
    ctx.font = `400 ${FS}px ${MONO}`;
    const cw = ctx.measureText("M").width;
    // The key margin fits the widest key, up to 15 characters as on the site (D81); longer slot keys wrap.
    let widest = 0;
    for (const b of blocks) for (const row of b) {
      const w = row.k.reduce((a, r) => a + m.w({ t: r.t, look: probe.look("k", row, r), size: r.c.includes("km") ? FS * 0.86 : undefined }), 0);
      widest = Math.max(widest, w);
    }
    const g: Geometry = { keyW: Math.ceil(Math.min(Math.max(widest, 3 * cw), 15 * cw)), gap: Math.round(1.6 * cw), cw, grpIndent: 2 + Math.round(1.2 * cw) };

    const TITLE = `600 30px ${SANS}`;
    const BY = `400 16px ${SANS}`;
    const BOOKS = `400 14px ${SANS}`;
    const FOOT = `400 14px ${SANS}`;
    const metaHeight = (w: number) => {
      const t = wrapSans(meta.title, w, meta.untitled ? `italic ${TITLE}` : TITLE, m);
      const b = meta.byline ? wrapSans(meta.byline, w, BY, m) : [];
      const k = meta.books ? wrapSans(meta.books, w, BOOKS, m) : [];
      return { t, b, k, h: t.length * 38 + (b.length ? 6 + b.length * 24 : 0) + (k.length ? 4 + k.length * 22 : 0) + 26 };
    };
    const FOOT_H = 28 + 1 + 16 + 20;

    let colW: number;
    let cols: number[][];
    let laid: LaidBlock[];
    if (layout === "tall" || blocks.length < 2) {
      colW = TALL_W;
      laid = layBlocks(blocks, colW, g, probe, m);
      cols = [laid.map((_, i) => i)];
    } else {
      colW = COL_W;
      laid = layBlocks(blocks, colW, g, probe, m);
      const hs = laid.map((b) => b.h);
      cols = partition(hs, 2);
      for (let c = 2; c <= Math.min(4, blocks.length); c++) {
        cols = partition(hs, c);
        const w = 2 * PAD + c * COL_W + (c - 1) * GUTTER;
        const colH = Math.max(...cols.map((ix) => ix.reduce((a, i) => a + hs[i], 0) + (ix.length - 1) * BLOCK_GAP));
        if (PAD * 2 + metaHeight(w - 2 * PAD).h + colH + FOOT_H <= w) break;
      }
    }
    const n = cols.length;
    const W = 2 * PAD + n * colW + (n - 1) * GUTTER;
    const mh = metaHeight(W - 2 * PAD);
    const colH = Math.max(...cols.map((ix) => ix.reduce((a, i) => a + laid[i].h, 0) + (ix.length - 1) * BLOCK_GAP), 0);
    const H = PAD + mh.h + colH + FOOT_H + PAD;

    const scale = Math.min(2, Math.sqrt(MAX_PX / (W * H)), MAX_SIDE / H, MAX_SIDE / W);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "middle";

    // Title and byline (the view's .meta).
    let y = PAD;
    ctx.textAlign = "left";
    ctx.font = meta.untitled ? `italic ${TITLE}` : TITLE;
    ctx.fillStyle = meta.untitled ? col.mute : col.fg;
    for (const line of mh.t) { ctx.fillText(line, PAD, y + 19); y += 38; }
    if (mh.b.length) {
      y += 6;
      ctx.font = BY;
      ctx.fillStyle = col.mute;
      for (const line of mh.b) { ctx.fillText(line, PAD, y + 12); y += 24; }
    }
    if (mh.k.length) {
      y += 4;
      ctx.font = BOOKS;
      ctx.fillStyle = col.mute;
      for (const line of mh.k) { ctx.fillText(line, PAD, y + 11); y += 22; }
    }
    y += 26;

    // The build, column by column.
    const top = y;
    cols.forEach((ix, c) => {
      const x0 = PAD + c * (colW + GUTTER);
      let yy = top;
      ix.forEach((i, k) => {
        if (k) yy += BLOCK_GAP;
        for (const row of laid[i].rows) {
          paintRow(ctx, row, x0, yy, g, col);
          yy += row.h;
        }
      });
    });

    // Footer: the share link and the wordmark.
    const fy = H - PAD - 20;
    ctx.fillStyle = col.rule;
    ctx.fillRect(PAD, fy - 16, W - 2 * PAD, 1);
    ctx.font = FOOT;
    ctx.fillStyle = col.mute;
    ctx.textAlign = "left";
    const url = meta.url.replace(/^https?:\/\//, "");
    ctx.fillText(url, PAD, fy + 10);
    ctx.textAlign = "right";
    ctx.font = `600 16px ${SANS}`;
    ctx.fillStyle = col.acc;
    ctx.fillText(".", W - PAD, fy + 10);
    const dot = m.sans(".", `600 16px ${SANS}`);
    ctx.font = `600 16px ${SANS}`;
    ctx.fillStyle = col.fg;
    ctx.fillText("dndpaste", W - PAD - dot, fy + 10);
    return canvas;
  } finally {
    probe.done();
  }
}

function paintRow(ctx: CanvasRenderingContext2D, row: LaidRow, x0: number, y: number, g: Geometry, col: Colors): void {
  const vx = x0 + g.keyW + g.gap;
  // Keys, right-aligned in the margin (D81).
  row.keys.forEach((line, i) => {
    let x = x0 + g.keyW;
    for (let j = line.length - 1; j >= 0; j--) {
      const p = line[j];
      ctx.font = fontOf(p.look, p.size);
      ctx.textAlign = "right";
      ctx.fillStyle = p.look.color;
      ctx.fillText(p.t, x, y + i * LH + LH / 2);
      x -= ctx.measureText(p.t).width;
    }
  });
  if (row.grp) {
    ctx.fillStyle = col.rule;
    ctx.fillRect(vx, y, 2, row.h);
  }
  const tx = vx + (row.grp ? g.grpIndent : 0);
  ctx.textAlign = "left";
  row.vals.forEach((line, i) => {
    let x = tx;
    const cy = y + i * LH + LH / 2;
    for (const p of line) {
      ctx.font = fontOf(p.look, p.size);
      ctx.fillStyle = p.look.color;
      ctx.fillText(p.t, x, cy);
      const w = ctx.measureText(p.t).width;
      if (p.look.strike) {
        ctx.fillStyle = p.look.strike;
        ctx.fillRect(x, cy, w, 1.25);
      }
      x += w;
    }
  });
}

/** The canvas as a PNG. */
export function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}

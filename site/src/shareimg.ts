/**
 * The share image's model (D119): a parsed paste → blocks of rows, each row a key and a value as styled runs. Pure,
 * no DOM: the browser (client/share.ts) lays the rows out and paints them on a canvas; the tests check that the runs
 * read exactly as the view's renderer (render.ts), so the image never drops or reorders a line.
 *
 * A run's `c` holds the renderer's span classes for that text (k, p, r, s, n, e, q, ab, ab-<str…cha>, x, kd-<kind>,
 * km); `w` is the class of a wrapping span that changes how it looks (`d` a detail, `drop` a dropped item).
 */
import { ABILITIES, splitMarker } from "../../src/dndpaste.ts";
import type { Ability, Item, Paste, Ref, Scope, Value } from "../../src/dndpaste.ts";
import { BOOKS } from "./books.ts";
import { KIND_OF_KEY, isEmptyValue, kindOfKey, lineEntries } from "./render.ts";
import type { Kind } from "./render.ts";

export interface Run { t: string; c: string; w?: "d" | "drop" }
/** `kc`/`vc` are the renderer's row classes: `lvk` a level number; `idv`, `ehv`, `lvv` a bold head value; `grp` a line under a head. */
export interface Row { k: Run[]; v: Run[]; kc?: "lvk"; vc?: "idv" | "ehv" | "lvv" | "grp" }
export type Block = Row[];

const P = (t: string): Run => ({ t, c: "p" });
const isAbility = (name: string): name is Ability => (ABILITIES as readonly string[]).includes(name);
const ab = (a: Ability): Run => ({ t: a, c: `ab ab-${a.toLowerCase()}` });
const needsQuotes = (name: string): boolean => /[,;:[\]"]/.test(name) || name.startsWith("-");
const join = (parts: Run[][], sep: Run[]): Run[] => parts.flatMap((p, i) => (i ? [...sep, ...p] : p));
const wrap = (runs: Run[], w: "d" | "drop"): Run[] => runs.map((r) => ({ ...r, w }));

function ref(r: Ref, kind?: Kind): Run[] {
  if (!r.source && isAbility(r.name)) return [ab(r.name)];
  const name: Run = { t: r.name, c: kind ? `r kd-${kind}` : "r" };
  const out = needsQuotes(r.name) ? [P('"'), name, P('"')] : [name];
  return r.source ? [...out, { t: `|${r.source}`, c: "s" }] : out;
}

function item(it: Item, kind?: Kind): Run[] {
  const out: Run[] = it.drop ? [{ t: "-", c: "x" }] : [];
  out.push(...ref(it.ref, kind));
  if (it.details.length) {
    const groups = it.details.map((g) => join(g.map((d) => [...wrap(ref(d.ref), "d"), ...(d.at !== null ? [{ t: " ", c: "" }, { t: `@${d.at}`, c: "n" }] : [])]), [P(", ")]));
    out.push({ t: " ", c: "" }, P("["), ...join(groups, [P("; ")]), P("]"));
  }
  if (it.qty !== null) out.push({ t: " ", c: "" }, { t: `x${it.qty}`, c: "q" });
  return it.drop ? wrap(out, "drop") : out;
}

/** One key's value, as `renderValue` writes it. */
export function valueRuns(key: string, v: Value): Run[] {
  const kind = kindOfKey(key);
  switch (v.type) {
    case "items": return join(v.items.map((it) => item(it, kind)), [P(", ")]);
    case "enum": return [{ t: v.value, c: "e" }];
    case "int": return [{ t: String(v.value), c: "n" }];
    case "text": return [{ t: v.value, c: "" }];
    case "classes": return join(v.entries.map((e) => [...ref(e.ref, "class"), ...(e.levels === null ? [] : [{ t: " ", c: "" }, { t: String(e.levels), c: "n" }])]),
      [{ t: " ", c: "" }, P("/"), { t: " ", c: "" }]);
    case "scores": {
      if (v.values.every((x) => x === null)) {
        return join((v.increase ?? []).map((b) => [{ t: `+${b.amount}`, c: "n" }, { t: " ", c: "" }, ab(b.ability)]), [P(", ")]);
      }
      if (v.values.every((x) => x !== null)) return join(v.values.map((x, i) => [{ t: String(x), c: `n ab-${ABILITIES[i].toLowerCase()}` }]), [P("/")]);
      return join(ABILITIES.flatMap((a, i) => (v.values[i] === null ? [] : [[ab(a), { t: " ", c: "" }, { t: String(v.values[i]), c: `n ab-${a.toLowerCase()}` }]])), [P(", ")]);
    }
    case "hp": return v.roll !== null ? [{ t: String(v.roll), c: "n" }] : [{ t: v.method, c: "e" }];
    case "empty": return [];
  }
}

/** A key and its colon, the marker apart: `Feat (Fighting Style):`, `Spells (3rd):` (D110, D181, D184). */
export function keyRuns(key: string): Run[] {
  const c = key.startsWith("X-") ? "k xk" : "k";
  const m = !key.startsWith("X-") && splitMarker(key).marker !== null ? /^(.*?)(\s*)\((.*)\)$/.exec(key) : null;
  const body: Run[] = m ? [{ t: m[1] + m[2], c }, { t: `(${m[3]})`, c: `${c} km` }] : [{ t: key, c }];
  return [...body, P(":")];
}

// D216: the image, like the view, leaves out empty lines.
const rows = (scope: Scope, vc?: "grp"): Row[] => lineEntries(scope).filter(([, v]) => !isEmptyValue(v)).map(([k, v]) => ({ k: keyRuns(k), v: valueRuns(k, v), ...(vc ? { vc } : {}) }));

/** The whole build, block by block, in the view's order: identifier and header, Species/Background, then levels. */
export function shareBlocks(paste: Paste): Block[] {
  const head: Row[] = paste.identifier ? [{ k: [], v: [{ t: paste.identifier, c: "" }], vc: "idv" }] : [];
  head.push(...rows(paste.header));
  const out: Block[] = head.length ? [head] : [];
  for (const e of paste.entities) if (e.item || rows(e.lines).length) out.push([{ k: keyRuns(e.key), v: e.item ? item(e.item, KIND_OF_KEY[e.key]) : [], vc: "ehv" }, ...rows(e.lines, "grp")]);
  for (const l of paste.levels) out.push([{ k: [{ t: `L${l.n}`, c: "" }], v: ref(l.class, "class"), kc: "lvk", vc: "lvv" }, ...rows(l.lines, "grp")]);
  return out;
}

/** A book the build cites (D120): its title from `BOOKS` (D103), or null for a code the list does not hold. */
export interface CitedBook { code: string; title: string | null }

/**
 * The books a build cites, from its explicit `|SOURCE` codes anywhere (header, Species, Background, levels, details),
 * in the order they first appear, each once (codes compare without case). Names with no code are left out (D120).
 */
export function citedBooks(paste: Paste): CitedBook[] {
  const known = new Map(BOOKS.map((b) => [b.code.toUpperCase(), b] as const));
  const seen = new Map<string, CitedBook>();
  const cite = (r: Ref) => {
    if (!r.source) return;
    const k = r.source.toUpperCase();
    if (seen.has(k)) return;
    const b = known.get(k);
    seen.set(k, b ? { code: b.code, title: b.title } : { code: r.source, title: null });
  };
  const item = (it: Item) => { cite(it.ref); for (const g of it.details) for (const d of g) cite(d.ref); };
  const scope = (sc: Scope) => {
    for (const [, v] of sc) {
      if (v.type === "items") v.items.forEach(item);
      else if (v.type === "classes") for (const e of v.entries) cite(e.ref);
    }
  };
  scope(paste.header);
  for (const e of paste.entities) { if (e.item) item(e.item); scope(e.lines); }
  for (const l of paste.levels) { cite(l.class); scope(l.lines); }
  return [...seen.values()];
}

/** Reddit's submit page with the link and title filled in (D119). Reddit takes no image by URL. */
export function redditSubmitUrl(url: string, title: string): string {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

/** A file name from the build's title: no path or reserved characters, at most 80 characters; `fallback` when empty. */
export function imageFileName(title: string, fallback: string): string {
  // eslint-disable-next-line no-control-regex
  const t = title.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 80).trim();
  return `${t || fallback}.png`;
}

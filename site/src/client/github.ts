/**
 * GitHub links as sources (D248, D249): fetched by this browser straight from GitHub, never through the site's server.
 * CSP `connect-src` lets the page reach GitHub's API and raw-file hosts only (app.ts).
 *
 * A check costs one API call: the file's or folder's listing, sent with the ETag of the last one, so an unchanged link
 * answers 304. Files are fetched from the raw host, and only when a blob sha changed. A folder link reads every
 * .json file in it, and the .json files of its subfolders whose path names a kind (class, spell, feat, …): a folder
 * laid out by kind. Unauthenticated API calls are limited to 60 an hour per address; a failed check keeps the copy
 * already stored (the caller's job) and says why.
 */
import type { LinkState } from "../yours.ts";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

export interface Link { owner: string; repo: string; ref: string | null; path: string; kind: "file" | "folder" | "unknown" }

/** A GitHub address → its parts, or null when it isn't one this page can read. */
export function parseLink(input: string): Link | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const seg = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const name = /^[\w.-]+$/;
  if (u.hostname === "raw.githubusercontent.com") {
    if (seg.length < 4 || !name.test(seg[0]) || !name.test(seg[1])) return null;
    // raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>, or …/refs/heads/<ref>/<path>
    const heads = seg[2] === "refs" && (seg[3] === "heads" || seg[3] === "tags");
    const ref = heads ? seg[4] : seg[2];
    const path = seg.slice(heads ? 5 : 3).join("/");
    return ref && path ? { owner: seg[0], repo: seg[1], ref, path, kind: "file" } : null;
  }
  if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
  if (seg.length < 2 || !name.test(seg[0]) || !name.test(seg[1])) return null;
  const repo = seg[1].replace(/\.git$/, "");
  if (seg.length === 2) return { owner: seg[0], repo, ref: null, path: "", kind: "folder" };
  if ((seg[2] === "tree" || seg[2] === "blob" || seg[2] === "raw") && seg.length >= 4) {
    return { owner: seg[0], repo, ref: seg[3], path: seg.slice(4).join("/"), kind: seg[2] === "tree" ? "folder" : "file" };
  }
  return null;
}

/** A link's display name: `owner/repo`, then the path. */
export const linkName = (l: Link): string => `${l.owner}/${l.repo}${l.path ? `/${l.path}` : ""}`;

/** Path words that mark a subfolder file as one the names come from. */
const KIND_WORDS = /class|race|species|background|feat|spell|item|option/i;
/** Companion files of descriptions only: no names the editor reads. */
const SKIP = /fluff/i;
/** Limits for one source: files, bytes. */
export const MAX_FILES = 400;
/** A file inside a folder, by its path from the folder (D261, D269): a .json file at the top, or one whose path names a
 *  kind deeper down; description companions never. The same rule for a GitHub folder and a folder from this computer. */
export const folderFile = (rel: string): boolean => /\.json$/i.test(rel) && !SKIP.test(rel) && (!rel.includes("/") || KIND_WORDS.test(rel));
export const MAX_BYTES = 80 * 1024 * 1024;

export class LinkError extends Error {}

export interface Fetched {
  /** False when nothing changed since the last check: the stored copy stays. */
  changed: boolean;
  /** Every file the source reads now, with its text; empty when nothing changed. */
  files: { path: string; text: string }[];
  state: Pick<LinkState, "etag" | "shas" | "trees" | "kind" | "path">;
}

/** What to tell the visitor when GitHub says no (D249): plain words, never the raw status. */
async function failure(res: Response): Promise<LinkError> {
  if (res.status === 404) return new LinkError("GitHub has no public file or folder at this link.");
  if (res.status === 403 || res.status === 429) {
    const left = res.headers.get("x-ratelimit-remaining");
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    if (left === "0" && reset) {
      const t = new Date(reset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return new LinkError(`GitHub's hourly limit for this browser is used up. Try again after ${t}.`);
    }
    return new LinkError("GitHub refused the request. Try again later.");
  }
  return new LinkError("GitHub didn't answer.");
}

async function get(url: string, etag?: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (etag) headers["If-None-Match"] = etag;
  try {
    return await fetch(url, { headers, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
  } catch {
    throw new LinkError("GitHub didn't answer.");
  }
}

async function raw(l: Link, ref: string, path: string): Promise<string> {
  let res: Response;
  const url = `${RAW}/${l.owner}/${l.repo}/${encodeURIComponent(ref)}/${path.split("/").map(encodeURIComponent).join("/")}`;
  try { res = await fetch(url, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }); } catch { throw new LinkError("GitHub didn't answer."); }
  if (!res.ok) throw await failure(res);
  return res.text();
}

const contentsUrl = (l: Link) => `${API}/repos/${l.owner}/${l.repo}/contents/${l.path.split("/").map(encodeURIComponent).join("/")}${l.ref ? `?ref=${encodeURIComponent(l.ref)}` : ""}`;

/** Runs `fn` over `items`, `n` at a time. */
async function pool<T, R>(items: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/**
 * Checks a link and fetches what changed. `prev`: what the last check saw (none for a new link). Throws a LinkError
 * with words for the visitor when GitHub can't be read; the caller keeps its stored copy then (D249).
 */
export async function fetchLink(l: Link, prev: Partial<LinkState> | null, onProgress?: (done: number, all: number) => void): Promise<Fetched> {
  const res = await get(contentsUrl(l), prev?.etag);
  if (res.status === 304 && prev) return { changed: false, files: [], state: { etag: prev.etag, shas: prev.shas, trees: prev.trees, kind: prev.kind ?? "file", path: prev.path ?? l.path } };
  if (!res.ok) throw await failure(res);
  const etag = res.headers.get("etag");
  const body = await res.json().catch(() => null);
  const ref = l.ref ?? "HEAD";

  // A file: one entry with its sha.
  if (body && !Array.isArray(body)) {
    if (body.type !== "file" || typeof body.sha !== "string") throw new LinkError("This link is not a file or a folder.");
    if (body.size > MAX_BYTES) throw new LinkError("This file is too large to read here.");
    const path = String(body.path ?? l.path);
    const shas = { [path]: body.sha };
    if (prev?.shas?.[path] === body.sha) return { changed: false, files: [], state: { etag, shas, trees: {}, kind: "file", path } };
    onProgress?.(0, 1);
    const text = await raw(l, ref, path);
    onProgress?.(1, 1);
    return { changed: true, files: [{ path, text }], state: { etag, shas, trees: {}, kind: "file", path } };
  }
  if (!Array.isArray(body)) throw new LinkError("GitHub sent something this page can't read.");

  // A folder: its .json files, and the .json files of its subfolders whose path names a kind (each subfolder listed
  // once per tree sha, so an unchanged subfolder costs no call).
  const want: { path: string; sha: string; size: number }[] = [];
  const isJson = (p: string) => /\.json$/i.test(p) && !SKIP.test(p);
  for (const e of body) if (e?.type === "file" && isJson(e.name)) want.push({ path: e.path, sha: e.sha, size: e.size ?? 0 });
  const trees: NonNullable<LinkState["trees"]> = {};
  for (const d of body.filter((e) => e?.type === "dir")) {
    const had = prev?.trees?.[d.path];
    let files = had && had.sha === d.sha ? had.files : null;
    if (!files) {
      const t = await get(`${API}/repos/${l.owner}/${l.repo}/git/trees/${d.sha}?recursive=1`);
      if (!t.ok) throw await failure(t);
      const tree = await t.json().catch(() => null);
      files = (Array.isArray(tree?.tree) ? tree.tree : [])
        .filter((x: { type: string; path: string }) => x.type === "blob" && isJson(x.path) && KIND_WORDS.test(`${d.name}/${x.path}`))
        .map((x: { path: string; sha: string; size?: number }) => ({ path: `${d.path}/${x.path}`, sha: x.sha, size: x.size ?? 0 }));
    }
    trees[d.path] = { sha: d.sha, files: files ?? [] };
    want.push(...(files ?? []));
  }
  if (!want.length) throw new LinkError("This folder has no .json files to read.");
  if (want.length > MAX_FILES) throw new LinkError(`This folder has ${want.length} files; a source reads up to ${MAX_FILES}. Link a smaller folder.`);
  if (want.reduce((a, f) => a + f.size, 0) > MAX_BYTES) throw new LinkError("This folder is too large to read here. Link a smaller folder.");
  const shas = Object.fromEntries(want.map((f) => [f.path, f.sha]));
  const same = prev?.shas && Object.keys(prev.shas).length === want.length && want.every((f) => prev.shas?.[f.path] === f.sha);
  if (same) return { changed: false, files: [], state: { etag, shas, trees, kind: "folder", path: l.path } };
  let done = 0;
  onProgress?.(0, want.length);
  const files = await pool(want, 6, async (f) => {
    const text = await raw(l, ref, f.path);
    onProgress?.(++done, want.length);
    return { path: f.path, text };
  });
  return { changed: true, files, state: { etag, shas, trees, kind: "folder", path: l.path } };
}

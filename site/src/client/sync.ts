/**
 * Adding, checking and reading your own sources in the browser (D245–D249). The /sources page bundles this module;
 * the editor loads it as /assets/yours.js once it knows a source exists, to merge your names into its lists and to
 * check your links again on each visit.
 */
import { allCodes } from "../codelist.ts";
import { joinReads, keepTable, merge, readText } from "../yours.ts";
import type { Merged, Names, SourceRec, Switches } from "../yours.ts";
import { fetchLink, folderFile, LinkError, linkName, MAX_BYTES, MAX_FILES, parseLink } from "./github.ts";
import { getSwitches, listSources, putSource } from "./sourcestore.ts";

/** Book code → publication date, so a book from 2024 on reads as 2024 (books.ts and the playtest codes, D228). */
let dates: Record<string, string> | null = null;
const DATES = (): Record<string, string> => (dates ??= Object.fromEntries(allCodes().filter((b) => b.date).map((b) => [b.code, b.date])));
/** A file larger than this is not read: no names file needs it. */
export const MAX_FILE = 30 * 1024 * 1024;
/** A link checked this recently is not checked again on a visit (reloads would spend GitHub's hourly limit). */
const RECHECK_MS = 10 * 60 * 1000;

const now = () => new Date().toISOString();
const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export class AddError extends Error {}

/** The names a read gave: none means the file was not a names file. */
function hasNames(rec: SourceRec): boolean {
  return Object.entries(rec.table).some(([k, v]) => k !== "families" && k !== "featCategories" && Object.keys(v ?? {}).length > 0);
}

/** A picked or dropped file → a new source (not yet saved). */
export async function fromFile(file: File, featCategories: Readonly<Record<string, string>> = {}): Promise<SourceRec> {
  if (file.size > MAX_FILE) throw new AddError("This file is too large to read here.");
  let text: string;
  try { text = await file.text(); } catch { throw new AddError("This browser could not read the file."); }
  const read = readText(text, featCategories);
  const rec: SourceRec = { id: newId(), name: file.name, type: "file", on: true, added: now(), files: 1, skipped: read.skipped, table: keepTable(read, DATES(), featCategories) };
  if (!hasNames(rec)) throw new AddError(read.format === "json" ? "No names found. Each entry needs a name and a source." : "No names found. Start each line with a kind, such as Spell: Name|BOOK.");
  return rec;
}

/**
 * A folder from this computer, picked or dropped (D269) → a new source (not yet saved), read once like a file. `files`
 * carry their path from the folder; the folder's .json files are read by the GitHub folder rule (github.ts `folderFile`).
 */
export async function fromFolder(name: string, files: readonly { path: string; file: File }[], featCategories: Readonly<Record<string, string>> = {},
  onProgress?: (done: number, all: number) => void): Promise<SourceRec> {
  const want = files.filter((f) => folderFile(f.path));
  if (!want.length) throw new AddError("This folder has no .json files to read.");
  if (want.length > MAX_FILES) throw new AddError(`This folder has ${want.length} files; a source reads up to ${MAX_FILES}. Pick a smaller folder.`);
  if (want.reduce((a, f) => a + f.file.size, 0) > MAX_BYTES) throw new AddError("This folder is too large to read here. Pick a smaller folder.");
  const reads = [];
  for (const [i, f] of want.entries()) {
    onProgress?.(i, want.length);
    try { reads.push(readText(await f.file.text(), featCategories)); } catch { throw new AddError(`This browser could not read ${f.path}.`); }
  }
  onProgress?.(want.length, want.length);
  const read = joinReads(reads);
  const rec: SourceRec = { id: newId(), name, type: "folder", on: true, added: now(), files: want.length, skipped: read.skipped, table: keepTable(read, DATES(), featCategories) };
  if (!hasNames(rec)) throw new AddError("No names found in this folder's .json files.");
  return rec;
}

/** A pasted GitHub link → a new source (not yet saved). */
export async function fromLink(url: string, featCategories: Readonly<Record<string, string>> = {}, onProgress?: (done: number, all: number) => void): Promise<SourceRec> {
  const l = parseLink(url);
  if (!l) throw new AddError("Paste a link to a file or a folder on github.com.");
  let got;
  try { got = await fetchLink(l, null, onProgress); } catch (e) { throw new AddError(e instanceof LinkError ? e.message : "GitHub didn't answer."); }
  const read = joinReads(got.files.map((f) => readText(f.text, featCategories)));
  const at = now();
  const rec: SourceRec = {
    id: newId(), name: linkName(l), type: "link", on: true, added: at, files: got.files.length, skipped: read.skipped,
    link: { url: url.trim(), kind: got.state.kind ?? "file", path: got.state.path ?? l.path, checked: at, copy: at, failed: null, etag: got.state.etag, shas: got.state.shas, trees: got.state.trees },
    table: keepTable(read, DATES(), featCategories),
  };
  if (!hasNames(rec)) throw new AddError("No names found at this link. A folder link reads its .json files.");
  return rec;
}

/**
 * Checks a link source again (D248, D249) and saves what it found: new names when the link changed, the check time
 * when it didn't, and the failure when GitHub couldn't be read, keeping the stored copy. `force`: Check now.
 */
export async function recheck(rec: SourceRec, force = false, featCategories: Readonly<Record<string, string>> = {}): Promise<SourceRec> {
  const st = rec.link;
  const l = st ? parseLink(st.url) : null;
  if (!st || !l) return rec;
  const last = Date.parse(st.failed?.at ?? st.checked ?? "") || 0;
  if (!force && Date.now() - last < RECHECK_MS) return rec;
  const at = now();
  let next: SourceRec;
  try {
    const got = await fetchLink(l, st);
    const link = { ...st, ...got.state, checked: at, failed: null };
    if (!got.changed) next = { ...rec, link };
    else {
      const read = joinReads(got.files.map((f) => readText(f.text, featCategories)));
      next = { ...rec, link: { ...link, copy: at }, files: got.files.length, skipped: read.skipped, table: keepTable(read, DATES(), featCategories) };
    }
  } catch (e) {
    next = { ...rec, link: { ...st, failed: { at, message: e instanceof LinkError ? e.message : "GitHub didn't answer." } } };
  }
  await putSource(next);
  return next;
}

/** Checks every link source that is due, one after another; resolves to the sources as now stored. */
export async function recheckAll(sources: readonly SourceRec[], featCategories: Readonly<Record<string, string>> = {}): Promise<SourceRec[]> {
  const out: SourceRec[] = [];
  for (const s of sources) out.push(s.type === "link" ? await recheck(s, false, featCategories) : s);
  return out;
}

/** What the editor needs: the built-in names with yours merged in, and your classes' presets (D246, D250). */
export async function editorNames(n: Names): Promise<Merged | null> {
  const [sources, sw] = await Promise.all([listSources(), getSwitches()]);
  return mergeOrNull(n, sources, sw);
}

/** The merge, or null when nothing differs from the built-in names (no sources, every switch on). */
export function mergeOrNull(n: Names, sources: readonly SourceRec[], sw: Switches): Merged | null {
  const plain = sw.builtin && !sw.offBooks.length && !sw.offPairs.length && !sources.some((s) => s.on);
  return plain ? null : merge(n, sources, sw);
}

/** The editor's visit (D248): merge now, then check the links that are due and merge again if any changed. */
export async function editorVisit(n: Names, onChange: (m: Merged | null) => void): Promise<void> {
  const [sources, sw] = await Promise.all([listSources(), getSwitches()]);
  onChange(mergeOrNull(n, sources, sw));
  if (!sources.some((s) => s.type === "link")) return;
  const after = await recheckAll(sources, n.FEAT_CATEGORIES);
  if (after.some((s, i) => s.table !== sources[i].table)) onChange(mergeOrNull(n, after, sw));
}

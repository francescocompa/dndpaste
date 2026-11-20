/**
 * The /sources page in the browser (D247, D252–D256): add a names file (pick or drop) or a GitHub link, list the
 * sources grouped by book or by source (split by kind on demand), switch sources, books and kinds, check links again, remove. Bundled as
 * /assets/sources.js. Every storage call degrades: with storage blocked the page says so and adds nothing (D245).
 */
import { esc, icon } from "../render.ts";
import { builtinBookKinds, counts } from "../yours.ts";
import type { Names, SourceRec, Switches } from "../yours.ts";
import { NO_SWITCHES } from "../yours.ts";
import { categoryToggle, listHtml } from "../sourcesview.ts";
import type { Lens, View } from "../sourcesview.ts";
import { AddError, fromFile, fromFolder, fromLink, recheck } from "./sync.ts";
import { deleteSource, getSwitches, listSources, putSource, putSwitches, storageWorks } from "./sourcestore.ts";

/** The names module (D158), for the built-in counts and the feat category names. A variable: loaded at run time. */
const NAMES_JS = "/assets/names.js";
const LENS_KEY = "dndpaste.sources.lens";
const SPLIT_KEY = "dndpaste.sources.split";

/** Every file in a dropped folder, with its path from that folder (readEntries answers in batches). */
async function walk(dir: FileSystemDirectoryEntry, base = ""): Promise<{ path: string; file: File }[]> {
  const out: { path: string; file: File }[] = [];
  const reader = dir.createReader();
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    for (const e of batch) {
      const path = `${base}${e.name}`;
      if (e.isDirectory) out.push(...(await walk(e as FileSystemDirectoryEntry, `${path}/`)));
      else out.push({ path, file: await new Promise<File>((res, rej) => (e as FileSystemFileEntry).file(res, rej)) });
    }
  }
  return out;
}

function start(): void {
  const page = document.querySelector<HTMLElement>(".srcp");
  const list = page?.querySelector<HTMLElement>(".list");
  const add = page?.querySelector<HTMLElement>(".add");
  if (!page || !list || !add) return;
  const out = add.querySelector<HTMLElement>(".addout") as HTMLElement;
  const fileWay = add.querySelector<HTMLElement>(".way-file") as HTMLElement;
  const linkWay = add.querySelector<HTMLFormElement>(".way-link") as HTMLFormElement;
  const input = add.querySelector<HTMLInputElement>("input[type=file]") as HTMLInputElement;
  const linkIn = add.querySelector<HTMLInputElement>("#src-link") as HTMLInputElement;
  const drop = add.querySelector<HTMLElement>(".drop") as HTMLElement;
  const docs = page.querySelector<HTMLDetailsElement>("#names-format");

  let lens: Lens = "book";
  let split = false;
  try {
    if (localStorage.getItem(LENS_KEY) === "source") lens = "source";
    split = localStorage.getItem(SPLIT_KEY) === "1";
  } catch { /* storage blocked */ }
  const v: { sources: SourceRec[]; sw: Switches; names: Names | null; open: Set<string>; busy: Set<string>; confirm: string | null; works: boolean } =
    { sources: [], sw: { ...NO_SWITCHES }, names: null, open: new Set(), busy: new Set(), confirm: null, works: true };
  let builtin: View["builtin"] = null;
  let builtinNames = 0;

  const draw = () => {
    const view: View = { sources: v.sources, sw: v.sw, lens, split, builtin, builtinNames, open: v.open, busy: v.busy, confirm: v.confirm, now: new Date() };
    const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-lens],[data-split],[data-cat],[data-catsw],[data-book],[data-pair],[data-source],[data-builtin],[data-check],[data-remove],[data-remove-no],[data-remove-yes]");
    const sel = focused ? [...focused.attributes].find((a) => a.name.startsWith("data-")) : null;
    // A redraw (a visit's link check ending) keeps an open "not read" popover open.
    const pops = [...list.querySelectorAll<HTMLDetailsElement>("details.pop[open]")].map((d) => d.dataset.pop ?? "");
    list.innerHTML = listHtml(view);
    for (const id of pops) { const d = list.querySelector<HTMLDetailsElement>(`details.pop[data-pop="${CSS.escape(id)}"]`); if (d) d.open = true; }
    if (sel) list.querySelector<HTMLElement>(`[${sel.name}="${CSS.escape(sel.value)}"]`)?.focus({ preventScroll: true });
    // The names format is open while there is nothing else to read (the empty frame), folded once sources exist.
    if (docs && !docs.dataset.touched) docs.open = !v.sources.length;
  };
  // Once the visitor opens or folds it, it stays as they left it.
  docs?.querySelector(":scope > summary")?.addEventListener("click", () => { if (docs) docs.dataset.touched = "1"; });

  const say = (html: string, error = false) => { out.innerHTML = html ? (error ? `<p class="ferr">${icon("warning")}<span>${html}</span></p>` : `<p class="said">${html}</p>`) : ""; };
  /** D266: the work under way, with a thin bar that fills as files are read. */
  const busy = (what: string, done = 0, all = 0) => {
    out.innerHTML = `<div class="said busy">${icon("refresh")}<span>${what}</span></div>` +
      `<div class="bar" role="progressbar" aria-label="${esc(what)}"${all ? ` aria-valuemin="0" aria-valuemax="${all}" aria-valuenow="${done}"` : ""}><span${all ? "" : ` class="ind"`}></span></div>`;
    // The width through CSSOM: the live CSP drops style attributes (D240).
    const fill = out.querySelector<HTMLElement>(".bar span");
    if (fill && all) fill.style.width = `${Math.round((done / all) * 100)}%`;
  };
  const reading = (done: number, all: number) => busy(all > 1 ? `Reading ${done} of ${all} files…` : "Reading the file…", done, all);
  const reload = async () => { v.sources = await listSources(); draw(); };

  // ---- adding ----
  const added = (s: SourceRec) => {
    const c = counts(s.table);
    // D266: what was added, then its counts, then what was not read, each its own part.
    const k = (x: number, one: string) => `${x.toLocaleString("en-US")} ${x === 1 ? one : `${one}s`}`;
    out.innerHTML = `<p class="said done"><span class="ok">${icon("check")}</span><b>Added ${esc(s.name)}</b><span>${k(c.names, "name")} · ${k(c.books.size, "book")}</span>` +
      (s.skipped ? `<span class="warn">${icon("warning")}${k(s.skipped, "line")} not read</span>` : "") + `</p>`;
  };
  const keep = async (s: SourceRec) => {
    if (!(await putSource(s))) { say("This browser could not keep the source. It may be out of space for site data.", true); return; }
    await reload();
    added(s);
  };
  const addFiles = async (files: readonly File[]) => {
    if (!v.works || !files.length) return;
    for (const f of files) {
      busy(`Reading ${esc(f.name)}…`);
      try { await keep(await fromFile(f, v.names?.FEAT_CATEGORIES)); } catch (e) { say(e instanceof AddError ? esc(e.message) : "This file could not be read.", true); return; }
    }
  };
  // D269: a folder from this computer, picked or dropped, read once with the GitHub folder rule.
  const addFolder = async (name: string, files: { path: string; file: File }[]) => {
    if (!v.works) return;
    busy(`Reading ${esc(name)}…`);
    try { await keep(await fromFolder(name, files, v.names?.FEAT_CATEGORIES, reading)); } catch (e) { say(e instanceof AddError ? esc(e.message) : "This folder could not be read.", true); }
  };
  const dirInput = add.querySelector<HTMLInputElement>("input.dir");
  add.querySelector(".pick")?.addEventListener("click", () => input.click());
  add.querySelector(".pickdir")?.addEventListener("click", () => dirInput?.click());
  input.addEventListener("change", () => { void addFiles([...(input.files ?? [])]); input.value = ""; });
  dirInput?.addEventListener("change", () => {
    const fs = [...(dirInput.files ?? [])];
    // webkitRelativePath is "Folder/sub/file.json": the first part names the folder.
    const name = fs[0]?.webkitRelativePath.split("/")[0] ?? "Folder";
    void addFolder(name, fs.map((file) => ({ path: file.webkitRelativePath.split("/").slice(1).join("/"), file })));
    dirInput.value = "";
  });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("over");
    const dirs = [...(e.dataTransfer?.items ?? [])].map((i) => i.webkitGetAsEntry?.()).filter((x): x is FileSystemDirectoryEntry => !!x?.isDirectory);
    if (dirs[0]) { void (async () => addFolder(dirs[0].name, await walk(dirs[0])))(); return; }
    void addFiles([...(e.dataTransfer?.files ?? [])]);
  });
  // A file dropped anywhere else on the page is not opened by the browser in place of the page.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => { if (!(e.target as Element | null)?.closest?.(".drop")) e.preventDefault(); });
  linkWay.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!v.works) return;
    const url = linkIn.value.trim();
    if (!url) { linkIn.focus(); return; }
    const btn = linkWay.querySelector<HTMLButtonElement>("button[type=submit]");
    if (btn) btn.disabled = true;
    busy("Asking GitHub…");
    try {
      const s = await fromLink(url, v.names?.FEAT_CATEGORIES, reading);
      await keep(s);
      linkIn.value = "";
    } catch (err) { say(err instanceof AddError ? esc(err.message) : "GitHub didn't answer.", true); }
    if (btn) btn.disabled = false;
  });
  add.querySelector(".addh .seg")?.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("[data-way]");
    if (!b) return;
    const link = b.dataset.way === "link";
    for (const x of add.querySelectorAll<HTMLButtonElement>("[data-way]")) { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(on)); }
    fileWay.hidden = link;
    linkWay.hidden = !link;
    say("");
    if (link) linkIn.focus();
  });

  // ---- the list ----
  const saveSwitches = async (sw: Switches) => { v.sw = sw; draw(); await putSwitches(sw); };
  const check = async (s: SourceRec) => {
    v.busy.add(s.id); draw();
    const next = await recheck(s, true, v.names?.FEAT_CATEGORIES);
    v.busy.delete(s.id);
    v.sources = v.sources.map((x) => (x.id === s.id ? next : x));
    draw();
  };
  list.addEventListener("click", async (e) => {
    const t = (e.target as Element).closest<HTMLElement>("button");
    if (!t) return;
    const d = t.dataset;
    const view = { sources: v.sources, sw: v.sw, lens, split, builtin, builtinNames, open: v.open, busy: v.busy, confirm: v.confirm, now: new Date() } as View;
    if (d.lens) {
      lens = d.lens as Lens;
      try { localStorage.setItem(LENS_KEY, lens); } catch { /* storage blocked */ }
      v.confirm = null;
      draw();
    } else if (d.cat) {
      if (v.open.has(d.cat)) v.open.delete(d.cat); else v.open.add(d.cat);
      draw();
    } else if (d.catsw) await saveSwitches(categoryToggle(view, d.catsw));
    else if (d.book) {
      const off = new Set(v.sw.offBooks);
      if (off.has(d.book)) off.delete(d.book); else off.add(d.book);
      await saveSwitches({ ...v.sw, offBooks: [...off].sort() });
    } else if (d.split) {
      split = !split;
      try { localStorage.setItem(SPLIT_KEY, split ? "1" : "0"); } catch { /* storage blocked */ }
      draw();
    } else if (d.pair) {
      const p = d.pair;
      await saveSwitches({ ...v.sw, offPairs: v.sw.offPairs.includes(p) ? v.sw.offPairs.filter((x) => x !== p) : [...v.sw.offPairs, p].sort() });
    } else if (d.builtin) await saveSwitches({ ...v.sw, builtin: !v.sw.builtin });
    else if (d.source) {
      const s = v.sources.find((x) => x.id === d.source);
      if (!s) return;
      const next = { ...s, on: !s.on };
      v.sources = v.sources.map((x) => (x.id === s.id ? next : x));
      draw();
      await putSource(next);
    } else if (d.check) {
      const s = v.sources.find((x) => x.id === d.check);
      if (s) await check(s);
    } else if (d.remove) { v.confirm = d.remove; draw(); list.querySelector<HTMLElement>(`[data-remove-no="${CSS.escape(d.remove)}"]`)?.focus(); }
    else if (d.removeNo) { v.confirm = null; draw(); }
    else if (d.removeYes) {
      const s = v.sources.find((x) => x.id === d.removeYes);
      v.confirm = null;
      await deleteSource(d.removeYes);
      await reload();
      if (s) say(`Removed ${esc(s.name)}.`);
    }
  });

  // ---- first draw, then the visit's checks (D248) ----
  void (async () => {
    v.works = await storageWorks();
    if (!v.works) {
      say("This browser isn't keeping site data (a private window, or site data is blocked), so sources can't be added here.", true);
      for (const b of add.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")) b.disabled = true;
    }
    [v.sources, v.sw] = await Promise.all([listSources(), getSwitches()]);
    draw();
    try {
      v.names = (await import(NAMES_JS)) as Names;
      builtin = builtinBookKinds(v.names);
      builtinNames = (["CLASS_ROWS", "SUBCLASSES", "SPECIES", "BACKGROUNDS", "FEATS", "SPELLS", "ITEMS", "OPTIONS"] as const)
        .reduce((a, k) => a + (v.names as Names)[k].length, 0);
      draw();
    } catch { /* the counts of the built-in names stay out */ }
    for (const s of v.sources) {
      if (s.type !== "link") continue;
      const next = await recheck(s, false, v.names?.FEAT_CATEGORIES);
      if (next !== s) { v.sources = v.sources.map((x) => (x.id === s.id ? next : x)); draw(); }
    }
  })();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();

/**
 * dndpaste checker — data-driven (SPEC §6, D11, D30, D34).
 * Input: a parsed Paste + a slot table (scripts/extract-slots.mjs) + the hand-kept supplement.
 * Output: findings. Never edits the paste; `normalise` returns a new one.
 * Every finding is a warning or an info — extras are accepted (D34).
 */
import type { Paste, Item, Ref, Scope, Value, LevelBlock } from "./dndpaste.js";

// ─── Slot table types (loose on purpose: the extract may grow fields) ────────

interface ChooseSpec { fixed: string[]; choose: { count: number; from: string[] | null } | null; any: number }
interface Progression { name: string; progression: number[] }
interface FeatureSlot { level: number; options: string[] }
export interface ClassSlots {
  name: string; source: string; edition: string | null; subclassLevel: number | null; asiLevels: number[]; expertiseLevels: number[];
  features: Record<string, FeatureSlot>; optionalClassFeatures?: Record<string, { level: number; source: string }>; options: Record<string, Progression>; featProgression: Record<string, Progression>;
  masteries: number[] | null; hasMastery?: boolean; skills: ChooseSpec | null; multiclassSkills: ChooseSpec | null; equipmentOptions: string[];
  casting: { ability: string; progression: string | null; preparedChange: string | null; cantrips: number[] | null; prepared: number[] | null; known: number[] | null } | null;
}
export interface SubclassSlots {
  name: string; shortName: string; className: string; classSource: string; source: string; edition: string | null;
  features: Record<string, FeatureSlot>; options: Record<string, Progression>; grantedSpells: string[];
  casting: { ability: string; cantrips: number[] | null; prepared: number[] | null; known: number[] | null } | null;
}
export interface SpeciesSlots {
  name: string; source: string; edition: string | null; size: string[] | null; skills: ChooseSpec | null; tools: ChooseSpec | null; languages: ChooseSpec | null;
  ability: unknown; feats: { category?: string[]; count?: number; fixed?: string[] }[]; versions: string[]; spellAbility: string[] | null; cantripChoose: number; grantedSpells: string[];
}
export interface BackgroundSlots {
  name: string; source: string; edition: string | null; ability: { choose: { from: string[]; weights?: number[] } | null } | null;
  skills: ChooseSpec | null; tools: ChooseSpec | null; languages: ChooseSpec | null; feats: string[]; equipmentOptions: string[];
}
export interface FeatSlots { name: string; source: string; category: string | null; repeatable: boolean; abilityChoose: string[] | null; versions: string[]; cantripChoose: number; spellChoose: number; grantedSpells: string[]; prereqLevel: number | null }
export interface OptionalFeatureSlots { name: string; source: string; types: string[]; prereqLevel: number | null }
export interface Slots {
  classes: Record<string, ClassSlots>; subclasses: Record<string, SubclassSlots>; species: Record<string, SpeciesSlots>;
  backgrounds: Record<string, BackgroundSlots>; feats: Record<string, FeatSlots>; optionalFeatures: Record<string, OptionalFeatureSlots>;
  families: Record<string, string>; spells: Record<string, { name: string; source: string; level: number }>; items: Record<string, { name: string; source: string; rarity: string }>;
}
export interface Supplement {
  expertiseCount?: number;
  spellbook?: Record<string, { first: number; perLevel: number }>;
  lineageTrait?: Record<string, string | null>;
  speciesFeatures?: Record<string, Record<string, string[]>>;
  optionPicks?: Record<string, number>;
  classFeaturePicks?: Record<string, Record<string, { levels: number[]; key: string; count: number }>>;
}

export type FindingKind = "missing" | "misplaced" | "unresolved" | "redundant" | "unplaced" | "extra";
export interface Finding { kind: FindingKind; severity: "warning" | "info"; where: string; key?: string; ref?: string; message: string }

// ─── Resolution ─────────────────────────────────────────────────────────────

const lc = (s: string) => s.toLowerCase();
const looseEq = (a: string, b: string) => { const x = lc(a), y = lc(b); return x === y || x.startsWith(y + " ") || x.endsWith(" " + y) || y.startsWith(x + " ") || y.endsWith(" " + x); };
const refStr = (r: Ref) => (r.source ? `${r.name}|${r.source}` : r.name);

class Index<T extends { name: string; source: string; edition?: string | null; core?: boolean }> {
  private byName = new Map<string, T[]>();
  private all: T[] = [];
  constructor(table: Record<string, T>, alias?: (t: T) => string | undefined) {
    for (const t of Object.values(table)) {
      this.all.push(t);
      this.push(lc(t.name), t);
      const a = alias?.(t);
      if (a && lc(a) !== lc(t.name)) this.push(lc(a), t);
    }
  }
  private push(k: string, t: T) { const l = this.byName.get(k); if (l) l.push(t); else this.byName.set(k, [t]); }
  resolve(ref: Ref, rules: string | null, extra?: (t: T) => boolean): { hit: T | null; status: "ok" | "none" | "ambiguous" | "alias" } {
    let c = this.byName.get(lc(ref.name)) ?? [];
    if (extra) c = c.filter(extra);
    if (ref.source) c = c.filter((t) => lc(t.source) === lc(ref.source as string));
    if (c.length > 1 && rules) { const e = c.filter((t) => t.edition === rules); if (e.length) c = e; }
    if (c.length > 1) { const k = c.filter((t) => t.core); if (k.length) c = k; }
    if (c.length > 1) { const d = dedupeByName(c); if (d.length === 1) return { hit: d[0], status: "ok" }; return { hit: c[0], status: "ambiguous" }; }
    if (c.length === 1) return { hit: c[0], status: "ok" };
    // ── D43: name-alias contains fallback — a ref of 4+ chars with no direct match against
    // exactly one entity of the same kind whose name contains it, case-insensitively. ────────
    if (ref.name.length >= 4) {
      let a = this.all.filter((t) => lc(t.name).includes(lc(ref.name)));
      if (extra) a = a.filter(extra);
      if (ref.source) a = a.filter((t) => lc(t.source) === lc(ref.source as string));
      if (a.length > 1 && rules) { const e = a.filter((t) => t.edition === rules); if (e.length) a = e; }
      if (a.length > 1) { const k = a.filter((t) => t.core); if (k.length) a = k; }
      if (a.length > 1) a = dedupeByName(a);
      if (a.length === 1) return { hit: a[0], status: "alias" };
    }
    return { hit: null, status: "none" };
  }
}
function dedupeByName<T extends { name: string; source: string }>(c: T[]): T[] {
  const seen = new Set<string>(); const out: T[] = [];
  for (const t of c) { const k = `${lc(t.name)}|${lc(t.source)}`; if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}

// ─── Checker ────────────────────────────────────────────────────────────────

function items(scope: Scope, key: string): Item[] {
  const v = scope.get(key);
  return v && v.type === "items" ? v.items : [];
}
function adds(scope: Scope, key: string): Item[] { return items(scope, key).filter((i) => !i.drop); }
function drops(scope: Scope, key: string): Item[] { return items(scope, key).filter((i) => i.drop); }
function delta(p: number[] | null | undefined, k: number): number {
  if (!p || k < 1 || k > p.length) return 0;
  return p[k - 1] - (k >= 2 ? p[k - 2] : 0);
}

export function check(paste: Paste, slots: Slots, supplement: Supplement = {}): Finding[] {
  const F: Finding[] = [];
  const add = (kind: FindingKind, severity: "warning" | "info", where: string, message: string, key?: string, ref?: string) => F.push({ kind, severity, where, key, ref, message });
  const rulesV = paste.header.get("Rules");
  const rules = rulesV && rulesV.type === "enum" ? rulesV.value : null;

  const ix = {
    classes: new Index(slots.classes),
    subclasses: new Index(slots.subclasses, (s) => s.shortName),
    species: new Index(slots.species),
    backgrounds: new Index(slots.backgrounds),
    feats: new Index(slots.feats),
    options: new Index(slots.optionalFeatures),
    spells: new Index(slots.spells),
    items: new Index(slots.items),
  };
  const resolveRef = <T extends { name: string; source: string; edition?: string | null; core?: boolean }>(index: Index<T>, ref: Ref, where: string, key: string, sev: "warning" | "info" = "warning", extra?: (t: T) => boolean): T | null => {
    let r = index.resolve(ref, rules, extra);
    // Generic magic variants ("+1 Longsword") are not 5etools entities: strip the bonus and resolve the base item (D40).
    const plus = /^\+\d+\s+(.+)$/.exec(ref.name);
    if (r.status === "none" && plus && (key === "Items" || key === "Equipment")) r = index.resolve({ name: plus[1], source: ref.source }, rules, extra);
    if (r.status === "none") add("unresolved", sev, where, `${key}: "${refStr(ref)}" matches nothing in the loaded data`, key, refStr(ref));
    else if (r.status === "ambiguous") add("unresolved", "info", where, `${key}: "${refStr(ref)}" matches several sources; add |SOURCE`, key, refStr(ref));
    else if (r.status === "alias" && r.hit) {
      const full = refStr({ name: r.hit.name, source: r.hit.source });
      const editionNote = rules && r.hit.edition && r.hit.edition !== rules ? ` (${r.hit.edition} edition; paste is ${rules})` : "";
      add("unresolved", "info", where, `${key}: "${refStr(ref)}" resolved as ${full}${editionNote}`, key, refStr(ref));
    }
    return r.hit;
  };
  const uidOf = (t: { name: string; source: string }) => `${t.name}|${t.source}`;

  // ── Classes and timeline ──────────────────────────────────────────────────
  const clsV = paste.header.get("Classes");
  const classEntries = clsV && clsV.type === "classes" ? clsV.entries : [];
  const classData = new Map<string, ClassSlots | null>();   // lc(name) → data
  for (const e of classEntries) classData.set(lc(e.ref.name), resolveRef(ix.classes, e.ref, "Classes", "Classes"));
  for (const lv of paste.levels) if (!classData.has(lc(lv.class.name))) {
    classData.set(lc(lv.class.name), resolveRef(ix.classes, lv.class, `L${lv.n}`, "L"));
    if (classEntries.length) add("misplaced", "warning", `L${lv.n}`, `class "${lv.class.name}" is not listed in Classes`, "L", lv.class.name);
  }
  checkDanglingClassZero();
  const known = classEntries.every((e) => e.levels !== null);
  const played = known ? classEntries.reduce((a, e) => a + (e.levels ?? 0), 0) : null;
  const blockAt = new Map(paste.levels.map((l) => [l.n, l]));
  const classAt: string[] = [];   // index n-1 → lc class name
  {
    const queue = classEntries.flatMap((e) => Array<string>(e.levels ?? 0).fill(lc(e.ref.name)));
    const maxN = Math.max(played ?? 0, ...paste.levels.map((l) => l.n));
    let qi = 0;
    for (let n = 1; n <= maxN; n++) {
      const b = blockAt.get(n);
      if (b) { classAt.push(lc(b.class.name)); if (queue[qi] === lc(b.class.name)) qi++; else if (played !== null && n <= played) { const j = queue.indexOf(lc(b.class.name), qi); if (j >= 0) queue.splice(j, 1); else add("misplaced", "warning", `L${n}`, `Classes does not account for a ${b.class.name} level here`, "L", b.class.name); } }
      else classAt.push(queue[qi++] ?? classAt[classAt.length - 1] ?? "");
    }
  }
  const classLevelAt = (n: number, cls: string) => classAt.slice(0, n).filter((c) => c === cls).length;

  // ── Owed-slot ledger per class ────────────────────────────────────────────
  type Ledger = Map<string, { owed: number; owedPlayed: number; picked: number; dropped: number; where: string[] }>;
  const perClass = new Map<string, Ledger>();
  const ledger = (cls: string): Ledger => { let l = perClass.get(cls); if (!l) { l = new Map(); perClass.set(cls, l); } return l; };
  const slot = (cls: string, key: string): NonNullable<ReturnType<Ledger["get"]>> => { const l = ledger(cls); let s = l.get(key); if (!s) { s = { owed: 0, owedPlayed: 0, picked: 0, dropped: 0, where: [] }; l.set(key, s); } return s; };
  const featureNames = new Map<string, Map<string, { level: number; options: string[] }>>();  // cls → feature → slot
  const expertiseCount = supplement.expertiseCount ?? 2;

  // Subclass per class (placed or unplaced).
  const subclassOf = new Map<string, SubclassSlots | null>();
  const subclassFrom = new Map<string, number>();   // cls → character level the subclass is chosen at (placed only)
  const subclassLines: { item: Item; where: string; cls: string | null; n: number | null }[] = [];
  for (const it of adds(paste.header, "Subclass")) subclassLines.push({ item: it, where: "header", cls: null, n: null });
  for (const lv of paste.levels) for (const it of adds(lv.lines, "Subclass")) subclassLines.push({ item: it, where: `L${lv.n}`, cls: lc(lv.class.name), n: lv.n });
  for (const s of subclassLines) {
    const cand = s.cls ? [s.cls] : [...classData.keys()];
    const hit = resolveRef(ix.subclasses, s.item.ref, s.where, "Subclass", "warning", (t) => cand.includes(lc(t.className)));
    if (!hit) continue;
    const cls = lc(hit.className);
    if (subclassOf.get(cls)) add("extra", "info", s.where, `second subclass "${hit.name}" for ${hit.className} — accepted as an extra`, "Subclass", hit.name);
    subclassOf.set(cls, hit);
    if (s.n !== null) subclassFrom.set(cls, s.n);
    const cd = classData.get(cls);
    if (s.n !== null) { const sl = slot(cls, "Subclass"); sl.picked++; sl.where.push(s.where); }
    if (s.n !== null && cd?.subclassLevel && classLevelAt(s.n, cls) !== cd.subclassLevel) add("misplaced", "warning", s.where, `${hit.className} subclass is chosen at class level ${cd.subclassLevel}, this is class level ${classLevelAt(s.n, cls)}`, "Subclass", hit.name);
    if (s.n === null && classEntries.length > 1 && !s.item.ref.source) add("unplaced", "info", s.where, `"${hit.name}" assigned to ${hit.className}`, "Subclass", hit.name);
  }


  const uptoN = Math.max(played ?? 0, ...paste.levels.map((l) => l.n));
  const owe = (cls: string, key: string, n: number, count: number) => { const s = slot(cls, key); s.owed += count; if (played === null || n <= played) s.owedPlayed += count; };
  for (let n = 1; n <= uptoN; n++) {
    const cls = classAt[n - 1]; if (!cls) continue;
    const cd = classData.get(cls); if (!cd) continue;
    const k = classLevelAt(n, cls);
    const sc = subclassOf.get(cls) ?? null;
    if (k === 1) {
      const sk = n === 1 ? cd.skills : cd.multiclassSkills;
      const cnt = (sk?.choose?.count ?? 0) + (sk?.any ?? 0);
      if (cnt) owe(cls, "Skills", n, cnt);
      if (n === 1 && cd.equipmentOptions.length && rules !== "2014") owe(cls, "Equipment", n, 0); // default A is silent
      if ((cd.masteries && cd.masteries[0]) || cd.hasMastery) owe(cls, "Masteries", n, 1);
    }
    if (cd.subclassLevel === k) owe(cls, "Subclass", n, 1);
    if (cd.asiLevels.includes(k)) owe(cls, "ASI/Feat", n, 1);
    if (cd.expertiseLevels.includes(k)) owe(cls, "Expertise", n, expertiseCount);
    for (const [cat, p] of Object.entries(cd.featProgression)) {
      const d = delta(p.progression, k);
      if (!d) continue;
      if (cat === "FS") owe(cls, "Fighting Style", n, d); else owe(cls, "ASI/Feat", n, d);
    }
    for (const [fam, p] of [...Object.entries(cd.options), ...Object.entries(sc?.options ?? {})]) {
      const d = delta(p.progression, k);
      if (d) owe(cls, fam.startsWith("FS") ? "Fighting Style" : `Options:${fam}`, n, d);
    }
    const cast = cd.casting;
    const scast = sc?.casting;
    const cantrips = delta(cast?.cantrips, k) + delta(scast?.cantrips, k);
    if (cantrips) owe(cls, "Cantrips", n, cantrips);
    const sb = supplement.spellbook?.[uidOf(cd)];
    if (sb) owe(cls, "Spells", n, k === 1 ? sb.first : sb.perLevel);
    else if (cast?.preparedChange === "level") owe(cls, "Spells", n, delta(cast.prepared, k));
    else if (cast?.known) owe(cls, "Spells", n, delta(cast.known, k));
    if (scast) owe(cls, "Spells", n, delta(scast.known, k) + (delta(scast.prepared, k) > 0 && !scast.known ? delta(scast.prepared, k) : 0));
    for (const [name, fs] of [...Object.entries(cd.features), ...Object.entries(sc?.features ?? {})]) {
      if (fs.level !== k) continue;
      slot(cls, `Feature:${lc(name)}`).owed += 1;
      let m = featureNames.get(cls); if (!m) { m = new Map(); featureNames.set(cls, m); } m.set(lc(name), fs);
    }
    for (const [name, fp] of Object.entries(supplement.classFeaturePicks?.[uidOf(cd)] ?? {})) {
      if (fp.levels.includes(k)) owe(cls, fp.key, n, fp.count);
      void name;
    }
  }

  // ── Placed picks ──────────────────────────────────────────────────────────
  const countInto = (cls: string, key: string, scope: Scope, where: string) => {
    const a = adds(scope, key).length, d = drops(scope, key).length;
    if (!a && !d) return;
    const s = slot(cls, key); s.picked += a; s.dropped += d; s.where.push(where);
  };
  const featOrAsi = (scope: Scope) => adds(scope, "Feat").length + (scope.get("ASI") ? 1 : 0);

  for (const lv of paste.levels) {
    const cls = lc(lv.class.name); const where = `L${lv.n}`;
    const cd = classData.get(cls);
    const beyond = played !== null && lv.n > played;
    const fullList = Boolean(cd?.casting && cd.casting.preparedChange === "restLong" && !supplement.spellbook?.[uidOf(cd)]);
    const knownCaster = Boolean(cd?.casting?.known && !supplement.spellbook?.[uidOf(cd)]);
    for (const key of ["Skills", "Tools", "Languages", "Expertise", "Fighting Style", "Cantrips"]) countInto(cls, key, lv.lines, where);
    if (lv.lines.get("Spells") && fullList) add("redundant", "info", where, `${cd?.name} prepares from its whole list; write the default loadout as Prepared, not Spells`, "Spells");
    else countInto(cls, "Spells", lv.lines, where);
    if (lv.lines.get("Prepared") && knownCaster) add("redundant", "info", where, `${cd?.name} knows a fixed list of spells and does not prepare; drop Prepared`, "Prepared");
    if (lv.lines.get("Masteries")) { const s = slot(cls, "Masteries"); s.picked = Math.max(s.picked, 1); s.where.push(where); }
    if (featOrAsi(lv.lines)) { const s = slot(cls, "ASI/Feat"); s.picked += featOrAsi(lv.lines); s.where.push(where); }
    for (const it of items(lv.lines, "Options")) {
      const ocf = Object.entries(cd?.optionalClassFeatures ?? {}).find(([n]) => lc(n) === lc(it.ref.name));
      if (ocf) { add("redundant", "info", where, `"${ocf[0]}" is an optional class feature (${ocf[1].source}); write it as Feature, not Options`, "Options", ocf[0]); continue; }
      const of = resolveRef(ix.options, it.ref, where, "Options");
      const fam = of ? of.types.join("/") : "?";
      const s = slot(cls, fam.startsWith("FS") ? "Fighting Style" : `Options:${fam}`); if (it.drop) s.dropped++; else s.picked++; s.where.push(where);
      if (of?.prereqLevel && classLevelAt(lv.n, cls) < of.prereqLevel && !beyond) add("misplaced", "warning", where, `"${of.name}" needs class level ${of.prereqLevel}`, "Options", of.name);
      const picks = supplement.optionPicks?.[uidOf(of ?? { name: it.ref.name, source: "" })] ?? 0;
      if (of && picks && !it.drop && (it.details[0]?.length ?? 0) < picks) add("missing", "info", where, `"${of.name}" asks for ${picks} pick(s) in brackets`, "Options", of.name);
    }
    for (const it of adds(lv.lines, "Feature")) {
      const ocf = Object.entries(cd?.optionalClassFeatures ?? {}).find(([n]) => lc(n) === lc(it.ref.name));
      if (ocf) { if (ocf[1].level > classLevelAt(lv.n, cls) && !beyond) add("misplaced", "warning", where, `"${ocf[0]}" is available from class level ${ocf[1].level}`, "Feature", ocf[0]); continue; }
      const fs = featureNames.get(cls)?.get(lc(it.ref.name));
      const any = cd ? Object.entries(cd.features).find(([n]) => lc(n) === lc(it.ref.name)) : undefined;
      if (!fs && !any) { add("extra", "info", where, `Feature "${it.ref.name}" is not a pick the data knows for ${cd?.name ?? cls} — accepted`, "Feature", it.ref.name); continue; }
      const s = slot(cls, `Feature:${lc(it.ref.name)}`);
      s.picked++; s.where.push(where);
      if (!fs && any) add("misplaced", "warning", where, `"${it.ref.name}" is chosen at class level ${any[1].level}`, "Feature", it.ref.name);
      if (fs && fs.options.length && it.details[0]?.length && !it.details[0].some((d) => fs.options.some((o) => lc(o) === lc(d.ref.name)))) add("unresolved", "info", where, `"${it.ref.name}" pick "${it.details[0][0].ref.name}" is not one of: ${fs.options.join(", ")}`, "Feature", it.ref.name);
    }
    for (const it of adds(lv.lines, "Feat")) checkFeat(it, where, "L", lv.n, beyond);
    for (const it of adds(lv.lines, "Spells")) checkSpell(it, where, "Spells", cls, lv.n);
    for (const it of adds(lv.lines, "Cantrips")) checkSpell(it, where, "Cantrips", cls, lv.n);
    for (const it of adds(lv.lines, "Prepared")) checkSpell(it, where, "Prepared", cls, lv.n);
    if (lv.lines.get("Prepared") && cd?.casting?.preparedChange === "level" && !supplement.spellbook?.[uidOf(cd)]) add("redundant", "info", where, `${cd.name} picks its prepared spells on level-up; write them as Spells`, "Prepared");
    for (const it of adds(lv.lines, "Items")) resolveRef(ix.items, it.ref, where, "Items", "info");
    for (const it of adds(lv.lines, "Equipment")) if (!/^[A-Z]$/.test(it.ref.name)) resolveRef(ix.items, it.ref, where, "Equipment", "info");
    const letter = adds(lv.lines, "Equipment").find((i) => /^[A-Z]$/.test(i.ref.name));
    if (letter && cd && !cd.equipmentOptions.includes(letter.ref.name.toUpperCase())) add("unresolved", "info", where, `${cd.name} has no starting-equipment option ${letter.ref.name}`, "Equipment", letter.ref.name);
    if (letter && rules === "2014") add("unresolved", "info", where, `starting-equipment letters exist only under 2024 rules`, "Equipment", letter.ref.name);
  }

  // ── Unplaced header picks: distribute to classes that still owe (D28) ─────
  const classNames = [...classData.keys()];
  const distribute = (key: string, ledgerKey: (it: Item) => string, list: Item[]) => {
    for (const it of list) {
      const lk = ledgerKey(it);
      const owing = classNames.filter((c) => { const s = ledger(c).get(lk); return s && s.owed > s.picked; });
      const target = owing[0] ?? classNames.find((c) => ledger(c).has(lk)) ?? classNames[0];
      if (!target) { add("extra", "info", "header", `${key} "${it.ref.name}" with no class to own it — accepted`, key, it.ref.name); continue; }
      if (owing.length > 1) add("unplaced", "info", "header", `${key} "${it.ref.name}" could belong to ${owing.map((c) => classData.get(c)?.name ?? c).join(" or ")}; assigned to ${classData.get(target)?.name ?? target}`, key, it.ref.name);
      const s = slot(target, lk); s.picked++; s.where.push("header");
    }
  };
  for (const key of ["Skills", "Tools", "Languages", "Expertise", "Fighting Style", "Cantrips", "Spells", "Prepared"]) distribute(key, () => key, adds(paste.header, key));
  if (paste.header.get("Masteries")) distribute("Masteries", () => "Masteries", [{ ref: { name: "Masteries", source: null }, drop: false, details: [], qty: null }]);
  distribute("Feat", () => "ASI/Feat", adds(paste.header, "Feat"));
  if (paste.header.get("ASI")) distribute("ASI", () => "ASI/Feat", [{ ref: { name: "ASI", source: null }, drop: false, details: [], qty: null }]);
  distribute("Options", (it) => { const of = resolveRef(ix.options, it.ref, "header", "Options"); return `Options:${of ? of.types.join("/") : "?"}`; }, adds(paste.header, "Options"));
  for (const it of adds(paste.header, "Feature")) {
    const owner = classNames.find((c) => Object.keys(classData.get(c)?.features ?? {}).some((n) => lc(n) === lc(it.ref.name)));
    if (owner) { const s = slot(owner, `Feature:${lc(it.ref.name)}`); s.picked++; s.where.push("header"); continue; }
    add("unplaced", "info", "header", `Feature "${it.ref.name}" has no class that asks for it; a species, subclass or homebrew pick — accepted`, "Feature", it.ref.name);
  }
  for (const it of adds(paste.header, "Feat")) checkFeat(it, "header", "H", null, false);
  for (const it of adds(paste.header, "Spells")) checkSpell(it, "header", "Spells", null);
  for (const it of adds(paste.header, "Cantrips")) checkSpell(it, "header", "Cantrips", null);
  for (const it of adds(paste.header, "Items")) resolveRef(ix.items, it.ref, "header", "Items", "info");
  for (const it of adds(paste.header, "Equipment")) resolveRef(ix.items, it.ref, "header", "Equipment", "info");
  for (const s of subclassLines) if (s.n === null) { const cls = subclassOf.size ? [...subclassOf.entries()].find(([, v]) => v && lc(v.name) === lc(s.item.ref.name) || (v && lc(v.shortName) === lc(s.item.ref.name)))?.[0] : undefined; if (cls) { const sl = slot(cls, "Subclass"); sl.picked++; sl.where.push("header"); } }

  // ── Ledger → findings ─────────────────────────────────────────────────────
  for (const [cls, l] of perClass) {
    const cname = classData.get(cls)?.name ?? cls;
    for (const [key, s] of l) {
      const label = key.startsWith("Options:") ? `${slots.families[key.slice(8)] ?? key.slice(8)}` : key.startsWith("Feature:") ? `Feature "${key.slice(8)}"` : key;
      const allowed = s.owed + s.dropped;
      if (s.picked < s.owedPlayed) add("missing", "warning", cname, `${cname} owes ${s.owedPlayed - s.picked} more ${label} pick(s)`, key);
      if (s.picked > allowed) add("extra", "info", s.where.join(", ") || cname, `${cname}: ${s.picked - allowed} ${label} pick(s) beyond what the rules grant — accepted (DM boon?)`, key);
    }
  }

  // ── Species block ─────────────────────────────────────────────────────────
  const sp = paste.entities.find((e) => e.key === "Species");
  if (sp) {
    const where = "Species";
    const sd = resolveRef(ix.species, sp.item.ref, where, "Species");
    if (sd) {
      const owe = (key: string, n: number, sev: "warning" | "info" = "warning", what = key) => {
        const got = key === "ASI" ? (sp.lines.get("ASI") ? 1 : 0) : adds(sp.lines, key).length;
        if (got < n) add("missing", sev, where, `${sd.name} asks for ${n - got} more ${what} pick(s)`, key);
        if (got > n && key !== "ASI") add("extra", "info", where, `${sd.name}: ${got - n} ${what} pick(s) beyond what the species grants — accepted`, key);
      };
      owe("Skills", (sd.skills?.choose?.count ?? 0) + (sd.skills?.any ?? 0));
      owe("Tools", (sd.tools?.choose?.count ?? 0) + (sd.tools?.any ?? 0));
      owe("Languages", (sd.languages?.choose?.count ?? 0) + (sd.languages?.any ?? 0));
      owe("Feat", sd.feats.reduce((a, f) => a + (f.count ?? 0), 0));
      if (sd.spellAbility) owe("Ability", 1, "info", "casting-ability");
      if (sd.cantripChoose) owe("Cantrips", sd.cantripChoose, "info");
      if (sd.ability && rules !== "2024") owe("ASI", 1, "info", "ability-bonus");
      const trait = supplement.lineageTrait?.[uidOf(sd)] ?? (sd.versions.length ? `${sd.name} Lineage` : null);
      const feats = adds(sp.lines, "Feature");
      const extraFeatures = new Set(Object.keys(supplement.speciesFeatures?.[uidOf(sd)] ?? {}).map(lc));
      if (trait) {
        const f = feats.find((x) => lc(x.ref.name) === lc(trait)) ?? feats.find((x) => x.details[0]?.length && sd.versions.some((v) => looseEq(v, x.details[0][0].ref.name)));
        if (f) extraFeatures.add(lc(f.ref.name));
        if (!f) add("missing", "warning", where, `${sd.name} asks for a Feature: ${trait} [${sd.versions.join(" | ")}]`, "Feature", trait);
        else if (f.details[0]?.length && sd.versions.length && !sd.versions.some((v) => looseEq(v, f.details[0][0].ref.name))) add("unresolved", "info", where, `"${trait}" pick "${f.details[0][0].ref.name}" is not one of: ${sd.versions.join(", ")}`, "Feature", trait);
        extraFeatures.add(lc(trait));
      }
      // Size: Medium is the silent default (D39); only an invalid explicit pick is reported.
      const sizeLine = feats.find((x) => lc(x.ref.name) === "size");
      if (sizeLine && sd.size && sizeLine.details[0]?.length && !sd.size.some((s) => lc(s) === lc(sizeLine.details[0][0].ref.name[0]))) add("unresolved", "info", where, `${sd.name} size must be one of ${sd.size.join("/")}`, "Feature", "Size");
      extraFeatures.add("size");
      for (const f of feats) if (!extraFeatures.has(lc(f.ref.name))) add("extra", "info", where, `Feature "${f.ref.name}" is not a pick the data knows for ${sd.name} — accepted`, "Feature", f.ref.name);
      for (const it of adds(sp.lines, "Feat")) checkFeat(it, where, "S", null, false);
      for (const it of [...adds(sp.lines, "Cantrips"), ...adds(sp.lines, "Spells")]) if (sd.grantedSpells.some((g) => lc(g) === lc(it.ref.name))) add("redundant", "info", where, `"${it.ref.name}" is granted by ${sd.name}, not chosen`, "Spells", it.ref.name);
    }
  }

  // ── Background block ──────────────────────────────────────────────────────
  const bg = paste.entities.find((e) => e.key === "Background");
  if (bg) {
    const where = "Background";
    const custom = lc(bg.item.ref.name) === "custom";
    const bd = custom ? null : resolveRef(ix.backgrounds, bg.item.ref, where, "Background", "info");
    if (bd) {
      const asi = bg.lines.get("ASI");
      if (bd.ability?.choose) {
        if (!asi) add("missing", "warning", where, `${bd.name} asks for ability bonuses (+2/+1 or +1/+1/+1 from ${bd.ability.choose.from.map((a) => a.toUpperCase()).join(", ")})`, "ASI");
        else if (asi.type === "asi") {
          const total = asi.bonuses.reduce((a, b) => a + b.amount, 0);
          const from = bd.ability.choose.from.map((a) => a.toUpperCase());
          if (total !== 3 || asi.bonuses.some((b) => !from.includes(b.ability))) add("unresolved", "info", where, `${bd.name} bonuses should total +3 from ${from.join(", ")}`, "ASI");
        }
      }
      for (const key of ["Skills", "Tools", "Languages"] as const) {
        const spec = key === "Skills" ? bd.skills : key === "Tools" ? bd.tools : bd.languages;
        const owed = (spec?.choose?.count ?? 0) + (spec?.any ?? 0);
        for (const it of adds(bg.lines, key)) if (spec?.fixed.some((f) => lc(f) === lc(it.ref.name))) add("redundant", "info", where, `${key} "${it.ref.name}" is granted by ${bd.name}, not chosen`, key, it.ref.name);
        const got = adds(bg.lines, key).filter((it) => !spec?.fixed.some((f) => lc(f) === lc(it.ref.name))).length;
        if (got < owed) add("missing", "warning", where, `${bd.name} asks for ${owed - got} more ${key} pick(s)`, key);
        if (got > owed) add("extra", "info", where, `${bd.name}: ${got - owed} ${key} pick(s) beyond what it grants — accepted`, key);
      }
      for (const it of adds(bg.lines, "Feat")) {
        if (bd.feats.some((f) => lc(f).split(";")[0].trim() === lc(it.ref.name))) add("redundant", "info", where, `Feat "${it.ref.name}" is granted by ${bd.name}, not chosen`, "Feat", it.ref.name);
        else add("extra", "info", where, `Feat "${it.ref.name}" is not granted by ${bd.name} — accepted`, "Feat", it.ref.name);
      }
      const letter = adds(bg.lines, "Equipment").find((i) => /^[A-Z]$/.test(i.ref.name));
      if (letter && !bd.equipmentOptions.includes(letter.ref.name.toUpperCase())) add("unresolved", "info", where, `${bd.name} has no starting-equipment option ${letter.ref.name}`, "Equipment", letter.ref.name);
    } else {
      // custom or homebrew: fully specified by the block; only resolve feats.
      for (const it of adds(bg.lines, "Feat")) checkFeat(it, where, "B", null, false);
      if (custom && rules !== "2014" && !bg.lines.get("ASI")) add("missing", "warning", where, "a custom background states its ability bonuses (ASI)", "ASI");
    }
  }

  const seen = new Set<string>();
  return F.filter((f) => { const k = `${f.kind}|${f.where}|${f.message}`; if (seen.has(k)) return false; seen.add(k); return true; });

  // ── D42: dangling `Class 0` ────────────────────────────────────────────────
  // A `Classes` entry with level 0 and no level block for that class declares nothing yet — it
  // stays legal (planned multiclass slot) and normalise must not touch it; just flag it at info.
  function checkDanglingClassZero() {
    for (const e of classEntries) {
      if (e.levels !== 0) continue;
      if (paste.levels.some((lv) => lc(lv.class.name) === lc(e.ref.name))) continue;
      add("unplaced", "info", "header", `${e.ref.name} 0 declares nothing`, "Classes", e.ref.name);
    }
  }

  // ── shared checks ─────────────────────────────────────────────────────────
  function checkFeat(it: Item, where: string, scope: "H" | "S" | "B" | "L", n: number | null, beyond: boolean) {
    const fd = resolveRef(ix.feats, it.ref, where, "Feat");
    if (!fd) return;
    const slot0 = it.details[0] ?? [];
    if (fd.abilityChoose && !slot0.length) add("missing", "info", where, `"${fd.name}" asks for an ability pick in its first bracket slot`, "Feat", fd.name);
    if (fd.abilityChoose && slot0.length && !fd.abilityChoose.some((a) => lc(a) === lc(slot0[0].ref.name))) add("unresolved", "info", where, `"${fd.name}" ability must be one of ${fd.abilityChoose.map((a) => a.toUpperCase()).join(", ")}`, "Feat", fd.name);
    if (fd.versions.length && !(it.details[1]?.length)) add("missing", "info", where, `"${fd.name}" asks for a version in its second slot: ${fd.versions.join(", ")}`, "Feat", fd.name);
    if (fd.category === "O" && scope === "L") add("misplaced", "warning", where, `"${fd.name}" is an Origin feat; an ASI-slot feat must be General`, "Feat", fd.name);
    if (fd.category === "G" && (scope === "S" || scope === "B")) add("misplaced", "warning", where, `"${fd.name}" is a General feat; a species or background grants an Origin feat`, "Feat", fd.name);
    if (fd.prereqLevel && n !== null && n < fd.prereqLevel && !beyond) add("misplaced", "warning", where, `"${fd.name}" needs character level ${fd.prereqLevel}`, "Feat", fd.name);
  }
  function checkSpell(it: Item, where: string, key: string, cls: string | null, n: number | null = null) {
    resolveRef(ix.spells, it.ref, where, key);
    const from = cls ? subclassFrom.get(cls) : undefined;
    if (n !== null && from !== undefined && n < from) return;
    const sc = cls ? subclassOf.get(cls) : null;
    if (sc && sc.grantedSpells.some((g) => lc(g) === lc(it.ref.name))) add("redundant", "info", where, `"${it.ref.name}" is always prepared via ${sc.name}, not chosen`, key, it.ref.name);
  }
}

// ─── normalise: data-aware fold, returns a new Paste ────────────────────────

export function normalise(paste: Paste, slots: Slots, supplement: Supplement = {}): Paste {
  const findings = check(paste, slots, supplement);
  const out: Paste = {
    identifier: paste.identifier,
    header: new Map(paste.header),
    entities: paste.entities.map((e) => ({ ...e, lines: new Map(e.lines) })),
    levels: paste.levels.map((l) => ({ ...l, lines: new Map(l.lines) })),
    diagnostics: [...paste.diagnostics],
  };
  const redundant = findings.filter((f) => f.kind === "redundant");
  const scopeFor = (where: string): Scope | null => {
    if (where === "header") return out.header;
    if (where === "Species" || where === "Background") return out.entities.find((e) => e.key === where)?.lines ?? null;
    const m = /^L(\d+)$/.exec(where);
    return m ? out.levels.find((l) => l.n === Number(m[1]))?.lines ?? null : null;
  };
  for (const f of redundant) {
    const scope = scopeFor(f.where); if (!scope || !f.key) continue;
    if (f.key === "Prepared" && !f.ref) { scope.delete("Prepared"); continue; }
    const v = scope.get(f.key);
    if (!v || v.type !== "items" || !f.ref) continue;
    const kept = v.items.filter((i) => lc(i.ref.name) !== lc(f.ref as string));
    if (kept.length) scope.set(f.key, { type: "items", items: kept } as Value); else scope.delete(f.key);
  }
  return out;
}

export type { Paste, LevelBlock };

#!/usr/bin/env node
// Run parser + emitter + checker over stress/pastes/*.dndpaste → stress/results.json + stress/results.md
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse, emit, isClean } from "../dist/src/dndpaste.js";
import { check } from "../dist/src/check.js";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "stress", "pastes");
const slotsPath = existsSync(join(root, "data", "slots.json")) ? join(root, "data", "slots.json") : join(root, "data", "srd", "slots.json");
const slots = JSON.parse(readFileSync(slotsPath, "utf8"));
const supplement = JSON.parse(readFileSync(join(root, "data", "supplement.json"), "utf8"));

const results = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".dndpaste")).sort()) {
  const text = readFileSync(join(dir, f), "utf8");
  const p = parse(text);
  const errors = p.diagnostics.filter((d) => d.code.startsWith("E"));
  const warnings = p.diagnostics.filter((d) => d.code.startsWith("W"));
  let canonical = null, roundTrip = null, findings = [];
  if (isClean(p)) {
    canonical = emit(p);
    roundTrip = emit(parse(canonical)) === canonical;
    try { findings = check(p, slots, supplement); } catch (e) { findings = [{ kind: "CRASH", severity: "warning", where: "checker", message: String(e && e.stack || e) }]; }
  }
  results.push({ file: f, lines: text.split("\n").length, errors, warnings, canonicalEqualsInput: canonical === text, roundTrip, findings });
}
writeFileSync(join(root, "stress", "results.json"), JSON.stringify(results, null, 1));

const md = [`# Stress run — ${new Date().toISOString().slice(0, 10)} — ${results.length} pastes, slots: ${slotsPath.includes("srd") ? "SRD" : "full"}\n`];
const tot = { errors: 0, crash: 0, warn: 0, info: 0 };
for (const r of results) {
  tot.errors += r.errors.length;
  const w = r.findings.filter((x) => x.severity === "warning").length, i = r.findings.filter((x) => x.severity === "info").length;
  tot.warn += w; tot.info += i; if (r.findings.some((x) => x.kind === "CRASH")) tot.crash++;
  md.push(`## ${r.file}  — parse errors ${r.errors.length} · canonical ${r.canonicalEqualsInput ? "=" : "≠"} input · round-trip ${r.roundTrip} · findings ${w}W/${i}I`);
  for (const e of r.errors) md.push(`- ❌ E ${e.code} L${e.line}: ${e.message}`);
  for (const e of r.warnings) md.push(`- ⚠ ${e.code} L${e.line}: ${e.message}`);
  for (const x of r.findings) md.push(`- ${x.severity === "warning" ? "⚠" : "ℹ"} ${x.kind} [${x.where}] ${x.message}`);
  md.push("");
}
md.unshift(`Totals: parse errors ${tot.errors} · checker crashes ${tot.crash} · warnings ${tot.warn} · infos ${tot.info}\n`);
writeFileSync(join(root, "stress", "results.md"), md.join("\n"));
console.log(md[0]);

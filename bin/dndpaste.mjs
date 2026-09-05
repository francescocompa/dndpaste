#!/usr/bin/env node
// dndpaste CLI — check / emit / normalise a .dndpaste file.
// ESM, Node >= 20, zero dependencies. Imports the built library from dist/.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, emit, isClean } from "../dist/src/dndpaste.js";
import { check, normalise } from "../dist/src/check.js";

const root = fileURLToPath(new URL("..", import.meta.url));

const USAGE = `dndpaste — plain-text D&D 5e build parser/checker

Usage:
  dndpaste check <file|-> [--json] [--info] [--slots <path>]
  dndpaste emit <file|->
  dndpaste normalise <file|-> [--slots <path>]
  dndpaste --help

Commands:
  check        Parse and check a paste; prints diagnostics then findings.
  emit         Print the canonical text for a paste (exit 1 on grammar errors).
  normalise    Print the canonical text after checker normalisation.

Options:
  --json       Machine-readable output for \`check\` (full diagnostics + findings).
  --info       Also print info-level findings (hidden by default).
  --slots      Path to a slots.json. Defaults to data/slots.json, falling back
               to data/srd/slots.json, both relative to the package root.
  --help, -h   Show this help.

Exit codes:
  0  clean (no errors, no warnings)
  1  parse errors and/or warnings (check: including warning-level findings)
  2  usage error (bad arguments, missing/unreadable file)
`;

function printUsage(stream) {
  stream.write(USAGE);
}

function readInput(file) {
  if (file === "-") return readFileSync(0, "utf8");
  return readFileSync(file, "utf8");
}

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveSlotsPath(override) {
  if (override) return override;
  const full = join(root, "data", "slots.json");
  if (existsSync(full)) return full;
  return join(root, "data", "srd", "slots.json");
}

function loadSlotsAndSupplement(slotsOverride) {
  const slotsPath = resolveSlotsPath(slotsOverride);
  const slots = loadJSON(slotsPath);
  const supplementPath = join(root, "data", "supplement.json");
  const supplement = existsSync(supplementPath) ? loadJSON(supplementPath) : {};
  return { slots, supplement };
}

const SEV_RANK = { error: 0, warning: 1, info: 2 };

function locKey(where) {
  const m = /^L(\d+)/.exec(where);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

function sortRows(rows) {
  return rows
    .map((r, i) => ({ ...r, i }))
    .sort(
      (a, b) =>
        SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
        locKey(a.where) - locKey(b.where) ||
        a.where.localeCompare(b.where) ||
        a.i - b.i,
    );
}

function diagnosticRows(diagnostics) {
  return diagnostics.map((d) => ({
    severity: d.code.startsWith("E") ? "error" : "warning",
    kind: d.code,
    where: `L${d.line}`,
    message: d.message,
  }));
}

function findingRows(findings) {
  return findings.map((f) => ({ severity: f.severity, kind: f.kind, where: f.where, message: f.message }));
}

function cmdCheck(file, { json, info, slotsOverride }) {
  let text;
  try {
    text = readInput(file);
  } catch (e) {
    console.error(`dndpaste: cannot read ${file}: ${e.message}`);
    process.exit(2);
  }

  const p = parse(text);
  let findings = [];
  if (isClean(p)) {
    let slots, supplement;
    try {
      ({ slots, supplement } = loadSlotsAndSupplement(slotsOverride));
    } catch (e) {
      console.error(`dndpaste: cannot load slot data: ${e.message}`);
      process.exit(2);
    }
    try {
      findings = check(p, slots, supplement);
    } catch (e) {
      findings = [{ kind: "unresolved", severity: "warning", where: "checker", message: `checker crashed: ${(e && e.stack) || e}` }];
    }
  }

  const hasErrorOrWarning =
    p.diagnostics.length > 0 || findings.some((f) => f.severity === "warning");

  if (json) {
    console.log(JSON.stringify({ diagnostics: p.diagnostics, findings }, null, 2));
    process.exit(hasErrorOrWarning ? 1 : 0);
  }

  const rows = [...diagnosticRows(p.diagnostics), ...findingRows(findings)].filter(
    (r) => info || r.severity !== "info",
  );
  for (const r of sortRows(rows)) {
    console.log(`${r.severity} ${r.kind} ${r.where}: ${r.message}`);
  }
  process.exit(hasErrorOrWarning ? 1 : 0);
}

function cmdEmit(file) {
  let text;
  try {
    text = readInput(file);
  } catch (e) {
    console.error(`dndpaste: cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const p = parse(text);
  if (!isClean(p)) {
    for (const d of p.diagnostics.filter((d) => d.code.startsWith("E"))) {
      console.error(`error ${d.code} L${d.line}: ${d.message}`);
    }
    process.exit(1);
  }
  process.stdout.write(emit(p));
  process.exit(0);
}

function cmdNormalise(file, { slotsOverride }) {
  let text;
  try {
    text = readInput(file);
  } catch (e) {
    console.error(`dndpaste: cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const p = parse(text);
  if (!isClean(p)) {
    for (const d of p.diagnostics.filter((d) => d.code.startsWith("E"))) {
      console.error(`error ${d.code} L${d.line}: ${d.message}`);
    }
    process.exit(1);
  }
  let slots, supplement;
  try {
    ({ slots, supplement } = loadSlotsAndSupplement(slotsOverride));
  } catch (e) {
    console.error(`dndpaste: cannot load slot data: ${e.message}`);
    process.exit(2);
  }
  process.stdout.write(emit(normalise(p, slots, supplement)));
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage(process.stderr);
    process.exit(2);
  }
  if (args[0] === "--help" || args[0] === "-h") {
    printUsage(process.stdout);
    process.exit(0);
  }

  const cmd = args[0];
  if (!["check", "emit", "normalise"].includes(cmd)) {
    console.error(`dndpaste: unknown command "${cmd}"\n`);
    printUsage(process.stderr);
    process.exit(2);
  }

  const rest = args.slice(1);
  let file = null;
  let json = false;
  let info = false;
  let slotsOverride = null;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--json") json = true;
    else if (a === "--info") info = true;
    else if (a === "--slots") slotsOverride = rest[++i];
    else if (a === "--help" || a === "-h") {
      printUsage(process.stdout);
      process.exit(0);
    } else if (file === null) file = a;
    else {
      console.error(`dndpaste: unexpected argument "${a}"\n`);
      printUsage(process.stderr);
      process.exit(2);
    }
  }

  if (!file) {
    console.error(`dndpaste: missing <file> argument\n`);
    printUsage(process.stderr);
    process.exit(2);
  }

  if (cmd === "check") cmdCheck(file, { json, info, slotsOverride });
  else if (cmd === "emit") cmdEmit(file);
  else cmdNormalise(file, { slotsOverride });
}

main();

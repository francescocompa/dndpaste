import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cli = join(root, "bin", "dndpaste.mjs");
const fixturesDir = join(root, "fixtures");
const fixtureFiles = readdirSync(fixturesDir).filter((n) => n.endsWith(".dndpaste"));

function run(args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

// A `check` line looks like "severity kind where: message" — one word for severity/kind, no colon before ": ".
const LINE_RE = /^(error|warning|info) \S+ [^:]+: .+$/;

test("no arguments prints usage to stderr and exits 2", () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage:/);
  assert.equal(r.stdout, "");
});

test("--help prints usage to stdout and exits 0", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage:/);
  const r2 = run(["-h"]);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /Usage:/);
});

test("unknown command exits 2 with usage on stderr", () => {
  const r = run(["frobnicate", "somefile"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown command/);
});

test("missing file argument exits 2", () => {
  const r = run(["check"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /missing <file>/);
});

test("--slots as the last argument exits 2 instead of silently defaulting", () => {
  const r = run(["check", join(fixturesDir, fixtureFiles[0]), "--slots"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--slots needs a path/);
  const r2 = run(["normalise", join(fixturesDir, fixtureFiles[0]), "--slots", "--json"]);
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /--slots needs a path/);
});

test("check on a nonexistent file exits 2, not a crash", () => {
  const r = run(["check", join(fixturesDir, "does-not-exist.dndpaste")]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cannot read/);
});

test("check: every fixture parses with no grammar errors under the SRD table, and exit code matches printed output", () => {
  for (const f of fixtureFiles) {
    const path = join(fixturesDir, f);
    const r = run(["check", path]);
    // No crash — exit 0 (clean) or 1 (findings/diagnostics present), never a usage/IO failure.
    assert.ok(r.status === 0 || r.status === 1, `${f}: unexpected exit ${r.status}\n${r.stderr}`);
    const lines = r.stdout.split("\n").filter((l) => l.length > 0);
    for (const line of lines) assert.match(line, LINE_RE, `${f}: malformed line "${line}"`);
    // Fixtures are hand-canonicalised: the grammar itself must always be clean (no "error" lines).
    assert.ok(lines.every((l) => !l.startsWith("error ")), `${f}: unexpected grammar error\n${lines.join("\n")}`);
    // Exit-code contract: 1 iff something was printed (info is hidden by default and never drives exit 1,
    // so with info hidden, "printed" and "has an error/warning" coincide).
    assert.equal(r.status === 1, lines.length > 0, `${f}: exit code disagrees with printed output`);
  }
});

test("check --json: every fixture yields valid JSON with no grammar-error diagnostics", () => {
  for (const f of fixtureFiles) {
    const path = join(fixturesDir, f);
    const r = run(["check", path, "--json"]);
    assert.ok(r.status === 0 || r.status === 1, `${f}: unexpected exit ${r.status}`);
    const out = JSON.parse(r.stdout) as { diagnostics: { code: string }[]; findings: { severity: string }[] };
    assert.ok(Array.isArray(out.diagnostics) && Array.isArray(out.findings), f);
    assert.ok(out.diagnostics.every((d) => !d.code.startsWith("E")), `${f}: grammar error in JSON output`);
  }
});

test("check --info shows at least as many lines as without it", () => {
  const path = join(fixturesDir, fixtureFiles[0]);
  const withoutInfo = run(["check", path]).stdout.split("\n").filter((l) => l.length > 0);
  const withInfo = run(["check", path, "--info"]).stdout.split("\n").filter((l) => l.length > 0);
  assert.ok(withInfo.length >= withoutInfo.length);
});

test("emit round-trips a canonical fixture byte-for-byte", () => {
  const path = join(fixturesDir, "vice.dndpaste");
  const original = readFileSync(path, "utf8");
  const r = run(["emit", path]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, original);
});

test("emit reads from stdin with -", () => {
  const path = join(fixturesDir, "vice.dndpaste");
  const original = readFileSync(path, "utf8");
  const r = spawnSync(process.execPath, [cli, "emit", "-"], { encoding: "utf8", input: original });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, original);
});

test("normalise produces the same canonical text as emit for an already-canonical fixture", () => {
  const path = join(fixturesDir, "st-quoting.dndpaste");
  const emitted = run(["emit", path]);
  const normalised = run(["normalise", path]);
  assert.equal(emitted.status, 0);
  assert.equal(normalised.status, 0);
  assert.equal(normalised.stdout, emitted.stdout);
});

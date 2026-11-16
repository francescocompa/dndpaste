// IP gate (SITE.md "IP", D9, D45): nothing from data/, the checker or any 5etools file may ship.
// Bundles the Worker as wrangler would (esbuild), and the client bundle as scripts/build-client.mjs does, then fails on:
//   - any bundled input under data/, a slots table, the SRD subset, src/check.ts, or a path naming 5etools;
//   - 5etools markers in the Worker bundle or any file under public/ ({@tag …} inline tags, "_meta" headers);
//   - any data file (.json) in public/, or a bundle large enough to be carrying data.
import { build } from "esbuild";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { CLIENTS, esbuildOptions } from "./build-client.mjs";

const site = fileURLToPath(new URL("..", import.meta.url));
const problems = [];

const res = await build({
  entryPoints: [join(site, "src/worker.ts")], bundle: true, format: "esm", platform: "neutral",
  write: false, metafile: true, logLevel: "silent",
});
const clients = await Promise.all(CLIENTS.map(async (c) => ({ out: c.out, res: await build({ ...esbuildOptions(c), write: false, metafile: true, logLevel: "silent" }) })));
const inputs = Object.keys(res.metafile.inputs);
const clientInputs = [...new Set(clients.flatMap((c) => Object.keys(c.res.metafile.inputs)))];
const BANNED_INPUT = /(^|\/)data\/|slots\.json|(^|\/)srd\/|(^|\/)src\/check\.ts$|5etools/i;
for (const i of inputs) if (BANNED_INPUT.test(i)) problems.push(`bundle input not allowed: ${i}`);
for (const i of clientInputs) if (BANNED_INPUT.test(i)) problems.push(`client bundle input not allowed: ${i}`);

const MARKERS = [/\{@[a-z]+ /i, /"_meta"\s*:/, /"entries"\s*:\s*\[/];
const scan = (name, text) => { for (const m of MARKERS) if (m.test(text)) problems.push(`5etools marker ${m} in ${name}`); };
const out = res.outputFiles[0].text;
scan("the Worker bundle", out);
if (out.length > 400_000) problems.push(`the Worker bundle is ${out.length} bytes; it should be well under 400 KB`);
const sizes = [];
for (const c of clients) {
  const cout = c.res.outputFiles[0].text;
  scan(`the client bundle ${c.out}`, cout);
  if (cout.length > 150_000) problems.push(`the client bundle ${c.out} is ${cout.length} bytes; it should be well under 150 KB`);
  sizes.push(`${c.out} ${cout.length} bytes`);
}

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(join(site, "public"))) {
  const rel = relative(site, f);
  if (/\.json$/i.test(f) || BANNED_INPUT.test(rel.replace(/^public\//, ""))) problems.push(`file not allowed in public/: ${rel}`);
  if (/\.(css|js|svg|html|txt|_headers)$|_headers$/.test(f)) scan(rel, readFileSync(f, "utf8"));
}

if (problems.length) {
  console.error("check:bundle FAILED\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`check:bundle ok: Worker ${inputs.length} inputs (${inputs.join(", ")}), ${out.length} bytes; client ${clientInputs.length} inputs (${sizes.join(", ")}); no data or 5etools content`);

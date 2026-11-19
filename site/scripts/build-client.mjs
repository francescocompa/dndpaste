// The client build: bundles the browser modules (src/client/, with the library and the shared renderer they
// import) into public/assets/, served under CSP script-src 'self'. Run by `npm run build`, and by wrangler before
// `dev` and `deploy` ([build] in wrangler.toml). The output is not committed.
//   form.js  ESM module, the paste form only (slice 2).
//   site.js  classic script, every page, loaded in <head> without defer: it sets the theme and the colour switches
//            before the first paint (no flash), then wires the header, the Display menu and the view page (slice 3).
//   share.js ESM module, the share image (D119): site.js imports it the first time a reader opens Share.
//   names.js ESM module, the autocomplete's SRD names (D158): form.js imports it the first time the editor gets focus.
// First it writes the build stamp, src/build.gen.ts (scripts/stamp.mjs), which the Worker and site.js import.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { writeStamp } from "./stamp.mjs";

const site = fileURLToPath(new URL("..", import.meta.url));
const base = { bundle: true, platform: "browser", target: ["es2020"], minify: true, legalComments: "none", logLevel: "error" };
/** One esbuild config per output file; `out` is the path under public/assets/. */
export const CLIENTS = [
  { ...base, entryPoints: [join(site, "src/client/form.ts")], format: "esm", out: "form.js" },
  { ...base, entryPoints: [join(site, "src/client/site.ts")], format: "iife", out: "site.js" },
  { ...base, entryPoints: [join(site, "src/client/share.ts")], format: "esm", out: "share.js" },
  { ...base, entryPoints: [join(site, "src/names.gen.ts")], format: "esm", out: "names.js" },
];
const opts = ({ out, ...o }) => o;
export { opts as esbuildOptions };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = writeStamp();
  console.log(`build-client: src/build.gen.ts, ${s.version} · ${s.commit}`);
  for (const c of CLIENTS) {
    const res = await build({ ...opts(c), outfile: join(site, "public/assets", c.out), metafile: true });
    const out = Object.values(res.metafile.outputs)[0];
    console.log(`build-client: public/assets/${c.out}, ${out.bytes} bytes from ${Object.keys(res.metafile.inputs).length} inputs`);
  }
}

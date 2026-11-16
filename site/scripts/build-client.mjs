// The client build: bundles the browser modules (src/client/, with the library and the shared renderer they
// import) into public/assets/, served under CSP script-src 'self'. Run by `npm run build`, and by wrangler before
// `dev` and `deploy` ([build] in wrangler.toml). The output is not committed.
//   form.js  ESM module, the paste form only (slice 2).
//   site.js  classic script, every page, loaded in <head> without defer: it sets the theme and the colour switches
//            before the first paint (no flash), then wires the header, the Display menu and the view page (slice 3).
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const site = fileURLToPath(new URL("..", import.meta.url));
const base = { bundle: true, platform: "browser", target: ["es2020"], minify: true, legalComments: "none", logLevel: "error" };
/** One esbuild config per output file; `out` is the path under public/assets/. */
export const CLIENTS = [
  { ...base, entryPoints: [join(site, "src/client/form.ts")], format: "esm", out: "form.js" },
  { ...base, entryPoints: [join(site, "src/client/site.ts")], format: "iife", out: "site.js" },
];
const opts = ({ out, ...o }) => o;
export { opts as esbuildOptions };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const c of CLIENTS) {
    const res = await build({ ...opts(c), outfile: join(site, "public/assets", c.out), metafile: true });
    const out = Object.values(res.metafile.outputs)[0];
    console.log(`build-client: public/assets/${c.out}, ${out.bytes} bytes from ${Object.keys(res.metafile.inputs).length} inputs`);
  }
}

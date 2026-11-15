// The client build: bundles the browser modules (src/client/, with the library and the shared renderer they
// import) into public/assets/form.js, one ESM file served under CSP script-src 'self'. Run by `npm run build`,
// and by wrangler before `dev` and `deploy` ([build] in wrangler.toml). The output is not committed.
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const site = fileURLToPath(new URL("..", import.meta.url));
export const CLIENT = {
  entryPoints: [join(site, "src/client/form.ts")], bundle: true, format: "esm", platform: "browser",
  target: ["es2020"], minify: true, legalComments: "none", logLevel: "error",
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = await build({ ...CLIENT, outfile: join(site, "public/assets/form.js"), metafile: true });
  const out = Object.values(res.metafile.outputs)[0];
  console.log(`build-client: public/assets/form.js, ${out.bytes} bytes from ${Object.keys(res.metafile.inputs).length} inputs`);
}

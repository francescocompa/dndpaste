// Derive dist/dndpaste.umd.cjs from the compiled single-file ESM build.
// The library is one module with no imports, so the transform is textual:
// strip `export` keywords, collect the exported names, wrap in a UMD shell.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Both modules are concatenated: check.js imports only types from dndpaste.js, so nothing survives at runtime.
const src = ["dndpaste.js", "check.js"].map((f) => readFileSync(new URL(`../dist/src/${f}`, import.meta.url), "utf8")).join("\n");
if (/^\s*import\s/m.test(src)) throw new Error("library modules must stay import-free for the UMD build");

const names = new Set();
for (const m of src.matchAll(/^export\s+(?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
const body = src
  .replace(/^export\s+(?=(?:const|function|class|let|var)\s)/gm, "")
  .replace(/^export\s+type\s.*$/gm, "")
  .replace(/^export\s*\{[^}]*\};?\s*$/gm, "")
  .replace(/^\/\/# sourceMappingURL=.*$/gm, "");

const out = `(function (root, factory) {
  if (typeof define === "function" && define.amd) define([], factory);
  else if (typeof module === "object" && module.exports) module.exports = factory();
  else root.dndpaste = factory();
})(typeof self !== "undefined" ? self : this, function () {
"use strict";
${body}
return { ${[...names].join(", ")} };
});
`;
mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/dndpaste.umd.cjs", import.meta.url), out);
console.log(`dist/dndpaste.umd.cjs: ${[...names].length} exports`);

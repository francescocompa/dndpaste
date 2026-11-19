import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../../src/dndpaste.ts";
import { renderPaste } from "../src/render.ts";
import { citedBooks, imageFileName, redditSubmitUrl, shareBlocks } from "../src/shareimg.ts";
import { booksLine } from "../src/pages.ts";
import type { Run } from "../src/shareimg.ts";
import { FIXTURES, ORIGIN, asJson, call, makeEnv, textOf } from "./helpers.ts";

const text = (runs: Run[]) => runs.map((r) => r.t).join("");

// D119: the image draws every line the view shows, in the view's order. The view's text, without the fold markers,
// must equal the image model's text, key and value of each row in turn.
for (const [name, src] of FIXTURES) {
  test(`share image: ${name} holds every line of the view, in order`, () => {
    const p = parse(src);
    const view = textOf(renderPaste(p).replace(/<span class="mk">.*?<span class="cnt">[^<]*<\/span><\/span>/g, ""));
    const blocks = shareBlocks(p);
    assert.equal(blocks.map((b) => b.map((r) => text(r.k) + text(r.v)).join("")).join(""), view);
    assert.equal(blocks.filter((b) => b[0].kc === "lvk").length, p.levels.length, "one block per level");
    assert.equal(blocks.flat().length, (renderPaste(p).match(/class="hk/g) ?? []).length, "one row per view row");
  });
}

test("share image: runs carry the view's classes (kind, ability, detail, drop, slot marker)", () => {
  const b = shareBlocks(parse("Scores: 8/13/14/12/10/15\n\nL1 Fighter\nFeat (Fighting Style): Archery\nGear: -Shield, Longsword [Topple @5] x2\n"));
  const runs = b.flat().flatMap((r) => [...r.k, ...r.v]);
  assert.deepEqual(runs.find((r) => r.t === "8"), { t: "8", c: "n ab-str" });
  assert.deepEqual(runs.find((r) => r.t === "Fighter"), { t: "Fighter", c: "r kd-class" });
  assert.deepEqual(runs.find((r) => r.t === "(Fighting Style)"), { t: "(Fighting Style)", c: "k km" });
  assert.deepEqual(runs.find((r) => r.t === "Shield"), { t: "Shield", c: "r kd-item", w: "drop" });
  assert.deepEqual(runs.find((r) => r.t === "Topple"), { t: "Topple", c: "r", w: "d" });
  assert.deepEqual(runs.find((r) => r.t === "x2"), { t: "x2", c: "q" });
});

test("Post to Reddit: the share link and title, URL-encoded", () => {
  assert.equal(redditSubmitUrl("https://dndpaste.test/AbCdE12345", "Vice & Virtue: a 5/3 build?"),
    "https://www.reddit.com/submit?url=https%3A%2F%2Fdndpaste.test%2FAbCdE12345&title=Vice%20%26%20Virtue%3A%20a%205%2F3%20build%3F");
});

test("share image file name: the title, without path or reserved characters", () => {
  assert.equal(imageFileName("Vice: the 5/3 build?", "dndpaste-x"), "Vice the 5 3 build.png");
  assert.equal(imageFileName("  ..  ", "dndpaste-AbCdE12345"), "dndpaste-AbCdE12345.png");
  assert.equal(imageFileName("x".repeat(200), "f").length, 84);
});

test("view: Post to Reddit's link on the action row for the Copy link menu, and under <noscript>; link and title encoded", async () => {
  const env = makeEnv();
  const res = await call(env, "POST", "/", asJson({ title: `Vice "&" <b>`, paste: "L1 Fighter\n" }));
  const { id } = await res.json() as { id: string };
  const page = await (await call(env, "GET", `/${id}`)).text();
  const reddit = `https://www.reddit.com/submit?url=${encodeURIComponent(`${ORIGIN}/${id}`)}&amp;title=Vice%20%22%26%22%20%3Cb%3E`;
  assert.ok(page.includes(`<div class="actrow acts" data-id="${id}" data-reddit="${reddit}" data-tidy="same">`)); // "L1 Fighter" is already tidy (D152 round 2)
  assert.ok(page.includes(`<a href="${reddit}" target="_blank" rel="noopener noreferrer">Post to Reddit</a></span></noscript>`));
  // Round 2 of the review: no Share button in the row; the Copy link menu (site.js) holds Share image and Post to Reddit.
  assert.ok(!page.includes(`class="bt shr`));
  assert.ok(page.includes(`aria-label="More ways to copy and share" aria-haspopup="menu"`));
  // A pinned revision shares its own address.
  const pinned = await (await call(env, "GET", `/${id}/1`)).text();
  assert.ok(pinned.includes(`data-reddit="https://www.reddit.com/submit?url=${encodeURIComponent(`${ORIGIN}/${id}/1`)}&amp;`));
});

// D120: the books a build cites, from its |SOURCE codes; uncited names are left out.
test("books: cited codes in order of first use, each once, titled from BOOKS; unknown codes as written", () => {
  const p = parse("Classes: Warlock|XPHB 5\nSpells: Hex|xphb, Misty Step\n\nSpecies: Tiefling|XPHB\n\nBackground: Archer Priest|HB\nFeat: Mark of Making|EFA\n\nL1 Warlock|XPHB\nOptions: Agonizing Blast [Eldritch Blast|FRHoF]\nGear: Rapier|ZZZ\n");
  assert.deepEqual(citedBooks(p).map((b) => [b.code, b.title !== null]), [["XPHB", true], ["HB", true], ["EFA", true], ["FRHoF", true], ["ZZZ", false]], "HB is homebrew on /codes (D218)");
  assert.equal(citedBooks(p)[2].title, "Eberron: Forge of the Artificer");
});

test("books: none cited means no Sources line; the line escapes, marks codes and sets unknown ones apart (D217)", () => {
  assert.deepEqual(citedBooks(parse("Classes: Fighter 3\n\nL1 Fighter\nFeat: Alert\n")), []);
  assert.equal(booksLine([]), "");
  assert.equal(booksLine([{ code: "EFA", title: "Eberron: Forge of the Artificer" }, { code: "<b>", title: null }]),
    `<div class="bks">Sources: Eberron: Forge of the Artificer <span class="bc">(EFA)</span> · <span class="bun"><a href="/codes">Unknown code</a>: <span class="bc">&lt;b&gt;</span></span></div>`);
  // T03: a made-up code and a UA code.
  const t03 = booksLine(citedBooks(parse("Species: Drider|ZZZNOPE\n\nL1 Fighter\nSubclass: Psi Warper|XUA2025Psion\nFeat: Alert|QQQ\n")));
  assert.equal(t03, `<div class="bks">Sources: Unearthed Arcana 2025: The Psion <span class="bc">(XUA2025Psion)</span> · ` +
    `<span class="bun"><a href="/codes">Unknown codes</a>: <span class="bc">ZZZNOPE</span>, <span class="bc">QQQ</span></span></div>`);
});

test("view: the Sources line sits under the byline when the build cites a book", async () => {
  const env = makeEnv();
  const shigen = FIXTURES.find(([n]) => n === "shigen.dndpaste")![1];
  const { id } = await (await call(env, "POST", "/", asJson({ title: "Shigen", paste: shigen }))).json() as { id: string };
  const page = await (await call(env, "GET", `/${id}`)).text();
  assert.match(page, /<\/time><\/div><div class="bks">Sources: Strixhaven: A Curriculum of Chaos <span class="bc">\(SCC\)<\/span> · Forgotten Realms: Heroes of Faerûn <span class="bc">\(FRHoF\)<\/span> · Homebrew <span class="bc">\(HB\)<\/span> · Eberron: Forge of the Artificer <span class="bc">\(EFA\)<\/span><\/div><\/div>/);
  const { id: id2 } = await (await call(env, "POST", "/", asJson({ paste: "L1 Fighter\n" }))).json() as { id: string };
  assert.ok(!(await (await call(env, "GET", `/${id2}`)).text()).includes(`class="bks"`));
});

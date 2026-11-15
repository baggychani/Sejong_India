import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "parse5";
import { resolveMovedRoute } from "../src/site/sections.ts";
import { readablePage } from "./readable-html.mjs";

const base = new URL("https://baggychani.github.io/Sejong_India/");
const attribute = (node, name) => node?.attrs?.find(attr => attr.name === name)?.value;
const nodes = node => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const filesIn = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)]);

export function verifyRoutes(outDir) {
  const read = file => readFileSync(file, "utf8");
  const sitemap = read(join(outDir, "sitemap.xml"));
  let checkedLinks = 0;
  let checkedAliases = 0;
  for (const file of filesIn(outDir).filter(file => file.endsWith(".html"))) {
    const html = read(file);
    const document = nodes(parse(html, { scriptingEnabled: false }));
    for (const node of document) {
      for (const name of ["href", "src"]) {
        const value = attribute(node, name);
        if (!value) continue;
        const target = new URL(value, base);
        if (target.origin !== base.origin) continue;
        assert(target.pathname === base.pathname.slice(0, -1) || target.pathname.startsWith(base.pathname), `${file}: internal URL escaped site base: ${value}`);
        const relative = decodeURIComponent(target.pathname.slice(base.pathname.length));
        const destination = join(outDir, relative);
        assert((existsSync(destination) && statSync(destination).isFile()) || existsSync(join(destination, "index.html")), `${file}: broken local link/asset: ${value}`);
        checkedLinks++;
      }
    }
    if (file.endsWith("404.html")) {
      assert(!document.some(node => node.tagName === "link" && attribute(node, "rel") === "canonical"), "404 must not advertise a nonexistent canonical page");
      continue;
    }
    const canonical = attribute(document.find(node => node.tagName === "link" && attribute(node, "rel") === "canonical"), "href");
    assert(canonical && sitemap.includes(`<loc>${canonical}</loc>`), `${file}: canonical missing from sitemap`);
    const canonicalFile = join(outDir, new URL(canonical).pathname.slice(base.pathname.length), "index.html");
    assert(existsSync(canonicalFile), `${file}: canonical page missing`);
    if (dirname(file) !== dirname(canonicalFile)) {
      assert.equal(readablePage(html, canonical), readablePage(read(canonicalFile), canonical), `${file}: alias content differs from canonical`);
      checkedAliases++;
    }
  }
  for (const [old, current] of [
    ["/hindi", "/learn/hindi"],
    ["/study/classroom-management", "/interview/classroom"],
    ["/study/classroom-management/encouraging-korean", "/interview/classroom/korean"],
    ["/interview/classroom-management/inclusive-classroom", "/interview/classroom/hindi"],
    ["/interview/classroom-management/participation-reluctance", "/interview/classroom/participation"],
  ]) {
    assert.equal(resolveMovedRoute(old), current, `incomplete legacy redirect: ${old}`);
    const html = read(join(outDir, old, "index.html"));
    assert(html.includes(`data-render-path="${current}"`), `missing static legacy content: ${old}`);
  }
  assert.equal(resolveMovedRoute("/hindi/example"), "/learn/hindi/example", "legacy Hindi article paths must migrate too");
  const home = readablePage(read(join(outDir, "index.html")), base.href);
  assert(home.includes("언어 익히기") && home.includes("/learn"), "home must link to the learning hub");
  const learning = readablePage(read(join(outDir, "learn/index.html")), base.href);
  for (const [id, title] of [["hindi", "힌디어"], ["tamil", "타밀어"]]) {
    assert(learning.includes(title) && learning.includes(`/learn/${id}`), `learning hub is missing ${id}`);
    const html = read(join(outDir, `learn/${id}/index.html`));
    assert(readablePage(html, base.href).includes(`# ${title}`), `missing learning page title: ${id}`);
    assert(read(join(outDir, `learn/${id}/index.md`)).includes(`# ${title}`), `missing learning page text: ${id}`);
    assert(html.includes(`rel="canonical" href="${base}learn/${id}/"`), `incorrect learning canonical: ${id}`);
  }
  console.log(`PASS: ${checkedLinks} internal links/assets and ${checkedAliases} static aliases; chained legacy routes resolve to canonical pages.`);
}

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { readablePage } from "./readable-html.mjs";
import { verifyContentFields } from "./verify-content-fields.mjs";
import { verifyContentContract } from "./content-contract.mjs";
import { verifyContentContractGuards } from "./verify-content-contract-guards.mjs";
import { parse } from "parse5";
import { verifyLanguageContent } from "./verify-language-content.mjs";

const outDir = process.argv[2] ?? "dist";
const siteUrl = "https://baggychani.github.io/Sejong_India/";
const read = path => readFileSync(join(outDir, path), "utf8");
function htmlFiles(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith(".html") ? [path] : [];
  });
}

// This deliberately parses HTML without executing JavaScript.
const files = htmlFiles(outDir);
for (const file of files) {
  const html = readFileSync(file, "utf8");
  // AI fallbacks must not become new controls, tables or page height in the
  // normal JavaScript-enabled browser. Parse noscript as that browser does.
  const unwantedUi = new Set(["text-version", "map-reference", "language-reference", "language-facts", "language-legend"]);
  function checkUi(node) {
    const classes = node.attrs?.find(attr => attr.name === "class")?.value.split(/\s+/) ?? [];
    assert(!classes.some(name => unwantedUi.has(name)), `${file}: AI reading support leaked into the visible UI`);
    for (const child of node.childNodes ?? []) checkUi(child);
  }
  checkUi(parse(html, { scriptingEnabled: true }));
  assert(html.includes('data-render-path="'), `${file}: missing render identity`);
  assert(!/<template\b|<div hidden id="S:/.test(html), `${file}: script-dependent body`);
  assert(readablePage(html, siteUrl).length > 0, `${file}: no readable main`);
  if (file.endsWith("404.html")) {
    assert(html.includes('name="robots" content="noindex"'));
    continue;
  }
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  assert(canonical?.startsWith(siteUrl), `${file}: invalid canonical`);
  const markdown = readFileSync(join(dirname(file), "index.md"), "utf8");
  assert(markdown.includes(readablePage(html, canonical)), `${file}: text differs from main`);
  const head = html.split("</head>")[0];
  for (const match of head.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    if (!match[1].startsWith("/")) continue;
    assert(existsSync(join(outDir, match[1].replace(/^\/Sejong_India\//, "").replace(/^\//, ""))), `${file}: missing CSS`);
  }
}
const hindi = readablePage(read("bharat/languages/hindi/index.html"), siteUrl);
for (const word of ["힌디어", "हिन्दी", "Hindi"]) assert(hindi.includes(word));
const catalog = JSON.parse(readFileSync("data/content/languages.json", "utf8"));
const languages = readablePage(read("bharat/languages/index.html"), siteUrl);
for (const language of catalog) {
  assert(languages.includes(language.ko), `missing language: ${language.ko}`);
  assert(languages.includes(`/bharat/languages/${language.id}`), `missing language link: ${language.id}`);
}
for (const [path, cssName] of [["library", "library-"], ["lessons", "library-"], ["bharat/languages/hindi", "LanguagePage-"]]) {
  assert(read(`${path}/index.html`).split("</head>")[0].includes(cssName), `${path}: page CSS loads too late`);
}
const textbooks = JSON.parse(readFileSync("data/content/textbooks.json", "utf8"));
const lessons = readablePage(read("lessons/index.html"), siteUrl);
for (const textbook of textbooks) assert(lessons.includes(`/lessons/${textbook.id}`));
for (const file of readdirSync("content/library").filter(file => file.endsWith(".md"))) {
  assert(readablePage(read("library/index.html"), siteUrl).includes(`/library/${file.slice(0, -3)}`));
}
const urls = [...read("sitemap.xml").matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(urls).size, urls.length, "duplicate canonical URLs in sitemap");
for (const url of urls) {
  const path = new URL(url).pathname.replace(/^\/Sejong_India\//, "");
  assert(existsSync(join(outDir, path, "index.html")), `sitemap target missing: ${url}`);
  assert(read("llms.txt").includes(new URL("index.md", url).href));
}
assert.equal(readablePage('<main><h1>A &amp; B</h1><a href="/x"><span>Link</span></a><script>ignore me</script><div hidden>hidden</div></main>', siteUrl), '# A & B\n\n[Link](https://baggychani.github.io/x)');
const mapBundle = readdirSync(join(outDir, "assets")).filter(name => name.endsWith(".js")).map(name => readFileSync(join(outDir, "assets", name), "utf8")).join("\n");
assert(mapBundle.includes("홈페이지 열기") && mapBundle.includes("Google 지도에서 검색"), "map actions missing from the client bundle");
assert(!mapBundle.includes("(확인:"), "source access dates must not be map detail buttons");
console.log(`PASS: ${files.length} HTML pages readable without JavaScript; ${urls.length} unique sitemap URLs; all language, book and textbook links preserved; page CSS available initially.`);
verifyContentFields(outDir);
verifyContentContract(outDir);
verifyContentContractGuards(outDir);
verifyLanguageContent(outDir);

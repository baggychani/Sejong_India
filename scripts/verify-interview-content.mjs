import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "parse5";

function descendants(node) {
  return [node, ...(node.childNodes ?? []).flatMap(descendants)];
}

export function verifyInterviewContent(outDir) {
  const read = path => readFileSync(join(outDir, path), "utf8");
  const index = descendants(parse(read("interview/index.html")));
  const main = index.find(node => node.tagName === "main");
  const links = descendants(main).filter(node => node.tagName === "a");
  const sitemap = read("sitemap.xml");
  const files = readdirSync("content/study").filter(file => file.endsWith(".md"));
  for (const file of files) {
    const slug = file.slice(0, -3);
    const route = `interview/${slug}`;
    const source = readFileSync(join("content/study", file), "utf8");
    assert(links.some(node => node.attrs?.some(attr => attr.name === "href" && attr.value.replace(/\/$/, "").endsWith(`/${route}`))), `${slug}: missing section entry point`);
    const html = read(`${route}/index.html`);
    const nodes = descendants(parse(html));
    const article = nodes.find(node => node.tagName === "article");
    const prose = descendants(article).find(node => node.attrs?.some(attr => attr.name === "class" && attr.value === "prose"));
    assert(prose, `${slug}: missing static section body`);
    const headings = (prose.childNodes ?? []).filter(node => node.tagName === "h2");
    assert.equal(headings.length, [...source.matchAll(/^## /gm)].length, `${slug}: question headings lost`);
    const diagnoses = (prose.childNodes ?? []).filter(node => node.tagName === "blockquote")
      .flatMap(node => node.childNodes ?? []).filter(node => node.tagName === "h3");
    assert.equal(diagnoses.length, [...source.matchAll(/^> ### /gm)].length, `${slug}: diagnosis blocks lost`);
    const primaryPoints = (prose.childNodes ?? []).filter(node => node.tagName === "ul")
      .flatMap(node => node.childNodes ?? []).filter(node => node.tagName === "li");
    assert.equal(primaryPoints.length, [...source.matchAll(/^- /gm)].length, `${slug}: primary point hierarchy lost`);
    const canonical = `https://baggychani.github.io/Sejong_India/${route}/`;
    assert(html.includes(`rel="canonical" href="${canonical}"`), `${slug}: missing canonical`);
    assert(sitemap.includes(`<loc>${canonical}</loc>`), `${slug}: missing sitemap entry`);
    assert(read(`${route}/index.md`).includes(canonical), `${slug}: missing text version`);
  }
  console.log(`PASS: ${files.length} interview sections linked from index; question/list hierarchy, direct HTML, text versions and sitemap preserved.`);
}

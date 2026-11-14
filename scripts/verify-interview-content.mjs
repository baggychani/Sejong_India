import assert from "node:assert/strict";
import { readFileSync, globSync } from "node:fs";
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
  const files = globSync("**/*.md", { cwd: "content/study" }).map(file => file.replace(/\\/g, "/"));
  for (const file of files) {
    const slug = file.slice(0, -3);
    const route = `interview/${slug}`;
    const source = readFileSync(join("content/study", file), "utf8");
    const parentRoute = slug.includes("/") ? `interview/${slug.split("/")[0]}` : "interview";
    const incoming = parentRoute === "interview" ? links : descendants(parse(read(`${parentRoute}/index.html`))).filter(node => node.tagName === "a");
    assert(incoming.some(node => node.attrs?.some(attr => attr.name === "href" && attr.value.replace(/\/$/, "").endsWith(`/${route}`))), `${slug}: missing entry point`);
    const html = read(`${route}/index.html`);
    const nodes = descendants(parse(html));
    const article = nodes.find(node => node.tagName === "article");
    const prose = descendants(article).find(node => node.attrs?.some(attr => attr.name === "class" && attr.value === "prose"));
    assert(prose, `${slug}: missing static section body`);
    const questionFiles = files.filter(name => name.startsWith(`${slug}/`));
    if (questionFiles.length) {
      assert.equal(descendants(prose).filter(node => node.tagName === "blockquote").length, 0, `${slug}: answers must not be expanded in the question list`);
      const list = descendants(article).find(node => node.attrs?.some(attr => attr.name === "class" && attr.value === "interview-question-list"));
      assert(list, `${slug}: missing question list`);
      assert.equal(descendants(list).filter(node => node.tagName === "a").length, questionFiles.length, `${slug}: question list incomplete`);
    }
    if (slug.includes("/")) {
      assert(descendants(article).some(node => node.tagName === "a" && node.attrs?.some(attr => attr.name === "href" && attr.value.endsWith(parentRoute))), `${slug}: missing return to question list`);
      const siblingFiles = files.filter(name => name !== file && name.startsWith(`${slug.split("/")[0]}/`));
      for (const sibling of siblingFiles) {
        const siblingTitle = readFileSync(join("content/study", sibling), "utf8").match(/^title: (.+)$/m)?.[1];
        assert(siblingTitle && !html.includes(siblingTitle), `${slug}: another question leaked into detail`);
      }
    }
    const headings = (prose.childNodes ?? []).filter(node => node.tagName === "h2");
    assert.equal(headings.length, [...source.matchAll(/^## /gm)].length, `${slug}: question headings lost`);
    const diagnoses = (prose.childNodes ?? []).filter(node => node.tagName === "blockquote")
      .flatMap(node => node.childNodes ?? []).filter(node => node.tagName === "h3");
    assert.equal(diagnoses.length, [...source.matchAll(/^> ### /gm)].length, `${slug}: diagnosis blocks lost`);
    if (source.includes("> ### 피해야 할 접근")) {
      const caution = descendants(prose).find(node => node.tagName === "blockquote" && node.attrs?.some(attr => attr.name === "class" && attr.value === "interview-caution"));
      assert(caution, `${slug}: missing caution section`);
      assert(descendants(caution).some(node => node.tagName === "h3" && descendants(node).some(child => child.value === "피해야 할 접근")), `${slug}: caution needs a readable heading`);
    }
    const primaryPoints = (prose.childNodes ?? []).filter(node => node.tagName === "ul")
      .flatMap(node => node.childNodes ?? []).filter(node => node.tagName === "li");
    assert.equal(primaryPoints.length, [...source.matchAll(/^- /gm)].length, `${slug}: primary point hierarchy lost`);
    const canonical = `https://baggychani.github.io/Sejong_India/${route}/`;
    assert(html.includes(`rel="canonical" href="${canonical}"`), `${slug}: missing canonical`);
    assert(sitemap.includes(`<loc>${canonical}</loc>`), `${slug}: missing sitemap entry`);
    assert(read(`${route}/index.md`).includes(canonical), `${slug}: missing text version`);
  }
  console.log(`PASS: ${files.length} interview section/question pages linked; list/detail separation, diagnosis and list hierarchy, direct HTML, text versions and sitemap preserved.`);
}

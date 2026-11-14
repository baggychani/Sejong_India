import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { readablePage } from "./readable-html.mjs";

const root = process.cwd();
function escapeHtml(value) {
  return value.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
function destination(outDir, file) {
  if (file === "/") return join(outDir, "index.html");
  if (file === "/404.html") return join(outDir, "404.html");
  return join(outDir, file.replace(/^\//, ""), "index.html");
}
function stylesFor(manifest, pathname, base) {
  const page = pathname.startsWith("/library") ? "src/library/LibraryPage.tsx"
    : pathname.startsWith("/lessons") ? "src/pages/LessonsPage.tsx"
    : pathname.startsWith("/bharat/languages") ? "src/pages/LanguagePage.tsx"
    : pathname.startsWith("/bharat/map") ? "src/pages/MapPage.tsx" : null;
  const css = new Set();
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`missing build manifest entry: ${key}`);
    for (const imported of entry.imports ?? []) visit(imported);
    for (const file of entry.css ?? []) css.add(base + file);
  }
  visit("index.html");
  if (page) visit(page);
  return [...css];
}
function pageOf(template, rendered, page, styles, siteUrl) {
  // Eager server pages have resolved Suspense boundaries. Preserve React's
  // markers so the browser can hydrate the same tree without rebuilding it.
  if (/<template\b|<div hidden id="S:|<script\b/.test(rendered.html)) {
    throw new Error(`prerender still requires JavaScript: ${page.file}`);
  }
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(rendered.title)}</title>`);
  const canonical = new URL(page.renderPath.replace(/^\//, "") + (page.renderPath === "/" ? "" : "/"), siteUrl).href;
  const textUrl = new URL("index.md", canonical).href;
  const description = readablePage(rendered.html, canonical).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const tags = styles.filter(href => !html.includes(`href="${href}"`))
    .map(href => `<link rel="stylesheet" crossorigin href="${escapeHtml(href)}">`);
  tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta name="description" content="${escapeHtml(description)}">`);
  if (page.file !== "/404.html") {
    tags.push(`<link rel="alternate" type="text/markdown" href="${escapeHtml(textUrl)}" title="텍스트로 읽기">`,
      `<link rel="sitemap" type="application/xml" href="${new URL("sitemap.xml", siteUrl).href}">`);
  } else {
    tags.push('<meta name="robots" content="noindex">');
  }
  html = html.replace("</head>", `  ${tags.join("\n    ")}\n  </head>`);
  const marker = '<div id="root"></div>';
  if (!html.includes(marker)) throw new Error("built index.html has no empty root");
  return { html: html.replace(marker, `<div id="root" data-render-path="${escapeHtml(page.renderPath)}">${rendered.html}</div>`), canonical, textUrl };
}
export async function fillHtml({ mode, base, pages, outDir, siteUrl }) {
  const { build } = await import("vite");
  const ssrOut = join(root, "dist-ssr");
  await build({
    configFile: false, root, mode, base, plugins: [react()], logLevel: "warn",
    build: { ssr: join(root, "src/entry-server.tsx"), outDir: ssrOut, emptyOutDir: true,
      rollupOptions: { output: { inlineDynamicImports: true } } },
  });
  const { render } = await import(pathToFileURL(join(ssrOut, "entry-server.js")).href);
  const template = readFileSync(join(outDir, "index.html"), "utf8");
  const manifest = JSON.parse(readFileSync(join(outDir, ".vite/manifest.json"), "utf8"));
  const basename = base === "/" ? "/" : base.replace(/\/$/, "");
  const jobs = [...pages, { file: "/404.html", renderPath: "/this-page-is-missing" }];
  const canonicalPages = new Map();
  for (const page of jobs) {
    const rendered = await render(page.renderPath, basename);
    const result = pageOf(template, rendered, page, stylesFor(manifest, page.renderPath, base), siteUrl);
    const file = destination(outDir, page.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, result.html);
    if (page.file === "/404.html") continue;
    const text = `# ${rendered.title}\n\n원문: ${result.canonical}\n\n${readablePage(rendered.html, result.canonical)}\n`;
    writeFileSync(join(dirname(file), "index.md"), text);
    canonicalPages.set(result.canonical, { title: rendered.title, url: result.textUrl });
  }
  writeFileSync(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...canonicalPages.keys()].map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync(join(outDir, "llms.txt"), `# 세종학당 인도 가보기 프로젝트\n\n> 공개 페이지와 동일한 내용의 텍스트 버전입니다. 이미지나 JavaScript 실행 없이 읽을 수 있습니다.\n\n## 페이지\n\n${[...canonicalPages.values()].map(page => `- [${page.title}](${page.url})`).join("\n")}\n`);
  // Fail deployment if the reported URL loses readable names or its incoming link.
  const hindi = readFileSync(destination(outDir, "/bharat/languages/hindi"), "utf8");
  for (const word of ["힌디어", "हिन्दी", "Hindi"]) {
    if (!readablePage(hindi, siteUrl).includes(word)) throw new Error(`hindi page is missing readable text: ${word}`);
  }
  const list = readablePage(readFileSync(destination(outDir, "/bharat/languages"), "utf8"), siteUrl);
  if (!list.includes("벵골어") || !list.includes("/bharat/languages/hindi")) throw new Error("language list lost readable names or links");
  console.log(`Prerendered ${jobs.length} HTML pages; ${canonicalPages.size} canonical pages have text alternatives.`);
}

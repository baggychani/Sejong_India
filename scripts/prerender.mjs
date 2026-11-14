import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";

const root = process.cwd();

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[char]);
}

function destination(outDir, file) {
  if (file === "/") return join(outDir, "index.html");
  if (file === "/404.html") return join(outDir, "404.html");
  return join(outDir, file.replace(/^\//, ""), "index.html");
}

function reveal(html) {
  let source = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  const marker = /<div hidden id="(S:\d+)">/g;
  const blocks = new Map();
  let found;
  while ((found = marker.exec(source))) {
    const open = found.index;
    const innerAt = open + found[0].length;
    let depth = 1;
    let cursor = innerAt;
    while (cursor < source.length && depth > 0) {
      const nextOpen = source.indexOf("<div", cursor);
      const nextClose = source.indexOf("</div>", cursor);
      if (nextClose < 0) throw new Error("unclosed prerender block");
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        cursor = nextOpen + 4;
      } else {
        depth -= 1;
        cursor = nextClose + 6;
      }
    }
    blocks.set(found[1], source.slice(innerAt, cursor - 6));
    source = source.slice(0, open) + source.slice(cursor);
    marker.lastIndex = open;
  }
  for (const [id, inner] of blocks) {
    const slot = `<!--$?--><template id="${id.replace("S:", "B:")}"></template><!--/$-->`;
    if (!source.includes(slot)) throw new Error(`prerender slot missing for ${id}`);
    source = source.replace(slot, inner);
  }
  return source.replace(/<!--\/?\$\??-->/g, "");
}

function pageOf(template, rendered) {
  const titled = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(rendered.title)}</title>`);
  const marker = '<div id="root"></div>';
  if (!titled.includes(marker)) throw new Error("built index.html has no empty root");
  return titled.replace(marker, `<div id="root">${reveal(rendered.html)}</div>`);
}

export async function fillHtml({ mode, base, pages, outDir }) {
  const { build } = await import("vite");
  const ssrOut = join(root, "dist-ssr");
  await build({
    configFile: false,
    root,
    mode,
    base,
    plugins: [react()],
    logLevel: "warn",
    build: {
      ssr: join(root, "src/entry-server.tsx"),
      outDir: ssrOut,
      emptyOutDir: true,
      rollupOptions: {
        output: { inlineDynamicImports: true },
      },
    },
  });

  const { render } = await import(pathToFileURL(join(ssrOut, "entry-server.js")).href);
  const template = readFileSync(join(outDir, "index.html"), "utf8");
  const basename = base === "/" ? "/" : base.replace(/\/$/, "");
  const jobs = [...pages, { file: "/404.html", renderPath: "/this-page-is-missing" }];

  for (const page of jobs) {
    const rendered = await render(page.renderPath, basename);
    if (!rendered.html.includes("<")) throw new Error(`empty prerender: ${page.file}`);
    const file = destination(outDir, page.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, pageOf(template, rendered));
  }

  const hindi = readFileSync(destination(outDir, "/bharat/languages/hindi"), "utf8");
  const hindiRoot = hindi.split('<div id="root">')[1]?.split("</body>")[0] ?? "";
  for (const text of ["힌디어", "हिन्दी", "Hindi"]) {
    if (!hindiRoot.includes(text)) throw new Error(`hindi page HTML is missing ${text}`);
  }
  const list = readFileSync(destination(outDir, "/bharat/languages"), "utf8");
  const listRoot = list.split('<div id="root">')[1]?.split("</body>")[0] ?? "";
  if (listRoot.includes('id="S:') || listRoot.includes("<template") || !listRoot.includes("벵골어")) {
    throw new Error("language list HTML is not readable without script");
  }
}

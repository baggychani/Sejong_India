import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { globSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import catalog from "./data/content/languages.json";
import textbooks from "./data/content/textbooks.json";
import { collections, mapSection, movedRoutes } from "./src/site/sections";
import { fillHtml } from "./scripts/prerender.mjs";

export default defineConfig(({ mode }) => {
  const base = mode === "pages" ? "/Sejong_India/" : "/";
  let outDir = "";
  const pages: { file: string; renderPath: string }[] = [];
  return {
  base,
  build: { manifest: true },
  plugins: [react(), {
    name: "github-pages-direct-links",
    apply: "build",
    writeBundle({ dir }) {
      if (!dir) return;
      outDir = dir;
      pages.length = 0;
      const india = mapSection.path;
      const routes = [india, india + "/map", india + "/languages", ...catalog.map(l => india + "/languages/" + l.id)];
      routes.push(...textbooks.map(book => "/lessons/" + book.id));
      for (const { id, path } of collections) {
        routes.push(path);
        for (const name of globSync(id === "study" ? "**/*.md" : "*.md", { cwd: "content/" + id })) {
          routes.push(path + "/" + name.replace(/\\/g, "/").slice(0, -3));
        }
      }
      const renderPath = (route: string) => route === india ? india + "/map" : route;
      pages.push({ file: "/", renderPath: "/" }, ...routes.map(route => ({ file: route, renderPath: renderPath(route) })));
      const aliases = movedRoutes.flatMap(({ from, to }) => routes
        .filter(route => route === to || route.startsWith(to + "/"))
        .map(route => ({ file: from + route.slice(to.length), renderPath: renderPath(route) })));
      pages.push(...aliases);
      const entry = join(dir, "index.html");
      for (const page of pages) {
        if (page.file === "/") continue;
        const folder = join(dir, page.file);
        mkdirSync(folder, { recursive: true });
        copyFileSync(entry, join(folder, "index.html"));
      }
      copyFileSync(entry, join(dir, "404.html"));
    },
    async closeBundle() {
      if (!outDir) return;
      await fillHtml({ mode, base, pages, outDir, siteUrl: "https://baggychani.github.io/Sejong_India/" });
    },
  }],
  server: {
    port: 5173,
  },
  };
});

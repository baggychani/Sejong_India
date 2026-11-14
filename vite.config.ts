import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { globSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import catalog from "./data/content/languages.json";
import textbooks from "./data/content/textbooks.json";
import { collections, mapSection, movedRoutes } from "./src/site/sections";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/Sejong_India/" : "/",
  plugins: [react(), {
    name: "github-pages-direct-links",
    apply: "build",
    writeBundle({ dir }) {
      if (mode !== "pages" || !dir) return;
      const india = mapSection.path;
      const routes = [india, india + "/map", india + "/languages", ...catalog.map(l => india + "/languages/" + l.id)];
      routes.push(...textbooks.map(book => "/lessons/" + book.id));
      for (const { id, path } of collections) {
        routes.push(path);
        for (const name of globSync("*.md", { cwd: "content/" + id })) {
          routes.push(path + "/" + name.slice(0, -3));
        }
      }
      const entry = join(dir, "index.html");
      const aliases = movedRoutes.flatMap(({ from, to }) => routes
        .filter(route => route === to || route.startsWith(to + "/"))
        .map(route => from + route.slice(to.length)));
      for (const route of [...routes, ...aliases]) {
        const folder = join(dir, route);
        mkdirSync(folder, { recursive: true });
        copyFileSync(entry, join(folder, "index.html"));
      }
      copyFileSync(entry, join(dir, "404.html"));
    },
  }],
  server: {
    port: 5173,
  },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { globSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import catalog from "./data/content/languages.json";
import { collections, mapSection } from "./src/site/sections";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/Sejong_India/" : "/",
  plugins: [react(), {
    name: "github-pages-direct-links",
    apply: "build",
    writeBundle({ dir }) {
      if (mode !== "pages" || !dir) return;
      const map = mapSection.path.slice(1);
      const routes = [map, map + "/languages", ...catalog.map(l => map + "/languages/" + l.id)];
      for (const { id } of collections) {
        routes.push(id);
        for (const name of globSync("*.md", { cwd: "content/" + id })) {
          routes.push(id + "/" + name.slice(0, -3));
        }
      }
      const entry = join(dir, "index.html");
      for (const route of routes) {
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

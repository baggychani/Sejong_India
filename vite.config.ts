import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/Sejong_India/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
  },
}));

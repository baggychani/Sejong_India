import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { movedRoutes } from "./site/sections";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("root element missing");
}

const base = import.meta.env.BASE_URL;
// Keep links shared before the move to directory URLs working.
if (location.pathname === base && location.hash.startsWith("#/")) {
  const target = new URL(base + location.hash.slice(2), location.origin);
  if (target.origin === location.origin && target.pathname.startsWith(base)) {
    history.replaceState(null, "", target);
  }
}

const path = location.pathname.slice(base.length - 1);
const moved = movedRoutes.find(({ from }) => path === from || path.startsWith(from + "/"));
if (moved) {
  history.replaceState(null, "", base + moved.to.slice(1) + path.slice(moved.from.length) + location.search + location.hash);
}

// After a redeploy, an open tab may request page chunks that no longer exist.
// Reload once to pick up the new build; the error boundary covers repeated failures.
window.addEventListener("vite:preloadError", (event) => {
  const key = "reloaded-for-chunk";
  try {
    if (sessionStorage.getItem(key) === location.pathname) return;
    sessionStorage.setItem(key, location.pathname);
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

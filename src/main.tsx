import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
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

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

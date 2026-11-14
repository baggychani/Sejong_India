import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { App } from "./App";
import { LibraryPage, BookPage } from "./library/LibraryPage";
import { LessonsPage } from "./pages/LessonsPage";
import { MapPage } from "./pages/MapPage";
import LanguagePage from "./pages/LanguagePage";
import { renderedTitle, resetRenderedTitle } from "./site/title";

export function render(pathname: string, basename: string) {
  resetRenderedTitle();
  const prefix = basename === "/" ? "" : basename.replace(/\/$/, "");
  const location = `${prefix}${pathname === "/" ? "/" : pathname}`;
  // All page modules and content are already loaded at build time. A synchronous
  // render leaves Suspense content visible in place, without stream reveal scripts.
  const html = renderToString(
    <StrictMode>
      <MemoryRouter initialEntries={[location]} basename={prefix || "/"}>
        <App pages={{ LibraryPage, BookPage, LessonsPage, MapPage, LanguagePage }} />
      </MemoryRouter>
    </StrictMode>,
  );
  return { html, title: renderedTitle() };
}

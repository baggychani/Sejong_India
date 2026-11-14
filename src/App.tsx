import { lazy, Suspense, useState, type ComponentType } from "react";
import { Icon } from "./site/Icon";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router";
import { SiteShell } from "./shell/SiteShell";
import { LoadErrorBoundary } from "./shell/LoadErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { CollectionPage } from "./pages/CollectionPage";
import { EntryPage } from "./pages/EntryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const LibraryPage = lazy(() => import("./library/LibraryPage").then(({ LibraryPage }) => ({ default: LibraryPage })));
const BookPage = lazy(() => import("./library/LibraryPage").then(({ BookPage }) => ({ default: BookPage })));
const MapPage = lazy(() => import("./pages/MapPage").then(({ MapPage }) => ({ default: MapPage })));
const LanguagePage = lazy(() => import("./pages/LanguagePage"));
const LessonsPage = lazy(() => import("./pages/LessonsPage").then(({ LessonsPage }) => ({ default: LessonsPage })));

function IndiaSection() {
  const [collapsed, setCollapsed] = useState(false);
  const label = collapsed ? "인도 메뉴 펼치기" : "인도 메뉴 접기";
  return <div className={collapsed ? "india-section is-collapsed" : "india-section"}>
    <nav className="india-navigation" id="india-navigation" aria-label="인도" hidden={collapsed}>
      <NavLink to="map" end>지도</NavLink>
      <NavLink to="languages">언어</NavLink>
    </nav>
    <button className="india-nav-toggle" aria-controls="india-navigation" aria-expanded={!collapsed}
      aria-label={label} title={label} onClick={() => setCollapsed(!collapsed)}>
      <Icon name="arrow" />
    </button>
    <Outlet />
  </div>;
}

export type PageComponents = Record<"LibraryPage" | "BookPage" | "MapPage" | "LanguagePage" | "LessonsPage", ComponentType>;
const browserPages: PageComponents = { LibraryPage, BookPage, MapPage, LanguagePage, LessonsPage };

export function App({ pages = browserPages }: { pages?: PageComponents } = {}) {
  const { LibraryPage, BookPage, MapPage, LanguagePage, LessonsPage } = pages;
  const { pathname } = useLocation();
  return (
    <SiteShell>
      <LoadErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bharat" element={<IndiaSection />}>
        <Route index element={<Navigate to="map" replace />} />
        <Route path="map" element={
          <Suspense fallback={<p className="reading" role="status">지도를 여는 중…</p>}>
            <MapPage />
          </Suspense>
        } />
        <Route path="languages/:id?" element={<Suspense fallback={null}><LanguagePage /></Suspense>} />
        </Route>
        <Route path="/library" element={<Suspense fallback={null}><LibraryPage /></Suspense>} />
        <Route path="/library/:slug" element={<Suspense fallback={null}><BookPage /></Suspense>} />
        <Route path="/lessons" element={<Suspense fallback={null}><LessonsPage /></Suspense>} />
        <Route path="/lessons/:slug" element={<Suspense fallback={null}><LessonsPage /></Suspense>} />
        <Route path="/:collectionId" element={<CollectionPage />} />
        <Route path="/:collectionId/:slug" element={<EntryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </LoadErrorBoundary>
    </SiteShell>
  );
}

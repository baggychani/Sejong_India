import { lazy, Suspense, useState } from "react";
import { Icon } from "./site/Icon";
import { NavLink, Outlet, Route, Routes } from "react-router";
import { SiteShell } from "./shell/SiteShell";
import { HomePage } from "./pages/HomePage";
import { CollectionPage } from "./pages/CollectionPage";
import { EntryPage } from "./pages/EntryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const LibraryPage = lazy(() => import("./library/LibraryPage").then(({ LibraryPage }) => ({ default: LibraryPage })));
const BookPage = lazy(() => import("./library/LibraryPage").then(({ BookPage }) => ({ default: BookPage })));
const MapPage = lazy(() => import("./pages/MapPage").then(({ MapPage }) => ({ default: MapPage })));
const LanguagePage = lazy(() => import("./pages/LanguagePage"));

function IndiaSection() {
  const [collapsed, setCollapsed] = useState(false);
  const label = collapsed ? "인도 메뉴 펼치기" : "인도 메뉴 접기";
  return <div className={collapsed ? "india-section is-collapsed" : "india-section"}>
    <nav className="india-navigation" id="india-navigation" aria-label="인도" hidden={collapsed}>
      <NavLink to="/map" end>지도</NavLink>
      <NavLink to="/map/languages">언어 목록</NavLink>
    </nav>
    <button className="india-nav-toggle" aria-controls="india-navigation" aria-expanded={!collapsed}
      aria-label={label} title={label} onClick={() => setCollapsed(!collapsed)}>
      <Icon name="arrow" />
    </button>
    <Outlet />
  </div>;
}

export function App() {
  return (
    <SiteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<IndiaSection />}>
        <Route index element={
          <Suspense fallback={<p className="reading" role="status">지도를 여는 중…</p>}>
            <MapPage />
          </Suspense>
        } />
        <Route path="languages/:id?" element={<Suspense fallback={null}><LanguagePage /></Suspense>} />
        </Route>
        <Route path="/library" element={<Suspense fallback={null}><LibraryPage /></Suspense>} />
        <Route path="/library/:slug" element={<Suspense fallback={null}><BookPage /></Suspense>} />
        <Route path="/:collectionId" element={<CollectionPage />} />
        <Route path="/:collectionId/:slug" element={<EntryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  );
}

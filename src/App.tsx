import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { SiteShell } from "./shell/SiteShell";
import { HomePage } from "./pages/HomePage";
import { CollectionPage } from "./pages/CollectionPage";
import { EntryPage } from "./pages/EntryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const LibraryPage = lazy(() => import("./library/LibraryPage").then(({ LibraryPage }) => ({ default: LibraryPage })));
const BookPage = lazy(() => import("./library/LibraryPage").then(({ BookPage }) => ({ default: BookPage })));
const MapPage = lazy(() => import("./pages/MapPage").then(({ MapPage }) => ({ default: MapPage })));

export function App() {
  return (
    <SiteShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={
          <Suspense fallback={<p className="reading" role="status">지도를 여는 중…</p>}>
            <MapPage />
          </Suspense>
        } />
        <Route path="/library" element={<Suspense fallback={null}><LibraryPage /></Suspense>} />
        <Route path="/library/:slug" element={<Suspense fallback={null}><BookPage /></Suspense>} />
        <Route path="/:collectionId" element={<CollectionPage />} />
        <Route path="/:collectionId/:slug" element={<EntryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteShell>
  );
}

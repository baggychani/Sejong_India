import { useEffect, useRef, useState } from "react";
import { siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";
import { MapView } from "../map/MapView";
import { DetailCard } from "../map/details";
import {
  adminShapes,
  cityPoints,
  countryGeometryOnly,
  details,
  fitGeometry,
  instituteList,
  institutePoints,
  landformShapes,
  mapConfig,
  neighborShapes,
  riverShapes,
} from "../map/indiaModel";

export function MapPage() {
  const [visible, setVisible] = useState(
    () => new Set(mapConfig.layers.filter((layer) => layer.visible).map((layer) => layer.id)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectingStates, setSelectingStates] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastRowId = useRef<string | null>(null);

  useEffect(() => {
    document.title = `지도 · ${siteTitle}`;
  }, []);

  useEffect(() => {
    if (!selectedId || !panel.current) return;
    panel.current.scrollTop = 0;
    closeButton.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 800px)").matches) {
      panel.current.scrollIntoView({ block: "start" });
    }
  }, [selectedId]);

  function showList() {
    setSelectedId(null);
    requestAnimationFrame(() => {
      const rows = panel.current?.querySelectorAll<HTMLButtonElement>(".institute-list button");
      const target = Array.from(rows ?? []).find((row) => row.dataset.id === lastRowId.current);
      (target ?? rows?.[0])?.focus();
    });
  }

  function toggle(id: string) {
    if (id === "admin") setSelectingStates(false);
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selected = selectedId ? details.get(selectedId) : undefined;

  return (
    <div className="map-page">
      <MapView
        fit={fitGeometry}
        country={countryGeometryOnly}
        neighbors={neighborShapes}
        areas={landformShapes}
        boundaries={adminShapes}
        lines={riverShapes}
        points={[...cityPoints, ...institutePoints]}
        visibleLayers={visible}
        selectingStates={selectingStates}
        onToggleStateSelection={() => {
          if (!visible.has("admin")) setVisible((current) => new Set(current).add("admin"));
          setSelectingStates(!selectingStates);
        }}
        selectedId={selectedId}
        onSelect={(id) => {
          lastRowId.current = null;
          setSelectedId(id);
        }}
        projection={mapConfig.projection}
        layers={mapConfig.layers.map((layer) => ({
          id: layer.id,
          label: layer.label,
          pressed: visible.has(layer.id),
        }))}
        onToggleLayer={toggle}
      />
      <aside ref={panel} className="detail" aria-label="장소 정보">
        {selected ? (
          <>
            <button ref={closeButton} className="back-to-list" onClick={showList}><Icon name="back" />학당 목록</button>
            <DetailCard key={selected.id} detail={selected} />
          </>
        ) : (
          <>
            <header className="list-heading"><h1>인도 세종학당</h1><span>{instituteList.length}곳</span></header>
            <ul className="institute-list">
              {instituteList.map((institute) => (
                <li key={institute.id}>
                  <button
                    type="button"
                    data-id={institute.id}
                    onClick={() => {
                      lastRowId.current = institute.id;
                      setVisible((current) => current.has("sejong") ? current : new Set(current).add("sejong"));
                      setSelectedId(institute.id);
                    }}
                  >
                    <i className="row-pin"><Icon name="pin" /></i>
                    <div>
                      <strong>{institute.title}</strong>
                      <span>{institute.place}</span>
                    </div>
                    <Icon name="arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}

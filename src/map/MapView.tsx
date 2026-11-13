import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { geoConicEqualArea, geoGraticule10, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { MapLabel, MapPoint, MapViewProps } from "./types";
import "../styles/map.css";

type LayerControl = {
  id: string;
  label: string;
  pressed: boolean;
};

type Props = MapViewProps & {
  layers: LayerControl[];
  onToggleLayer: (id: string) => void;
  selectingStates: boolean;
  onToggleStateSelection: () => void;
};

export function MapView({
  fit,
  country,
  neighbors,
  areas,
  boundaries,
  lines,
  points,
  visibleLayers,
  selectedId,
  onSelect,
  projection: projectionOptions,
  layers,
  onToggleLayer,
  selectingStates,
  onToggleStateSelection,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState(zoomIdentity);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 18])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });
    zoomRef.current = behavior;
    select(svg).call(behavior);
    // D3 also routes a touch double-tap through its dblclick.zoom listener.
    if (selectingStates) select(svg).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [selectingStates]);

  const fitted = useRef(false);
  useEffect(() => {
    if (size.width < 20) return;
    if (!fitted.current) {
      fitted.current = true;
      return;
    }
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    select(svg).call(behavior.transform, zoomIdentity);
  }, [size.width, size.height]);

  const geographic = useMemo(() => {
    if (size.width < 20 || size.height < 20) return null;
    const next = geoConicEqualArea()
      .parallels([projectionOptions.parallels[0], projectionOptions.parallels[1]])
      .rotate([-projectionOptions.centerLon, 0]);
    next.fitExtent(
      [
        [size.width < 500 ? 22 : 44, 35],
        [size.width - (size.width < 500 ? 22 : 44), size.height - 54],
      ],
      fit,
    );
    return next;
  }, [
    fit,
    projectionOptions.centerLon,
    projectionOptions.parallels,
    size.height,
    size.width,
  ]);

  const draw = useMemo(
    () => (geographic ? geoPath(geographic) : null),
    [geographic],
  );

  function zoomBy(factor: number) {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    select(svg).call(behavior.scaleBy, factor);
  }

  function resetView() {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    select(svg).call(behavior.transform, zoomIdentity);
  }

  function choose(event: SyntheticEvent, id: string) {
    event.stopPropagation();
    onSelect(id);
  }

  const scale = transform.k || 1;
  const visiblePoints = points.filter((point) => visibleLayers.has(point.layer));
  const orderedPoints = [
    ...visiblePoints.filter((point) => point.id !== selectedId),
    ...visiblePoints.filter((point) => point.id === selectedId),
  ];

  return (
    <div className="map-frame" ref={frameRef}>
      <svg
        ref={svgRef}
        role="group"
        aria-label="인도 지도"
        className={selectingStates ? "selecting-states" : undefined}
        onClick={(event) => {
          // A near miss on land should leave the current place open.
          if (event.target instanceof Element && event.target.matches(".map-country")) return;
          onSelect(null);
        }}
      >
        {draw && geographic ? (
          <g transform={transform.toString()}>
            {neighbors.map((shape) => (
              <path
                key={shape.id}
                className={shape.className}
                d={draw(shape.geometry) ?? undefined}
              />
            ))}
            <path className="map-country" d={draw(country) ?? undefined} />
            <path className="map-grid" d={draw(geoGraticule10()) ?? undefined} />
            {boundaries
              .filter((shape) => visibleLayers.has(shape.layer))
              .map((shape) => (
                <path
                  key={shape.id}
                  className={`${shape.className}${shape.id === selectedId ? " selected" : ""}`}
                  d={draw(shape.geometry) ?? undefined}
                  onClick={selectingStates ? (event) => choose(event, shape.id) : undefined}
                />
              ))}
            {areas
              .filter((shape) => visibleLayers.has(shape.layer))
              .map((shape) => (
                <path
                  key={shape.id}
                  className={`${shape.className}${shape.id === selectedId ? " selected" : ""}`}
                  d={draw(shape.geometry) ?? undefined}
                  onClick={(event) => choose(event, shape.id)}
                />
              ))}
            <path className="country-outline" d={draw(country) ?? undefined} />
            {lines
              .filter((shape) => visibleLayers.has(shape.layer))
              .map((shape) => (
                <g key={shape.id} onClick={(event) => choose(event, shape.id)}>
                  <path
                    className="map-river-hit"
                    d={draw(shape.geometry) ?? undefined}
                  />
                  <path
                    className={`${shape.className}${shape.id === selectedId ? " selected" : ""}`}
                    d={draw(shape.geometry) ?? undefined}
                  />
                </g>
              ))}
            {orderedPoints.map((point) => (
              <PointMark
                key={point.id}
                point={point}
                selected={point.id === selectedId}
                project={geographic}
                scale={scale}
                onChoose={choose}
              />
            ))}
            <g className="map-labels">
              {[
                { text: "인도", lon: 78.8, lat: 22.7, className: "country-name" },
                { text: "아라비아해", lon: 71.1, lat: 14.3, className: "sea-name" },
                { text: "벵골만", lon: 87.1, lat: 15.8, className: "sea-name" },
              ].map(({ text, lon, lat, className }) => (
                <PlacedLabel key={text} lon={lon} lat={lat} label={{ text, dx: 0, dy: 0, anchor: "middle", leader: false }} className={`map-label ${className}`} project={geographic} scale={scale} />
              ))}
              {neighbors.map((shape) =>
                shape.label ? (
                  <PlacedLabel
                    key={`${shape.id}-label`}
                    lon={shape.label.lon}
                    lat={shape.label.lat}
                    label={shape.label}
                    className="map-label map-label-neighbor"
                    project={geographic}
                    scale={scale}
                  />
                ) : null,
              )}
              {areas
                .filter((shape) => visibleLayers.has(shape.layer) && shape.label)
                .map((shape) => (
                  <PlacedLabel
                    key={`${shape.id}-label`}
                    lon={shape.label!.lon}
                    lat={shape.label!.lat}
                    label={shape.label!}
                    className="map-label map-label-landform"
                    project={geographic}
                    scale={scale}
                  />
                ))}
              {lines
                .filter((shape) => visibleLayers.has(shape.layer) && shape.label)
                .map((shape) => (
                  <PlacedLabel
                    key={`${shape.id}-label`}
                    lon={shape.label!.lon}
                    lat={shape.label!.lat}
                    label={shape.label!}
                    className="map-label map-label-river"
                    project={geographic}
                    scale={scale}
                  />
                ))}
              {orderedPoints.map((point) => (
                <PlacedLabel
                  key={`${point.id}-label`}
                  lon={point.lon}
                  lat={point.lat}
                  label={point.label}
                  className={`map-label point-label${point.layer === "sejong" ? " map-label-institute" : ""}${point.id === selectedId ? " selected" : ""}`}
                  onChoose={(event) => choose(event, point.id)}
                  project={geographic}
                  scale={scale}
                />
              ))}
            </g>
          </g>
        ) : null}
      </svg>
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      <div className="map-controls">
        <div className="map-toolbar">
          <div className="map-layers" role="group" aria-label="지도 레이어">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                aria-pressed={layer.pressed}
                onClick={() => onToggleLayer(layer.id)}
              >
                <i className={`layer-swatch swatch-${layer.id}`} aria-hidden="true" />{layer.label}
              </button>
            ))}
          </div>
          <button
            className="state-selection"
            type="button"
            aria-pressed={selectingStates}
            onClick={onToggleStateSelection}
          >
            <span>주 선택</span>
          </button>
        </div>
        <div className="map-zoom">
          <button type="button" onClick={() => zoomBy(1.45)} aria-label="확대">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.45)} aria-label="축소">
            −
          </button>
          <button type="button" onClick={resetView} aria-label="전체 보기">
            전체
          </button>
        </div>
      </div>
    </div>
  );
}

function PointMark({
  point,
  selected,
  project,
  scale,
  onChoose,
}: {
  point: MapPoint;
  selected: boolean;
  project: (coordinates: [number, number]) => [number, number] | null;
  scale: number;
  onChoose: (event: SyntheticEvent, id: string) => void;
}) {
  const at = project([point.lon, point.lat]);
  if (!at) return null;
  return (
    <g
      className={`map-point${selected ? " selected" : ""}`}
      transform={`translate(${at[0]} ${at[1]}) scale(${1 / scale})`}
      onClick={(event) => onChoose(event, point.id)}
      role="button"
      tabIndex={0}
      aria-label={point.layer === "sejong" ? `${point.label.text} 세종학당` : point.label.text}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChoose(event, point.id);
        }
      }}
    >
      <circle r={11} className="point-hit" />
      {point.symbol === "city" ? (
        <circle r={3.3} className="city-dot" />
      ) : (
        <rect x={-4.7} y={-4.7} width={9.4} height={9.4} rx="1.3" transform="rotate(45)" />
      )}
    </g>
  );
}

function PlacedLabel({
  lon,
  lat,
  label,
  className,
  project,
  scale,
  onChoose,
}: {
  lon: number;
  lat: number;
  label: MapLabel;
  className: string;
  project: (coordinates: [number, number]) => [number, number] | null;
  scale: number;
  onChoose?: (event: SyntheticEvent) => void;
}) {
  const at = project([lon, lat]);
  if (!at) return null;
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${1 / scale})`}>
      {label.leader ? (
        <line className="map-leader" x1={0} y1={0} x2={label.dx} y2={label.dy} />
      ) : null}
      <text className={className} x={label.dx} y={label.dy} textAnchor={label.anchor} dy="0.32em" onClick={onChoose}>
        {label.text}
      </text>
    </g>
  );
}

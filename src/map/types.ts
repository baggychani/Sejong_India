import type { GeoGeometryObjects, GeoPermissibleObjects } from "d3-geo";

export type TextAnchor = "start" | "middle" | "end";

export type MapLabel = {
  text: string;
  dx: number;
  dy: number;
  anchor: TextAnchor;
  leader: boolean;
};

export type MapShape = {
  id: string;
  layer: string;
  className: string;
  geometry: GeoGeometryObjects;
  label?: MapLabel & { lon: number; lat: number };
};

export type MapPoint = {
  id: string;
  layer: string;
  className: string;
  symbol: "city" | "institute";
  lon: number;
  lat: number;
  label: MapLabel;
};

export type MapProjectionOptions = {
  parallels: readonly number[];
  centerLon: number;
};

export type MapViewProps = {
  fit: GeoPermissibleObjects;
  country: GeoGeometryObjects;
  neighbors: MapShape[];
  areas: MapShape[];
  boundaries: MapShape[];
  lines: MapShape[];
  points: MapPoint[];
  visibleLayers: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  projection: MapProjectionOptions;
};

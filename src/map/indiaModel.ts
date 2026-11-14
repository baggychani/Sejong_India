import { geoCentroid, type GeoGeometryObjects } from "d3-geo";
import type { DetailRecord } from "./details";
import type { MapPoint, MapShape } from "./types";
import indiaMap from "../../data/maps/india.json";
import cities from "../../data/content/cities.json";
import institutes from "../../data/content/institutes.json";
import rivers from "../../data/content/rivers.json";
import landforms from "../../data/content/landforms.json";
import neighbors from "../../data/content/neighbors.json";
import countryFile from "../../data/processed/india-country.json";
import adminFile from "../../data/processed/india-admin1.json";
import neighborFile from "../../data/processed/neighbors.json";
import riverFile from "../../data/processed/rivers.json";
import landformFile from "../../data/processed/landforms.json";

type Properties = Record<string, string | number | null | undefined>;

type Feature = {
  type: "Feature";
  properties: Properties;
  geometry: GeoGeometryObjects;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

type LabelLayout = {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
  leader: boolean;
};

function layout(value: {
  dx: number;
  dy: number;
  anchor: string;
  leader: boolean;
}): LabelLayout {
  const anchor =
    value.anchor === "start" || value.anchor === "end" ? value.anchor : "middle";
  return { dx: value.dx, dy: value.dy, anchor, leader: value.leader };
}

const unionTerritories = new Set([
  "IN-AN",
  "IN-CH",
  "IN-DH",
  "IN-DL",
  "IN-JK",
  "IN-LA",
  "IN-LD",
  "IN-PY",
]);

function text(properties: Properties, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function lineAnchor(geometry: GeoGeometryObjects): [number, number] | null {
  const points: [number, number][] = [];
  const pushLine = (line: number[][]) => {
    for (const pair of line) {
      if (pair.length >= 2) points.push([pair[0], pair[1]]);
    }
  };
  if (geometry.type === "LineString") pushLine(geometry.coordinates);
  if (geometry.type === "MultiLineString") {
    for (const line of geometry.coordinates) pushLine(line);
  }
  if (points.length === 0) return null;
  return points[Math.floor(points.length / 2)];
}

function areaAnchor(geometry: GeoGeometryObjects): [number, number] | null {
  const [lon, lat] = geoCentroid({ type: "Feature", properties: {}, geometry });
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

function asLabel(textValue: string, layout: LabelLayout, at: [number, number]) {
  return { text: textValue, ...layout, lon: at[0], lat: at[1] };
}

const country = countryFile as FeatureCollection;
const admin = adminFile as FeatureCollection;
const neighborGeo = neighborFile as FeatureCollection;
const riverGeo = riverFile as FeatureCollection;
const landformGeo = landformFile as FeatureCollection;

const countryGeometry = country.features[0]?.geometry;
if (!countryGeometry) {
  throw new Error("india country geometry missing");
}

const neighborContent = new Map(neighbors.map((item) => [item.id, item]));
const riverContent = new Map(rivers.map((item) => [item.id, item]));
const landformContent = new Map(landforms.map((item) => [item.id, item]));

export const mapConfig = indiaMap;

export const neighborShapes: MapShape[] = neighborGeo.features.flatMap((feature) => {
  const id = text(feature.properties, ["ADM0_A3", "adm0_a3"]);
  const content = neighborContent.get(id);
  const shape: MapShape = {
    id,
    layer: "neighbor",
    className: "map-neighbor",
    geometry: feature.geometry,
    label: content && asLabel(content.shortLabel, layout(content.label), content.at as [number, number]),
  };
  return [shape];
});

export const adminShapes: MapShape[] = admin.features.flatMap((feature) => {
  const id = text(feature.properties, ["iso_3166_2"]);
  if (!id) return [];
  return [
    {
      id,
      layer: "admin",
      className: "map-admin",
      geometry: feature.geometry,
    },
  ];
});

export const landformShapes: MapShape[] = landformGeo.features.flatMap((feature) => {
  const id = text(feature.properties, ["NAME", "name"]);
  const content = landformContent.get(id);
  if (!content) return [];
  const at = content.at
    ? (content.at as [number, number])
    : areaAnchor(feature.geometry);
  if (!at) return [];
  return [
    {
      id,
      layer: "landform",
      className: `map-area landform-${content.kind}`,
      geometry: feature.geometry,
      label: asLabel(content.shortLabel, layout(content.label), at),
    },
  ];
});

export const riverShapes: MapShape[] = riverGeo.features.flatMap((feature) => {
  const id = text(feature.properties, ["name", "NAME"]);
  const content = riverContent.get(id);
  if (!content) return [];
  const at = content.at
    ? (content.at as [number, number])
    : lineAnchor(feature.geometry);
  if (!at) return [];
  return [
    {
      id,
      layer: "river",
      className: content.major ? "map-river map-river-major" : "map-river",
      geometry: feature.geometry,
      label: asLabel(content.shortLabel, layout(content.label), at),
    },
  ];
});

export const cityPoints: MapPoint[] = cities.map((city) => ({
  id: city.id,
  layer: "city",
  className: "map-city",
  symbol: "city",
  lon: city.lon,
  lat: city.lat,
  label: { text: city.shortLabel, ...layout(city.label) },
}));

export const institutePoints: MapPoint[] = institutes.map((institute) => ({
  id: institute.id,
  layer: "sejong",
  className: "map-institute",
  symbol: "institute",
  lon: institute.lon,
  lat: institute.lat,
  label: { text: institute.names.ko.replace("인도 한국문화원", "뉴델리").replace(" 세종학당", ""), ...layout(institute.label) },
}));

const adminDetails: DetailRecord[] = admin.features.flatMap((feature) => {
  const id = text(feature.properties, ["iso_3166_2"]);
  if (!id) return [];
  const ko = text(feature.properties, ["name_ko", "name"]);
  const en = text(feature.properties, ["name_en", "name"]);
  const hi = text(feature.properties, ["name_hi"]);
  const kind = unionTerritories.has(id) ? "연방직할지" : "주";
  return [
    {
      id,
      eyebrow: kind,
      title: ko,
      subtitle: [en, hi].filter(Boolean).join(" · "),
    },
  ];
});

const landformDetails: DetailRecord[] = landforms.map((item) => ({
  id: item.id,
  eyebrow: "자연지리",
  title: item.names.ko,
  subtitle: [item.names.en, item.names.hi].filter(Boolean).join(" · "),
  summary: item.summary,
}));

const riverDetails: DetailRecord[] = rivers.map((item) => ({
  id: item.id,
  eyebrow: "강",
  title: item.names.ko,
  subtitle: [item.names.en, item.names.hi].filter(Boolean).join(" · "),
  summary: item.summary,
}));

const cityDetails: DetailRecord[] = cities.map((city) => ({
  id: city.id,
  eyebrow: "도시",
  title: city.names.ko,
  subtitle: [city.names.en, city.names.hi].filter(Boolean).join(" · "),
  summary: city.summary,
}));

const instituteDetails: DetailRecord[] = institutes.map((institute) => ({
  id: institute.id,
  eyebrow: "세종학당",
  title: institute.names.ko,
  subtitle: institute.names.en,
  allowances: institute.allowances,
  facts: [
    { label: "운영기관", value: `${institute.operator.ko} / ${institute.operator.en}` },
    {
      label: "도시",
      value: [institute.city.ko, institute.city.en, institute.city.hi].filter(Boolean).join(" · "),
    },
    { label: "주소", value: institute.address },
    { label: "위치 메모", value: institute.locationNote },
  ],
  links: [
    ...institute.sources.map(source => ({ label: `${source.title} (확인: ${source.accessed})`, href: source.url })),
    ...(institute.homepage
      ? [{ label: "홈페이지 열기", href: institute.homepage }]
      : []),
    {
      label: "Google 지도에서 검색",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(institute.mapsQuery)}`,
    },
  ],
}));

export const details = new Map<string, DetailRecord>(
  [...adminDetails, ...landformDetails, ...riverDetails, ...cityDetails, ...instituteDetails].map(
    (detail) => [detail.id, detail],
  ),
);

export const instituteList = institutes.map((institute) => ({
  id: institute.id,
  title: institute.names.ko,
  place: institute.city.ko,
}));

export const fitGeometry = countryGeometry;
export const countryGeometryOnly = countryGeometry;

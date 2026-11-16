import { readFile, writeFile } from "node:fs/promises";
import { geoArea } from "d3-geo";

// Simplified west-coast ring, sitting in the notch the country coastline already draws.
// The town itself is a little farther south. Sliding the ring there left a second shape in the sea.
const COASTAL_MAHE = [[75.304, 12.043], [75.222, 12.022], [75.223, 12.1], [75.276, 12.101], [75.304, 12.043]];

function polygonsOf(feature) {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  throw new Error("Puducherry geometry is not a polygon");
}

function outerBox(polygon) {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (const [x, y] of polygon[0]) {
    if (x < minx) minx = x;
    if (y < miny) miny = y;
    if (x > maxx) maxx = x;
    if (y > maxy) maxy = y;
  }
  return { minx, miny, maxx, maxy, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
}

function kind(box) {
  if (box.cx < 78) return "mahe";
  if (box.cy > 15) return "yanam";
  if (box.cy > 11.4) return "puducherry";
  return "karaikal";
}

function group(polygons) {
  const grouped = {};
  for (const polygon of polygons) {
    const name = kind(outerBox(polygon));
    if (grouped[name]) throw new Error(`Puducherry has two ${name} shapes`);
    grouped[name] = polygon;
  }
  return grouped;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function roundPolygon(polygon) {
  return polygon.map((ring) => {
    const rounded = ring.map(([x, y]) => [round3(x), round3(y)]);
    const first = rounded[0];
    const last = rounded[rounded.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) rounded[rounded.length - 1] = [...first];
    return rounded;
  });
}

function maheOnCoast(polygon) {
  if (!polygon || outerBox(polygon).cy < 11.9) return [COASTAL_MAHE];
  return polygon;
}

function orient(polygon) {
  const area = geoArea({ type: "Polygon", coordinates: polygon });
  if (area <= Math.PI * 2) return polygon;
  return polygon.map((ring) => [...ring].reverse());
}

/** Keep Puducherry's four separated regions on the simplified map. */
export async function fixPuducherryGeometry(processedPath, rawPath) {
  const processed = JSON.parse(await readFile(processedPath, "utf8"));
  const raw = JSON.parse(await readFile(rawPath, "utf8"));
  const feature = processed.features.find((item) => item.properties.iso_3166_2 === "IN-PY");
  const source = raw.features.find((item) => item.properties.iso_3166_2 === "IN-PY");
  if (!feature || !source) throw new Error("Puducherry geometry missing");

  const drawn = group(polygonsOf(feature));
  const original = group(polygonsOf(source));
  const mahe = maheOnCoast(drawn.mahe ?? original.mahe);
  if (!original.yanam || !drawn.puducherry || !drawn.karaikal) {
    throw new Error("Puducherry is missing one of its four regions");
  }

  feature.geometry = {
    type: "MultiPolygon",
    coordinates: [
      orient(drawn.puducherry),
      orient(drawn.karaikal),
      orient(mahe),
      orient(roundPolygon(original.yanam)),
    ],
  };

  const next = JSON.stringify(processed);
  if (next !== await readFile(processedPath, "utf8")) await writeFile(processedPath, next);

  const centers = {};
  for (const polygon of feature.geometry.coordinates) {
    const box = outerBox(polygon);
    centers[kind(box)] = [round3(box.cx), round3(box.cy)];
  }
  console.log("puducherry parts", centers);
  return centers;
}

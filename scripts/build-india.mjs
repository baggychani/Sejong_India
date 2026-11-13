import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import mapshaper from "mapshaper";
import { geoArea } from "d3-geo";

const root = path.resolve(import.meta.dirname, "..");
const cache = path.join(root, "data", "cache", "natural-earth", "v5.1.2");
const raw = path.join(root, "data", "raw", "south-asia");
const processed = path.join(root, "data", "processed");

const riverNames = [
  "Ganges",
  "Yamuna",
  "Brahmaputra",
  "Narmada",
  "Godävari",
  "Krishna",
  "Cauvery",
  "Mahäna Nadï",
];
const regionNames = [
  "HIMALAYAS",
  "WESTERN GHATS",
  "EASTERN GHATS",
  "DECCAN PLATEAU",
  "THAR DESERT",
  "Arvalli Ra.",
  "Vindhya Range",
  "Satpura Range",
];
const placeNames = [
  "New Delhi",
  "Mumbai",
  "Kolkata",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Pune",
  "Jaipur",
  "Agra",
  "Varanasi",
  "Amritsar",
  "Patna",
  "Imphal",
];

function quote(filePath) {
  return `"${filePath.replaceAll("\\", "/")}"`;
}

async function run(commands) {
  const output = await new Promise((resolve, reject) => {
    mapshaper.applyCommands(commands, (error, files) => {
      if (error) reject(error);
      else resolve(files ?? {});
    });
  });
  for (const [filePath, contents] of Object.entries(output)) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
    console.log("wrote", filePath);
  }
}

function jsList(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(",")}]`;
}

await mkdir(raw, { recursive: true });
await mkdir(processed, { recursive: true });

const countries = path.join(cache, "ne_10m_admin_0_countries.geojson");
const admin = path.join(cache, "ne_10m_admin_1_states_provinces.geojson");
const rivers = path.join(cache, "ne_10m_rivers_lake_centerlines.geojson");
const regions = path.join(cache, "ne_10m_geography_regions_polys.geojson");
const places = path.join(cache, "ne_10m_populated_places.geojson");

console.log("extract india");
await run(
  `-i ${quote(countries)} -filter 'ADM0_A3 == "IND"' -clean rewind -o format=geojson precision=0.00001 ${quote(path.join(raw, "india-country.geojson"))}`,
);
await run(
  `-i ${quote(admin)} -filter 'adm0_a3 == "IND"' -clean rewind -o format=geojson precision=0.00001 ${quote(path.join(raw, "india-admin1.geojson"))}`,
);
await orientPolygons(path.join(raw, "india-country.geojson"));
await orientPolygons(path.join(raw, "india-admin1.geojson"));

console.log("extract neighbors");
await run(
  `-i ${quote(countries)} -filter 'ADM0_A3 != "IND"' -clip bbox=25,-10,145,65 -filter-fields ADM0_A3 -clean rewind -o format=geojson precision=0.00001 ${quote(path.join(raw, "neighbors.geojson"))}`,
);

console.log("extract rivers");
await run(
  `-i ${quote(rivers)} -filter '${jsList(riverNames)}.indexOf(name) > -1' -clip bbox=67,6,98,36 -dissolve fields=name -o format=geojson precision=0.00001 ${quote(path.join(raw, "rivers.geojson"))}`,
);

console.log("extract landforms");
await run(
  `-i ${quote(regions)} -filter '${jsList(regionNames)}.indexOf(NAME) > -1' -clip ${quote(path.join(raw, "india-country.geojson"))} -clean rewind -o format=geojson precision=0.00001 ${quote(path.join(raw, "landforms.geojson"))}`,
);

console.log("extract places");
await run(
  `-i ${quote(places)} -filter 'ADM0_A3 == "IND" && ${jsList(placeNames)}.indexOf(NAME) > -1' -o format=geojson precision=0.00001 ${quote(path.join(raw, "places.geojson"))}`,
);

console.log("simplify country and states together");
await run(
  `-i ${quote(path.join(raw, "india-country.geojson"))} ${quote(path.join(raw, "india-admin1.geojson"))} combine-files -simplify visvalingam weighted 7% keep-shapes -clean rewind -o format=geojson precision=0.001 target=* ${quote(processed)}`,
);

console.log("simplify neighbors, rivers, landforms");
await run(
  `-i ${quote(path.join(raw, "neighbors.geojson"))} -simplify visvalingam weighted 2% keep-shapes -clean rewind -o format=geojson precision=0.001 ${quote(path.join(processed, "neighbors.json"))}`,
);
await run(
  `-i ${quote(path.join(raw, "rivers.geojson"))} -simplify visvalingam weighted 20% keep-shapes -clean -o format=geojson precision=0.001 ${quote(path.join(processed, "rivers.json"))}`,
);
await run(
  `-i ${quote(path.join(raw, "landforms.geojson"))} -simplify visvalingam weighted 15% keep-shapes -clean rewind -o format=geojson precision=0.001 ${quote(path.join(processed, "landforms.json"))}`,
);

async function orientPolygons(filePath) {
  const collection = JSON.parse(await readFile(filePath, "utf8"));
  for (const feature of collection.features) {
    const geometry = feature.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      continue;
    }
    if (geoArea(feature) <= Math.PI * 2) continue;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) ring.reverse();
    }
  }
  await writeFile(filePath, JSON.stringify(collection));
  console.log("oriented", filePath);
}

const polygonFiles = [
  path.join(raw, "india-country.geojson"),
  path.join(raw, "india-admin1.geojson"),
  path.join(raw, "neighbors.geojson"),
  path.join(raw, "landforms.geojson"),
  path.join(processed, "india-country.json"),
  path.join(processed, "india-admin1.json"),
  path.join(processed, "neighbors.json"),
  path.join(processed, "landforms.json"),
];
for (const filePath of polygonFiles) {
  await orientPolygons(filePath);
}

const placesGeo = JSON.parse(await readFile(path.join(raw, "places.geojson"), "utf8"));
const placeIndex = placesGeo.features.map((feature) => {
  const props = feature.properties;
  return {
    id: props.NAME,
    name: props.NAME,
    nameKo: props.NAME_KO,
    nameHi: props.NAME_HI,
    lat: props.LATITUDE,
    lon: props.LONGITUDE,
    popMax: props.POP_MAX,
  };
});
await writeFile(
  path.join(processed, "place-index.json"),
  JSON.stringify(placeIndex, null, 2),
);

const manifest = {
  source: "Natural Earth",
  version: "5.1.2",
  license: "public domain",
  builtAt: new Date().toISOString().slice(0, 10),
  simplify: {
    countryAndAdmin: "visvalingam weighted 7% keep-shapes",
    neighbors: "visvalingam weighted 2% keep-shapes",
    rivers: "visvalingam weighted 20% keep-shapes",
    landforms: "visvalingam weighted 15% keep-shapes",
  },
};
await writeFile(path.join(processed, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("build complete");

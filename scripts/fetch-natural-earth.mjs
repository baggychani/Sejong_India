import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const version = "v5.1.2";
const root = path.resolve(import.meta.dirname, "..");
const cacheDir = path.join(root, "data", "cache", "natural-earth", version);

const files = [
  "ne_10m_admin_0_countries.geojson",
  "ne_10m_admin_1_states_provinces.geojson",
  "ne_10m_rivers_lake_centerlines.geojson",
  "ne_10m_geography_regions_polys.geojson",
  "ne_10m_populated_places.geojson",
];

const sources = [
  (name) =>
    `https://github.com/nvkelso/natural-earth-vector/raw/${version}/geojson/${name}`,
  (name) =>
    `https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@${version}/geojson/${name}`,
];

async function alreadyDownloaded(filePath) {
  try {
    const info = await stat(filePath);
    return info.size > 1000;
  } catch {
    return false;
  }
}

async function download(name) {
  const destination = path.join(cacheDir, name);
  if (await alreadyDownloaded(destination)) {
    const info = await stat(destination);
    console.log(`skip ${name} (${info.size} bytes)`);
    return;
  }

  let lastError = null;
  for (const toUrl of sources) {
    const url = toUrl(name);
    console.log(`get ${url}`);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "SejongIndiaPersonalStudy/0.1" },
        redirect: "follow",
      });
      if (!response.ok || !response.body) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
      const info = await stat(destination);
      console.log(`saved ${name} (${info.size} bytes)`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`failed ${url}: ${error instanceof Error ? error.message : error}`);
    }
  }
  throw lastError ?? new Error(`could not download ${name}`);
}

await mkdir(cacheDir, { recursive: true });
for (const name of files) {
  await download(name);
}
console.log("natural earth cache ready");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, serializeOuter } from "parse5";
import { readablePage } from "./readable-html.mjs";

const load = name => JSON.parse(readFileSync(`data/content/${name}.json`, "utf8"));
const nodes = node => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const attr = (node, name) => node.attrs?.find(attribute => attribute.name === name)?.value;
const normalize = text => text.replace(/\s+/g, " ").trim();

export function verifyReligionContent(outDir) {
  const census = load("religions");
  const groups = new Set(census.groups.map(group => group.id));
  const places = new Map();
  const sources = new Set(census.sources.map(source => source.id));
  for (const profile of census.profiles) {
    assert(sources.has(profile.sourceId), `${profile.id}: unknown source`);
    assert.deepEqual(new Set(profile.religions.map(group => group.id)), groups, `${profile.id}: missing/duplicate religious category`);
    assert.equal(profile.religions.length, groups.size);
    assert(profile.religions.every(group => Number.isSafeInteger(group.population) && group.population >= 0));
    assert.equal(profile.religions.reduce((sum, group) => sum + group.population, 0), profile.population, `${profile.id}: categories must sum to whole population`);
    assert(profile.sourceAreas.length === profile.sourceRows.length && profile.sourceRows.length > 0);
    for (const id of profile.placeIds) { assert(!places.has(id), `duplicate place: ${id}`); places.set(id, profile); }
  }
  for (const place of [...load("institutes"), ...load("states")]) assert(places.has(place.id), `missing religion profile: ${place.id}`);
  for (const [id, total] of [["bengaluru", 8495492], ["chennai", 4646732], ["kancheepuram", 3998252], ["pune", 3124458], ["patna", 1684297], ["barasat-i", 294628], ["imphal", 277196], ["barasat", 278435]]) {
    const profile = census.profiles.find(profile => profile.id === id);
    assert.equal(profile.population, total, `${id}: preserve the chosen 2011 geographic scope`);
    assert.equal(profile.sourceRows.length, 1, `${id}: city aggregate and its parts must not be counted together`);
  }
  for (const route of ["bharat/religions", "bharat/map"]) {
    const html = readFileSync(join(outDir, route, "index.html"), "utf8");
    const markdown = normalize(readFileSync(join(outDir, route, "index.md"), "utf8"));
    const document = nodes(parse(html, { scriptingEnabled: false }));
    for (const profile of census.profiles) {
      const record = document.find(node => attr(node, "id") === `religion-${profile.id}`);
      assert(record, `${route}: missing regional profile ${profile.id}`);
      const rows = nodes(record).filter(node => node.tagName === "tr" && attr(node, "data-religion"));
      assert.equal(rows.length, groups.size);
      for (const entry of profile.religions) {
        const row = rows.find(node => attr(node, "data-religion") === entry.id);
        const text = normalize(readablePage(`<main><table><tbody>${serializeOuter(row)}</tbody></table></main>`, "https://example.org/"));
        const share = entry.population / profile.population * 100;
        const percent = share > 0 && share < 0.05 ? "<0.1%" : `${share.toFixed(1)}%`;
        assert(text.includes(`${entry.population.toLocaleString("ko-KR")}명`) && text.includes(percent), `${profile.id}/${entry.id}: wrong count/denominator/rounding`);
        const rank = entry.id === "not-stated" ? "순위 제외" : `${1 + profile.religions.filter(other => other.id !== "not-stated" && other.population > entry.population).length}위`;
        assert(text.includes(rank), `${profile.id}/${entry.id}: wrong rank`);
        assert(markdown.includes(text), `${profile.id}/${entry.id}: missing text row`);
      }
    }
  }
  const html = readFileSync(join(outDir, "bharat/religions/index.html"), "utf8");
  assert(html.split("</head>")[0].includes("ReligionPage-"), "religion page CSS must load before hydration");
  assert(html.includes('href="/Sejong_India/bharat/religions"'), "missing internal religion menu link");
  const rendered = nodes(parse(html, { scriptingEnabled: true }));
  assert(!rendered.some(node => attr(node, "id") === "religion-reference"), "full reference must remain inside noscript");
  console.log(`PASS: ${census.profiles.length} religion profiles; complete mapped state/institute coverage; exact counts, denominators, ranking, scope and static tab data verified.`);
}

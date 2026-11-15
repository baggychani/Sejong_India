import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, serializeOuter } from "parse5";
import { readablePage } from "./readable-html.mjs";
import { geoContains } from "d3-geo";

const data = name => JSON.parse(readFileSync(`data/content/${name}.json`, "utf8"));
const normalize = value => String(value).replace(/\s+/g, " ").trim();

export function verifyContentFields(outDir) {
  let fields = 0;
  function page(path) {
    const html = readFileSync(join(outDir, path, "index.html"), "utf8");
    const markdown = readFileSync(join(outDir, path, "index.md"), "utf8");
    const nodes = new Map();
    function visit(node) {
      const id = node.attrs?.find(attr => attr.name === "id")?.value;
      if (id) { assert(!nodes.has(id), `${path}: duplicate id ${id}`); nodes.set(id, node); }
      for (const child of node.childNodes ?? []) visit(child);
    }
    visit(parse(html, { scriptingEnabled: false }));
    return id => {
      const node = nodes.get(id);
      assert(node, `${path}: missing static record ${id}`);
      const text = readablePage(`<main>${serializeOuter(node)}</main>`, "https://baggychani.github.io/Sejong_India/");
      assert(normalize(markdown).includes(normalize(text)), `${path}: ${id} missing from Markdown`);
      return {
        text: normalize(text),
        expect(value) {
          assert(normalize(text).includes(normalize(value)), `${path} / ${id}: missing ${value}`);
          fields += 1;
        },
      };
    };
  }

  const map = page("bharat/map");
  const institutes = data("institutes");
  const states = data("states");
  const admin = JSON.parse(readFileSync("data/processed/india-admin1.json", "utf8")).features;
  const stateIds = new Set(states.map(state => state.id));
  assert.equal(stateIds.size, states.length, "duplicate state record");
  assert.deepEqual([...stateIds].sort(), admin.map(feature => feature.properties.iso_3166_2).sort(), "state content must cover every mapped administrative area");
  const staticHtml = parse(readFileSync(join(outDir, "bharat/map/index.html"), "utf8"), { scriptingEnabled: false });
  const allNodes = node => [node, ...(node.childNodes ?? []).flatMap(allNodes)];
  const attr = (node, key) => node.attrs?.find(attribute => attribute.name === key)?.value;
  const nodes = allNodes(staticHtml);
  for (const state of states) {
    const record = map(`state-${state.id}`);
    record.expect(state.capital);
    if (state.capitalNote) record.expect(state.capitalNote);
    for (const city of state.majorCities ?? []) record.expect(city);
    const node = nodes.find(node => attr(node, "id") === `state-${state.id}`);
    const labels = allNodes(node).filter(node => node.tagName === "dt").map(node => allNodes(node).filter(child => child.nodeName === "#text").map(child => child.value).join(""));
    assert(["주도", "행정 중심지"].includes(labels[0]), `${state.id}: capital must precede mother tongues`);
    assert.equal(labels.includes("주요도시"), Boolean(state.majorCities?.length), `${state.id}: major cities must be conditional`);
    if (state.majorCities?.length) assert.equal(labels[1], "주요도시");
    if (state.emblem) {
      const emblem = allNodes(node).find(node => node.tagName === "img" && attr(node, "alt") === state.emblem.caption);
      assert(attr(emblem, "src")?.includes("/assets/"), `${state.id}: emblem asset missing`);
      for (const value of [state.emblem.caption, state.emblem.source, state.emblem.credit, state.emblem.license]) record.expect(value);
    }
  }
  for (const institute of institutes) {
    const record = map(`institute-${institute.id}`);
    assert(stateIds.has(institute.stateId), `${institute.id}: unknown state link`);
    assert(geoContains(admin.find(feature => feature.properties.iso_3166_2 === institute.stateId), [institute.lon, institute.lat]), `${institute.id}: institute point lies outside its assigned state`);
    record.expect(admin.find(feature => feature.properties.iso_3166_2 === institute.stateId).properties.name_ko);
    for (const value of [
      ...Object.values(institute.names), ...Object.values(institute.operator), ...Object.values(institute.city),
      institute.address, institute.locationNote, institute.homepage,
    ].filter(Boolean)) record.expect(value);
    record.expect(`주거지원비 ${institute.allowances.housingManwon}만 원`);
    record.expect(`특수지 근무수당 ${institute.allowances.hardshipManwon === null ? "미확인" : `${institute.allowances.hardshipManwon}만 원`}`);
    record.expect(encodeURIComponent(institute.mapsQuery));
    for (const source of institute.sources) {
      record.expect(source.title); record.expect(source.url); record.expect(source.accessed);
    }
  }
  for (const group of ["cities", "rivers", "landforms"]) {
    for (const item of data(group)) {
      const record = map(`${group}-${encodeURIComponent(item.id)}`);
      for (const name of Object.values(item.names)) record.expect(name);
      record.expect(item.summary);
    }
  }
  const census = data("mother-tongues");
  for (const [index, profile] of census.profiles.entries()) {
    const record = map(`mother-tongues-${index}`);
    record.expect(profile.area); record.expect(`${census.year}년`);
    for (const language of profile.languages) record.expect(`${language.name} ${language.sharePct}%`);
  }

  const list = page("bharat/languages");
  const languages = data("languages");
  for (const language of languages) {
    for (const record of [list(`language-${language.id}`), page(`bharat/languages/${language.id}`)(`language-${language.id}`)]) {
      record.expect(language.family);
      record.expect(language.census2011GroupSpeakers == null ? "자료 없음" : `${language.census2011GroupSpeakers.toLocaleString("ko-KR")}명`);
      record.expect(`헌법 제8부속서 등재 ${language.scheduled ? "예" : "아니요"}`);
      record.expect(`지정 고전어 ${language.classical ? "예" : "아니요"}`);
    }
  }
  function checkMembers(id, predicate) {
    const record = list(id);
    for (const language of languages) {
      const url = new RegExp(`/bharat/languages/${language.id}\\)`);
      assert.equal(url.test(record.text), predicate(language), `${id}: incorrect membership for ${language.id}`);
    }
  }
  checkMembers("language-constitution", language => language.scheduled);
  checkMembers("language-classical", language => language.classical);
  for (const family of new Set(languages.map(language => language.family))) {
    checkMembers(`family-${family}`, language => language.family === family);
  }
  const home = readFileSync(join(outDir, "index.md"), "utf8");
  assert(!/^# .* {2,}.*$/m.test(home), "home heading contains repeated spaces");
  console.log(`PASS: ${fields} source fields preserved in static HTML and Markdown: ${institutes.length} institutes, ${languages.length} languages, ${census.profiles.length} mother-tongue profiles, cities, rivers and landforms; exact tab memberships verified.`);
}

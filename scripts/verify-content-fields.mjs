import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, serializeOuter } from "parse5";
import { readablePage } from "./readable-html.mjs";
import { geoContains } from "d3-geo";

const data = name => JSON.parse(readFileSync(`data/content/${name}.json`, "utf8"));
const normalize = value => String(value).replace(/\s+/g, " ").trim();
const seasonMarks = { "☀️": "여름 주도", "❄️": "겨울 주도" };

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
    if (state.capitalNote) {
      // 비고는 주도 칸에 문장으로 붙이지 않고 ? 버튼의 설명으로만 제공한다.
      record.expect(state.capitalNote);
      const note = allNodes(nodes.find(node => attr(node, "id") === `state-${state.id}`)).find(node => attr(node, "class") === "fact-note");
      assert.equal(attr(note, "aria-label"), `비고: ${state.capitalNote}`, `${state.id}: capital note must be a ? button`);
    }
    for (const city of state.majorCities ?? []) record.expect(city);
    const node = nodes.find(node => attr(node, "id") === `state-${state.id}`);
    const labels = allNodes(node).filter(node => node.tagName === "dt").map(node => allNodes(node).filter(child => child.nodeName === "#text").map(child => child.value).join(""));
    assert(["주도", "행정 중심지"].includes(labels[0]), `${state.id}: capital must precede mother tongues`);
    assert.equal(labels.includes("주요도시"), Boolean(state.majorCities?.length), `${state.id}: major cities must be conditional`);
    if (state.majorCities?.length) assert.equal(labels[1], "주요도시");
    // 계절 주도는 글자가 아닌 표식으로 적고, 표식의 뜻은 같은 레코드 안에서 글로 읽혀야 한다.
    assert(!/여름|겨울/.test(state.capital), `${state.id}: seasonal capitals use ☀️/❄️ marks, not words`);
    for (const [mark, meaning] of Object.entries(seasonMarks)) if (state.capital.includes(mark)) record.expect(`${mark} ${meaning}`);
    for (const city of state.majorCities ?? []) assert(!state.capital.includes(city), `${state.id}: ${city} is already listed as a capital`);
    if (state.emblem) {
      const emblem = allNodes(node).find(node => node.tagName === "img" && attr(node, "alt") === state.emblem.caption);
      assert(attr(emblem, "src")?.includes("/assets/"), `${state.id}: emblem asset missing`);
      for (let ancestor = emblem.parentNode; ancestor; ancestor = ancestor.parentNode) {
        assert.notEqual(ancestor.tagName, "a", `${state.id}: emblem must not be a link`);
      }
      for (const value of [state.emblem.caption, state.emblem.source, state.emblem.credit, state.emblem.license]) record.expect(value);
    }
    const description = allNodes(node).find(child => attr(child, "class") === "detail-description");
    assert.equal(Boolean(description), Boolean(state.description?.length), `${state.id}: description box must follow source data`);
    if (description) {
      assert.equal(description.tagName, "div", `${state.id}: description must be always visible`);
      assert(!allNodes(description).some(child => ["details", "summary", "button"].includes(child.tagName)), `${state.id}: description must not have disclosure controls`);
      const list = description.childNodes.find(child => child.tagName === "ul");
      assert(list, `${state.id}: description must be a bullet list`);
      const items = list.childNodes.filter(child => child.tagName === "li");
      assert.equal(items.length, state.description.length, `${state.id}: each source paragraph needs one bullet`);
      state.description.forEach((item, index) => {
        record.expect(item.text);
        const itemText = allNodes(items[index]).filter(child => child.nodeName === "#text").map(child => child.value).join("");
        assert.equal(itemText, item.text, `${state.id}: bullet text must preserve the complete source paragraph`);
        const keywords = allNodes(items[index]).filter(child => child.tagName === "strong" && attr(child, "class") === "description-keyword");
        for (const keyword of item.keywords ?? []) {
          assert(keyword && item.text.includes(keyword), `${state.id}: keyword must occur in its paragraph`);
          assert(keywords.some(child => child.childNodes.map(text => text.value ?? "").join("") === keyword), `${state.id}: missing keyword emphasis: ${keyword}`);
        }
      });
      const siblings = description.parentNode.childNodes.filter(child => child.tagName);
      assert.equal(siblings[siblings.indexOf(description) - 1]?.tagName, "dl", `${state.id}: description must follow the facts, outside the table`);
      assert(!allNodes(description).some(child => /^h[1-6]$/.test(child.tagName)), `${state.id}: description must not have an added heading`);
    }
  }
  for (const institute of institutes) {
    const record = map(`institute-${institute.id}`);
    assert(stateIds.has(institute.stateId), `${institute.id}: unknown state link`);
    assert(geoContains(admin.find(feature => feature.properties.iso_3166_2 === institute.stateId), [institute.lon, institute.lat]), `${institute.id}: institute point lies outside its assigned state`);
    const stateName = admin.find(feature => feature.properties.iso_3166_2 === institute.stateId).properties.name_ko;
    record.expect(`${[institute.city.ko, institute.city.en, institute.city.hi, institute.city.ta].filter(Boolean).join(" · ")} | ${stateName}`);
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

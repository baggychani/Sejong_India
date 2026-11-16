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
  assert(html.includes('href="/Sejong_India/bharat/foods"'), "missing internal food menu link");
  const rendered = nodes(parse(html, { scriptingEnabled: true }));
  assert(!rendered.some(node => attr(node, "id") === "religion-reference"), "full reference must remain inside noscript");

  // 종교 목록·상세·지도 pill은 같은 원본에서 계산하고 서로 연결되어야 한다.
  const pages = load("religion-pages");
  const groupNames = new Map(census.groups.map(group => [group.id, group.name]));
  const nation = census.profiles.find(profile => profile.id === "india");
  const regions = census.profiles.filter(profile => profile.placeIds.some(id => id.startsWith("IN-")));
  const count = (profile, group) => profile.religions.find(entry => entry.id === group).population;
  const percent = (population, total) => { const share = population / total * 100; return share > 0 && share < 0.05 ? "<0.1%" : `${share.toFixed(1)}%`; };
  assert.equal(new Set(pages.map(page => page.id)).size, pages.length, "duplicate religion page");
  assert(!rendered.some(node => attr(node, "class")?.split(/\s+/).includes("religion-table")), "census tables stay out of the visible religion list");
  // 목록은 전국 신자 수가 많은 순이다.
  const tileOrder = rendered.map(node => attr(node, "id")).filter(id => id?.startsWith("religion-page-"));
  assert.deepEqual(tileOrder, [...pages].sort((a, b) => count(nation, b.censusGroup) - count(nation, a.censusGroup)).map(page => `religion-page-${page.id}`), "religion tiles must follow nationwide population");
  for (const page of pages) {
    assert.equal(groupNames.get(page.censusGroup), page.ko, `${page.id}: page name must match its census category`);
    const tile = rendered.find(node => attr(node, "id") === `religion-page-${page.id}`);
    assert(attr(tile, "href")?.endsWith(`/bharat/religions/${page.id}`), `${page.id}: list tile must link to its page`);
    const detailHtml = readFileSync(join(outDir, `bharat/religions/${page.id}/index.html`), "utf8");
    assert(detailHtml.split("</head>")[0].includes("ReligionPage-"), `${page.id}: page CSS must load before hydration`);
    const text = normalize(readablePage(detailHtml, "https://example.org/"));
    const population = count(nation, page.censusGroup);
    for (const value of [page.ko, page.en, `${population.toLocaleString("ko-KR")}명`, percent(population, nation.population), `${census.year}년 인구조사`]) {
      assert(text.includes(value), `${page.id}: detail page is missing ${value}`);
    }
    // 종교 페이지는 언어 페이지가 아니다. 이름을 인도 문자로 다시 적지 않는다.
    assert(!/\p{Script=Devanagari}|\p{Script=Gurmukhi}/u.test(text), `${page.id}: native-script names must not return`);
    for (const html of [detailHtml, serializeOuter(tile)]) {
      const symbol = nodes(parse(html, { scriptingEnabled: true })).find(node => attr(node, "class")?.split(/\s+/).includes("religion-symbol"));
      assert(attr(symbol, "style")?.includes("/assets/"), `${page.id}: symbol image missing`);
    }
    // 분포는 표가 아니라 지도로 보여 준다. 지도의 색·이름표와 글 목록은 같은 계산에서 나와야 한다.
    const expected = regions.map(profile => ({ profile, population: count(profile, page.censusGroup) }))
      .sort((a, b) => b.population / b.profile.population - a.population / a.profile.population);
    const detail = nodes(parse(detailHtml, { scriptingEnabled: false }));
    const shares = new Map(detail.filter(node => attr(node, "data-place")).map(node => [attr(node, "data-place"), node]));
    for (const { profile, population } of expected) {
      for (const id of profile.placeIds.filter(id => id.startsWith("IN-"))) {
        const shape = shares.get(id);
        assert.equal(attr(shape, "data-share"), percent(population, profile.population), `${page.id}: wrong map share for ${id}`);
        assert(attr(shape, "href")?.includes(`/bharat/map?place=${id}`), `${page.id}: map region ${id} must open the map`);
      }
    }
    assert.equal(shares.size, load("states").length, `${page.id}: every state and territory must be drawn once`);
    assert.deepEqual(detail.filter(node => attr(node, "data-label")).map(node => attr(node, "data-label")),
      page.mapLabels === false ? [] : expected.slice(0, 5).map(entry => entry.profile.placeIds[0]), `${page.id}: map labels must name the highest-share regions`);
    const list = detail.find(node => attr(node, "id") === `religion-regions-${page.id}`);
    const items = nodes(list).filter(node => node.tagName === "li");
    assert.deepEqual(items.map(node => attr(node, "data-region")), expected.map(entry => entry.profile.id), `${page.id}: text list must cover every region in share order`);
    items.forEach((item, index) => {
      const { profile, population } = expected[index];
      const line = normalize(readablePage(`<main><ol>${serializeOuter(item)}</ol></main>`, "https://example.org/"));
      for (const value of [profile.area, percent(population, profile.population), `${population.toLocaleString("ko-KR")}명`, profile.note].filter(Boolean)) {
        assert(line.includes(value) && text.includes(line), `${page.id}: text list is missing ${value} for ${profile.id}`);
      }
    });
  }
  const mapDocument = nodes(parse(readFileSync(join(outDir, "bharat/map/index.html"), "utf8"), { scriptingEnabled: false }));
  const pageByGroup = new Map(pages.map(page => [page.censusGroup, page.id]));
  for (const [kind, list] of [["institute", load("institutes")], ["state", load("states")]]) {
    for (const place of list) {
      const record = mapDocument.find(node => attr(node, "id") === `${kind}-${place.id}`);
      const links = nodes(record).map(node => attr(node, "href")).filter(Boolean);
      const ranked = places.get(place.id).religions.filter(group => group.id !== "not-stated");
      for (const group of ranked) {
        const rank = 1 + ranked.filter(other => other.population > group.population).length;
        const id = pageByGroup.get(group.id);
        if (rank <= 3 && id) assert(links.some(href => href.endsWith(`/bharat/religions/${id}`)), `${place.id}: ${group.id} pill must link to its religion page`);
      }
    }
  }
  console.log(`PASS: ${census.profiles.length} religion profiles; complete mapped state/institute coverage; exact counts, denominators, ranking, scope and static tab data verified; ${pages.length} religion pages match the census and connect to the list and map pills.`);
}

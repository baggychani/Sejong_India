import assert from "node:assert/strict";
import { globSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse, serializeOuter } from "parse5";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { readablePage } from "./readable-html.mjs";

// A new file/key must be classified here. Public values are checked against
// the record's actual HTML and Markdown; technical exemptions need a reason.
const publicValue = (format = value => value == null ? "" : String(value)) => ({ kind: "public", format });
const technical = reason => ({ kind: "technical", reason });
const name = { ko: publicValue(), en: publicValue(), hi: publicValue() };
const identity = technical("레코드와 URL을 연결하는 내부 식별자다.");
const layout = technical("지도 라벨의 위치·정렬·연결선 배치 설정이다.");
const coordinates = technical("지도 도형과 점을 그리기 위한 좌표다.");
const geometry = {
  id: identity, names: name, shortLabel: technical("지도에는 줄인 이름을 사용한다. 공개 이름은 names로 검사한다."),
  label: layout, summary: publicValue(),
};
const jsonContracts = {
  institutes: {
    targets: row => [["bharat/map", `institute-${row.id}`]],
    schema: { id: identity, names: name, operator: name, city: name, address: publicValue(),
      locationNote: publicValue(), homepage: publicValue(), mapsQuery: publicValue(encodeURIComponent),
      allowances: { housingManwon: publicValue(value => `${value}만 원`), hardshipManwon: publicValue(value => value === null ? "미확인" : `${value}만 원`) },
      sources: [{ title: publicValue(), url: publicValue(), accessed: publicValue() }],
      shortLabel: geometry.shortLabel, lat: coordinates, lon: coordinates, label: layout,
      precision: technical("좌표의 정확도 코드다. 사용자가 읽는 위치 제약은 locationNote로 검사한다.") },
  },
  cities: { targets: row => [["bharat/map", `cities-${encodeURIComponent(row.id)}`]], schema: { ...geometry, lat: coordinates, lon: coordinates } },
  rivers: { targets: row => [["bharat/map", `rivers-${encodeURIComponent(row.id)}`]], schema: { ...geometry, at: coordinates, major: technical("지도에서 강의 선 두께를 고르는 표시 옵션이다.") } },
  landforms: { targets: row => [["bharat/map", `landforms-${encodeURIComponent(row.id)}`]], schema: { ...geometry, at: coordinates, kind: technical("지형의 지도 색상과 도형을 고르는 코드다. 이름과 설명은 별도 공개 필드다.") } },
  neighbors: { targets: () => [["bharat/map", "neighbor-reference"]], schema: { id: identity, shortLabel: publicValue(), at: coordinates, label: layout } },
  languages: {
    targets: row => [["bharat/languages", `language-${row.id}`], [`bharat/languages/${row.id}`]],
    schema: { id: identity, ko: publicValue(), en: publicValue(), native: publicValue(), family: publicValue(),
      census2011GroupSpeakers: publicValue(value => value == null ? "자료 없음" : `${value.toLocaleString("ko-KR")}명`),
      scheduled: publicValue(value => `헌법 제8부속서 등재 ${value ? "예" : "아니요"}`),
      classical: publicValue(value => `지정 고전어 ${value ? "예" : "아니요"}`),
      tag: technical("HTML lang 속성에 쓰는 언어 식별 코드다. 언어 이름은 별도 공개 필드다.") },
  },
  "mother-tongues": { targets: () => [["bharat/map", "map-reference"]], schema: {
    year: publicValue(), profiles: [{ area: publicValue(),
      placeIds: technical("조사 지역을 지도 레코드와 연결하는 내부 키다. 조사 지역명은 area로 검사한다."),
      languages: [{ name: publicValue(), sharePct: publicValue(value => `${value}%`) }] }],
  } },
  textbooks: { targets: row => [[`lessons/${row.id}`]], schema: {
    id: identity, title: publicValue(), level: publicValue(), source: publicValue(),
    cover: technical("표지 이미지 경로다. 이미지 속 정보에 본문을 의존하지 않는다."),
  } },
};
const entryFields = { title: publicValue(), summary: publicValue(), textbook: technical("교안을 교재에 연결하는 내부 키다.") };
const markdownContracts = {
  library: { route: "library", schema: { ...entryFields, author: publicValue(), subtitle: publicValue(), translator: publicValue(), publisher: publicValue(), pages: publicValue(), status: publicValue(),
    read: publicValue(value => { const [y, m, d] = value.split("-"); return [y && `${y}년`, m && `${Number(m)}월`, d && `${Number(d)}일`].filter(Boolean).join(" "); }),
    cover: jsonContracts.textbooks.schema.cover, spine: technical("책등의 배경색이다."), ink: technical("책등 글자색이다."), pose: technical("책장의 진열 방식이다."), order: technical("서재의 표시 순서를 지정하는 정렬 값이다.") } },
  hindi: { route: "hindi", schema: entryFields }, study: { route: "interview", schema: entryFields }, lessons: { route: "lessons", schema: entryFields },
};
const normalize = value => String(value).replace(/\s+/g, " ").trim();

export function verifyContentContract(outDir, { datasets = {}, markdown = {} } = {}) {
  const pageCache = new Map();
  let publicChecks = 0;
  let technicalChecks = 0;
  function output(route, id) {
    const key = `${route}#${id ?? "main"}`;
    if (pageCache.has(key)) return pageCache.get(key);
    const html = readFileSync(join(outDir, route, "index.html"), "utf8");
    let source = html;
    if (id) {
      function find(node) {
        if (node.attrs?.some(attr => attr.name === "id" && attr.value === id)) return node;
        for (const child of node.childNodes ?? []) { const found = find(child); if (found) return found; }
      }
      const node = find(parse(html));
      assert(node, `missing contract target: ${key}`);
      source = `<main>${serializeOuter(node)}</main>`;
    }
    const url = `https://baggychani.github.io/Sejong_India/${route}/`;
    const texts = [normalize(readablePage(source, url)), normalize(readFileSync(join(outDir, route, "index.md"), "utf8"))];
    pageCache.set(key, texts);
    return texts;
  }
  function check(value, schema, targets, field) {
    if (schema?.kind === "technical") {
      assert(schema.reason?.trim(), `technical exemption needs a reason: ${field}`);
      technicalChecks += 1;
      return;
    }
    if (schema?.kind === "public") {
      const expected = normalize(schema.format(value));
      if (expected) for (const target of targets) for (const text of output(...target)) {
        assert(text.includes(expected), `public field missing from HTML/Markdown: ${field} = ${expected}`);
        publicChecks += 1;
      }
      return;
    }
    if (Array.isArray(value)) {
      assert(Array.isArray(schema), `unclassified content array: ${field}`);
      value.forEach((item, index) => check(item, schema[0], targets, `${field}[${index}]`));
      return;
    }
    assert(value && typeof value === "object" && schema, `unclassified content field: ${field}`);
    for (const [key, child] of Object.entries(value)) {
      assert(Object.hasOwn(schema, key), `unclassified content field: ${field}.${key}; update scripts/content-contract.mjs and its static renderer`);
      check(child, schema[key], targets, `${field}.${key}`);
    }
  }
  const datasetFiles = new Set([...readdirSync("data/content").filter(file => file.endsWith(".json")), ...Object.keys(datasets).map(key => `${key}.json`)]);
  for (const file of datasetFiles) {
    const kind = file.slice(0, -5);
    const contract = jsonContracts[kind];
    assert(contract, `unclassified content dataset: ${file}; add its rendering and contract`);
    const source = Object.hasOwn(datasets, kind) ? datasets[kind] : JSON.parse(readFileSync(join("data/content", file), "utf8"));
    const records = Array.isArray(source) ? source : [source];
    for (const row of records) check(row, contract.schema, contract.targets(row), file);
  }
  for (const file of globSync("content/**/*.md")) {
    const [kind, name, extra] = relative("content", file).split(/[\\/]/);
    const contract = markdownContracts[kind];
    assert(contract && !extra, `unclassified Markdown collection/path: ${file}`);
    const raw = markdown[file.replace(/\\/g, "/")] ?? readFileSync(file, "utf8");
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    const meta = {};
    if (match) for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator >= 0) meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    }
    const route = `${contract.route}/${name.slice(0, -3)}`;
    check(meta, contract.schema, [[route]], file);
    const body = (match ? match[2] : raw).trim();
    if (body) {
      const markup = renderToStaticMarkup(createElement(ReactMarkdown, null, body));
      const expected = normalize(readablePage(`<main>${markup}</main>`, `https://baggychani.github.io/Sejong_India/${route}/`));
      for (const text of output(route)) assert(text.includes(expected), `Markdown body missing from HTML/text: ${file}`);
    }
  }
  console.log(`PASS: content contract checked ${publicChecks} public values and ${technicalChecks} documented technical fields; unknown datasets/fields fail closed.`);
}

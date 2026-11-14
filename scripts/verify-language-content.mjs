import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "parse5";

const source = name => JSON.parse(readFileSync(`data/content/${name}.json`, "utf8"));
const attribute = (node, name) => node.attrs?.find(attr => attr.name === name)?.value;
const hasClass = (node, name) => attribute(node, "class")?.split(/\s+/).includes(name);
function visibleNodes(node) {
  if (node.tagName === "noscript") return [];
  return [node, ...(node.childNodes ?? []).flatMap(visibleNodes)];
}
const scripts = {
  hindi: "Devanagari", bengali: "Bengali", marathi: "Devanagari", telugu: "Telugu", tamil: "Tamil",
  gujarati: "Gujarati", urdu: "Arabic", kannada: "Kannada", odia: "Oriya", malayalam: "Malayalam",
  punjabi: "Gurmukhi", assamese: "Bengali", maithili: "Devanagari", santali: "Ol_Chiki", kashmiri: "Arabic",
  nepali: "Devanagari", sindhi: "Arabic", dogri: "Devanagari", konkani: "Devanagari", manipuri: "Meetei_Mayek",
  bodo: "Devanagari", sanskrit: "Devanagari", pali: "Devanagari", prakrit: "Devanagari",
};

export function verifyLanguageContent(outDir) {
  const languages = source("languages");
  const goals = source("language-goals");
  assert.equal(new Set(goals.map(goal => goal.id)).size, goals.length, "duplicate goal language");
  assert.deepEqual(goals.map(goal => goal.id).sort(), languages.map(language => language.id).sort(), "every language needs one goal sentence");
  for (const goal of goals) {
    assert(goal.text.trim() && goal.romanization.trim(), `${goal.id}: empty sentence or romanization`);
    assert(new RegExp(`\\p{Script=${scripts[goal.id]}}`, "u").test(goal.text), `${goal.id}: native script missing`);
    assert(/\p{Script=Latin}/u.test(goal.romanization), `${goal.id}: Latin reading missing`);
    assert(!/\p{Script=Hangul}/u.test(goal.romanization), `${goal.id}: Korean pronunciation is prohibited`);
    assert(["draft", "reviewed"].includes(goal.reviewStatus), `${goal.id}: unknown review status`);
    if (goal.reviewStatus === "reviewed") {
      assert(goal.editorial.reviewedBy?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(goal.editorial.reviewedAt), `${goal.id}: reviewed content needs reviewer and date`);
    }
    const html = readFileSync(join(outDir, `bharat/languages/${goal.id}/index.html`), "utf8");
    assert(html.includes(`id="language-goal-${goal.id}"`));
    assert(html.includes(goal.reviewStatus === "draft" ? "번역·전사 초안" : "검수 완료"));
    assert(!html.includes('class="text-version"'), "AI footer must not return");
    const nodes = visibleNodes(parse(html, { scriptingEnabled: true }));
    const visibleText = nodes.filter(node => node.nodeName === "#text").map(node => node.value).join(" ");
    for (const label of ["나의 목표", "로마자 전사", "번역·전사 초안", "검수 완료", "지역 모어 1위", "2011"]) {
      assert(!visibleText.includes(label), `${goal.id}: unwanted visible label ${label}`);
    }
    const identity = nodes.find(node => hasClass(node, "language-identity"));
    assert(identity && visibleNodes(identity).some(node => attribute(node, "id") === `language-goal-${goal.id}`), `${goal.id}: sentence must stay inside identity card`);
  }

  const census = source("mother-tongues");
  const aliases = { "마니푸리어(메이테이어)": "manipuri" };
  const expected = new Map(languages.map(language => [language.id, new Map()]));
  for (const institute of source("institutes")) {
    const profile = census.profiles.find(profile => profile.placeIds.includes(institute.id));
    if (!profile?.languages.length) continue;
    const sorted = [...profile.languages].sort((a, b) => b.sharePct - a.sharePct);
    for (const top of sorted) {
      const rank = sorted.findIndex(entry => entry.sharePct === top.sharePct) + 1;
      if (rank > 2) continue;
      const id = aliases[top.name] ?? languages.find(language => language.ko === top.name)?.id;
      if (!id) continue; // Unlisted languages retain their rank in the full profile.
      expected.get(id).set(institute.id, rank);
    }
  }
  for (const language of languages) {
    const html = readFileSync(join(outDir, `bharat/languages/${language.id}/index.html`), "utf8");
    const actual = new Map();
    function visit(node) {
      const id = node.attrs?.find(attr => attr.name === "data-institute")?.value;
      if (id) {
        assert(!actual.has(id), `${language.id}: duplicate institute badge ${id}`);
        actual.set(id, Number(attribute(node, "data-rank")));
        assert(attribute(node, "href")?.includes(`/bharat/map?place=${id}`), `${language.id}: badge ${id} missing map link`);
      }
      for (const child of node.childNodes ?? []) visit(child);
    }
    visit(parse(html, { scriptingEnabled: true }));
    assert.deepEqual(actual, expected.get(language.id), `${language.id}: incorrect regional rank badges`);
  }
  const mapDoc = parse(readFileSync(join(outDir, "bharat/map/index.html"), "utf8"), { scriptingEnabled: false });
  const catalog = new Map(languages.map(language => [language.ko, language.id]));
  const languageId = name => aliases[name] ?? catalog.get(name);
  function findId(node, id) {
    if (node.attrs?.some(attr => attr.name === "id" && attr.value === id)) return node;
    for (const child of node.childNodes ?? []) {
      const found = findId(child, id);
      if (found) return found;
    }
  }
  function hrefs(node, found = []) {
    const href = attribute(node, "href");
    if (href) found.push(href);
    for (const child of node.childNodes ?? []) hrefs(child, found);
    return found;
  }
  for (const institute of source("institutes")) {
    const profile = census.profiles.find(profile => profile.placeIds.includes(institute.id));
    if (!profile?.languages.length) continue;
    const shown = profile.languages.slice(0, 3);
    const hindiAt = profile.languages.findIndex(language => language.name === "힌디어");
    if (hindiAt >= 3) shown.push(profile.languages[hindiAt]);
    const record = findId(mapDoc, `institute-${institute.id}`);
    assert(record, `missing institute reference ${institute.id}`);
    const links = hrefs(record);
    for (const language of shown) {
      const id = languageId(language.name);
      if (!id) continue;
      assert(links.some(href => href.includes(`/bharat/languages/${id}`)), `${institute.id}: missing language link for ${language.name}`);
    }
  }
  console.log(`PASS: ${goals.length} in-card examples with no visible editorial labels; review state retained; top-two badges match complete ${census.year} profiles; institute and language links connect.`);
}

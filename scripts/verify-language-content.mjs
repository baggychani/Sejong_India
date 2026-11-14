import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "parse5";

const source = name => JSON.parse(readFileSync(`data/content/${name}.json`, "utf8"));
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
  }

  const census = source("mother-tongues");
  const aliases = { "마니푸리어(메이테이어)": "manipuri" };
  const expected = new Map(languages.map(language => [language.id, new Set()]));
  for (const institute of source("institutes")) {
    const profile = census.profiles.find(profile => profile.placeIds.includes(institute.id));
    if (!profile?.languages.length) continue;
    const max = Math.max(...profile.languages.map(language => language.sharePct));
    for (const top of profile.languages.filter(language => language.sharePct === max)) {
      const id = aliases[top.name] ?? languages.find(language => language.ko === top.name)?.id;
      assert(id, `unmapped regional leader ${top.name}`);
      expected.get(id).add(institute.id);
    }
  }
  for (const language of languages) {
    const html = readFileSync(join(outDir, `bharat/languages/${language.id}/index.html`), "utf8");
    const actual = new Set();
    function visit(node) {
      const id = node.attrs?.find(attr => attr.name === "data-institute")?.value;
      if (id) actual.add(id);
      for (const child of node.childNodes ?? []) visit(child);
    }
    visit(parse(html, { scriptingEnabled: true }));
    assert.deepEqual(actual, expected.get(language.id), `${language.id}: incorrect regional rank badges`);
  }
  console.log(`PASS: ${goals.length} native-script goals and Latin readings; review state required; regional badges match ${census.year} source data.`);
}

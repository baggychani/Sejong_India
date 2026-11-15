import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { geoCentroid } from "d3-geo";
import { makeQuiz, QUIZ_LENGTH } from "../src/map/quiz.ts";

// 난수를 고정해 같은 검사가 매번 같은 문제지를 본다.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function verifyQuiz(outDir) {
  const admin = JSON.parse(readFileSync("data/processed/india-admin1.json", "utf8")).features;
  const regions = admin.map(feature => {
    const [lon, lat] = geoCentroid(feature);
    return { id: feature.properties.iso_3166_2, name: feature.properties.name_ko, lon, lat };
  });
  assert.equal(new Set(regions.map(region => region.name)).size, regions.length, "quiz answers need distinct names");
  const ids = new Set(regions.map(region => region.id));
  const asked = new Set();
  for (let round = 0; round < 300; round++) {
    const quiz = makeQuiz(regions, seeded(round + 1));
    assert.equal(quiz.length, QUIZ_LENGTH);
    assert.equal(new Set(quiz.map(question => question.id)).size, QUIZ_LENGTH, "a quiz must not ask the same region twice");
    assert.deepEqual(quiz.map(question => question.kind), [...Array(5).fill("name"), ...Array(5).fill("locate")], "five naming questions, then five locating questions");
    for (const question of quiz) {
      assert(ids.has(question.id));
      asked.add(question.id);
      if (question.kind !== "name") continue;
      assert.equal(new Set(question.choices).size, 4, "four distinct choices");
      assert(question.choices.includes(question.id), "the answer must be among the choices");
      assert(question.choices.every(id => ids.has(id)));
    }
  }
  assert.equal(asked.size, regions.length, "every state and territory can be asked");
  // 퀴즈는 연습 기능일 뿐 새 공개 정보를 싣지 않는다. 시작 버튼만 초기 HTML에 있으면 된다.
  const html = readFileSync(join(outDir, "bharat/map/index.html"), "utf8");
  assert(html.includes('class="quiz-toggle"'), "quiz button missing from the map");
  console.log(`PASS: quizzes ask ${QUIZ_LENGTH} distinct regions (5 naming with 4 choices, 5 locating) and can reach all ${regions.length} regions.`);
}

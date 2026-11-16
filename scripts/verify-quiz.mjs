import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { geoCentroid } from "d3-geo";
import { lessonPlanForm } from "../src/site/lessonPlanForm.ts";
import { readablePage } from "./readable-html.mjs";
import { makeQuiz, quizWeight, QUIZ_LENGTH } from "../src/map/quiz.ts";

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
  const asked = new Map();
  const ROUNDS = 3000;
  for (let round = 0; round < ROUNDS; round++) {
    const quiz = makeQuiz(regions, seeded(round + 1));
    assert.equal(quiz.length, QUIZ_LENGTH);
    assert.equal(new Set(quiz.map(question => question.id)).size, QUIZ_LENGTH, "a quiz must not ask the same region twice");
    assert.deepEqual(quiz.map(question => question.kind), [...Array(5).fill("name"), ...Array(5).fill("locate")], "five naming questions, then five locating questions");
    for (const question of quiz) {
      assert(ids.has(question.id));
      asked.set(question.id, (asked.get(question.id) ?? 0) + 1);
      if (question.kind !== "name") continue;
      assert.equal(new Set(question.choices).size, 4, "four distinct choices");
      assert(question.choices.includes(question.id), "the answer must be among the choices");
      assert(question.choices.every(id => ids.has(id)));
    }
  }
  assert.equal(asked.size, regions.length, "every state and territory can be asked");
  // 우선순위가 낮은 곳은 나오긴 하되 다른 곳의 절반보다 덜 나와야 한다.
  const usual = regions.filter(region => quizWeight(region.id) === 1).map(region => asked.get(region.id));
  const average = usual.reduce((sum, count) => sum + count, 0) / usual.length;
  for (const region of regions.filter(region => quizWeight(region.id) < 1)) {
    assert(asked.get(region.id) > 0 && asked.get(region.id) < average / 2, `${region.id}: low-priority regions must appear less often`);
  }
  assert(Math.min(...usual) > average * 0.8, "ordinary regions should be asked about equally often");
  // 퀴즈는 연습 기능일 뿐 새 공개 정보를 싣지 않는다. 시작 버튼만 초기 HTML에 있으면 된다.
  const html = readFileSync(join(outDir, "bharat/map/index.html"), "utf8");
  assert(html.includes('class="quiz-toggle"'), "quiz button missing from the map");
  // 교안 양식: 책장의 종이 한 장이 양식 페이지로 이어지고, 양식의 칸 이름이 글로 읽혀야 한다.
  const shelf = readFileSync(join(outDir, "lessons/index.html"), "utf8");
  assert(shelf.includes(`/lessons/${lessonPlanForm.slug}"`) && shelf.includes('class="plan-sheet-link"'), "lesson plan sheet missing from the shelf");
  const formText = readablePage(readFileSync(join(outDir, `lessons/${lessonPlanForm.slug}/index.html`), "utf8"), "https://example.org/");
  const formMarkdown = readFileSync(join(outDir, `lessons/${lessonPlanForm.slug}/index.md`), "utf8");
  for (const value of [lessonPlanForm.title, lessonPlanForm.context, lessonPlanForm.source, ...lessonPlanForm.header.flatMap(cell => [cell.label, cell.value]), ...lessonPlanForm.rows,
    lessonPlanForm.materials.label, ...lessonPlanForm.materials.who, ...lessonPlanForm.columns, ...lessonPlanForm.stages].filter(Boolean)) {
    assert(formText.includes(value) && formMarkdown.includes(value), `lesson plan form is missing ${value}`);
  }
  console.log(`PASS: quizzes ask ${QUIZ_LENGTH} distinct regions (5 naming with 4 choices, 5 locating) and can reach all ${regions.length} regions.`);
}

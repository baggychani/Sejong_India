// 주 이름 퀴즈의 출제 규칙. 지도·화면과 무관한 순수 계산이라 검사 스크립트에서도 그대로 불러 쓴다.
export type QuizRegion = { id: string; name: string; lon: number; lat: number };
// 알아 두면 좋지만 우선순위가 낮은 곳은 덜 자주 낸다. 화면에는 드러내지 않는다.
const RARE = new Set(["IN-LD", "IN-DH", "IN-AN"]);
export const quizWeight = (id: string) => RARE.has(id) ? 0.25 : 1;
/** name: 지도에 표시된 곳의 이름을 4지선다로 고른다. locate: 이름을 보고 지도에서 누른다. */
export type QuizQuestion = { kind: "name"; id: string; choices: string[] } | { kind: "locate"; id: string };

export const QUIZ_LENGTH = 10;
const NAME_QUESTIONS = 5;
const CHOICES = 4;
const NEARBY = 7;

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distance(a: QuizRegion, b: QuizRegion) {
  const toRad = Math.PI / 180;
  const x = (a.lon - b.lon) * toRad * Math.cos((a.lat + b.lat) / 2 * toRad);
  const y = (a.lat - b.lat) * toRad;
  return Math.hypot(x, y);
}

/** 열 문제의 대상은 서로 겹치지 않는다. 오답 보기는 가까운 지역에서 뽑아 위치를 대충 알아서는 못 풀게 한다. */
export function makeQuiz(regions: readonly QuizRegion[], random: () => number = Math.random): QuizQuestion[] {
  if (regions.length < QUIZ_LENGTH) throw new Error("not enough regions for a quiz");
  // 가중치를 둔 비복원 추출: 무작위 값에 1/가중치 제곱을 한 순서로 뽑은 뒤, 문제 순서는 다시 섞는다.
  const picked = regions.map(region => ({ region, key: random() ** (1 / quizWeight(region.id)) }))
    .sort((a, b) => b.key - a.key).slice(0, QUIZ_LENGTH).map(entry => entry.region);
  return shuffled(picked, random).map((target, index) => {
    if (index >= NAME_QUESTIONS) return { kind: "locate", id: target.id };
    const nearby = regions.filter(region => region.id !== target.id)
      .sort((a, b) => distance(a, target) - distance(b, target)).slice(0, NEARBY);
    const wrong = shuffled(nearby, random).slice(0, CHOICES - 1);
    return { kind: "name", id: target.id, choices: shuffled([target, ...wrong], random).map(region => region.id) };
  });
}

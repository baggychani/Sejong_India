// 힌디어 단어 퀴즈의 출제 규칙. 화면과 무관한 순수 계산이라 검사 스크립트에서도 그대로 불러 쓴다.
export type QuizWord = { id: string; word: string; roman: string; meaning: string };
/** meaning: 데바나가리 낱말을 보고 뜻을 고른다. word: 뜻을 보고 데바나가리 낱말을 고른다. */
export type WordQuestion = { kind: "meaning" | "word"; id: string; choices: string[] };

export const MIN_QUESTIONS = 5;
const CHOICES = 4;
const NEARBY = 8;

/** 전사를 볼 수 있는 횟수. 적어도 5번, 문항이 많으면 다섯 문항에 한 번꼴. */
export const hintBudget = (questions: number) => Math.max(5, Math.ceil(questions / 5));

// 뜻이 거의 같아 서로의 오답 보기로 내면 불공정한 단어들.
const ALIKE = [
  ["namaste", "namaskar"], ["dhanyavad", "shukriya"], ["han", "ji"], ["thik-hai", "koi-bat-nahin", "accha"],
  ["alvida", "phir-milenge"], ["tu", "tum", "ap"], ["sikhana", "parhana"], ["parhna", "sikhna"],
  ["lekin", "par", "magar"], ["phir", "tab", "to"], ["admi", "larka"], ["aurat", "larki"],
];
const alike = (a: string, b: string) => ALIKE.some(group => group.includes(a) && group.includes(b));

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 문제의 대상은 서로 겹치지 않는다. 앞 절반은 뜻 고르기, 뒤 절반은 낱말 고르기다.
 * 단어장은 주제별로 이어 적으므로, 오답 보기는 목록에서 가까운 단어에서 뽑아 같은 부류끼리 헷갈리게 한다.
 * only를 주면 그 단어들만 문제로 낸다(틀린 것만 다시 풀기).
 */
export function makeWordQuiz(words: readonly QuizWord[], count: number, random: () => number = Math.random, only?: readonly string[]): WordQuestion[] {
  if (words.length < CHOICES) throw new Error("not enough words for a quiz");
  const pool = only ? words.filter(word => only.includes(word.id)) : words;
  const targets = shuffled(pool, random).slice(0, Math.max(1, Math.min(count, pool.length)));
  const half = Math.ceil(targets.length / 2);
  return targets.map((target, index) => {
    const at = words.findIndex(word => word.id === target.id);
    const nearby = words.map((word, position) => ({ word, distance: Math.abs(position - at) }))
      .filter(({ word }) => word.id !== target.id && !alike(word.id, target.id) && word.meaning !== target.meaning && word.word !== target.word)
      .sort((a, b) => a.distance - b.distance).slice(0, NEARBY).map(entry => entry.word);
    const wrong = shuffled(nearby, random).slice(0, CHOICES - 1);
    return { kind: index < half ? "meaning" : "word", id: target.id, choices: shuffled([target, ...wrong], random).map(word => word.id) };
  });
}

export const similarWords = alike;

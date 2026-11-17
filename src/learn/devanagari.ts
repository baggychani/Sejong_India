// 데바나가리 낱말을 음절 덩어리(악샤라)와 그 구성 글자로 나누고, 로마자(IAST)와 짝짓는다.
// 화면과 검사 스크립트가 함께 쓰는 순수 계산이다.

/**
 * consonant: 자음 글자 · half: 모음을 뗀 자음(결합 자음의 앞부분) · vowel: 홀로 쓰는 모음 글자
 * sign: 자음에 붙는 모음 부호 · inherent: 부호가 없을 때 따라오는 기본 모음 a · mark: 비음·기음 부호
 */
export type PartKind = "consonant" | "half" | "vowel" | "sign" | "inherent" | "mark";
export type Part = { kind: PartKind; glyph: string; roman: string; silent?: boolean; rule?: SilentRule; note?: string; verdict?: string };

/** 소리 나지 않는 기본 모음 a가 어느 규칙에 해당하는지. */
export type SilentRule = "final" | "medial";
export const SILENT_RULES: Record<SilentRule, string> = {
  final: "단어 끝 자음 뒤의 /a/는 발음하지 않는다.",
  medial: "앞뒤에 모음이 있는 두 자음 사이에 낀 /a/는 발음하지 않는다. (모음-자음-/a/-자음-모음)",
};
/** 단어 끝인데도 /a/가 남는 경우. 로마자에 끝 a가 적힌 단어에서 역산한다. */
export const KEPT_FINAL_A = "단어 끝 /a/는 보통 발음하지 않지만, 끝이 자음 묶음이고 마지막 자음이 /y/·/r/·/l/·/v/이면 /a/를 약하게 발음한다.";
const KEEPS_FINAL_A = new Set(["य", "र", "ल", "व"]);
/** 비음·기음 부호가 무엇인지. 쪼갠 화면의 ? 에서 보여 준다. */
export const MARK_NOTES: Record<string, string> = {
  "\u0902": "아누스와라. 뒤 자음과 같은 자리에서 나는 콧소리다. 뒤에 자음이 없거나 입을 막는 자음이 아니면 앞의 모음을 콧소리로 낸다.",
  "\u0901": "찬드라빈두. 모음을 콧소리로 낸다.",
  "\u0903": "비사르가. 모음 뒤에 숨을 가볍게 내쉬는 h 소리다.",
};
export type Akshara = { text: string; parts: Part[] };
/** 부호 설명 다음 줄에 이 칸의 판정을 붙인다. 화면의 ? 에서 보여 준다. */
export const partNote = (part: Part) => part.verdict ? `${part.note}\n${part.verdict}` : part.note;

const VIRAMA = "्";
const NUKTA = "़";
const PLACEHOLDER = "◌";

const nfc = (table: Record<string, string>) => Object.fromEntries(Object.entries(table).map(([key, value]) => [key, value.normalize("NFC")]));

const CONSONANTS = nfc({
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ṅ",
  च: "c", छ: "ch", ज: "j", झ: "jh", ञ: "ñ",
  ट: "ṭ", ठ: "ṭh", ड: "ḍ", ढ: "ḍh", ण: "ṇ",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v",
  श: "ś", ष: "ṣ", स: "s", ह: "h",
});
// 점(누크타)을 찍어 만든 글자. IAST에는 없어 ISO 15919 표기를 따른다.
const DOTTED = nfc({ क: "q", ख: "k͟h", ग: "ġ", ज: "z", ड: "ṛ", ढ: "ṛh", फ: "f" });
const VOWELS = nfc({ अ: "a", आ: "ā", इ: "i", ई: "ī", उ: "u", ऊ: "ū", ऋ: "ṛ", ए: "e", ऐ: "ai", ओ: "o", औ: "au" });
const SIGNS = nfc({ "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū", "ृ": "ṛ", "े": "e", "ै": "ai", "ो": "o", "ौ": "au" });
const MARKS = nfc({ "ं": "ṃ", "ँ": "m̐", "ः": "ḥ" });

function parseWord(word: string): Akshara[] {
  const chars = Array.from(word);
  const aksharas: Akshara[] = [];
  let i = 0;
  while (i < chars.length) {
    const start = i;
    const parts: Part[] = [];
    if (VOWELS[chars[i]]) {
      parts.push({ kind: "vowel", glyph: chars[i], roman: VOWELS[chars[i]] });
      i++;
    } else if (CONSONANTS[chars[i]]) {
      // 결합 자음은 '자음+비라마'가 이어지다가 마지막 자음에서 모음을 얻는다.
      for (;;) {
        let glyph = chars[i];
        let roman = CONSONANTS[glyph];
        i++;
        if (chars[i] === NUKTA) {
          if (!DOTTED[glyph]) throw new Error(`unsupported dotted letter in ${word}: ${glyph}`);
          roman = DOTTED[glyph];
          glyph += NUKTA;
          i++;
        }
        if (chars[i] === VIRAMA) {
          i++;
          parts.push({ kind: "half", glyph: glyph + VIRAMA, roman });
          if (CONSONANTS[chars[i]]) continue;
          break;
        }
        parts.push({ kind: "consonant", glyph, roman });
        if (SIGNS[chars[i]]) {
          parts.push({ kind: "sign", glyph: PLACEHOLDER + chars[i], roman: SIGNS[chars[i]] });
          i++;
        } else {
          parts.push({ kind: "inherent", glyph: PLACEHOLDER, roman: "a" });
        }
        break;
      }
    } else {
      throw new Error(`unsupported Devanagari letter in ${word}: ${chars[i]}`);
    }
    while (MARKS[chars[i]]) {
      parts.push({ kind: "mark", glyph: PLACEHOLDER + chars[i], roman: MARKS[chars[i]], note: MARK_NOTES[chars[i]] });
      i++;
    }
    aksharas.push({ text: chars.slice(start, i).join(""), parts });
  }
  return aksharas;
}

/** 힌디어는 기본 모음 a를 자주 발음하지 않는다. 주어진 로마자와 맞춰 보아 소리 나지 않는 a를 찾는다. */
function markSilent(aksharas: Akshara[], target: string, word: string) {
  const parts = aksharas.flatMap(akshara => akshara.parts);
  const silent = new Set<number>();
  function walk(index: number, at: number): boolean {
    if (index === parts.length) return at === target.length;
    const part = parts[index];
    if (target.startsWith(part.roman, at) && walk(index + 1, at + part.roman.length)) return true;
    if (part.kind !== "inherent") return false;
    silent.add(index);
    if (walk(index + 1, at)) return true;
    silent.delete(index);
    return false;
  }
  if (!walk(0, 0)) throw new Error(`romanization does not match the letters: ${word} / ${target}`);
  for (const index of silent) parts[index].silent = true;
}

/** 로마자에서 역산한 묵음 a에 규칙을 붙인다. 어느 규칙에도 맞지 않으면(예외) 비워 둔다. */
function classifySilent(aksharas: Akshara[]) {
  const voiced = (akshara?: Akshara) => akshara?.parts.some(part => ["vowel", "sign", "inherent"].includes(part.kind) && !part.silent);
  aksharas.forEach((akshara, at) => {
    const kept = akshara.parts.find(item => item.kind === "inherent" && !item.silent);
    if (kept && at === aksharas.length - 1) {
      // 끝 자음 묶음(예: त्र)의 마지막 자음이 y·r·l·v이면 끝 /a/가 약하게 남는다.
      const consonants = akshara.parts.filter(item => item.kind === "half" || item.kind === "consonant");
      const last = consonants.at(-1);
      if (consonants.length > 1 && last && KEEPS_FINAL_A.has(last.glyph)) {
        kept.note = KEPT_FINAL_A;
        kept.verdict = `끝 자음 묶음 /${consonants.map(item => item.roman).join("")}/의 마지막이 /${last.roman}/이므로 /a/를 약하게 발음한다.`;
      }
    }
    const part = akshara.parts.find(item => item.kind === "inherent" && item.silent);
    if (!part) return;
    if (at === aksharas.length - 1) { part.rule = "final"; return; }
    // VC a CV: 앞 음절에 소리 나는 모음, 이 음절은 자음 하나, 다음 음절은 자음 하나 + 소리 나는 모음.
    const single = (item?: Akshara) => item?.parts.filter(p => p.kind === "consonant" || p.kind === "half").length === 1;
    if (at > 0 && voiced(aksharas[at - 1]) && single(akshara) && single(aksharas[at + 1]) && voiced(aksharas[at + 1])) part.rule = "medial";
  });
}

// 아누스와라 뒤에 입을 막는 자음(자음표 다섯 줄)이 오면 그 줄의 콧소리가 된다.
// 소리는 단어장 칸 아래와 같은 로마자로 적는다.
const NASAL_PLACES: [string, string, string][] = [
  ["연구개음", "कखगघङ", "ङ"],
  ["경구개음", "चछजझञ", "ञ"],
  ["권설음", "टठडढण", "ण"],
  ["치음", "तथदधन", "न"],
  ["양순음", "पफबभम", "म"],
];
const STOP_NASAL = new Map(NASAL_PLACES.flatMap(([place, letters, nasal]) => Array.from(letters).map(letter => [letter, { place, nasal }] as const)));
// 입을 완전히 막지 않는 자음 앞에서는 앞 모음을 콧소리로 낸다. 값은 소리의 종류와 그 로마자에 붙는 조사.
const OPEN_CONSONANTS: Record<string, [string, string]> = {
  य: ["접근음", "가"], व: ["접근음", "가"], र: ["탄음", "이"], ल: ["설측음", "이"],
  श: ["마찰음", "가"], ष: ["마찰음", "가"], स: ["마찰음", "가"], ह: ["마찰음", "가"],
};
const ANUSVARA = "ं";

/** 아누스와라마다 뒤 글자를 보고 실제 소리를 정한다. 정할 수 없으면(점 찍은 글자 등) 비워 둔다. */
function judgeAnusvara(aksharas: Akshara[]) {
  aksharas.forEach((akshara, at) => {
    const mark = akshara.parts.find(part => part.kind === "mark" && part.glyph.endsWith(ANUSVARA));
    if (!mark) return;
    const next = aksharas[at + 1]?.parts[0];
    if (!next) { mark.verdict = "단어의 끝이므로 앞의 모음을 콧소리로 발음한다."; return; }
    if ((next.kind !== "consonant" && next.kind !== "half") || next.glyph.includes(NUKTA)) return;
    const letter = Array.from(next.glyph)[0];
    const stop = STOP_NASAL.get(letter);
    const open = OPEN_CONSONANTS[letter];
    if (stop) mark.verdict = `뒤 자음이 /${CONSONANTS[letter]}/이므로 같은 자리(${stop.place})의 /${CONSONANTS[stop.nasal]}/(${stop.nasal})으로 발음한다.`;
    else if (open) mark.verdict = `뒤 자음 /${CONSONANTS[letter]}/${open[1]} 입을 완전히 막지 않는 소리(${open[0]})이므로 앞의 모음을 콧소리로 발음한다.`;
  });
}

/** 띄어 쓴 낱말마다 악샤라 목록을 돌려준다. */
export function readWord(text: string, roman: string): Akshara[][] {
  const words = text.normalize("NFC").trim().split(/\s+/);
  const romans = roman.normalize("NFC").trim().split(/\s+/);
  if (words.length !== romans.length) throw new Error(`word count differs: ${text} / ${roman}`);
  return words.map((word, index) => {
    const aksharas = parseWord(word);
    markSilent(aksharas, romans[index], word);
    classifySilent(aksharas);
    judgeAnusvara(aksharas);
    return aksharas;
  });
}

/** 소리 나는 대로의 로마자. 발음하지 않는 기본 모음은 뺀다. */
export const aksharaRoman = (akshara: Akshara) => akshara.parts.filter(part => !part.silent).map(part => part.roman).join("");

/** 글자표. 데바나가리 익히기 화면이 같은 표에서 글자와 로마자를 가져다 쓴다. */
export const LETTERS = { consonants: CONSONANTS, dotted: DOTTED, vowels: VOWELS, signs: SIGNS, marks: MARKS, places: NASAL_PLACES };

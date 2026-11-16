// 데바나가리 낱말을 음절 덩어리(악샤라)와 그 구성 글자로 나누고, 로마자(IAST)와 짝짓는다.
// 화면과 검사 스크립트가 함께 쓰는 순수 계산이다.

/**
 * consonant: 자음 글자 · half: 모음을 뗀 자음(결합 자음의 앞부분) · vowel: 홀로 쓰는 모음 글자
 * sign: 자음에 붙는 모음 부호 · inherent: 부호가 없을 때 따라오는 기본 모음 a · mark: 비음·기음 부호
 */
export type PartKind = "consonant" | "half" | "vowel" | "sign" | "inherent" | "mark";
export type Part = { kind: PartKind; glyph: string; roman: string; silent?: boolean; rule?: SilentRule };

/** 소리 나지 않는 기본 모음 a가 어느 규칙에 해당하는지. V는 모음, C는 자음. */
export type SilentRule = "final" | "medial";
export const SILENT_RULES: Record<SilentRule, string> = {
  final: "단어 끝 C 뒤의 a는 발음하지 않는다.",
  medial: "VCaCV에서 가운데 a는 발음하지 않는다.",
};
export type Akshara = { text: string; parts: Part[] };

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
      parts.push({ kind: "mark", glyph: PLACEHOLDER + chars[i], roman: MARKS[chars[i]] });
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
    const part = akshara.parts.find(item => item.kind === "inherent" && item.silent);
    if (!part) return;
    if (at === aksharas.length - 1) { part.rule = "final"; return; }
    // VC a CV: 앞 음절에 소리 나는 모음, 이 음절은 자음 하나, 다음 음절은 자음 하나 + 소리 나는 모음.
    const single = (item?: Akshara) => item?.parts.filter(p => p.kind === "consonant" || p.kind === "half").length === 1;
    if (at > 0 && voiced(aksharas[at - 1]) && single(akshara) && single(aksharas[at + 1]) && voiced(aksharas[at + 1])) part.rule = "medial";
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
    return aksharas;
  });
}

/** 소리 나는 대로의 로마자. 발음하지 않는 기본 모음은 뺀다. */
export const aksharaRoman = (akshara: Akshara) => akshara.parts.filter(part => !part.silent).map(part => part.roman).join("");

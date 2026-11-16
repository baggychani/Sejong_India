import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aksharaRoman, readWord } from "../src/learn/devanagari.ts";
import { readablePage } from "./readable-html.mjs";

export function verifyHindiWords(outDir) {
  const words = JSON.parse(readFileSync("data/content/hindi-words.json", "utf8"));
  assert.equal(new Set(words.map(word => word.id)).size, words.length, "duplicate Hindi word id");
  assert.equal(new Set(words.map(word => word.word)).size, words.length, "duplicate Hindi word");
  for (const word of words) {
    assert(/^[\p{Script=Devanagari}\s]+$/u.test(word.word), `${word.id}: word must be Devanagari`);
    assert(!/\p{Script=Hangul}|\p{Script=Devanagari}/u.test(word.roman), `${word.id}: romanization must be Latin`);
    assert(/\p{Script=Hangul}/u.test(word.meaning), `${word.id}: meaning must be Korean`);
    // 글자를 나눈 결과를 다시 이으면 원본 낱말과 로마자가 그대로 나와야 한다.
    const reading = readWord(word.word, word.roman);
    assert.equal(reading.map(group => group.map(akshara => akshara.text).join("")).join(" "), word.word.normalize("NFC"), `${word.id}: letters lost while splitting`);
    assert.equal(reading.map(group => group.map(aksharaRoman).join("")).join(" "), word.roman.normalize("NFC"), `${word.id}: romanization does not follow the letters`);
  }
  // 대표 사례: नमस्ते = न + म + स्ते, 그리고 स्ते = स् + त + े
  const [namaste] = readWord("नमस्ते", "namaste");
  assert.deepEqual(namaste.map(akshara => [akshara.text, aksharaRoman(akshara)]), [["न", "na"], ["म", "ma"], ["स्ते", "ste"]]);
  assert.deepEqual(namaste[2].parts.map(part => [part.kind, part.roman]), [["half", "s"], ["consonant", "t"], ["sign", "e"]]);
  // 발음하지 않는 기본 모음: नाम = nām (끝의 a는 소리 나지 않는다)
  const [nam] = readWord("नाम", "nām");
  assert.deepEqual(nam[1].parts.map(part => [part.kind, Boolean(part.silent)]), [["consonant", false], ["inherent", true]]);
  assert.throws(() => readWord("नाम", "nom"), /does not match/);

  const page = readablePage(readFileSync(join(outDir, "learn/hindi/words/index.html"), "utf8"), "https://example.org/");
  for (const word of words) for (const value of [word.word, word.roman, word.meaning]) assert(page.includes(value.normalize("NFC")) || page.includes(value), `${word.id}: ${value} missing from the reading path`);
  assert(readFileSync(join(outDir, "learn/hindi/index.html"), "utf8").includes('/learn/hindi/words"'), "Hindi page must link to the word study page");
  console.log(`PASS: ${words.length} Hindi words split into letters that rebuild the word and its romanization; study page linked and readable without JavaScript.`);
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aksharaRoman, KEPT_FINAL_A, MARK_NOTES, readWord, SILENT_RULES } from "../src/learn/devanagari.ts";
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
  // 묵음 a 규칙: 단어 끝 / 모음-자음-a-자음-모음 / 자음이 뭉치면 남김
  const rules = (word, roman) => readWord(word, roman)[0].flatMap(akshara => akshara.parts.filter(part => part.silent).map(part => part.rule));
  assert.deepEqual(rules("नाम", "nām"), ["final"]);
  assert.deepEqual(rules("लड़का", "laṛkā"), ["medial"]);
  assert.deepEqual(rules("नमस्ते", "namaste"), []);
  // 아누스와라 판정: 뒤 파열음과 같은 자리의 콧소리 / 그 밖의 자음·단어 끝은 앞 모음을 콧소리로
  const verdicts = (word, roman) => readWord(word, roman)[0].flatMap(akshara => akshara.parts.flatMap(part => part.verdict ? [part.verdict] : []));
  assert.deepEqual(verdicts("मिलेंगे", "mileṃge"), ["이 단어의 경우, 뒤 자음이 /g/이므로 같은 자리(연구개음)의 /ṅ/(ङ)으로 발음한다."]);
  assert.deepEqual(verdicts("पंजाब", "paṃjāb"), ["이 단어의 경우, 뒤 자음이 /j/이므로 같은 자리(경구개음)의 /ñ/(ञ)으로 발음한다."]);
  assert.deepEqual(verdicts("ठंडा", "ṭhaṃḍā"), ["이 단어의 경우, 뒤 자음이 /ḍ/이므로 같은 자리(권설음)의 /ṇ/(ण)으로 발음한다."]);
  assert.deepEqual(verdicts("हिंदी", "hiṃdī"), ["이 단어의 경우, 뒤 자음이 /d/이므로 같은 자리(치음)의 /n/(न)으로 발음한다."]);
  assert.deepEqual(verdicts("लंबा", "laṃbā"), ["이 단어의 경우, 뒤 자음이 /b/이므로 같은 자리(양순음)의 /m/(म)으로 발음한다."]);
  assert.deepEqual(verdicts("संसार", "saṃsār"), ["이 단어의 경우, 뒤 자음 /s/가 입을 완전히 막지 않는 소리(마찰음)이므로 앞의 모음을 콧소리로 발음한다."]);
  assert.deepEqual(verdicts("संयम", "saṃyam"), ["이 단어의 경우, 뒤 자음 /y/가 입을 완전히 막지 않는 소리(접근음)이므로 앞의 모음을 콧소리로 발음한다."]);
  assert.deepEqual(verdicts("नहीं", "nahīṃ"), ["이 단어의 경우, 단어의 끝이므로 앞의 모음을 콧소리로 발음한다."]);
  // 남는 끝 /a/: 끝 자음 묶음의 마지막이 y·r·l·v이면 남고, 막는 소리로 끝나면 빠진다.
  assert.deepEqual(verdicts("छात्र", "chātra"), ["이 단어의 경우, 끝 자음 묶음 /tr/의 마지막이 /r/이므로 /a/를 약하게 발음한다."]);
  assert.deepEqual(verdicts("वाक्य", "vākya"), ["이 단어의 경우, 끝 자음 묶음 /ky/의 마지막이 /y/이므로 /a/를 약하게 발음한다."]);
  assert.deepEqual(verdicts("शब्द", "śabd"), []);
  assert.deepEqual(verdicts("दोस्त", "dost"), []);
  // 단어장의 아누스와라는 모두 판정이 나야 하고, 그 판정이 읽기 경로에도 있어야 한다.
  const judged = words.flatMap(word => readWord(word.word, word.roman).flat().flatMap(akshara => akshara.parts
    .filter(part => part.kind === "mark" && part.glyph.endsWith("ं"))
    .map(part => { assert(part.verdict, `${word.id}: anusvara sound not judged`); return `${akshara.text}: ${part.verdict}`; })));

  // 단어장에서 끝 /a/가 남는 단어는 모두 규칙으로 설명되어야 한다.
  for (const word of words) for (const group of readWord(word.word, word.roman)) {
    const end = group.at(-1).parts.find(part => part.kind === "inherent" && !part.silent);
    if (end && group.length > 1) assert(end.verdict, `${word.id}: word-final /a/ is kept without a rule`);
    if (end?.verdict) judged.push(`${group.at(-1).text}: ${end.verdict}`);
  }
  const page = readablePage(readFileSync(join(outDir, "learn/hindi/words/index.html"), "utf8"), "https://example.org/");
  for (const word of words) for (const value of [word.word, word.roman, word.meaning]) assert(page.includes(value.normalize("NFC")) || page.includes(value), `${word.id}: ${value} missing from the reading path`);
  for (const rule of [...Object.values(SILENT_RULES), KEPT_FINAL_A, ...Object.values(MARK_NOTES)]) assert(page.includes(rule), `letter note missing from the reading path: ${rule}`);
  for (const verdict of judged) assert(page.includes(verdict), `letter verdict missing from the reading path: ${verdict}`);
  assert(readFileSync(join(outDir, "learn/hindi/index.html"), "utf8").includes('/learn/hindi/words"'), "Hindi page must link to the word study page");
  console.log(`PASS: ${words.length} Hindi words split into letters that rebuild the word and its romanization; study page linked and readable without JavaScript.`);
}

import { Link } from "react-router";
import words from "../../data/content/hindi-words.json";
import { aksharaRoman, readWord } from "../learn/devanagari";
import { Icon } from "../site/Icon";

// 첫 단어를 뜯어 놓은 모습이 곧 이 단어장이 하는 일이다.
const sample = readWord(words[0].word, words[0].roman).flat();

/** 힌디어 페이지에 놓는 단어장 입구. */
export function HindiWordsEntry() {
  return <Link className="words-entry" to="/learn/hindi/words">
    <span className="words-entry-art" aria-hidden="true">
      {sample.map((akshara, index) => <span className="words-entry-tile" key={index}>
        <b lang="hi">{akshara.text}</b><i>{aksharaRoman(akshara)}</i>
      </span>)}
    </span>
    <span className="words-entry-text"><strong>뜯어 읽는 단어장</strong><small>{words.length} 단어</small></span>
    <Icon name="arrow" />
  </Link>;
}

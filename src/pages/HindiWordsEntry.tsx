import { Link } from "react-router";
import words from "../../data/content/hindi-words.json";
import { aksharaRoman, readWord } from "../learn/devanagari";
import { Icon } from "../site/Icon";

// 첫 단어를 뜯어 놓은 모습이 곧 이 단어장이 하는 일이다.
const sample = readWord(words[0].word, words[0].roman).flat();

/** 힌디어 페이지에 놓는 단어장 입구. */
export function HindiWordsEntry() {
  return <>
  <Link className="words-entry" to="/learn/hindi/script">
    <span className="words-entry-art" aria-hidden="true">
      {[["अ", "a"], ["क", "ka"], ["की", "kī"]].map(([glyph, roman]) => <span className="words-entry-tile" key={glyph}>
        <b lang="hi">{glyph}</b><i>{roman}</i>
      </span>)}
    </span>
    <span className="words-entry-text"><strong>데바나가리 익히기</strong></span>
    <Icon name="arrow" />
  </Link>
  <Link className="words-entry" to="/learn/hindi/words">
    <span className="words-entry-art" aria-hidden="true">
      {sample.map((akshara, index) => <span className="words-entry-tile" key={index}>
        <b lang="hi">{akshara.text}</b><i>{aksharaRoman(akshara)}</i>
      </span>)}
    </span>
    <span className="words-entry-text"><strong>단어 공부하기</strong><small>{words.length} 단어</small></span>
    <Icon name="arrow" />
  </Link>
  <Link className="words-entry" to="/learn/hindi/words/quiz">
    <span className="words-entry-art is-quiz" aria-hidden="true"><i /><i className="is-on" /><i /><i /></span>
    <span className="words-entry-text"><strong>단어 퀴즈</strong></span>
    <Icon name="arrow" />
  </Link>
  </>;
}

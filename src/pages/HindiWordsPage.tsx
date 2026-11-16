import { useState } from "react";
import { Link } from "react-router";
import words from "../../data/content/hindi-words.json";
import { aksharaRoman, readWord, type Akshara, type Part } from "../learn/devanagari";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/words.css";

const cards = words.map(word => ({ ...word, reading: readWord(word.word, word.roman) }));
type Card = typeof cards[number];
const cardById = new Map(cards.map(card => [card.id, card]));

function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const kindClass = (part: Part) => `k-${part.kind}${part.silent ? " is-silent" : ""}`;

/** 음절 덩어리 하나. 누르면 자음·모음 부호로 갈라진다. */
function AksharaTile({ akshara }: { akshara: Akshara }) {
  const [open, setOpen] = useState(false);
  const single = akshara.parts.length === 1;
  return <button type="button" className={open ? "akshara is-open" : "akshara"} aria-expanded={single ? undefined : open}
    disabled={single} onClick={() => setOpen(!open)}>
    {open ? akshara.parts.map((part, index) => <span className={`unit ${kindClass(part)}`} key={index}>
      <span className="unit-glyph" lang="hi">{part.glyph}</span>
      <span className="unit-roman">{part.roman}</span>
    </span>) : <span className="unit">
      <span className="unit-glyph" lang="hi">{akshara.text}</span>
      <span className="unit-roman">
        {akshara.parts.filter(part => !part.silent).map((part, index) => <span className={kindClass(part)} key={index}>{part.roman}</span>)}
      </span>
    </span>}
  </button>;
}

function WordCard({ card, onMark }: { card: Card; onMark: (known: boolean) => void }) {
  const [split, setSplit] = useState(false);
  const [shown, setShown] = useState(false);
  return <div className="word-card">
    <div className="word-stage">
      {split ? <div className="word-breakdown">
        {card.reading.map((word, index) => <div className="word-group" key={index}>
          {word.map((akshara, at) => <AksharaTile akshara={akshara} key={at} />)}
        </div>)}
      </div> : <p className="word-big" lang="hi">{card.word}</p>}
    </div>
    <p className="word-meaning" aria-live="polite">{shown ? card.meaning : " "}</p>
    <div className="word-actions">
      <button type="button" className="word-ghost" aria-pressed={split} onClick={() => setSplit(!split)}>뜯어보기</button>
      {shown ? <>
        <button type="button" className="word-mark is-wrong" aria-label="몰랐어요" onClick={() => onMark(false)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5l11 11M15.5 4.5l-11 11" /></svg>
        </button>
        <button type="button" className="word-mark is-correct" aria-label="알았어요" autoFocus onClick={() => onMark(true)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /></svg>
        </button>
      </> : <button type="button" className="word-primary" autoFocus onClick={() => setShown(true)}>뜻 보기</button>}
    </div>
  </div>;
}

export function HindiWordsPage() {
  usePageTitle(`단어 공부 · 힌디어 · ${siteTitle}`);
  // 첫 화면은 미리 만든 HTML과 같아야 하므로 원본 순서로 시작하고, 다시 할 때 섞는다.
  const [deck, setDeck] = useState(() => cards.map(card => card.id));
  const [marks, setMarks] = useState<boolean[]>([]);
  const index = marks.length;
  const finished = index >= deck.length;
  const missed = deck.filter((_, at) => marks[at] === false).map(id => cardById.get(id)!);
  const restart = (ids: string[]) => { setDeck(shuffled(ids)); setMarks([]); };
  return <article className="words-page">
    <header className="words-head">
      <Link className="words-back" to="/learn/hindi">← 힌디어</Link>
      <ol className="words-steps" aria-label={`${Math.min(index + 1, deck.length)} / ${deck.length}`}>
        {deck.map((id, at) => <li key={id} className={at < index ? (marks[at] ? "is-correct" : "is-wrong") : at === index ? "is-current" : undefined} />)}
      </ol>
    </header>
    {finished ? <div className="word-card">
      <p className="word-score"><strong>{marks.filter(Boolean).length}</strong><span>/ {deck.length}</span></p>
      {missed.length > 0 && <ul className="word-missed">
        {missed.map(card => <li key={card.id}><span lang="hi">{card.word}</span><small>{card.roman}</small><b>{card.meaning}</b></li>)}
      </ul>}
      <div className="word-actions">
        {missed.length > 0 && <button type="button" className="word-ghost" onClick={() => restart(missed.map(card => card.id))}>틀린 것만</button>}
        <button type="button" className="word-primary" autoFocus onClick={() => restart(cards.map(card => card.id))}>다시</button>
      </div>
    </div> : <WordCard key={`${deck[index]}-${index}`} card={cardById.get(deck[index])!} onMark={known => setMarks([...marks, known])} />}
    <noscript>
      <h1>힌디어 단어</h1>
      <p>로마자는 IAST 표기다. 글자에는 있지만 발음하지 않는 기본 모음 a는 로마자에 적지 않았다. 괄호 안은 음절 덩어리별 읽기다.</p>
      <ul>{cards.map(card => <li key={card.id} id={`hindi-word-${card.id}`}>
        <span lang="hi">{card.word}</span> · {card.roman} · {card.meaning} ({card.reading.map(word => word.map(akshara => `${akshara.text} ${aksharaRoman(akshara)}`).join(", ")).join(" / ")})
      </li>)}</ul>
    </noscript>
  </article>;
}

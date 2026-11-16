import { useEffect, useRef, useState } from "react";
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

/** 소리 끈 스피커. 발음하지 않는 기본 모음 칸에 붙는다. */
const MuteIcon = () => <svg className="unit-mute" viewBox="0 0 20 20" aria-hidden="true">
  <path className="mute-body" d="M3 7.5h3l4-3.5v12l-4-3.5H3z" />
  <path className="mute-x" d="M13 7.5l5 5M18 7.5l-5 5" />
</svg>;

/** 음절 덩어리 하나. 누르면 자음·모음 부호로 갈라진다. */
function AksharaTile({ akshara }: { akshara: Akshara }) {
  const [open, setOpen] = useState(false);
  const single = akshara.parts.length === 1;
  return <button type="button" className={open ? "akshara is-open" : "akshara"} aria-expanded={single ? undefined : open}
    disabled={single} onClick={() => setOpen(!open)}>
    {open ? akshara.parts.map((part, index) => <span className={`unit ${kindClass(part)}`} key={index}>
      {part.silent
        ? <span className="unit-glyph" aria-label="발음 안 함" role="img"><MuteIcon /></span>
        : <span className="unit-glyph" lang="hi">{part.glyph}</span>}
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
  return <>
    <div className="word-stage">
      {split ? <div className="word-breakdown">
        {card.reading.map((word, index) => <div className="word-group" key={index}>
          {word.map((akshara, at) => <AksharaTile akshara={akshara} key={at} />)}
        </div>)}
      </div> : <p className="word-big" lang="hi">{card.word}</p>}
    </div>
    <p className="word-meaning" aria-live="polite">{shown ? card.meaning : " "}</p>
    <div className="word-actions">
      <button type="button" className="word-ghost" aria-pressed={split} onClick={() => setSplit(!split)}>뜯어보기</button>
      {shown ? <>
        <button type="button" className="word-mark is-wrong" aria-label="몰랐어요" onClick={() => onMark(false)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5l11 11M15.5 4.5l-11 11" /></svg>
        </button>
        <button type="button" className="word-mark is-correct" aria-label="알았어요" autoFocus onClick={() => onMark(true)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /></svg>
        </button>
      </> : <button type="button" className="word-primary" autoFocus onClick={() => { setShown(true); setSplit(false); }}>뜻 보기</button>}
    </div>
  </>;
}

function NavArrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return <button type="button" className={`word-nav is-${dir}`} aria-label={dir === "prev" ? "이전 단어" : "다음 단어"}
    disabled={disabled} onClick={onClick}>
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d={dir === "prev" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} /></svg>
  </button>;
}

export function HindiWordsPage() {
  usePageTitle(`단어 공부 · 힌디어 · ${siteTitle}`);
  // 첫 화면은 미리 만든 HTML과 같아야 하므로 원본 순서로 시작하고, 다시 할 때 섞는다.
  const [deck, setDeck] = useState(() => cards.map(card => card.id));
  // 단어장이므로 O·X 표시는 선택이다. 표시하지 않은 칸은 비워 둔다.
  const [marks, setMarks] = useState<(boolean | undefined)[]>([]);
  const [index, setIndex] = useState(0);
  const finished = index >= deck.length;
  const missed = deck.filter((_, at) => marks[at] === false).map(id => cardById.get(id)!);
  const restart = (ids: string[]) => { setDeck(shuffled(ids)); setMarks([]); setIndex(0); };
  const go = (to: number) => setIndex(Math.max(0, Math.min(deck.length, to)));
  const mark = (known: boolean) => {
    const next = [...marks];
    next[index] = known;
    setMarks(next);
    go(index + 1);
  };
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft") go(index - 1);
      else if (event.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return <article className="words-page">
    <header className="words-head">
      <Link className="words-back" to="/learn/hindi">← 힌디어</Link>
      <ol className="words-steps" aria-label={`${Math.min(index + 1, deck.length)} / ${deck.length}`}>
        {deck.map((id, at) => <li key={id}>
          <button type="button" aria-label={`${at + 1}번째 단어`} aria-current={at === index ? "step" : undefined}
            className={[at === index && "is-current", marks[at] === true && "is-correct", marks[at] === false && "is-wrong"].filter(Boolean).join(" ") || undefined}
            onClick={() => go(at)} />
        </li>)}
      </ol>
    </header>
    <div className="word-card"
      onTouchStart={event => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
      }}>
      <NavArrow dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
      {finished ? <>
        <p className="word-score"><strong>{marks.filter(known => known === true).length}</strong><span>/ {deck.length}</span></p>
        {missed.length > 0 && <ul className="word-missed">
          {missed.map(card => <li key={card.id}><span lang="hi">{card.word}</span><small>{card.roman}</small><b>{card.meaning}</b></li>)}
        </ul>}
        <div className="word-actions">
          {missed.length > 0 && <button type="button" className="word-ghost" onClick={() => restart(missed.map(card => card.id))}>틀린 것만</button>}
          <button type="button" className="word-primary" autoFocus onClick={() => restart(cards.map(card => card.id))}>다시</button>
        </div>
      </> : <WordCard key={`${deck[index]}-${index}`} card={cardById.get(deck[index])!} onMark={mark} />}
      <NavArrow dir="next" disabled={finished} onClick={() => go(index + 1)} />
    </div>
    <noscript>
      <h1>힌디어 단어</h1>
      <p>로마자는 IAST 표기다. 글자에는 있지만 발음하지 않는 기본 모음 a는 로마자에 적지 않았다. 괄호 안은 음절 덩어리별 읽기다.</p>
      <ul>{cards.map(card => <li key={card.id} id={`hindi-word-${card.id}`}>
        <span lang="hi">{card.word}</span> · {card.roman} · {card.meaning} ({card.reading.map(word => word.map(akshara => `${akshara.text} ${aksharaRoman(akshara)}`).join(", ")).join(" / ")})
      </li>)}</ul>
    </noscript>
  </article>;
}

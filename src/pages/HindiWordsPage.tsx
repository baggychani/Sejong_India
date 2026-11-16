import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import words from "../../data/content/hindi-words.json";
import { aksharaRoman, KEPT_FINAL_A, MARK_NOTES, partNote, readWord, SILENT_RULES, type Akshara, type Part } from "../learn/devanagari";
import { fadeIn, fadeOut, flyFrom, ghost, resize, slideIn, slideOut, spot, still, type Spot } from "../learn/morph";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/words.css";

const cards = words.map(word => ({ ...word, reading: readWord(word.word, word.roman) }));
type Card = typeof cards[number];

/** 한 낱말에 나온 묵음 a 규칙 문장들(중복 없이). */
const wordRules = (card: Card) => [...new Set(card.reading.flat().flatMap(akshara => akshara.parts)
  .flatMap(part => part.silent && part.rule ? [SILENT_RULES[part.rule]] : []))];

/** ? 에 띄울 설명: 발음하지 않는 /a/의 규칙, 또는 비음 부호가 무엇인지. */
const why = (part: Part) => part.silent && part.rule ? SILENT_RULES[part.rule] : partNote(part);

/** 한 낱말의 판정(아누스와라가 실제로 내는 소리, 남는 끝 /a/). */
const wordVerdicts = (card: Card) => card.reading.flat().flatMap(akshara => akshara.parts
  .flatMap(part => part.verdict ? [`${part.kind === "mark" ? "아누스와라" : "끝 /a/"} ${akshara.text}: ${part.verdict}`] : []));

/** 팁에서 부호 이름을 눈에 띄게 한다. */
const TERMS = /(아누스와라|찬드라빈두|비사르가)/;
const tipText = (text: string) => text.split(TERMS).map((piece, index) => index % 2 ? <b key={index}>{piece}</b> : piece);

const kindClass = (part: Part) => `k-${part.kind}${part.silent ? " is-silent" : ""}`;

/** 소리 끈 스피커. 발음하지 않는 기본 모음 칸에 붙는다. */
const MuteIcon = () => <svg className="unit-mute" viewBox="0 0 20 20" aria-hidden="true">
  <path className="mute-body" d="M3 7.5h3l4-3.5v12l-4-3.5H3z" />
  <path className="mute-x" d="M13 7.5l5 5M18 7.5l-5 5" />
</svg>;

/** 음절 덩어리 하나. 누르면 자음·모음 부호로 갈라진다. */
function AksharaTile({ akshara }: { akshara: Akshara }) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<number | null>(null);
  const single = akshara.parts.length === 1;
  const ref = useRef<HTMLButtonElement>(null);
  const before = useRef<{ width: number; glyph?: Spot } | null>(null);
  const busy = useRef(false);

  // 상자가 넓어지며 부품이 가운데에서 미끄러져 나오고, 원래 덩어리는 겹쳐 흐려진다. 닫을 때는 거꾸로.
  useLayoutEffect(() => {
    const box = ref.current;
    const prev = before.current;
    before.current = null;
    if (!box || !prev) return;
    resize(box, prev.width);
    if (open) {
      if (prev.glyph) ghost(box, akshara.text, prev.glyph);
      slideOut(box, [...box.querySelectorAll(".unit")]);
    } else {
      fadeIn([...box.querySelectorAll(".unit")], { delay: 60, rise: 0 });
    }
  }, [open, akshara.text]);

  const toggle = async () => {
    const box = ref.current;
    if (busy.current) return;
    if (!box || still()) { setOpen(!open); return; }
    busy.current = true;
    if (open) await slideIn(box, [...box.querySelectorAll(".unit")]);
    const glyph = box.querySelector(".unit-glyph");
    before.current = { width: box.getBoundingClientRect().width, glyph: !open && glyph ? spot(glyph) : undefined };
    setOpen(!open);
    busy.current = false;
  };

  return <button type="button" ref={ref} data-akshara="" className={open ? "akshara is-open" : "akshara"} aria-expanded={single ? undefined : open}
    disabled={single} onClick={toggle}>
    <span className="akshara-box" aria-hidden="true" />
    {open ? akshara.parts.map((part, index) => <span className={`unit ${kindClass(part)}`} key={index}>
      {part.silent
        ? <span className="unit-glyph" aria-label={part.rule ? `발음 안 함. ${SILENT_RULES[part.rule]}` : "발음 안 함"} role="img"><MuteIcon /></span>
        : <span className="unit-glyph" lang="hi">{part.glyph}</span>}
      <span className="unit-roman">{part.roman}</span>
      {why(part) && <span className={tip === index ? "unit-why is-open" : "unit-why"} aria-hidden="true"
        onClick={event => { event.stopPropagation(); setTip(tip === index ? null : index); }}>
        ?<span className="unit-tip">{tipText(why(part)!)}</span>
      </span>}
    </span>) : <span className="unit">
      <span className="unit-glyph" lang="hi">{akshara.text}</span>
      <span className="unit-roman">
        {akshara.parts.filter(part => !part.silent).map((part, index) => <span className={kindClass(part)} key={index}>{part.roman}</span>)}
      </span>
    </span>}
  </button>;
}

function WordCard({ card, last, onNext }: { card: Card; last: boolean; onNext: () => void }) {
  const [split, setSplit] = useState(false);
  const [shown, setShown] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const from = useRef<Spot[] | null>(null);
  const busy = useRef(false);

  // 큰 낱말의 음절 덩어리가 제자리에서 차례로 떨어져 나와 칸이 되고, 상자와 로마자가 뒤따라 나타난다.
  useLayoutEffect(() => {
    const root = stage.current;
    const prev = from.current;
    from.current = null;
    if (!root || !prev) return;
    if (split) {
      const tiles = [...root.querySelectorAll("[data-akshara]")];
      flyFrom(prev, tiles.map(tile => tile.querySelector(".unit-glyph")!));
      fadeIn(tiles.map(tile => tile.querySelector(".akshara-box")!), { delay: 110, rise: 0 });
      fadeIn(tiles.map(tile => tile.querySelector(".unit-roman")!), { delay: 190 });
    } else {
      flyFrom(prev, [...root.querySelectorAll(".wb-ak")], 380);
    }
  }, [split]);

  const toggleSplit = async (next: boolean) => {
    const root = stage.current;
    if (next === split || busy.current) return;
    if (!root || still()) { setSplit(next); return; }
    busy.current = true;
    if (next) {
      from.current = [...root.querySelectorAll(".wb-ak")].map(spot);
    } else {
      // 상자와 로마자가 먼저 걷히고, 글자만 남아 원래 낱말 자리로 돌아간다.
      const tiles = [...root.querySelectorAll<HTMLElement>("[data-akshara]")];
      await fadeOut(tiles.flatMap(tile => [
        ...tile.querySelectorAll(".akshara-box, .unit-roman, .unit-why"),
        ...(tile.classList.contains("is-open") ? tile.querySelectorAll(".unit-glyph") : []),
      ]));
      from.current = tiles.map(tile => {
        const glyph = tile.querySelector(".unit-glyph")!;
        return tile.classList.contains("is-open") ? { ...spot(tile), size: spot(glyph).size } : spot(glyph);
      });
    }
    setSplit(next);
    busy.current = false;
  };

  return <>
    <div className="word-stage" ref={stage}>
      {split ? <div className="word-breakdown">
        {card.reading.map((word, index) => <div className="word-group" key={index}>
          {word.map((akshara, at) => <AksharaTile akshara={akshara} key={at} />)}
        </div>)}
      </div> : <p className="word-big" lang="hi">
        {card.reading.map((word, index) => <Fragment key={index}>
          {index > 0 && " "}
          <span className="wb-word">{word.map((akshara, at) => <span className="wb-ak" key={at}>{akshara.text}</span>)}</span>
        </Fragment>)}
      </p>}
    </div>
    {/* 뒷면: 뜻과 함께 로마자 전사를 보여 준다. 뜯어 놓은 동안에는 칸마다 전사가 있으므로 뺀다. */}
    <p className="word-roman">{shown && !split ? card.reading.map((word, index) => <Fragment key={index}>
      {index > 0 && " "}
      {word.flatMap(akshara => akshara.parts).filter(part => !part.silent).map((part, at) => <span className={kindClass(part)} key={at}>{part.roman}</span>)}
    </Fragment>) : "\u00A0"}</p>
    <p className="word-meaning" aria-live="polite">{shown ? card.meaning : " "}</p>
    <div className="word-actions">
      <button type="button" className="word-ghost" aria-pressed={split} onClick={() => toggleSplit(!split)}>뜯어보기</button>
      {shown
        ? <button type="button" className="word-primary" autoFocus onClick={onNext}>{last ? "처음으로" : "다음"}</button>
        : <button type="button" className="word-primary" autoFocus onClick={() => { setShown(true); toggleSplit(false); }}>뜻 보기</button>}
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
  usePageTitle(`단어장 · 힌디어 · ${siteTitle}`);
  // 외우는 단어장이다. 맞고 틀림을 매기는 퀴즈는 따로 만든다.
  const [index, setIndex] = useState(0);
  const [listing, setListing] = useState(false);
  const go = (to: number) => setIndex(Math.max(0, Math.min(cards.length - 1, to)));
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (listing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "ArrowLeft") go(index - 1);
      else if (event.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return <article className="words-page">
    <header className="words-head">
      <Link className="words-back" to="/learn/hindi">← 힌디어</Link>
      <div className="words-tools">
        {!listing && <span className="words-count"><strong>{index + 1}</strong> / {cards.length}</span>}
        <button type="button" className="words-list-toggle" aria-pressed={listing} aria-label="단어 목록" title="단어 목록" onClick={() => setListing(!listing)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 10h12M4 14.5h12" /></svg>
        </button>
      </div>
    </header>
    {listing ? <ol className="word-list">
      {cards.map((card, at) => <li key={card.id}>
        <button type="button" aria-current={at === index ? "true" : undefined} onClick={() => { setIndex(at); setListing(false); }}>
          <span lang="hi">{card.word}</span><small>{card.roman}</small><b>{card.meaning}</b>
        </button>
      </li>)}
    </ol> : <div className="word-card"
      onTouchStart={event => { touchX.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
      }}>
      <NavArrow dir="prev" disabled={index === 0} onClick={() => go(index - 1)} />
      <WordCard key={cards[index].id} card={cards[index]} last={index === cards.length - 1}
        onNext={() => setIndex(index === cards.length - 1 ? 0 : index + 1)} />
      <NavArrow dir="next" disabled={index === cards.length - 1} onClick={() => go(index + 1)} />
    </div>}
    <noscript>
      <h1>힌디어 단어</h1>
      <p>로마자는 IAST 표기다. 글자에는 있지만 발음하지 않는 기본 모음 /a/는 로마자에 적지 않았다. 괄호 안은 음절 덩어리별 읽기다.</p>
      <p>발음하지 않는 /a/의 규칙: {Object.values(SILENT_RULES).join(" ")} {KEPT_FINAL_A}</p>
      <p>비음·기음 부호: {Object.values(MARK_NOTES).join(" ")}</p>
      <ul>{cards.map(card => <li key={card.id} id={`hindi-word-${card.id}`}>
        <span lang="hi">{card.word}</span> · {card.roman} · {card.meaning} ({card.reading.map(word => word.map(akshara => `${akshara.text} ${aksharaRoman(akshara)}`).join(", ")).join(" / ")}){wordRules(card).map(rule => ` 묵음 /a/: ${rule}`).join("")}{wordVerdicts(card).map(verdict => ` ${verdict}`).join("")}
      </li>)}</ul>
    </noscript>
  </article>;
}

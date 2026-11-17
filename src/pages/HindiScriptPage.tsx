import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { LETTERS, MARK_NAMES } from "../learn/devanagari";
import letterNotes from "../../data/content/hindi-letter-notes.json";
import { Explanation, ExplanationContent } from "../learn/Explanation";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/script.css";

const VIRAMA = "्";
const NUKTA = "़";
const RING = "◌";
const { consonants, dotted, vowels, signs, marks, places } = LETTERS;
const notesByGlyph = new Map(letterNotes.map(note => [note.glyph, note]));

type Item = { glyph: string; roman: string };
const vowelItems: Item[] = Object.entries(vowels).map(([glyph, roman]) => ({ glyph, roman }));
const vowelPairs = [["अ", "आ"], ["इ", "ई"], ["उ", "ऊ"]];
const pairedVowels = new Set(vowelPairs.flat());
// 자음표: 소리 내는 자리별 다섯 줄, 그리고 나머지 자음.
const columns = ["무성음", "무성 유기음", "유성음", "유성 유기음", "비음"];
const stopRows = places.map(([place, letters]) => ({ place, letters: Array.from(letters) }));
const otherRows = [{ place: "반모음·유음", letters: ["य", "र", "ल", "व"] }, { place: "마찰음", letters: ["श", "ष", "स", "ह"] }];
const dottedItems: Item[] = Object.entries(dotted).map(([base, roman]) => ({ glyph: base + NUKTA, roman }));
const consonantItems: Item[] = [...Object.entries(consonants).map(([glyph, roman]) => ({ glyph, roman })), ...dottedItems];
const signItems = Object.entries(signs).map(([sign, roman]) => ({ sign, roman, vowel: Object.keys(vowels).find(vowel => vowels[vowel] === roman)! }));
const markNames = MARK_NAMES;
const markItems = Object.entries(marks).map(([mark, roman]) => ({ glyph: RING + mark, roman, name: markNames[mark] }));
const otherMarks = [...markItems,
  { glyph: RING + VIRAMA, name: "할란트(비라마)", roman: "" },
  { glyph: RING + NUKTA, name: "누크타", roman: "" }];
// 겹자음: 자음끼리 붙여 쓰는 대표적인 모양.
const conjuncts = [["क", "ष"], ["त", "र"], ["ज", "ञ"], ["श", "र"], ["स", "त"], ["न", "य"], ["च", "छ"], ["द", "य"], ["प", "र"]]
  .map(([first, second]) => ({ first, second, glyph: first + VIRAMA + second, roman: consonants[first] + consonants[second] }));

const syllable = (consonant: string, sign: string) => consonant + sign;
const syllableRoman = (consonant: string, sign: string) => consonants[consonant] + (sign === VIRAMA ? "" : sign ? signs[sign] : "a");

/* ───────── 연습 ───────── */

type Question = { glyph: string; answer: string; choices: string[] };
type Maker = (previous?: string) => Question;
const pickOne = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
/** 글자를 보고 로마자를 고르는 문제. 오답은 같은 묶음의 다른 글자에서 온다. */
const fromList = (items: Item[]): Maker => previous => {
  const target = pickOne(items.filter(item => item.glyph !== previous));
  const wrong = shuffled([...new Set(items.map(item => item.roman))].filter(roman => roman !== target.roman)).slice(0, 3);
  return { glyph: target.glyph, answer: target.roman, choices: shuffled([target.roman, ...wrong]) };
};
/** 자음에 모음 부호를 붙인 글자. 오답은 자음만, 또는 모음만 다른 것으로 낸다. */
const combined: Maker = previous => {
  const letters = Object.keys(consonants);
  const endings = ["", ...Object.keys(signs)];
  let consonant = pickOne(letters);
  let sign = pickOne(endings);
  while (syllable(consonant, sign) === previous) { consonant = pickOne(letters); sign = pickOne(endings); }
  const answer = syllableRoman(consonant, sign);
  const wrong = new Set<string>();
  while (wrong.size < 3) {
    const other = wrong.size < 2 ? syllableRoman(consonant, pickOne(endings)) : syllableRoman(pickOne(letters), sign);
    if (other !== answer) wrong.add(other);
  }
  return { glyph: syllable(consonant, sign), answer, choices: shuffled([answer, ...wrong]) };
};

function Drill({ make, onClose }: { make: Maker; onClose: () => void }) {
  const [question, setQuestion] = useState(() => make());
  const [picked, setPicked] = useState<string>();
  const [tally, setTally] = useState({ right: 0, total: 0 });
  const pick = (choice: string) => {
    if (picked !== undefined) return;
    setPicked(choice);
    setTally({ right: tally.right + (choice === question.answer ? 1 : 0), total: tally.total + 1 });
  };
  useEffect(() => {
    if (picked !== undefined) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const choice = question.choices[Number(event.key) - 1];
      if (choice) pick(choice);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return <div className="sc-drill">
    <div className="sc-drill-head">
      <span className="words-count"><strong>{tally.right}</strong> / {tally.total}</span>
      <button type="button" className="words-list-toggle" aria-label="연습 끝내기" title="연습 끝내기" onClick={onClose}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
      </button>
    </div>
    <p className="sc-drill-glyph" lang="hi">{question.glyph}</p>
    <div className="sc-drill-choices">
      {question.choices.map(choice => <button type="button" key={choice} disabled={picked !== undefined} onClick={() => pick(choice)}
        className={picked === undefined ? undefined : choice === question.answer ? "is-correct" : choice === picked ? "is-wrong" : undefined}>{choice}</button>)}
    </div>
    <div className="word-actions">
      {picked !== undefined && <button type="button" className="word-primary" autoFocus
        onClick={() => { setQuestion(make(question.glyph)); setPicked(undefined); }}>다음</button>}
    </div>
  </div>;
}

/* ───────── 화면 ───────── */

function Section({ id, title, count, note, make, children }: { id: string; title: string; count?: number; note?: ReactNode; make: Maker; children: ReactNode }) {
  const [drilling, setDrilling] = useState(false);
  return <section className="sc-section" id={id} aria-labelledby={`${id}-title`}>
    <header className="sc-head">
      <h2 className="sc-sr-only" id={`${id}-title`}>{title}{count !== undefined && <small> {count}</small>}</h2>
      <button type="button" className="word-ghost sc-practice" aria-pressed={drilling} onClick={() => setDrilling(!drilling)}>연습</button>
    </header>
    {note && <noscript><p>{note}</p></noscript>}
    {drilling ? <Drill make={make} onClose={() => setDrilling(false)} /> : children}
  </section>;
}

/** 글자 한 칸. 자음은 기본 모음 a를 옅게 붙여 보여 준다. */
function Tile({ glyph, roman, inherent }: { glyph: string; roman: string; inherent?: boolean }) {
  const note = notesByGlyph.get(glyph);
  return <div className={inherent ? "sc-tile is-consonant" : "sc-tile"}>
    <b lang="hi">{glyph}</b><i>{roman}{inherent && <em>a</em>}</i>
    {note && <Explanation note={note} className="sc-tile-help" />}
  </div>;
}

/** 자음 하나와 모음 부호 하나를 직접 골라 붙여 본다. 둘 다 고르기 전에는 결과가 없다. */
function Builder() {
  const [consonant, setConsonant] = useState<string | null>(null);
  // null: 아직 고르지 않음. "": 부호 없이 기본 모음 a.
  const [sign, setSign] = useState<string | null>(null);
  const endings = [{ sign: "", label: RING, roman: "a" }, ...Object.entries(signs).map(([key, roman]) => ({ sign: key, label: RING + key, roman })),
    { sign: VIRAMA, label: RING + VIRAMA, roman: "" }];
  const done = consonant !== null && sign !== null;
  return <div className="sc-builder">
    <div className="sc-picks is-consonants" role="group" aria-label="자음">
      {[...stopRows, ...otherRows].map(row => <div className="sc-pick-row" key={row.place}>
        {row.letters.map(letter => <button type="button" key={letter} lang="hi" aria-pressed={letter === consonant} onClick={() => setConsonant(current => current === letter ? null : letter)}>{letter}</button>)}
      </div>)}
    </div>
    <div className="sc-result" aria-live="polite">
      <p className="sc-result-glyph" lang="hi">{done ? syllable(consonant, sign) : "\u00A0"}</p>
      <p className="sc-formula">
        <b className={consonant === null ? "is-empty" : undefined} lang="hi">{consonant ?? "\u00A0"}</b>+
        <b className={sign === null ? "is-empty" : undefined} lang="hi">{sign === null ? "\u00A0" : sign ? RING + sign : RING}</b>
      </p>
      <p className="sc-result-roman">{done ? <><span>{consonants[consonant]}</span><span className="is-vowel">{sign === VIRAMA ? "" : sign ? signs[sign] : "a"}</span></> : "\u00A0"}</p>
    </div>
    <div className="sc-picks is-signs" role="group" aria-label="모음 부호">
      {endings.map(ending => <button type="button" key={ending.sign || "none"} aria-label={ending.roman ? `${ending.label} (${ending.roman})` : "할란트(비라마)"} aria-pressed={ending.sign === sign} onClick={() => setSign(current => current === ending.sign ? null : ending.sign)}>
        <span lang="hi">{ending.label}</span>
      </button>)}
    </div>
  </div>;
}

// 네 부분은 한 번에 하나씩 본다.
const tabs = [["vowels", "모음"], ["consonants", "자음"], ["signs", "모음 부호"], ["combine", "마트라"]] as const;
type TabId = typeof tabs[number][0];

export function HindiScriptPage() {
  usePageTitle(`데바나가리 익히기 · 힌디어 · ${siteTitle}`);
  const [active, setActive] = useState<TabId>("vowels");
  const parts: Record<TabId, ReactNode> = {
    vowels: <Section key="vowels" id="vowels" title="모음" count={vowelItems.length} make={fromList(vowelItems)}>
      <div className="sc-vowels">
        <div className="sc-vowel-pairs">
          {vowelPairs.map(pair => <div className="sc-vowel-pair" key={pair[0]} role="group" aria-label={`${vowels[pair[0]]} · ${vowels[pair[1]]}`}>
            {pair.map(glyph => <Tile key={glyph} glyph={glyph} roman={vowels[glyph]} />)}
          </div>)}
        </div>
        <div className="sc-vowel-rest">{vowelItems.filter(item => !pairedVowels.has(item.glyph)).map(item => <Tile key={item.glyph} {...item} />)}</div>
      </div>
    </Section>,

    consonants: <Section key="consonants" id="consonants" title="자음" count={consonantItems.length} make={fromList(consonantItems.map(item => ({ glyph: item.glyph, roman: `${item.roman}a` })))}>
      <div className="sc-grid">
        <div className="sc-row sc-cols" aria-hidden="true"><span className="sc-place" />{columns.map(column => <span key={column}>{column}</span>)}</div>
        {stopRows.map(row => <div className="sc-row" key={row.place}>
          <span className="sc-place">{row.place}</span>
          {row.letters.map(letter => <Tile key={letter} glyph={letter} roman={consonants[letter]} inherent />)}
        </div>)}
      </div>
      {otherRows.map(row => <div className="sc-group" key={row.place}>
        <h3>{row.place}</h3>
        <div className="sc-tiles">{row.letters.map(letter => <Tile key={letter} glyph={letter} roman={consonants[letter]} inherent />)}</div>
      </div>)}
      <div className="sc-group">
        <h3>점을 찍어 만든 글자</h3>
        <div className="sc-tiles">{dottedItems.map(item => <Tile key={item.glyph} glyph={item.glyph} roman={item.roman} inherent />)}</div>
      </div>
      <div className="sc-group">
        <h3>겹자음</h3>
        <div className="sc-signs">
          {conjuncts.map(item => <div className="sc-sign" key={item.glyph}>
            <b lang="hi">{item.glyph}</b><span><i lang="hi">{item.first + VIRAMA}</i><i lang="hi">{item.second}</i></span><em>{item.roman}a</em>
          </div>)}
        </div>
      </div>
    </Section>,

    signs: <Section key="signs" id="signs" title="모음 부호" count={signItems.length} make={fromList([...signItems.map(item => ({ glyph: RING + item.sign, roman: item.roman })), ...markItems])}
      note="자음 뒤에 오는 모음은 글자 대신 부호로 자음에 붙인다. 부호가 없으면 기본 모음 a다. ◌는 자음이 놓이는 자리다.">
      <div className="sc-signs">
        <div className="sc-sign"><b lang="hi">क</b><span><i lang="hi">अ</i>부호 없음</span><em>ka</em></div>
        {signItems.map(item => <div className="sc-sign" key={item.sign}>
          <b lang="hi">{syllable("क", item.sign)}</b>
          <span><i lang="hi">{item.vowel}</i><i lang="hi">{RING + item.sign}</i></span>
          <em>k{item.roman}</em>
        </div>)}
      </div>
      <div className="sc-group">
        <h3>그 밖의 부호</h3>
        <div className="sc-signs">
          {otherMarks.map(item => <div className="sc-sign sc-mark" key={item.glyph}>
            <b lang="hi">{item.glyph}</b><span>{item.name}</span><em>{item.roman}</em>
          </div>)}
        </div>
      </div>
    </Section>,

    combine: <Section key="combine" id="combine" title="마트라" make={combined}>
      <Builder />
    </Section>,
  };
  return <article className="script-page">
    <header className="words-head"><Link className="words-back" to="/learn/hindi">← 힌디어</Link></header>
    <h1 className="script-title">데바나가리 익히기</h1>
    <div className="script-layout">
    <div className="script-tabs" role="tablist" aria-label="글자 종류">
      {tabs.map(([id, title]) => <button type="button" role="tab" key={id} aria-selected={active === id} onClick={() => setActive(id)}>
        <span>{title}</span>
      </button>)}
    </div>
    <div className="script-body">
      {parts[active]}
      {/* 고르지 않은 부분도 스크립트 없이 읽을 수 있게 둔다. */}
      <noscript>{tabs.filter(([id]) => id !== active).map(([id]) => parts[id])}</noscript>
    </div>
    </div>
    <noscript>{letterNotes.map(note => <section key={note.id} id={`hindi-letter-note-${note.id}`}>
      <ExplanationContent note={note} reading />
    </section>)}</noscript>
  </article>;
}

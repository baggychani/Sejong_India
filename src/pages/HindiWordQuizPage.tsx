import { useEffect, useState } from "react";
import { Link } from "react-router";
import words from "../../data/content/hindi-words.json";
import { hintBudget, makeWordQuiz, MIN_QUESTIONS, type WordQuestion } from "../learn/wordQuiz";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/words.css";

const byId = new Map(words.map(word => [word.id, word]));
const total = words.length;
const presets = [...new Set([10, 20, 50, total].filter(size => size <= total))];

/** picks·hinted는 문항 번호 그대로의 칸이다. index가 문항 수와 같아지면 결과 화면이다. */
type Run = { questions: WordQuestion[]; picks: (string | undefined)[]; hinted: boolean[]; index: number };

const Mark = ({ right }: { right: boolean }) => <svg className="wq-mark" viewBox="0 0 20 20" aria-label={right ? "정답" : "오답"}>
  {right ? <circle cx="10" cy="10" r="6.5" /> : <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />}
</svg>;

export function HindiWordQuizPage() {
  usePageTitle(`단어 퀴즈 · 힌디어 · ${siteTitle}`);
  const [count, setCount] = useState(Math.min(10, total));
  const [run, setRun] = useState<Run | null>(null);
  const begin = (size: number, only?: string[]) =>
    setRun({ questions: makeWordQuiz(words, size, Math.random, only), picks: [], hinted: [], index: 0 });

  const size = run?.questions.length ?? 0;
  const finished = run !== null && run.index >= size;
  const question = run && !finished ? run.questions[run.index] : undefined;
  const picked = run && question ? run.picks[run.index] : undefined;
  const answered = picked !== undefined;
  const hinted = Boolean(run && question && run.hinted[run.index]);
  const hintsLeft = run ? hintBudget(size) - run.hinted.filter(Boolean).length : 0;
  const pick = (id: string) => setRun(now => {
    if (!now || now.picks[now.index] !== undefined) return now;
    const picks = [...now.picks];
    picks[now.index] = id;
    return { ...now, picks };
  });

  // 숫자 키 1~4로 보기를 고른다.
  useEffect(() => {
    if (!question || answered) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const choice = question.choices[Number(event.key) - 1];
      if (choice) pick(choice);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const header = <header className="words-head">
    <Link className="words-back" to="/learn/hindi">← 힌디어</Link>
    {run && <div className="words-tools">
      {!finished && <span className="words-count"><strong>{run.index + 1}</strong> / {size}</span>}
      <button type="button" className="words-list-toggle" aria-label="퀴즈 끝내기" title="퀴즈 끝내기" onClick={() => setRun(null)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
      </button>
    </div>}
  </header>;

  if (!run) return <article className="words-page">
    {header}
    <div className="word-card wq-card wq-setup">
      <h1 className="wq-title">단어 퀴즈</h1>
      <div className="wq-stepper" role="group" aria-label="문항 수">
        <button type="button" aria-label="다섯 문항 줄이기" disabled={count <= MIN_QUESTIONS} onClick={() => setCount(Math.max(MIN_QUESTIONS, count - 5))}>−</button>
        <output><strong>{count}</strong><span>문항</span></output>
        <button type="button" aria-label="다섯 문항 늘리기" disabled={count >= total} onClick={() => setCount(Math.min(total, count + 5))}>+</button>
      </div>
      <div className="wq-presets">
        {presets.map(preset => <button type="button" key={preset} aria-pressed={count === preset} onClick={() => setCount(preset)}>{preset === total ? "전체" : preset}</button>)}
      </div>
      <p className="wq-hints">힌트 {hintBudget(count)}회</p>
      <button type="button" className="word-primary" autoFocus onClick={() => begin(count)}>시작</button>
    </div>
  </article>;

  if (finished) {
    const missed = run.questions.filter((item, index) => run.picks[index] !== item.id).map(item => byId.get(item.id)!);
    return <article className="words-page">
      {header}
      <div className="word-card wq-card">
        <p className="wq-score"><strong>{size - missed.length}</strong><span>/ {size}</span></p>
        {missed.length > 0 && <ul className="wq-missed">
          {missed.map(word => <li key={word.id}><span lang="hi">{word.word}</span><small>{word.roman}</small><b>{word.meaning}</b></li>)}
        </ul>}
        <div className="word-actions">
          <button type="button" className="word-ghost" onClick={() => setRun(null)}>설정</button>
          {missed.length > 0 && <button type="button" className="word-ghost" onClick={() => begin(missed.length, missed.map(word => word.id))}>틀린 것만</button>}
          <button type="button" className="word-primary" autoFocus onClick={() => begin(size)}>다시</button>
        </div>
      </div>
    </article>;
  }

  const target = byId.get(question!.id)!;
  const showRoman = hinted || answered;
  return <article className="words-page">
    {header}
    <div className="wq-bar" aria-hidden="true"><i style={{ width: `${(run.index + (answered ? 1 : 0)) / size * 100}%` }} /></div>
    <div className="word-card wq-card">
      <div className="wq-prompt">
        {question!.kind === "meaning" ? <>
          <p className="word-big" lang="hi">{target.word}</p>
          <p className="wq-roman">{showRoman ? target.roman : " "}</p>
        </> : <p className="wq-meaning">{target.meaning}</p>}
      </div>
      <div className={`wq-choices is-${question!.kind}`}>
        {question!.choices.map((id, at) => {
          const choice = byId.get(id)!;
          const state = !answered ? "" : id === target.id ? " is-correct" : id === picked ? " is-wrong" : "";
          return <button type="button" key={id} className={`wq-choice${state}`} disabled={answered} onClick={() => pick(id)}>
            <span className="wq-key" aria-hidden="true">{at + 1}</span>
            {question!.kind === "meaning" ? <span className="wq-text">
              {choice.meaning}
              {/* 답한 뒤에는 보기마다 짝이 되는 낱말을 보여 준다. */}
              {answered && <small lang="hi">{choice.word}</small>}
            </span> : <span className="wq-text">
              <b lang="hi">{choice.word}</b>
              {showRoman && <small>{choice.roman}{answered && ` · ${choice.meaning}`}</small>}
            </span>}
            {state && <Mark right={id === target.id} />}
          </button>;
        })}
      </div>
      <div className="word-actions">
        <button type="button" className="word-ghost wq-hint" disabled={hinted || answered || hintsLeft <= 0}
          onClick={() => setRun(now => {
            if (!now) return now;
            const next = [...now.hinted];
            next[now.index] = true;
            return { ...now, hinted: next };
          })}>전사 보기<b>{hintsLeft}</b></button>
        {answered && <button type="button" className="word-primary" autoFocus
          onClick={() => setRun(now => now && { ...now, index: now.index + 1 })}>{run.index === size - 1 ? "결과" : "다음"}</button>}
      </div>
    </div>
  </article>;
}

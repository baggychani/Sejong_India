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

/** 시간 제한: 없음 / 문항당 / 퀴즈 전체. seconds는 그 단위의 초. */
type LimitMode = "off" | "each" | "total";
type Limit = { mode: LimitMode; seconds: number };
const limitModes: [LimitMode, string][] = [["off", "제한 없음"], ["each", "문항당"], ["total", "퀴즈 전체"]];
const EACH = { min: 5, max: 60, step: 5, start: 10 };
const TOTAL = { min: 30, max: 3600, step: 30 };
/** 전체 시간의 기본값: 문항당 10초꼴을 30초 단위로 맞춘다. */
const defaultTotal = (questions: number) => Math.max(TOTAL.min, Math.round(questions * 10 / TOTAL.step) * TOTAL.step);
const spoken = (seconds: number) => seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분${seconds % 60 ? ` ${seconds % 60}초` : ""}`;
const clock = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** 시간 안에 고르지 못한 문항의 답. */
const TIMEOUT = "";
/** picks·hinted는 문항 번호 그대로의 칸이다. index가 문항 수와 같아지면 결과 화면이다. */
type Run = { questions: WordQuestion[]; picks: (string | undefined)[]; hinted: boolean[]; index: number; limit: Limit; expired?: boolean };

const Mark = ({ right }: { right: boolean }) => <svg className="wq-mark" viewBox="0 0 20 20" aria-label={right ? "정답" : "오답"}>
  {right ? <circle cx="10" cy="10" r="6.5" /> : <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />}
</svg>;

function Stepper({ label, value, text, unit, min, max, step, small, onChange }: {
  label: string; value: number; text: string; unit?: string; min: number; max: number; step: number; small?: boolean; onChange: (value: number) => void;
}) {
  return <div className={small ? "wq-stepper is-small" : "wq-stepper"} role="group" aria-label={label}>
    <button type="button" aria-label="줄이기" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
    <output><strong>{text}</strong>{unit && <span>{unit}</span>}</output>
    <button type="button" aria-label="늘리기" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
  </div>;
}

export function HindiWordQuizPage() {
  usePageTitle(`단어 퀴즈 · 힌디어 · ${siteTitle}`);
  const [count, setCount] = useState(Math.min(10, total));
  const [mode, setMode] = useState<LimitMode>("off");
  const [each, setEach] = useState(EACH.start);
  // 전체 시간은 손대기 전까지 문항 수를 따라간다.
  const [totalChoice, setTotalChoice] = useState<number | null>(null);
  const totalSeconds = totalChoice ?? defaultTotal(count);
  const [run, setRun] = useState<Run | null>(null);
  // 남은 시간(ms)과 그 기준이 되는 전체 길이(ms).
  const [left, setLeft] = useState(0);
  const [span, setSpan] = useState(1);

  const begin = (size: number, limit: Limit, only?: string[]) => {
    const questions = makeWordQuiz(words, size, Math.random, only);
    setRun({ questions, picks: [], hinted: [], index: 0, limit });
    setSpan(limit.seconds * 1000);
    setLeft(limit.seconds * 1000);
  };
  const chooseCount = (value: number) => { setCount(value); setTotalChoice(null); };

  const size = run?.questions.length ?? 0;
  const finished = run !== null && run.index >= size;
  const question = run && !finished ? run.questions[run.index] : undefined;
  const picked = run && question ? run.picks[run.index] : undefined;
  const answered = picked !== undefined;
  const hinted = Boolean(run && question && run.hinted[run.index]);
  const hintsLeft = run ? hintBudget(size) - run.hinted.filter(Boolean).length : 0;
  const timed = run !== null && run.limit.mode !== "off";
  const ticking = timed && !finished && !answered;
  const pick = (id: string) => setRun(now => {
    if (!now || now.index >= now.questions.length || now.picks[now.index] !== undefined) return now;
    const picks = [...now.picks];
    picks[now.index] = id;
    return { ...now, picks };
  });
  const next = () => {
    if (!run) return;
    if (run.limit.mode === "each") setLeft(run.limit.seconds * 1000);
    setRun({ ...run, index: run.index + 1 });
  };

  // 시계는 답을 고르는 동안에만 간다. 답을 확인하는 동안에는 멈춘다.
  useEffect(() => {
    if (!ticking) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const passed = now - last;
      last = now;
      setLeft(value => Math.max(0, value - passed));
    }, 100);
    return () => window.clearInterval(id);
  }, [ticking, run?.index]);

  // 시간이 다 되면: 문제마다 → 그 문항을 놓친 것으로, 전체 시간 → 퀴즈를 끝낸다.
  useEffect(() => {
    if (!ticking || left > 0 || !run) return;
    if (run.limit.mode === "each") pick(TIMEOUT);
    else setRun(now => now && { ...now, index: now.questions.length, expired: true });
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

  const fraction = timed ? Math.max(0, Math.min(1, left / span)) : 1;
  const low = timed && (fraction <= 0.25 || left <= 3000);
  const header = <header className="words-head">
    <Link className="words-back" to="/learn/hindi">← 힌디어</Link>
    {run && <div className="words-tools">
      {timed && !finished && <span className={low ? "wq-clock is-low" : "wq-clock"} aria-label={`남은 시간 ${clock(left)}`}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="11" r="6.5" /><path d="M10 7.5V11l2.2 1.6M8 2.5h4" /></svg>{clock(left)}
      </span>}
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
      <div className="wq-count-setting">
        <Stepper label="문항 수" value={count} text={String(count)} unit="문항" min={MIN_QUESTIONS} max={total} step={5} onChange={chooseCount} />
        <div className="wq-presets" role="group" aria-label="문항 수 빠른 선택">
          {presets.map(preset => <button type="button" key={preset} aria-pressed={count === preset} onClick={() => chooseCount(preset)}>{preset === total ? "전체" : preset}</button>)}
        </div>
      </div>
      <div className="wq-settings">
        <div className="wq-setting-row">
          <label htmlFor="wq-limit-mode">시간 제한</label>
          <div className="wq-select">
            <select id="wq-limit-mode" value={mode} onChange={event => setMode(event.target.value as LimitMode)}>
              {limitModes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>
          </div>
        </div>
        {mode !== "off" && <div className="wq-duration-row">
          <span>{mode === "each" ? "문항당" : "제한 시간"}</span>
          {mode === "each"
            ? <Stepper small label="문항당 제한 시간" value={each} text={spoken(each)} min={EACH.min} max={EACH.max} step={EACH.step} onChange={setEach} />
            : <Stepper small label="퀴즈 전체 제한 시간" value={totalSeconds} text={spoken(totalSeconds)} min={TOTAL.min} max={TOTAL.max} step={TOTAL.step} onChange={setTotalChoice} />}
        </div>}
      </div>
      <div className="wq-setup-actions">
        <button type="button" className="word-primary"
          onClick={() => begin(count, { mode, seconds: mode === "each" ? each : mode === "total" ? totalSeconds : 0 })}>퀴즈 시작</button>
        <p className="wq-hints">힌트 {hintBudget(count)}회</p>
      </div>
    </div>
  </article>;

  if (finished) {
    const missed = run.questions.filter((item, index) => run.picks[index] !== item.id).map(item => byId.get(item.id)!);
    // 틀린 것만 다시 풀 때 전체 시간은 문항 수에 맞춰 줄인다.
    const retryLimit: Limit = run.limit.mode === "total"
      ? { mode: "total", seconds: Math.max(10, Math.round(run.limit.seconds / size * missed.length)) } : run.limit;
    return <article className="words-page">
      {header}
      <div className="word-card wq-card">
        {run.expired && <p className="wq-timeout">시간 종료</p>}
        <p className="wq-score"><strong>{size - missed.length}</strong><span>/ {size}</span></p>
        {missed.length > 0 && <ul className="wq-missed">
          {missed.map(word => <li key={word.id}><span lang="hi">{word.word}</span><small>{word.roman}</small><b>{word.meaning}</b></li>)}
        </ul>}
        <div className="word-actions">
          <button type="button" className="word-ghost" onClick={() => setRun(null)}>설정</button>
          {missed.length > 0 && <button type="button" className="word-ghost" onClick={() => begin(missed.length, retryLimit, missed.map(word => word.id))}>틀린 것만</button>}
          <button type="button" className="word-primary" autoFocus onClick={() => begin(size, run.limit)}>다시</button>
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
      {/* 남은 시간은 카드 윗변을 따라 줄어드는 선으로 보여 준다. 위의 막대는 문항 진행이다. */}
      {timed && <div className="wq-timer" aria-hidden="true"><i className={low ? "is-low" : undefined} style={{ transform: `scaleX(${fraction})` }} /></div>}
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
        {picked === TIMEOUT && <span className="wq-timeout">시간 초과</span>}
        <button type="button" className="word-ghost wq-hint" disabled={hinted || answered || hintsLeft <= 0}
          onClick={() => setRun(now => {
            if (!now) return now;
            const used = [...now.hinted];
            used[now.index] = true;
            return { ...now, hinted: used };
          })}>전사 보기<b>{hintsLeft}</b></button>
        {answered && <button type="button" className="word-primary" autoFocus onClick={next}>{run.index === size - 1 ? "결과" : "다음"}</button>}
      </div>
    </div>
  </article>;
}

import { QUIZ_LENGTH, type QuizQuestion } from "./quiz";
import type { QuizMapState } from "./MapView";

export type QuizRun = { questions: QuizQuestion[]; picks: string[]; index: number };

const isRight = (run: QuizRun, index: number) => run.picks[index] === run.questions[index].id;

const questionPrompt = (question: QuizQuestion, names: ReadonlyMap<string, string>) => question.kind === "name"
  ? "지도에 표시된 지역의 이름은 무엇인가요?"
  : `지도에서 ${names.get(question.id)}의 위치를 찾아보세요.`;

/** 지금 문제에서 지도에 무엇을 칠하고 무엇을 누를 수 있는지. */
export function quizMapState(run: QuizRun, names: ReadonlyMap<string, string>, onPick: (id: string) => void): QuizMapState {
  const label = (ids: string[]) => Object.fromEntries(ids.map(id => [id, names.get(id) ?? ""]));
  if (run.index >= QUIZ_LENGTH) {
    // 끝나면 열 곳을 한꺼번에 돌아본다.
    const marks = Object.fromEntries(run.questions.map((question, index) => [question.id, isRight(run, index) ? "correct" as const : "wrong" as const]));
    return { askedId: null, pickable: false, marks, labels: label(Object.keys(marks)), prompt: "", onPick };
  }
  const question = run.questions[run.index];
  const picked = run.picks[run.index];
  if (question.kind === "name") {
    // 맞고 틀림은 보기 버튼이 보여 준다. 지도에는 그곳의 이름만 적는다.
    return { askedId: question.id, pickable: false, prompt: questionPrompt(question, names), onPick, marks: {}, labels: picked ? label([question.id]) : {} };
  }
  const marks: QuizMapState["marks"] = !picked ? {} : picked === question.id ? { [question.id]: "correct" } : { [picked]: "wrong", [question.id]: "correct" };
  return { askedId: null, pickable: !picked, prompt: questionPrompt(question, names), marks, labels: label(Object.keys(marks)), onPick };
}

export function QuizPanel({ run, names, onPick, onNext, onRestart, onClose, onOpenPlace }: {
  run: QuizRun;
  names: ReadonlyMap<string, string>;
  onPick: (id: string) => void;
  onNext: () => void;
  onRestart: () => void;
  onClose: () => void;
  onOpenPlace: (id: string) => void;
}) {
  const finished = run.index >= QUIZ_LENGTH;
  const question = finished ? undefined : run.questions[run.index];
  const picked = finished ? undefined : run.picks[run.index];
  const score = run.questions.filter((_, index) => isRight(run, index)).length;
  const missed = run.questions.filter((_, index) => !isRight(run, index));
  return <div className="quiz">
    <header className="quiz-head">
      <ol className="quiz-steps" aria-label={finished ? `${score} / ${QUIZ_LENGTH}` : `${run.index + 1} / ${QUIZ_LENGTH}`}>
        {run.questions.map((item, index) => <li key={item.id}
          className={run.picks[index] ? (isRight(run, index) ? "is-correct" : "is-wrong") : index === run.index ? "is-current" : undefined} />)}
      </ol>
      <button type="button" className="quiz-close" aria-label="퀴즈 끝내기" onClick={onClose}>×</button>
    </header>
    {finished ? <>
      <p className="quiz-score"><strong>{score}</strong><span>/ {QUIZ_LENGTH}</span></p>
      {missed.length > 0 && <ul className="quiz-missed">
        {missed.map(item => <li key={item.id}><button type="button" onClick={() => onOpenPlace(item.id)}>{names.get(item.id)}</button></li>)}
      </ul>}
      <button type="button" className="quiz-next" autoFocus onClick={onRestart}>다시</button>
    </> : <>
      <h1 className="quiz-prompt">{questionPrompt(question!, names)}</h1>
      {question!.kind === "name" && <div className="quiz-choices">
        {question!.choices.map(id => <button type="button" key={id} disabled={Boolean(picked)} onClick={() => onPick(id)}
          className={!picked ? undefined : id === question!.id ? "is-correct" : id === picked ? "is-wrong" : undefined}>{names.get(id)}</button>)}
      </div>}
      {picked && <button type="button" className="quiz-next" autoFocus onClick={onNext}>{run.index === QUIZ_LENGTH - 1 ? "결과" : "다음"}</button>}
    </>}
  </div>;
}

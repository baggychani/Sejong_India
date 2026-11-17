import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LETTERS } from "./devanagari";
import "../styles/explanation.css";

export type ExplanationNote = {
  title: string;
  glyph?: string;
  roman?: string;
  paragraphs: string[];
  application?: string;
  examples?: { word: string; roman: string; meaning: string; pronunciationNote?: string }[];
  sources?: { title: string; url: string }[];
  /** 본문만으로 뜻이 통해 제목 줄을 보이지 않는다. 제목은 접근성 이름과 읽기 경로에 남는다. */
  untitled?: boolean;
  /** 한 줄 설명. 카드 대신 글자 위 검은 팁으로 보여 준다. */
  tip?: boolean;
};

// 끝 /a/가 남는 두 조건과 콧소리가 나는 자리 이름. 본문 문장은 그대로 두고 화면에서만 표시한다.
const CONDITIONS = ["끝이 자음 묶음", "마지막 자음이 /y/·/r/·/l/·/v/", ...LETTERS.places.map(([place]) => place)];
const TIP_PLACE = "단어 끝 자음 뒤";

function marked(text: string, key: string) {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;
  while (rest) {
    const found = CONDITIONS.map(item => ({ item, at: rest.indexOf(item) })).filter(hit => hit.at >= 0).sort((a, b) => a.at - b.at)[0];
    if (!found) { nodes.push(rest); break; }
    if (found.at > 0) nodes.push(rest.slice(0, found.at));
    nodes.push(<strong key={`${key}-${index++}`} className="explanation-highlight">{found.item}</strong>);
    rest = rest.slice(found.at + found.item.length);
  }
  return nodes;
}

// Keep mixed-script glyph metrics from expanding individual body lines.
function Prose({ text, reading }: { text: string; reading: boolean }) {
  if (reading) return <>{text}</>;
  return <>{text.split(/(\p{Script=Devanagari}[\p{Script=Devanagari}\p{M}\u200c\u200d]*|\[[^\]\n]+\])/gu).map((part, index) =>
    index % 2 ? <span key={index} className="explanation-run" lang={part.startsWith("[") ? undefined : "hi"}>{part}</span> : marked(part, String(index)))}</>;
}

function TipText({ text, name }: { text: string; name: string }) {
  if (text.startsWith(name)) return <><strong>{name}</strong>{text.slice(name.length)}</>;
  const at = text.indexOf(TIP_PLACE);
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<span className="explanation-tip-place">{TIP_PLACE}</span>{text.slice(at + TIP_PLACE.length)}</>;
}

/** 본문이 제목(부호 이름 등)으로 시작하면 제목 줄 대신 그 이름을 굵게 쓴다. */
const showsTitle = (note: ExplanationNote) => !note.glyph && !note.untitled && !note.paragraphs.some(text => text.startsWith(note.title));

/** The popup and the no-JavaScript reading path use the same source content. */
export function ExplanationContent({ note, reading = false }: { note: ExplanationNote; reading?: boolean }) {
  const showTitle = showsTitle(note);
  return <>
    {reading ? <h3>{note.title}</h3> : note.glyph ? <div className="explanation-identity">
      <span lang="hi">{note.glyph}</span><span className="explanation-roman">{note.roman}</span>
    </div> : showTitle && <p className="explanation-title">{note.title}</p>}
    {note.paragraphs.map(text => <p className="explanation-copy" key={text}>{!reading && !note.glyph && text.startsWith(note.title)
      ? <><strong className="explanation-name">{note.title}</strong><Prose text={text.slice(note.title.length)} reading={reading} /></>
      : <Prose text={text} reading={reading} />}</p>)}
    {note.application && <div className="explanation-application">
      {!reading && <p className="explanation-application-label">이 단어에서는</p>}
      <p className="explanation-copy"><Prose text={note.application} reading={reading} /></p>
    </div>}
    {note.examples && <ul className="explanation-examples">{note.examples.map(example => <li key={example.word}>
      <span lang="hi">{example.word}</span><i>{example.roman}</i><span>{example.meaning}</span>
      {example.pronunciationNote && <p className="explanation-copy explanation-example-note"><Prose text={example.pronunciationNote} reading={reading} /></p>}
    </li>)}</ul>}
    {reading && note.sources && <div>{note.sources.map(source => <p key={source.url}><a href={source.url}>{source.title}</a></p>)}</div>}
  </>;
}

// श·ष처럼 짧은 설명은 370px가 맞다. 본문이 그보다 길면 높이만 늘지 않도록 옆으로 넓힌다.
const COMPACT_NOTE_CHARS = 240;
function panelSize(note: ExplanationNote) {
  const text = [...note.paragraphs, note.application ?? "", ...(note.examples ?? []).flatMap(example => example.pronunciationNote ? [example.pronunciationNote] : [])].join("");
  return text.length > COMPACT_NOTE_CHARS ? " is-wide" : "";
}

/** Native top-layer popovers provide outside-click/Escape dismissal without clipping. */
export function Explanation({ note, className = "", above = false }: { note: ExplanationNote; className?: string; above?: boolean }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current;
      const popup = panel.current;
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      if (rect.bottom < 0 || rect.top > height) { popup.hidePopover(); return; }
      popup.style.maxHeight = "";
      const box = popup.getBoundingClientRect();
      // 글자표는 버튼 오른쪽으로 띄워 그 칸을 가리지 않는다. 단어 공부는 글자 위에 둔다.
      let left = above ? rect.left : rect.right + 8;
      if (left + box.width > width - 12) left = width - box.width - 12;
      if (left < 12) left = 12;
      const room = rect.top - 22;
      const below = rect.bottom + 10;
      const top = above
        ? (room > 0 ? rect.top - 10 - Math.min(box.height, room) : 12)
        : below + box.height <= height - 12 ? below : Math.max(12, rect.top - box.height - 10);
      if (above && room > 0 && box.height > room) popup.style.maxHeight = `${room}px`;
      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.style.visibility = "visible";
    };
    place();
    panel.current?.querySelector<HTMLButtonElement>(".explanation-close")?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, above]);

  if (note.tip) return <button type="button" className={`explanation-trigger ${className}`} aria-label={`${note.title} 설명`}
    aria-expanded={open} onClick={event => { event.stopPropagation(); setOpen(value => !value); }}>
    ?<span role="tooltip" className={`explanation-tip${open ? " is-open" : ""}`}><TipText text={note.paragraphs[0] ?? ""} name={note.title} /></span>
  </button>;

  const showTitle = showsTitle(note);
  return <>
    <button type="button" ref={trigger} className={`explanation-trigger ${className}`} popoverTarget={id}
      aria-label={`${note.title} 설명`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog">?</button>
    <div ref={panel} id={id} popover="auto" className={`explanation-panel${note.glyph ? " has-glyph" : ""}${showTitle ? " has-title" : ""}${panelSize(note)}`} role="dialog" aria-label={`${note.title} 설명`}
      onToggle={event => { setOpen(event.newState === "open"); }}
      onBeforeToggle={event => { if (event.newState === "open") event.currentTarget.style.visibility = "hidden"; }}
      onKeyDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
      {open && <>
        <button type="button" className="explanation-close" aria-label="설명 닫기" onClick={() => {
          panel.current?.hidePopover(); trigger.current?.focus({ preventScroll: true });
        }}>×</button>
        <ExplanationContent note={note} />
      </>}
    </div>
  </>;
}

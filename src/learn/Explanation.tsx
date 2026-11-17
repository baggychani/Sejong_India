import { useId, useLayoutEffect, useRef, useState } from "react";
import "../styles/explanation.css";

export type ExplanationNote = {
  title: string;
  glyph?: string;
  roman?: string;
  paragraphs: string[];
  application?: string;
  examples?: { word: string; roman: string; meaning: string; pronunciationNote?: string }[];
  sources?: { title: string; url: string }[];
};

// Keep mixed-script glyph metrics from expanding individual body lines.
function Prose({ text, reading }: { text: string; reading: boolean }) {
  if (reading) return <>{text}</>;
  return <>{text.split(/(\p{Script=Devanagari}[\p{Script=Devanagari}\p{M}\u200c\u200d]*|\[[^\]\n]+\])/gu).map((part, index) =>
    index % 2 ? <span key={index} className="explanation-run" lang={part.startsWith("[") ? undefined : "hi"}>{part}</span> : part)}</>;
}

/** The popup and the no-JavaScript reading path use the same source content. */
export function ExplanationContent({ note, reading = false }: { note: ExplanationNote; reading?: boolean }) {
  return <>
    {reading ? <h3>{note.title}</h3> : note.glyph && <div className="explanation-identity">
      <span lang="hi">{note.glyph}</span><span className="explanation-roman">{note.roman}</span>
    </div>}
    {note.paragraphs.map(text => <p className="explanation-copy" key={text}><Prose text={text} reading={reading} /></p>)}
    {note.application && <div className="explanation-application"><p className="explanation-copy"><Prose text={note.application} reading={reading} /></p></div>}
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
export function Explanation({ note, className = "" }: { note: ExplanationNote; className?: string }) {
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
      const box = popup.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.right - box.width, width - box.width - 12));
      const below = rect.bottom + 10;
      const top = below + box.height <= height - 12 ? below : Math.max(12, rect.top - box.height - 10);
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
  }, [open]);

  return <>
    <button type="button" ref={trigger} className={`explanation-trigger ${className}`} popoverTarget={id}
      aria-label={`${note.title} 설명`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog">?</button>
    <div ref={panel} id={id} popover="auto" className={`explanation-panel${note.glyph ? " has-glyph" : ""}${panelSize(note)}`} role="dialog" aria-label={`${note.title} 설명`}
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

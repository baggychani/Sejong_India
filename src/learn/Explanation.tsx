import { useId, useLayoutEffect, useRef, useState } from "react";
import "../styles/explanation.css";

export type ExplanationNote = {
  title: string;
  paragraphs: string[];
  application?: string;
  examples?: { word: string; roman: string; meaning: string }[];
  sources?: { title: string; url: string }[];
};

/** The popup and the no-JavaScript reading path use the same content. */
export function ExplanationContent({ note, headingId }: { note: ExplanationNote; headingId?: string }) {
  return <>
    <h3 id={headingId}>{note.title}</h3>
    {note.paragraphs.map(text => <p key={text}>{text}</p>)}
    {note.application && <div className="explanation-application"><h4>이 단어에서는</h4><p>{note.application}</p></div>}
    {note.examples && <ul className="explanation-examples">{note.examples.map(example => <li key={example.word}>
      <span lang="hi">{example.word}</span><i>{example.roman}</i><span>{example.meaning}</span>
    </li>)}</ul>}
    {note.sources && <div className="explanation-sources">{note.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div>}
  </>;
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
    <div ref={panel} id={id} popover="auto" className="explanation-panel" role="dialog" aria-labelledby={`${id}-title`}
      onToggle={event => { setOpen(event.newState === "open"); }}
      onBeforeToggle={event => { if (event.newState === "open") event.currentTarget.style.visibility = "hidden"; }}
      onKeyDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
      {open && <>
        <button type="button" className="explanation-close" aria-label="설명 닫기" onClick={() => {
          panel.current?.hidePopover(); trigger.current?.focus({ preventScroll: true });
        }}>×</button>
        <ExplanationContent note={note} headingId={`${id}-title`} />
      </>}
    </div>
  </>;
}

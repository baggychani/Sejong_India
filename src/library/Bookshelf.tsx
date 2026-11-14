import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { formatRead, spineWidth, type Book } from "./books";

type Item =
  | { kind: "face"; book: Book; width: number }
  | { kind: "spine"; book: Book; width: number }
  | { kind: "stack"; books: Book[]; width: number }
  | { kind: "bookend"; width: number };

const FACE_W = 128;
const ROW_GAP = 2;

function itemsFor(books: Book[], scale: number): Item[] {
  const items: Item[] = [];
  for (const book of books) {
    if (book.reading || book.pose === "face") {
      items.push({ kind: "face", book, width: Math.round(FACE_W * scale) + 26 });
    } else if (book.pose === "flat") {
      const last = items.at(-1);
      if (last?.kind === "stack" && last.books.length < 4) {
        last.books.push(book);
        last.width = Math.max(last.width, book.height * scale + 28 + (last.books.length % 2 === 0 ? 10 : 0));
      } else {
        items.push({ kind: "stack", books: [book], width: book.height * scale + 28 });
      }
    } else {
      const lean = book.pose === "lean" ? 30 : 0;
      items.push({ kind: "spine", book, width: (spineWidth(book.pages) + lean) * scale });
    }
  }
  return items;
}

/** Fill shelves in reading order, accounting for the gap between adjacent items. */
function packRows(items: Item[], inner: number) {
  const rows: Item[][] = [[]];
  let used = 0;
  for (const item of items) {
    if (used && used + ROW_GAP + item.width > inner) {
      rows.push([]);
      used = 0;
    }
    rows.at(-1)!.push(item);
    used += (used ? ROW_GAP : 0) + item.width;
  }
  // A shelf with room left gets a bookend after its last upright book.
  for (const row of rows) {
    const last = row.at(-1);
    const width = row.reduce((sum, item) => sum + item.width, 0) + ROW_GAP * (row.length - 1);
    if (last?.kind === "spine" && last.book.pose === "upright" && inner - width > 60) {
      row.push({ kind: "bookend", width: 22 });
    }
  }
  return rows;
}

/** Fit title (and author, if there is room) along the spine. */
function spineText(book: Book, scale: number) {
  const room = book.height * scale - 64;
  const max = spineWidth(book.pages) < 24 ? 11.5 : 13.5;
  const perChar = book.title.length * 1.1;
  const authorRoom = book.author ? book.author.length * 10.5 + 14 : 0;
  const withAuthor = (room - authorRoom) / perChar;
  if (withAuthor >= 9.5) return { size: Math.min(max, withAuthor), author: true };
  return { size: Math.max(8.5, Math.min(max, room / perChar)), author: false };
}

function Spine({ book, scale, onShow, basePath }: { book: Book; scale: number; basePath: string; onShow: (book: Book) => void }) {
  const text = spineText(book, scale);
  const style = {
    "--h": `${book.height * scale}px`,
    "--w": `${spineWidth(book.pages) * scale}px`,
    "--c": book.spine,
    "--spine-ink": book.ink,
    "--fs": `${text.size.toFixed(1)}px`,
  } as CSSProperties;
  const label = [book.title, book.author, book.read && `${formatRead(book.read)}에 읽음`].filter(Boolean).join(", ");
  return (
    <Link
      to={`${basePath}/${book.slug}`}
      className={`spine v${book.variant} pose-${book.pose}`}
      style={style}
      aria-label={label}
      onMouseEnter={() => onShow(book)}
      onFocus={() => onShow(book)}
    >
      <i className="band top" aria-hidden="true" />
      <span className="spine-text" aria-hidden="true">
        {book.title}
        {book.author && text.author && <small>{book.author}</small>}
      </span>
      <i className="band bottom" aria-hidden="true" />
      <i className="spine-mark" aria-hidden="true" />
    </Link>
  );
}

function FaceOut({ book, scale, onShow, basePath }: { book: Book; scale: number; basePath: string; onShow: (book: Book) => void }) {
  const style = { "--fw": `${Math.round(FACE_W * scale)}px`, "--c": book.spine, "--spine-ink": book.ink } as CSSProperties;
  return (
    <Link
      to={`${basePath}/${book.slug}`}
      className={book.cover ? "face-out has-cover" : "face-out"}
      style={style}
      aria-label={[book.title, book.author, book.reading && "읽는 중"].filter(Boolean).join(", ")}
      onMouseEnter={() => onShow(book)}
      onFocus={() => onShow(book)}
    >
      {book.reading && <span className="face-ribbon" aria-hidden="true">읽는 중</span>}
      <span className="face-name">{book.title}</span>
      {book.cover ? (
        <img className="face-cover" src={book.cover} alt="" decoding="async" />
      ) : (
        <span className="face-cover is-blank" aria-hidden="true">
          <b>{book.title}</b>
          <small>{book.author}</small>
        </span>
      )}
    </Link>
  );
}

export function Bookshelf({ books, basePath = "/library" }: { books: Book[]; basePath?: string }) {
  const caseRef = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState(0);
  const [shown, setShown] = useState<Book>();

  useLayoutEffect(() => {
    const el = caseRef.current;
    if (!el) return;
    const measure = () => {
      const css = getComputedStyle(el);
      const pad = parseFloat(css.getPropertyValue("--case-pad")) || 0;
      const rowPad = parseFloat(css.getPropertyValue("--row-pad")) || 0;
      setInner(el.clientWidth - 2 * pad - 2 * rowPad);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The first browser render must match the generated HTML for hydration.
  const width = inner || 960;
  const scale = width && width < 460 ? 0.86 : 1;
  const rows = width ? packRows(itemsFor(books, scale), width) : [[]];
  const caption = shown ?? (books.length === 1 ? books[0] : undefined);

  return (
    <div className="bookshelf">
      <div className="bookcase" ref={caseRef} style={{ "--scale": scale } as CSSProperties}
        onMouseLeave={() => { if (!caseRef.current?.contains(document.activeElement)) setShown(undefined); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShown(undefined); }}>
        {rows.map((row, index) => (
          <div className="bay" key={index}>
            <div className="shelf-row">
              {row.map((item) => {
                if (item.kind === "face") return <FaceOut key={item.book.slug} book={item.book} scale={scale} onShow={setShown} basePath={basePath} />;
                if (item.kind === "spine") return <Spine key={item.book.slug} book={item.book} scale={scale} onShow={setShown} basePath={basePath} />;
                if (item.kind === "bookend") return <i key="bookend" className="bookend" aria-hidden="true" />;
                return (
                  <div key={item.books[0].slug} className="book-stack">
                    {item.books.map((book) => <Spine key={book.slug} book={book} scale={scale} onShow={setShown} basePath={basePath} />)}
                  </div>
                );
              })}
            </div>
            <div className="shelf-board" aria-hidden="true" />
          </div>
        ))}
        <div className="bookcase-plinth" aria-hidden="true" />
      </div>
      <p className="shelf-caption" aria-live="polite">
        {caption && (
          <>
            <b>{caption.title}</b>
            <span>{[caption.author, caption.reading ? "읽는 중" : caption.read && `${formatRead(caption.read)}에 읽음`].filter(Boolean).join(" · ")}</span>
          </>
        )}
      </p>
    </div>
  );
}

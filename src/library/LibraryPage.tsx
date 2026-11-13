import { useEffect, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import { siteTitle } from "../site/sections";
import { NotFoundPage } from "../pages/NotFoundPage";
import { Bookshelf } from "./Bookshelf";
import { allBooks, findBook, formatRead } from "./books";
import "../styles/library.css";

export function LibraryPage() {
  const books = allBooks();
  useEffect(() => {
    document.title = `서재 · ${siteTitle}`;
  }, []);

  return (
    <article className="library">
      <header className="library-head">
        <h1>서재</h1>
        {books.length > 0 && <p>{books.length}권</p>}
      </header>
      <Bookshelf books={books} />
    </article>
  );
}

export function BookPage() {
  const { slug } = useParams();
  const book = slug ? findBook(slug) : undefined;

  useEffect(() => {
    if (book) document.title = `${book.title} · ${siteTitle}`;
  }, [book]);

  if (!book) return <NotFoundPage />;

  const status = book.reading ? "읽는 중" : book.read ? `${formatRead(book.read)}에 읽음` : "";
  return (
    <article className="book-page">
      <p className="eyebrow">
        <Link to="/library">서재</Link>
      </p>
      <header className="book-hero">
        {book.cover ? (
          <img className="book-hero-cover" src={book.cover} alt={`${book.title} 표지`} />
        ) : (
          <div className="book-hero-cover is-blank" style={{ "--c": book.spine, "--spine-ink": book.ink } as CSSProperties} aria-hidden="true">
            <b>{book.title}</b>
          </div>
        )}
        <div>
          <h1>{book.title}</h1>
          {book.subtitle && <p className="book-subtitle">{book.subtitle}</p>}
          <p className="book-meta">
            {book.author && <span>{book.author} 지음</span>}
            {book.translator && <span>{book.translator} 옮김</span>}
            {book.publisher && <span>{book.publisher}</span>}
            {status && <span>{status}</span>}
            {book.pages && <span>{book.pages}쪽</span>}
          </p>
          {book.summary && <p className="lede">{book.summary}</p>}
        </div>
      </header>
      {book.body && (
        <div className="prose">
          <ReactMarkdown>{book.body}</ReactMarkdown>
        </div>
      )}
    </article>
  );
}

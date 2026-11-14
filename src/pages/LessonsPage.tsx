import { Link, useParams } from "react-router";
import { usePageTitle } from "../site/title";
import textbooks from "../../data/content/textbooks.json";
import { Bookshelf } from "../library/Bookshelf";
import type { Book } from "../library/books";
import { entriesFor } from "../content/load";
import { EntryPage } from "./EntryPage";
import { siteTitle } from "../site/sections";
import "../styles/library.css";

const covers = import.meta.glob<string>("../../content/textbooks/covers/*", {
  query: "?url", import: "default", eager: true,
});
const books: Book[] = textbooks.map(textbook => ({
  slug: textbook.id, title: textbook.title, author: "세종학당재단",
  cover: covers["../../content/textbooks/covers/" + textbook.cover],
  spine: "#e8e5db", ink: "#242f2d", height: 190,
  reading: false, pose: "face", variant: 0, body: "", summary: "",
}));

export function LessonsPage() {
  const { slug } = useParams();
  const textbook = textbooks.find(book => book.id === slug);
  const book = books.find(book => book.slug === slug);
  usePageTitle(`${textbook?.title ?? "교안"} · ${siteTitle}`);
  if (slug && !textbook) return <EntryPage collectionIdOverride="lessons" />;
  if (textbook && book) {
    const lessons = entriesFor("lessons").filter(entry => entry.meta.textbook === textbook.id);
    return <article className="book-page">
      <p className="eyebrow"><Link to="/lessons">교안</Link></p>
      <header className="book-hero">
        <img className="book-hero-cover" src={book.cover} alt={textbook.title + " 표지"} />
        <div>
          <h1>{textbook.title}</h1>
          <p className="book-meta">세종학당재단</p>
          <a className="textbook-source" href={textbook.source} target="_blank" rel="noreferrer">누리세종학당 교재·음원 ↗</a>
        </div>
      </header>
      {lessons.length > 0 && <ul className="entry-list">
        {lessons.map(entry => <li key={entry.slug}><Link to={"/lessons/" + entry.slug}>{entry.title}</Link></li>)}
      </ul>}
    </article>;
  }
  return <article className="library">
    <header className="library-head"><h1>세종학당 한국어</h1><p>{books.length}권</p></header>
    <Bookshelf books={books} basePath="/lessons" />
  </article>;
}

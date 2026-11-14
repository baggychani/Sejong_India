import { Link, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import { findCollection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { findEntry } from "../content/load";
import { NotFoundPage } from "./NotFoundPage";
import "../styles/interview.css";

export function EntryPage({ collectionIdOverride }: { collectionIdOverride?: string } = {}) {
  const { collectionId, slug } = useParams();
  const collection = findCollection(collectionIdOverride ?? collectionId);
  const entry =
    collection && slug ? findEntry(collection.id, slug) : undefined;

  usePageTitle(collection && entry ? `${entry.title} · ${siteTitle}` : `없는 페이지 · ${siteTitle}`);

  if (!collection || !entry) {
    return <NotFoundPage />;
  }

  return (
    <article className={collection.id === "study" ? "reading entry interview-entry" : "reading entry"}>
      <p className="eyebrow">
        <Link to={collection.path}>{collection.title}</Link>
      </p>
      <h1>{entry.title}</h1>
      {entry.summary ? <p className="lede">{entry.summary}</p> : null}
      <div className="prose">
        <ReactMarkdown>{entry.body}</ReactMarkdown>
      </div>
    </article>
  );
}

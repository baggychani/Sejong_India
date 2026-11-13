import { useEffect } from "react";
import { Link, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import { findCollection, siteTitle } from "../site/sections";
import { findEntry } from "../content/load";
import { NotFoundPage } from "./NotFoundPage";

export function EntryPage() {
  const { collectionId, slug } = useParams();
  const collection = findCollection(collectionId);
  const entry =
    collection && slug ? findEntry(collection.id, slug) : undefined;

  useEffect(() => {
    if (collection && entry) {
      document.title = `${entry.title} · ${siteTitle}`;
    }
  }, [collection, entry]);

  if (!collection || !entry) {
    return <NotFoundPage />;
  }

  return (
    <article className="reading entry">
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

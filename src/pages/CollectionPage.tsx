import { Link, useParams } from "react-router";
import { findCollection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { entriesFor } from "../content/load";
import { NotFoundPage } from "./NotFoundPage";
import { Icon } from "../site/Icon";
import "../styles/interview.css";

export function CollectionPage() {
  const { collectionId } = useParams();
  const collection = findCollection(collectionId);

  usePageTitle(collection ? `${collection.title} · ${siteTitle}` : `없는 페이지 · ${siteTitle}`);

  if (!collection) {
    return <NotFoundPage />;
  }

  const entries = entriesFor(collection.id);

  return (
    <article className={collection.id === "study" ? "reading interview-index" : "reading"}>
      <h1>{collection.title}</h1>
      {entries.length === 0 ? (
        <p className="empty">아직 정리해 둔 글이 없다.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link to={`${collection.path}/${entry.slug}`}>{entry.title}{collection.id === "study" && <Icon name="arrow" />}</Link>
              {entry.summary ? <p>{entry.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

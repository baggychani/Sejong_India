import { Link, useParams } from "react-router";
import { findCollection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { entriesFor } from "../content/load";
import { NotFoundPage } from "./NotFoundPage";
import { Icon } from "../site/Icon";
import { CollectionLabel } from "../site/CollectionLabel";
import { HindiWordsEntry } from "./HindiWordsEntry";
import "../styles/interview.css";

export function CollectionPage({ collectionIdOverride }: { collectionIdOverride?: string } = {}) {
  const { collectionId } = useParams();
  const collection = findCollection(collectionIdOverride ?? collectionId);

  usePageTitle(collection ? `${collection.title} · ${siteTitle}` : `없는 페이지 · ${siteTitle}`);

  if (!collection) {
    return <NotFoundPage />;
  }

  const entries = entriesFor(collection.id);
  // 글이 아닌 학습 도구로 가는 입구가 있는 곳.
  const hasTools = collection.id === "hindi";

  return (
    <article className={collection.id === "study" ? "reading interview-index" : "reading"}>
      <h1><CollectionLabel collection={collection} /></h1>
      {hasTools && <HindiWordsEntry />}
      {entries.length === 0 ? (
        hasTools ? null : <p className="empty">아직 정리해 둔 글이 없다.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link to={`${collection.path}/${entry.slug}`}>{collection.id === "study" ? <span>{entry.title}</span> : entry.title}{collection.id === "study" && <Icon name="arrow" />}</Link>
              {entry.summary ? <p>{entry.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

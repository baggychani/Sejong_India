import { Link, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import { findCollection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { findEntry } from "../content/load";
import { NotFoundPage } from "./NotFoundPage";
import { questionsFor } from "../content/interview";
import { Icon } from "../site/Icon";
import "../styles/interview.css";

export function EntryPage({ collectionIdOverride }: { collectionIdOverride?: string } = {}) {
  const { collectionId, slug, questionSlug } = useParams();
  const collection = findCollection(collectionIdOverride ?? collectionId);
  const entry =
    collection && slug ? findEntry(collection.id, slug) : undefined;

  const isInterview = collection?.id === "study";
  const questions = isInterview && entry ? questionsFor(entry.slug) : [];
  const question = questionSlug ? questions.find(item => item.slug === questionSlug) : undefined;
  const current = question ?? entry;

  usePageTitle(collection && current && (!questionSlug || question) ? `${current.title} · ${siteTitle}` : `없는 페이지 · ${siteTitle}`);

  if (!collection || !entry || !current || (questionSlug && !question)) {
    return <NotFoundPage />;
  }

  return (
    <article className={isInterview ? "reading entry interview-entry" : "reading entry"}>
      <p className="eyebrow">
        <Link to={collection.path}>{collection.title}</Link>
        {question && <> <span aria-hidden="true">/</span> <Link to={`${collection.path}/${entry.slug}`}>{entry.title}</Link></>}
      </p>
      <h1 className={question ? "interview-question-title" : undefined}>{current.title}</h1>
      {current.summary ? <p className="lede">{current.summary}</p> : null}
      {isInterview && !question && questions.length > 0 ? (
        <ul className="interview-question-list">
          {questions.map(item => <li key={item.slug}>
            <Link to={`${collection.path}/${entry.slug}/${item.slug}`}>
              <span>{item.title}</span><Icon name="arrow" />
            </Link>
          </li>)}
        </ul>
      ) : null}
      <div className="prose">
        <ReactMarkdown>{current.body}</ReactMarkdown>
      </div>
      {question && <p className="interview-back"><Link to={`${collection.path}/${entry.slug}`}><Icon name="back" />질문 목록으로</Link></p>}
    </article>
  );
}

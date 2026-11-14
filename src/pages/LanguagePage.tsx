import { Link, useParams, useSearchParams } from "react-router";
import { languageModes as modes, languageSources as sources, languageFamilies as families, languages, interestLanguageIds, type Language } from "../site/languages";
import { LanguageFacts, LanguageReference } from "./LanguageReference";
import { LanguageGoal, LanguageRegionBadges } from "./LanguageGoal";
import { siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { Icon } from "../site/Icon";
import { NotFoundPage } from "./NotFoundPage";
import "../styles/languages.css";

function NativeName({ language }: { language: Language }) {
  return <bdi className="native-name" lang={language.tag} dir="auto">{language.native}</bdi>;
}

export default function LanguagePage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = modes.find(([key]) => key === params.get("group"))?.[0] ?? "speakers";
  const query = mode === "speakers" ? "" : `?group=${mode}`;
  const selected = languages.find(l => l.id === id);
  usePageTitle(id && !selected ? `없는 페이지 · ${siteTitle}` : `${selected?.ko ?? "언어"} · ${siteTitle}`);
  if (id && !selected) return <NotFoundPage />;
  if (selected) return <article className="language-page language-detail-page">
    <Link className="language-back" to={`/bharat/languages${query}`}>← 언어</Link>
    <header className="language-identity">
      <div className="language-name-block">
        <NativeName language={selected} />
        <div><h1>{selected.ko}</h1><span lang="en">{selected.en}</span></div>
      </div>
      <LanguageRegionBadges language={selected} />
    </header>
    <LanguageGoal language={selected} />
    <noscript><section id={`language-${selected.id}`}><LanguageFacts language={selected} /></section></noscript>
  </article>;

  const groups = new Map<string, Language[]>();
  const source = mode === "constitution" || mode === "classical" ? sources[mode] : undefined;
  for (const language of languages) {
    if (mode === "constitution" && !language.scheduled) continue;
    if (mode === "classical" && !language.classical) continue;
    const label = mode === "family" ? families[language.family] : source?.heading ?? "";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(language);
  }
  return <section className="language-page">
    <header className="language-toolbar">
      <div className="language-modes" role="group" aria-label="언어 분류">
        {modes.map(([key, label]) => <button key={key} aria-pressed={mode === key}
          title={key === "speakers" ? "2011년 인도 인구조사 · 언어 집단별 전국 모어 화자 수" : undefined}
          onClick={() => setParams(key === "speakers" ? {} : { group: key })}>{label}</button>)}
      </div>
    </header>
    {[...groups].map(([label, entries]) => <section className="language-group" key={label}>
      {label && <div className="language-group-heading">
        <h2>{label} <small>{entries.length}{source && "개"}</small></h2>
        {source && <a href={source.href} target="_blank" rel="noreferrer" aria-label={source.title} title={source.title}>
          <Icon name="link" />
        </a>}
      </div>}
      <div className="language-grid">
        {entries.map(l => <Link key={l.id} className="language-card" data-family={l.family} to={`/bharat/languages/${l.id}${query}`}>
          {interestLanguageIds.has(l.id) && <span aria-label="관심 언어" role="img" title="관심 언어" className={l.id === "tamil" ? "language-bookmark is-tamil" : "language-bookmark"}>★</span>}
          <NativeName language={l} />
          <span className="language-caption"><strong>{l.ko}</strong><span lang="en">{l.en}</span><Icon name="arrow" /></span>
        </Link>)}
      </div>
    </section>)}
    <noscript><LanguageReference /></noscript>
  </section>;
}

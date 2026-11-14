import { Link } from "react-router";
import { languages, languageFamilies, languageSources, interestLanguageIds, type Language } from "../site/languages";

export function LanguageFacts({ language }: { language: Language }) {
  return <dl className="language-facts">
    <div><dt>어족</dt><dd>{languageFamilies[language.family]} ({language.family})</dd></div>
    <div><dt>2011년 언어 집단별 모어 화자 수</dt><dd>{language.census2011GroupSpeakers == null ? "자료 없음" : `${language.census2011GroupSpeakers.toLocaleString("ko-KR")}명`}</dd></div>
    <div><dt>헌법 제8부속서 등재</dt><dd>{language.scheduled ? "예" : "아니요"}</dd></div>
    <div><dt>지정 고전어</dt><dd>{language.classical ? "예" : "아니요"}</dd></div>
  </dl>;
}

function LanguageLinks({ entries }: { entries: Language[] }) {
  return <ul>{entries.map(language => <li key={language.id}>
    <Link to={`/bharat/languages/${language.id}`}>{language.ko} · {language.native} · {language.en}</Link>
  </li>)}</ul>;
}

/** Tab results are present even when the reader cannot activate a tab. */
export function LanguageReference() {
  const scheduled = languages.filter(language => language.scheduled);
  const classical = languages.filter(language => language.classical);
  return <details className="language-reference" id="language-reference">
    <summary>언어 정보와 분류별 목록 전체 보기</summary>
    <p>★ 관심 언어: {languages.filter(language => interestLanguageIds.has(language.id)).map(language => language.ko).join(" · ")}</p>
    <p>화자 수는 2011년 인도 인구조사의 언어 집단 기준입니다. 개별 모어 기준과 다를 수 있으며, 자료가 없는 언어는 0명으로 표시하지 않습니다.</p>
    <p><a href="https://censusindia.gov.in/census.website/data/census-tables">인도 인구조사 원자료</a></p>
    <section id="language-speakers">
      <h2>화자 많은 순 · {languages.length}개</h2>
      {languages.map(language => <article key={language.id} id={`language-${language.id}`}>
        <h3><Link to={`/bharat/languages/${language.id}`}>{language.ko} · {language.native} · {language.en}</Link></h3>
        <LanguageFacts language={language} />
      </article>)}
    </section>
    <section id="language-families">
      <h2>어족별 · {Object.keys(languageFamilies).length}종</h2>
      {Object.entries(languageFamilies).map(([key, name]) => {
        const entries = languages.filter(language => language.family === key);
        return <section key={key} id={`family-${key}`}><h3>{name} · {entries.length}개</h3><LanguageLinks entries={entries} /></section>;
      })}
    </section>
    <section id="language-constitution">
      <h2>헌법 등재 · {scheduled.length}개</h2>
      <p><a href={languageSources.constitution.href}>{languageSources.constitution.title}</a></p>
      <LanguageLinks entries={scheduled} />
    </section>
    <section id="language-classical">
      <h2>지정 고전어 · {classical.length}개</h2>
      <p><a href={languageSources.classical.href}>{languageSources.classical.title}</a></p>
      <LanguageLinks entries={classical} />
    </section>
  </details>;
}

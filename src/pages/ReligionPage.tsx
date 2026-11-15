import { Link, useParams } from "react-router";
import {
  religionCensus, religionPages, religionNationwide, religionSymbolMask, formatReligionShare, numberOfPeople,
  type ReligionPageEntry,
} from "../site/religions";
import { ReligionReference } from "./ReligionReference";
import { ReligionMap } from "./ReligionMap";
import { NotFoundPage } from "./NotFoundPage";
import { Icon } from "../site/Icon";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/religions.css";

/** 상징 그림의 이름과 출처. 그림은 장식이므로 글은 비시각 읽기 경로에 둔다. */
function symbolCredit(religion: ReligionPageEntry) {
  return `상징 그림: ${religion.symbol.name} · ${religion.symbol.credit} · ${religion.symbol.license}`;
}

export function ReligionPage() {
  const { id } = useParams();
  const selected = religionPages.find(religion => religion.id === id);
  usePageTitle(id && !selected ? `없는 페이지 · ${siteTitle}` : `${selected?.ko ?? "종교"} · ${siteTitle}`);
  if (id && !selected) return <NotFoundPage />;
  if (selected) {
    const nation = religionNationwide(selected);
    return <article className="religion-page religion-detail-page">
      <Link className="religion-back" to="/bharat/religions">← 종교</Link>
      <header className="religion-identity" data-religion={selected.censusGroup}>
        <span className="religion-symbol" aria-hidden="true" title={selected.symbol.name} style={religionSymbolMask(selected)} />
        <div className="religion-name-block"><h1>{selected.ko}</h1><span lang="en">{selected.en}</span></div>
        <p className="religion-nation">
          <strong>{formatReligionShare(nation.population, nation.total)}</strong>
          <noscript><span> · 인도 인구 중 · {numberOfPeople(nation.population)} · {religionCensus.year}년 인구조사</span></noscript>
        </p>
        <noscript><p>{symbolCredit(selected)} · <a href={selected.symbol.source}>그림 출처</a></p></noscript>
      </header>
      <section className="religion-section" aria-labelledby="religion-distribution-title">
        <h2 id="religion-distribution-title">지역 분포</h2>
        <ReligionMap religion={selected} />
      </section>
    </article>;
  }

  return <section className="religion-page">
    <header className="religion-toolbar">
      <div className="religion-modes" role="group" aria-label="종교 배열 순서">
        <button aria-pressed={true} title={`${religionCensus.year}년 인도 인구조사 · 전국 신자 수`}>신자 많은 순</button>
      </div>
    </header>
    <div className="religion-tiles">
      {religionPages.map(religion => <Link key={religion.id} className="religion-tile" id={`religion-page-${religion.id}`}
        data-religion={religion.censusGroup} to={`/bharat/religions/${religion.id}`}>
        <span className="religion-tile-art" aria-hidden="true">
          <span className="religion-symbol is-echo" style={religionSymbolMask(religion)} />
          <span className="religion-symbol" style={religionSymbolMask(religion)} />
        </span>
        <span className="religion-caption"><strong>{religion.ko}</strong><span lang="en">{religion.en}</span><Icon name="arrow" /></span>
        <noscript><span> · {symbolCredit(religion)} · {religion.symbol.source}</span></noscript>
      </Link>)}
    </div>
    {/* 2011년 인구조사 표는 화면에서 내렸다. 아래 주석의 코드를 되살리면 다시 나온다. */}
    <noscript><ReligionReference /></noscript>
  </section>;
}

/*
 * 보관: 종교 페이지의 이전 화면 (학당 지역 / 주·연방직할지 / 전국 탭과 지역별 인구조사 표).
 * 삭제하지 않고 남겨 둔다. 되살리려면 아래 import와 본문을 ReligionPage에 다시 넣는다.
 * 표 컴포넌트(ReligionProfileFacts)와 스타일(.religion-card, .religion-table 등)은 그대로 있다.
 *
 * import { Link, useSearchParams } from "react-router";
 * import { religionCensus, religionModes, instituteReligionProfiles } from "../site/religions";
 * import { ReligionProfileFacts, ReligionReference } from "./ReligionReference";
 *
 * export function ReligionPage() {
 *   const [params, setParams] = useSearchParams();
 *   const mode = religionModes.find(([key]) => key === params.get("group"))?.[0] ?? "institutes";
 *   usePageTitle(`종교 · ${siteTitle}`);
 *   const entries = mode === "institutes" ? instituteReligionProfiles.map(({ institute, profile }) => ({
 *     key: institute.id, title: institute.names.ko, placeId: institute.id, profile,
 *   })) : religionCensus.profiles.filter(profile => mode === "india" ? profile.id === "india" : profile.placeIds.some(id => id.startsWith("IN-")))
 *     .map(profile => ({ key: profile.id, title: profile.area, placeId: profile.placeIds[0], profile }));
 *   return <section className="religion-page">
 *     <header className="religion-heading"><div><h1>종교</h1><p>2011 Census · 지역별 종교 구성</p></div>
 *       <div className="religion-modes" role="group" aria-label="종교 통계 지역 단위">
 *         {religionModes.map(([key, label]) => <button key={key} aria-pressed={mode === key}
 *           onClick={() => setParams(key === "institutes" ? {} : { group: key })}>{label}</button>)}
 *       </div>
 *     </header>
 *     <p className="religion-intro">{religionCensus.description}</p>
 *     <div className="religion-grid">{entries.map(entry => <article className="religion-card" key={entry.key}>
 *       <h2>{entry.placeId ? <Link to={`/bharat/map?place=${encodeURIComponent(entry.placeId)}`}>{entry.title}<span aria-hidden="true"> ↗</span></Link> : entry.title}</h2>
 *       <ReligionProfileFacts profile={entry.profile} />
 *     </article>)}</div>
 *     <p className="religion-methodology">{religionCensus.methodology}</p>
 *     <noscript><ReligionReference /></noscript>
 *   </section>;
 * }
 */

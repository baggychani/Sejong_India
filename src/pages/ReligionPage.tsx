import { Link, useSearchParams } from "react-router";
import { religionCensus, religionModes, instituteReligionProfiles } from "../site/religions";
import { ReligionProfileFacts, ReligionReference } from "./ReligionReference";
import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";
import "../styles/religions.css";

export function ReligionPage() {
  const [params, setParams] = useSearchParams();
  const mode = religionModes.find(([key]) => key === params.get("group"))?.[0] ?? "institutes";
  usePageTitle(`종교 · ${siteTitle}`);
  const entries = mode === "institutes" ? instituteReligionProfiles.map(({ institute, profile }) => ({
    key: institute.id, title: institute.names.ko, placeId: institute.id, profile,
  })) : religionCensus.profiles.filter(profile => mode === "india" ? profile.id === "india" : profile.placeIds.some(id => id.startsWith("IN-")))
    .map(profile => ({ key: profile.id, title: profile.area, placeId: profile.placeIds[0], profile }));
  return <section className="religion-page">
    <header className="religion-heading"><div><h1>종교</h1><p>2011 Census · 지역별 종교 구성</p></div>
      <div className="religion-modes" role="group" aria-label="종교 통계 지역 단위">
        {religionModes.map(([key, label]) => <button key={key} aria-pressed={mode === key}
          onClick={() => setParams(key === "institutes" ? {} : { group: key })}>{label}</button>)}
      </div>
    </header>
    <p className="religion-intro">{religionCensus.description}</p>
    <div className="religion-grid">{entries.map(entry => <article className="religion-card" key={entry.key}>
      <h2>{entry.placeId ? <Link to={`/bharat/map?place=${encodeURIComponent(entry.placeId)}`}>{entry.title}<span aria-hidden="true"> ↗</span></Link> : entry.title}</h2>
      <ReligionProfileFacts profile={entry.profile} />
    </article>)}</div>
    <p className="religion-methodology">{religionCensus.methodology}</p>
    <noscript><ReligionReference /></noscript>
  </section>;
}

import { religionCensus, religionSources, rankedReligions, formatReligionShare, numberOfPeople, type ReligionProfile } from "../site/religions";

export function ReligionTable({ profile }: { profile: ReligionProfile }) {
  return <table className="religion-table">
    <caption>{profile.area} · {religionCensus.year}년 · 전체 {numberOfPeople(profile.population)}</caption>
    <thead><tr><th scope="col">순위</th><th scope="col">종교·분류</th><th scope="col">인구</th><th scope="col">비율</th></tr></thead>
    <tbody>{rankedReligions(profile).map(group => <tr key={group.id} data-religion={group.id}>
      <td>{group.rank === null ? "순위 제외" : `${group.tied ? "공동 " : ""}${group.rank}위`}</td>
      <th scope="row">{group.name}</th><td>{numberOfPeople(group.population)}</td><td>{formatReligionShare(group.population, profile.population)}</td>
    </tr>)}</tbody>
  </table>;
}

export function ReligionProfileFacts({ profile }: { profile: ReligionProfile }) {
  const source = religionSources.get(profile.sourceId)!;
  return <>
    <ReligionTable profile={profile} />
    {profile.note && <p className="religion-note">{profile.note}</p>}
    <p className="religion-source"><a href={source.url} target="_blank" rel="noreferrer">출처: {source.title}</a></p>
  </>;
}

/** Same source and table as the interactive tabs, always available without JS. */
export function ReligionReference() {
  return <section id="religion-reference">
    <h2>{religionCensus.title} · {religionCensus.year}년</h2>
    <p>{religionCensus.description}</p><p>{religionCensus.methodology}</p>
    <dl>{religionCensus.groups.map(group => <div key={group.id}><dt>{group.name}</dt><dd>{group.en}</dd></div>)}</dl>
    {religionCensus.profiles.map(profile => <article id={`religion-${profile.id}`} key={profile.id}>
      <h3>{profile.area}</h3><ReligionProfileFacts profile={profile} />
      <p>원자료 지역명: {profile.sourceAreas.join(" · ")}</p>
    </article>)}
    <section id="religion-sources"><h3>인도 인구조사 C-01 원자료</h3>
      <ul>{religionCensus.sources.map(source => <li key={source.id}>
        <a href={source.url}>{source.title}</a> · <a href={source.downloadUrl}>원본 XLS</a> · 확인 {source.accessed}
      </li>)}</ul>
    </section>
  </section>;
}

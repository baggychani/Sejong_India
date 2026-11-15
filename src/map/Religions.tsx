import { Icon } from "../site/Icon";
import { religionCensus, religionProfilesByPlace, religionSources, rankedReligions, formatReligionShare } from "../site/religions";

export function ReligionRow({ placeId }: { placeId: string }) {
  const profile = religionProfilesByPlace.get(placeId);
  if (!profile) return null;
  const source = religionSources.get(profile.sourceId)!;
  const label = `${profile.area} · ${religionCensus.year}년 인구조사 · 지역 주민 전체 기준 · 소수점 한 자리 반올림${profile.note ? ` · ${profile.note}` : ""}`;
  return <div className="tongue-row">
    <dt>종교</dt>
    <dd><ul className="tongue-pills" aria-label={label} title={label}>
      {rankedReligions(profile).filter(group => group.rank !== null && group.rank <= 3).map(group => <li className="tongue-pill" key={group.id}>
        <span>{group.name}</span><span className="tongue-share">{formatReligionShare(group.population, profile.population)}</span>
      </li>)}
    </ul></dd>
    <a className="tongue-source" href={source.url} target="_blank" rel="noreferrer" aria-label={`출처: ${label}`}>
      <Icon name="link" /><span role="tooltip">{label}</span>
    </a>
  </div>;
}

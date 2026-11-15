import { Link } from "react-router";
import { Icon } from "../site/Icon";
import { religionCensus, religionPageByGroup, religionProfilesByPlace, religionSources, rankedReligions, formatReligionShare } from "../site/religions";

// 인도의 두 큰 종교만 색으로 구분한다. 나머지는 기본 회색 pill이다.
const tints: Record<string, string> = { hindu: " is-hindu", muslim: " is-muslim" };

export function ReligionRow({ placeId }: { placeId: string }) {
  const profile = religionProfilesByPlace.get(placeId);
  if (!profile) return null;
  const source = religionSources.get(profile.sourceId)!;
  const label = `${profile.area} · ${religionCensus.year} 인구조사`;
  return <div className="tongue-row">
    <dt>종교</dt>
    <dd><ul className="tongue-pills" aria-label={label} title={label}>
      {rankedReligions(profile).filter(group => group.rank !== null && group.rank <= 3).map(group => {
        const page = religionPageByGroup.get(group.id);
        const className = `tongue-pill${tints[group.id] ?? ""}`;
        const body = <><span>{group.name}</span><span className="tongue-share">{formatReligionShare(group.population, profile.population)}</span></>;
        // 사이트에 상세 페이지가 있는 종교만 그 페이지로 연결한다.
        return <li className={page ? undefined : className} key={group.id}>
          {page ? <Link className={className} to={`/bharat/religions/${page.id}`}>{body}</Link> : body}
        </li>;
      })}
    </ul></dd>
    <a className="tongue-source" href={source.url} target="_blank" rel="noreferrer" aria-label={`출처: ${label}`}>
      <Icon name="link" /><span role="tooltip">{label}</span>
    </a>
  </div>;
}

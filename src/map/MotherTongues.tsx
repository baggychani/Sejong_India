import { Link } from "react-router";
import census from "../../data/content/mother-tongues.json";
import { Icon } from "../site/Icon";
import { languageIdForName } from "../site/languages";

const CENSUS_URL = "https://censusindia.gov.in/census.website/data/census-tables";
const HINDI = "힌디어";
const TOP = 3;

const profilesByPlace = new Map(
  census.profiles.flatMap(profile => profile.placeIds.map(id => [id, profile] as const)),
);
const percent = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatShare(sharePct: number) {
  return sharePct > 0 && sharePct < 0.05 ? "<0.1%" : `${percent.format(sharePct)}%`;
}

function TonguePill({ name, sharePct, className, label }: { name: string; sharePct: number; className: string; label?: string }) {
  const id = languageIdForName(name);
  const body = <><span>{name}</span><span className="tongue-share">{formatShare(sharePct)}</span></>;
  return <li className={id ? undefined : className} aria-label={id ? undefined : label}>
    {id ? <Link className={className} to={`/bharat/languages/${id}`} aria-label={label}>{body}</Link> : body}
  </li>;
}

export function hasMotherTongues(placeId: string) {
  return profilesByPlace.has(placeId);
}

/** A row for the detail card's fact list: the top three mother tongues as pills, Hindi tinted. */
export function MotherTongueRow({ placeId }: { placeId: string }) {
  const profile = profilesByPlace.get(placeId);
  if (!profile) return null;

  const top = profile.languages.slice(0, TOP);
  const hindiRank = profile.languages.findIndex(({ name }) => name === HINDI);
  const trailingHindi = hindiRank >= TOP ? profile.languages[hindiRank] : undefined;
  const source = `${profile.area} · ${census.year} 인구조사`;

  return (
    <div className="tongue-row">
      <dt>모어</dt>
      <dd>
        <ul className="tongue-pills" aria-label={`${profile.area} 주민의 모어 상위 ${TOP}개`}>
          {top.map(({ name, sharePct }) => (
            <TonguePill key={name} name={name} sharePct={sharePct} className={name === HINDI ? "tongue-pill is-hindi" : "tongue-pill"} />
          ))}
          {trailingHindi && (
            <TonguePill name={trailingHindi.name} sharePct={trailingHindi.sharePct} className="tongue-pill is-hindi is-trailing" label={`힌디어 ${hindiRank + 1}위`} />
          )}
        </ul>
      </dd>
      <a className="tongue-source" href={CENSUS_URL} target="_blank" rel="noreferrer" aria-label={`출처: ${source}`}>
        <Icon name="link" />
        <span role="tooltip">{source}</span>
      </a>
    </div>
  );
}

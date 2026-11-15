import { hasMotherTongues, MotherTongueRow } from "./MotherTongues";
import { ReligionRow } from "./Religions";
import { religionProfilesByPlace } from "../site/religions";

export type DetailRecord = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  summary?: string;
  facts?: { label: string; value: string; note?: string }[];
  allowances?: { housingManwon: number; hardshipManwon: number | null };
  links?: { label: string; href: string }[];
  emblem?: { src: string; caption: string; source: string };
};

const emphasizedOperator = /(부산외국어대학교|Busan University of Foreign Studies)/;

function operatorName(value: string) {
  return value.split(emphasizedOperator).map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part);
}

/** 계절에 따라 옮기는 주도의 표식. 뜻은 툴팁·접근성 이름과 비시각 읽기 경로의 범례로 제공한다. */
export const seasonMarks: Record<string, string> = { "☀️": "여름 주도", "❄️": "겨울 주도" };
const seasonMark = new RegExp(`(${Object.keys(seasonMarks).join("|")})`);

function withSeasonMarks(value: string) {
  return value.split(seasonMark).map((part, i) => i % 2
    ? <span key={i} className="season-mark" role="img" aria-label={seasonMarks[part]} title={seasonMarks[part]}>{part}</span>
    : part);
}

export function DetailCard({ detail }: { detail: DetailRecord }) {
  const showTongues = hasMotherTongues(detail.id);
  const showReligions = religionProfilesByPlace.has(detail.id);
  return (
    <article className="detail-card">
      <div className="detail-heading">
      <div>
      <p className="detail-eyebrow">{detail.eyebrow}</p>
      <h2>{detail.title}</h2>
      {detail.subtitle ? <p className="detail-subtitle">{detail.subtitle}</p> : null}
      </div>
      {detail.emblem && (
        <a className="state-emblem-link" href={detail.emblem.source} target="_blank" rel="noreferrer" title="문장 출처 열기">
          <img className="state-emblem" src={detail.emblem.src} alt={detail.emblem.caption} width="88" height="88" />
        </a>
      )}
      </div>
      {detail.summary && <p>{detail.summary}</p>}
      {(detail.facts || showTongues || showReligions || detail.allowances) && (
        <dl>
          {detail.allowances && (
            <>
              <div className="allowance">
                <dt>주거지원비</dt>
                <dd>{detail.allowances.housingManwon}만 원</dd>
              </div>
              <div className="allowance">
                <dt>특수지 근무수당</dt>
                <dd className={detail.allowances.hardshipManwon === null ? "unconfirmed" : undefined}>
                  {detail.allowances.hardshipManwon === null ? "미확인" : `${detail.allowances.hardshipManwon}만 원`}
                </dd>
              </div>
            </>
          )}
          {detail.facts?.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.label === "운영기관" ? operatorName(fact.value) : withSeasonMarks(fact.value)}
                {fact.note && (
                  <button type="button" className="fact-note" aria-label={`비고: ${fact.note}`}>
                    <span aria-hidden="true">?</span>
                    <span role="tooltip">{fact.note}</span>
                  </button>
                )}
              </dd>
            </div>
          ))}
          {showTongues && <MotherTongueRow placeId={detail.id} />}
          {showReligions && <ReligionRow placeId={detail.id} />}
        </dl>
      )}
      {detail.links && (
        <div className="detail-links">
          {detail.links.map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noreferrer">
              {label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

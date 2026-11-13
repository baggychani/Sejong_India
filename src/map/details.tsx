import { hasMotherTongues, MotherTongueRow } from "./MotherTongues";

export type DetailRecord = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  summary?: string;
  facts?: { label: string; value: string }[];
  allowances?: { housingManwon: number; hardshipManwon: number | null };
  links?: { label: string; href: string }[];
};

export function DetailCard({ detail }: { detail: DetailRecord }) {
  const showTongues = hasMotherTongues(detail.id);
  return (
    <article className="detail-card">
      <p className="detail-eyebrow">{detail.eyebrow}</p>
      <h2>{detail.title}</h2>
      {detail.subtitle ? <p className="detail-subtitle">{detail.subtitle}</p> : null}
      {detail.summary && <p>{detail.summary}</p>}
      {(detail.facts || showTongues || detail.allowances) && (
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
              <dd>{fact.value}</dd>
            </div>
          ))}
          {showTongues && <MotherTongueRow placeId={detail.id} />}
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

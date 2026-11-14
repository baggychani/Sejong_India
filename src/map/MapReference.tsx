import institutes from "../../data/content/institutes.json";
import cities from "../../data/content/cities.json";
import rivers from "../../data/content/rivers.json";
import landforms from "../../data/content/landforms.json";
import census from "../../data/content/mother-tongues.json";
import neighbors from "../../data/content/neighbors.json";
import { details } from "./indiaModel";
import { DetailCard } from "./details";

/** Always in the HTML, including when the map's selected panel changes. */
export function MapReference() {
  return <details className="map-reference" id="map-reference">
    <summary>지도 정보 전체 보기</summary>
    <section aria-labelledby="institute-reference-title">
      <h2 id="institute-reference-title">세종학당 {institutes.length}곳</h2>
      {institutes.map(institute => <details key={institute.id} id={`institute-${institute.id}`}>
        <summary>{institute.names.ko} · {institute.city.ko}</summary>
        <DetailCard detail={details.get(institute.id)!} />
      </details>)}
    </section>
    {([
      ["cities", "도시", cities],
      ["rivers", "강", rivers],
      ["landforms", "지형", landforms],
    ] as const).map(([key, title, entries]) => <section key={key}>
      <h2>{title} {entries.length}곳</h2>
      {entries.map(entry => <article key={entry.id} id={`${key}-${encodeURIComponent(entry.id)}`}>
        <h3>{entry.names.ko}</h3>
        <p>{[entry.names.en, entry.names.hi].filter(Boolean).join(" · ")}</p>
        <p>{entry.summary}</p>
      </article>)}
    </section>)}
    <section id="neighbor-reference">
      <h2>지도에 표시한 주변 나라</h2>
      <p>{neighbors.map(neighbor => neighbor.shortLabel).join(" · ")}</p>
    </section>
    <section aria-labelledby="mother-tongue-reference-title">
      <h2 id="mother-tongue-reference-title">지역별 모어 분포 · {census.year}년</h2>
      <p>각 조사 지역에서 데이터에 수록된 모어 항목과 비율입니다. 학당 수강생이나 현재 주민의 언어 비율을 뜻하지 않습니다. 아래 수치는 데이터의 소수 자릿수를 유지했습니다.</p>
      <p><a href="https://censusindia.gov.in/census.website/data/census-tables">인도 인구조사 원자료</a></p>
      {census.profiles.map((profile, index) => <details key={profile.area + index} id={`mother-tongues-${index}`}>
        <summary>{profile.area} · {census.year}년</summary>
        <dl>{profile.languages.map(language => <div key={language.name}>
          <dt>{language.name}</dt><dd>{language.sharePct}%</dd>
        </div>)}</dl>
      </details>)}
    </section>
  </details>;
}

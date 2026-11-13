import { useEffect } from "react";
import { Link } from "react-router";
import { contents, siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";
import { geoConicEqualArea, geoPath } from "d3-geo";
import type { GeoGeometryObjects } from "d3-geo";
import country from "../../data/processed/india-country.json";
import institutes from "../../data/content/institutes.json";

const countryGeometryOnly = country.features[0].geometry as GeoGeometryObjects;
const projection = geoConicEqualArea().parallels([15, 32]).rotate([-82.5, 0])
  .fitExtent([[12, 9], [210, 218]], countryGeometryOnly);
const silhouette = geoPath(projection)(countryGeometryOnly) ?? "";

export function HomePage() {
  useEffect(() => {
    document.title = `${siteTitle}!`;
  }, []);

  return (
    <article className="home">
      <div className="home-cover">
        <h1>세종학당 <span>인도 가보기</span> 프로젝트!</h1>
        <svg className="home-india" viewBox="0 0 225 230" aria-hidden="true">
          <path d={silhouette} fill="#fbe1a7" stroke="#ab733e" strokeWidth="1.3" strokeLinejoin="round"/>
          {institutes.map(point => {
            const at = projection([point.lon, point.lat]);
            return at && <circle key={point.id} cx={at[0]} cy={at[1]} r="3.4" fill="#aa4232" stroke="#fff6df" strokeWidth="1.3"/>;
          })}
        </svg>
      </div>
      <nav className="toc" aria-label="메뉴">
        {contents.map((item) => (
          <Link key={item.id} to={item.path}>
            <Icon name={item.id} />
            <strong>{item.title}</strong>
            <Icon name="arrow" />
          </Link>
        ))}
      </nav>
      <footer className="home-credit"><small>© 2026 배기찬</small></footer>
    </article>
  );
}

import { Link, NavLink, Outlet } from "react-router";
import { learningCollections, learningSection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { Icon } from "../site/Icon";
import { CollectionLabel } from "../site/CollectionLabel";
import { geoConicEqualArea, geoPath } from "d3-geo";
import type { GeoGeometryObjects } from "d3-geo";
import country from "../../data/processed/india-country.json";
import cities from "../../data/content/cities.json";

const mapWidth = 680;
const mapHeight = 600;
const geometry = country.features[0].geometry as GeoGeometryObjects;
const projection = geoConicEqualArea().parallels([15, 32]).rotate([-82.5, 0])
  .fitExtent([[25, 15], [mapWidth - 25, mapHeight - 15]], geometry);
const silhouette = geoPath(projection)(geometry) ?? "";
const learningCities: Record<string, string> = { hindi: "New Delhi", tamil: "Chennai" };

function positionFor(id: string) {
  const city = cities.find(city => city.id === learningCities[id]);
  if (!city) throw new Error(`Missing learning map city: ${id}`);
  const point = projection([city.lon, city.lat]);
  if (!point) throw new Error(`Missing learning map position: ${id}`);
  return { left: `${point[0] / mapWidth * 100}%`, top: `${point[1] / mapHeight * 100}%` };
}

export function LearningSection() {
  return <>
    <nav className="india-navigation" aria-label={learningSection.title}>
      <NavLink to={learningSection.path} end>전체</NavLink>
      {learningCollections.map(collection => <NavLink key={collection.id} to={collection.path}><CollectionLabel collection={collection} /></NavLink>)}
    </nav>
    <Outlet />
  </>;
}

export function LearningPage() {
  usePageTitle(`${learningSection.title} · ${siteTitle}`);
  return <article className="reading learning-index">
    <h1>{learningSection.title}</h1>
    <div className="learning-map">
    <svg className="learning-map-silhouette" viewBox={`0 0 ${mapWidth} ${mapHeight}`} aria-hidden="true" focusable="false">
      <path d={silhouette} />
    </svg>
    <ul className="learning-list">
      {learningCollections.map(collection => <li key={collection.id} className={`learning-location learning-location-${collection.id}`} style={positionFor(collection.id)}>
        <Link to={collection.path}><CollectionLabel collection={collection} /><Icon name="arrow" /></Link>
      </li>)}
    </ul>
    </div>
  </article>;
}

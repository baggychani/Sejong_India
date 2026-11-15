import { Link, NavLink, Outlet } from "react-router";
import { learningCollections, learningSection, siteTitle } from "../site/sections";
import { usePageTitle } from "../site/title";
import { Icon } from "../site/Icon";

export function LearningSection() {
  return <>
    <nav className="india-navigation" aria-label={learningSection.title}>
      <NavLink to={learningSection.path} end>전체</NavLink>
      {learningCollections.map(collection => <NavLink key={collection.id} to={collection.path}>{collection.title}</NavLink>)}
    </nav>
    <Outlet />
  </>;
}

export function LearningPage() {
  usePageTitle(`${learningSection.title} · ${siteTitle}`);
  return <article className="reading learning-index">
    <h1>{learningSection.title}</h1>
    <ul className="learning-list">
      {learningCollections.map(collection => <li key={collection.id}>
        <Link to={collection.path}><span>{collection.title}</span><Icon name="arrow" /></Link>
      </li>)}
    </ul>
  </article>;
}

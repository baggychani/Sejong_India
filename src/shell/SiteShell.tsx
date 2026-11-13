import type { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router";
import { contents, siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";

export function SiteShell({ children }: { children: ReactNode }) {
  const isHome = useLocation().pathname === "/";
  return (
    <div className="site">
      {!isHome && <header className="site-header">
        <Link to="/" className="brand">
          <Icon name="map" />{siteTitle}
        </Link>
        <nav aria-label="메뉴">
          {contents.map((item) => (
            <NavLink key={item.id} to={item.path}>
              {item.title}
            </NavLink>
          ))}
        </nav>
      </header>}
      <main className="site-main">{children}</main>
    </div>
  );
}

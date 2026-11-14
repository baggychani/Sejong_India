import type { ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router";
import { contents, siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";

export function SiteShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const textPath = import.meta.env.BASE_URL + pathname.replace(/^\/+|\/+$/g, "") + (isHome ? "index.md" : "/index.md");
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
      <footer className="text-version"><a href={textPath}>텍스트로 읽기</a></footer>
    </div>
  );
}

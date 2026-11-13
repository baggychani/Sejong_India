import { useEffect } from "react";
import { Link } from "react-router";
import { siteTitle } from "../site/sections";

export function NotFoundPage() {
  useEffect(() => {
    document.title = `없는 페이지 · ${siteTitle}`;
  }, []);

  return (
    <article className="reading">
      <h1>없는 페이지</h1>
      <p className="lede">
        <Link to="/">홈으로</Link>
      </p>
    </article>
  );
}

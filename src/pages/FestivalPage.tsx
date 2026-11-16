import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";

/** 인도 > 축제. 아직 내용이 없는 자리다. */
export function FestivalPage() {
  usePageTitle(`축제 · ${siteTitle}`);
  return <section className="festival-page" />;
}

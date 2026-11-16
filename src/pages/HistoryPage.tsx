import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";

/** 인도 > 역사. 아직 내용이 없는 자리다. */
export function HistoryPage() {
  usePageTitle(`역사 · ${siteTitle}`);
  return <section className="history-page" />;
}

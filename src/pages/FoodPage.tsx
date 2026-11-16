import { usePageTitle } from "../site/title";
import { siteTitle } from "../site/sections";

/** 인도 > 음식. 아직 내용이 없는 자리다. */
export function FoodPage() {
  usePageTitle(`음식 · ${siteTitle}`);
  return <section className="food-page" />;
}

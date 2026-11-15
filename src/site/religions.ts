import census from "../../data/content/religions.json";
import institutes from "../../data/content/institutes.json";
import pages from "../../data/content/religion-pages.json";

export { census as religionCensus };
export type ReligionProfile = typeof census.profiles[number];
export const religionGroups = new Map(census.groups.map(group => [group.id, group]));
export const religionSources = new Map(census.sources.map(source => [source.id, source]));
export const religionProfilesByPlace = new Map(census.profiles.flatMap(profile => profile.placeIds.map(id => [id, profile] as const)));
export const religionModes = [["institutes", "학당 지역"], ["states", "주·연방직할지"], ["india", "전국"]] as const;
export const instituteReligionProfiles = institutes.map(institute => ({
  institute, profile: religionProfilesByPlace.get(institute.id)!,
}));
/** 사이트에 상세 페이지가 있는 종교. 인구조사 분류와는 censusGroup으로 연결한다. */
export const religionPages = pages;
export type ReligionPageEntry = typeof pages[number];
export const religionPageByGroup = new Map(pages.map(page => [page.censusGroup, page]));
const nationwide = census.profiles.find(profile => profile.id === "india")!;
const regionProfiles = census.profiles.filter(profile => profile.placeIds.some(id => id.startsWith("IN-")));
const groupPopulation = (profile: ReligionProfile, group: string) => profile.religions.find(entry => entry.id === group)!.population;
export function religionNationwide(page: ReligionPageEntry) {
  return { population: groupPopulation(nationwide, page.censusGroup), total: nationwide.population };
}
/** 이 종교의 인구 비율이 높은 주·연방직할지. 2011년 조사 단위를 그대로 쓴다. */
export function topReligionRegions(page: ReligionPageEntry, count = 3) {
  return regionProfiles.map(profile => ({ profile, population: groupPopulation(profile, page.censusGroup) }))
    .sort((a, b) => b.population / b.profile.population - a.population / a.profile.population).slice(0, count);
}
export const numberOfPeople = (value: number) => `${value.toLocaleString("ko-KR")}명`;
export const religionShare = (population: number, total: number) => population / total * 100;
export function formatReligionShare(population: number, total: number) {
  const share = religionShare(population, total);
  return share > 0 && share < 0.05 ? "<0.1%" : `${share.toFixed(1)}%`;
}
export function rankedReligions(profile: ReligionProfile) {
  const ranked = profile.religions.filter(group => group.id !== "not-stated");
  return [...profile.religions].sort((a, b) => (a.id === "not-stated" ? 1 : b.id === "not-stated" ? -1 : b.population - a.population))
    .map(group => ({ ...group, ...religionGroups.get(group.id)!,
      rank: group.id === "not-stated" ? null : 1 + ranked.filter(other => other.population > group.population).length,
      tied: ranked.filter(other => other.population === group.population).length > 1 }));
}

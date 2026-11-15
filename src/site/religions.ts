import census from "../../data/content/religions.json";
import institutes from "../../data/content/institutes.json";

export { census as religionCensus };
export type ReligionProfile = typeof census.profiles[number];
export const religionGroups = new Map(census.groups.map(group => [group.id, group]));
export const religionSources = new Map(census.sources.map(source => [source.id, source]));
export const religionProfilesByPlace = new Map(census.profiles.flatMap(profile => profile.placeIds.map(id => [id, profile] as const)));
export const religionModes = [["institutes", "학당 지역"], ["states", "주·연방직할지"], ["india", "전국"]] as const;
export const instituteReligionProfiles = institutes.map(institute => ({
  institute, profile: religionProfilesByPlace.get(institute.id)!,
}));
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

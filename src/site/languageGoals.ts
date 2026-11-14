import goals from "../../data/content/language-goals.json";
import institutes from "../../data/content/institutes.json";
import census from "../../data/content/mother-tongues.json";
import { languages } from "./languages";

export const goalMeaning = "제 목표는 인도에서 한국어를 가르치는 것입니다.";
export const goalsByLanguage = new Map(goals.map(goal => [goal.id, goal]));

// The census and the catalog use different Korean names for Meitei.
const censusAliases: Record<string, string> = { "마니푸리어(메이테이어)": "manipuri" };
export const regionalRankings = institutes.flatMap(institute => {
  const profile = census.profiles.find(profile => profile.placeIds.includes(institute.id));
  if (!profile?.languages.length) return [];
  // Rank the full census profile before matching the site's language catalog.
  // A language outside the catalog still occupies its actual regional rank.
  return profile.languages.flatMap(entry => {
    const rank = 1 + profile.languages.filter(other => other.sharePct > entry.sharePct).length;
    if (rank > 3) return [];
    const languageId = censusAliases[entry.name] ?? languages.find(language => language.ko === entry.name)?.id;
    if (!languageId) return [];
    return [{ languageId, instituteId: institute.id,
      label: institute.names.ko.replace("인도 한국문화원 세종학당", "뉴델리").replace(" 세종학당", ""),
      area: profile.area, sharePct: entry.sharePct, year: census.year, rank,
      broad: /광역 참고/.test(profile.area),
      tied: profile.languages.filter(other => other.sharePct === entry.sharePct).length > 1 }];
  });
});

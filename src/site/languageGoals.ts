import goals from "../../data/content/language-goals.json";
import institutes from "../../data/content/institutes.json";
import census from "../../data/content/mother-tongues.json";
import { languages } from "./languages";

export const goalMeaning = "제 목표는 인도에서 한국어를 가르치는 것입니다.";
export const goalsByLanguage = new Map(goals.map(goal => [goal.id, goal]));

// The census and the catalog use different Korean names for Meitei.
const censusAliases: Record<string, string> = { "마니푸리어(메이테이어)": "manipuri" };
export const regionalLeaders = institutes.flatMap(institute => {
  const profile = census.profiles.find(profile => profile.placeIds.includes(institute.id));
  if (!profile?.languages.length) return [];
  const maximum = Math.max(...profile.languages.map(language => language.sharePct));
  const leaders = profile.languages.filter(language => language.sharePct === maximum);
  return leaders.flatMap(leader => {
    const languageId = censusAliases[leader.name] ?? languages.find(language => language.ko === leader.name)?.id;
    if (!languageId) return [];
    return [{ languageId, instituteId: institute.id,
      label: institute.names.ko.replace("인도 한국문화원 세종학당", "뉴델리").replace(" 세종학당", ""),
      area: profile.area, sharePct: leader.sharePct, year: census.year,
      broad: /광역 참고/.test(profile.area), tied: leaders.length > 1 }];
  });
});

import catalog from "../../data/content/languages.json";

export const languageModes = [
  ["speakers", "화자 많은 순"], ["family", "어족별"], ["constitution", "헌법 등재"], ["classical", "지정 고전어"],
] as const;
export const languageSources = {
  constitution: { heading: "헌법 등재", title: "인도 헌법 제8부속서 원문", href: "https://cdnbbsr.s3waas.gov.in/s380537a945c7aaa788ccfcdf1b99b5d8f/uploads/2023/07/202507081043003900.pdf#page=511" },
  classical: { heading: "지정 고전어", title: "인도 문화부 고전어 지정 고시 원문", href: "https://egazette.gov.in/WriteReadData/2024/257710.pdf#page=2" },
};
export const languageFamilies: Record<string, string> = {
  "Indo-European": "인도유럽어족", Dravidian: "드라비다어족",
  "Sino-Tibetan": "중국티베트어족", Austroasiatic: "오스트로아시아어족",
};
export const languages = [...catalog].sort((a, b) =>
  (b.census2011GroupSpeakers ?? -1) - (a.census2011GroupSpeakers ?? -1) || a.en.localeCompare(b.en, "en"));
export type Language = typeof languages[number];
const censusNameAliases: Record<string, string> = { "마니푸리어(메이테이어)": "manipuri" };
const languageIdsByName = new Map(languages.map(language => [language.ko, language.id]));
export function languageIdForName(name: string) {
  return censusNameAliases[name] ?? languageIdsByName.get(name);
}
export const interestLanguageIds = new Set(["hindi", "tamil"]);

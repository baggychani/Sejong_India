import { goalMeaning, goalsByLanguage, regionalRankings } from "../site/languageGoals";
import type { Language } from "../site/languages";

export function LanguageRegionBadges({ language }: { language: Language }) {
  const rankings = regionalRankings.filter(entry => entry.languageId === language.id)
    .sort((a, b) => a.rank - b.rank || b.sharePct - a.sharePct);
  if (!rankings.length) return null;
  return <div className="language-regions" aria-label="세종학당 지역의 모어 비중 상위 3위">
    {rankings.map(entry => <span className="language-region-badge" key={entry.instituteId}
      data-institute={entry.instituteId} data-rank={entry.rank}
      aria-label={`${entry.label} · 모어 ${entry.tied ? "공동 " : ""}${entry.rank}위 · ${entry.sharePct}% · ${entry.area} · ${entry.year} 인구조사`}
      title={`${entry.area} · ${entry.year} 인구조사 · 모어 ${entry.tied ? "공동 " : ""}${entry.rank}위 · ${entry.sharePct}%`}>
      <span aria-hidden="true" className="region-rank">{entry.rank}</span>
      {entry.label}{entry.broad && <small>광역</small>}
      <span className="region-share">{entry.sharePct.toFixed(1)}%</span>
      <noscript><span> · 모어 {entry.tied && "공동 "}{entry.rank}위 · {entry.area} · {entry.year} 인구조사</span></noscript>
    </span>)}
  </div>;
}

export function LanguageGoal({ language }: { language: Language }) {
  const goal = goalsByLanguage.get(language.id);
  if (!goal) return null;
  return <div className="language-goal" id={`language-goal-${language.id}`}>
    <p className="goal-native" lang={language.tag} dir="auto">{goal.text}</p>
    <p className="goal-romanization" lang={`${language.tag}-Latn`} dir="ltr">{goal.romanization}</p>
    <p className="goal-meaning">{goalMeaning}</p>
    <noscript><p>{goal.variant && `${goal.variant} · `}{goal.reviewStatus === "draft" ? "번역·전사 초안" : "검수 완료"}</p></noscript>
  </div>;
}

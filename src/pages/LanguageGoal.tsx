import { goalMeaning, goalsByLanguage, regionalLeaders } from "../site/languageGoals";
import type { Language } from "../site/languages";

export function LanguageRegionBadges({ language }: { language: Language }) {
  const leaders = regionalLeaders.filter(leader => leader.languageId === language.id);
  if (!leaders.length) return null;
  return <div className="language-regions" aria-label="세종학당 지역의 모어 1위">
    <span className="language-region-key">지역 모어 1위 <small>{leaders[0].year}</small></span>
    {leaders.map(leader => <span className="language-region-badge" key={leader.instituteId}
      data-institute={leader.instituteId}
      title={`${leader.area} · ${leader.year} 인구조사 · ${leader.sharePct}%${leader.tied ? " · 공동 1위" : ""}`}>
      <span aria-hidden="true" className="region-rank">1</span>
      {leader.label}{leader.broad && <small>광역</small>}
      <span className="region-share">{leader.sharePct.toFixed(1)}%</span>
      <noscript><span> · {leader.area} · {leader.year} 인구조사{leader.tied && " · 공동 1위"}</span></noscript>
    </span>)}
  </div>;
}

export function LanguageGoal({ language }: { language: Language }) {
  const goal = goalsByLanguage.get(language.id);
  if (!goal) return null;
  return <section className="language-goal" id={`language-goal-${language.id}`} aria-labelledby="goal-title">
    <div className="goal-heading">
      <h2 id="goal-title">나의 목표</h2>
      {goal.variant && <span className="goal-variant">{goal.variant}</span>}
      <span className="goal-review" title={goal.editorial.note}>{goal.reviewStatus === "draft" ? "번역·전사 초안" : "검수 완료"}</span>
    </div>
    <p className="goal-native" lang={language.tag} dir="auto">{goal.text}</p>
    <p className="goal-romanization" lang={`${language.tag}-Latn`} dir="ltr">{goal.romanization}</p>
    <div className="goal-caption"><span>로마자 전사</span><span>{goalMeaning}</span></div>
  </section>;
}

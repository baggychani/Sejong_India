import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import catalog from "../../data/content/languages.json";
import { siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";
import { NotFoundPage } from "./NotFoundPage";
import "../styles/languages.css";

const modes = [
  ["speakers", "화자 많은 순"], ["family", "어족별"], ["constitution", "헌법 등재"], ["classical", "지정 고전어"],
] as const;
const sources = {
  constitution: { heading: "헌법 등재", title: "인도 헌법 제8부속서 원문", href: "https://cdnbbsr.s3waas.gov.in/s380537a945c7aaa788ccfcdf1b99b5d8f/uploads/2023/07/202507081043003900.pdf#page=511" },
  classical: { heading: "지정 고전어", title: "인도 문화부 고전어 지정 고시 원문", href: "https://egazette.gov.in/WriteReadData/2024/257710.pdf#page=2" },
};
const families: Record<string, string> = {
  "Indo-European": "인도유럽어족", Dravidian: "드라비다어족",
  "Sino-Tibetan": "중국티베트어족", Austroasiatic: "오스트로아시아어족",
};
const languages = [...catalog].sort((a, b) =>
  (b.census2011GroupSpeakers ?? -1) - (a.census2011GroupSpeakers ?? -1) || a.en.localeCompare(b.en, "en"));
type Language = typeof languages[number];

function NativeName({ language }: { language: Language }) {
  return <bdi className="native-name" lang={language.tag} dir="auto">{language.native}</bdi>;
}

export default function LanguagePage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = modes.find(([key]) => key === params.get("group"))?.[0] ?? "speakers";
  const query = mode === "speakers" ? "" : `?group=${mode}`;
  const selected = languages.find(l => l.id === id);
  useEffect(() => {
    if (!id || selected) document.title = `${selected?.ko ?? "언어"} · ${siteTitle}`;
  }, [id, selected]);
  if (id && !selected) return <NotFoundPage />;
  if (selected) return <article className="language-page">
    <Link className="language-back" to={`/bharat/languages${query}`}>← 언어</Link>
    <header className="language-identity">
      <NativeName language={selected} />
      <h1>{selected.ko}</h1><span lang="en">{selected.en}</span>
    </header>
  </article>;

  const groups = new Map<string, Language[]>();
  const source = mode === "constitution" || mode === "classical" ? sources[mode] : undefined;
  for (const language of languages) {
    if (mode === "constitution" && !language.scheduled) continue;
    if (mode === "classical" && !language.classical) continue;
    const label = mode === "family" ? families[language.family] : source?.heading ?? "";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(language);
  }
  return <section className="language-page">
    <header className="language-toolbar">
      <div className="language-modes" role="group" aria-label="언어 분류">
        {modes.map(([key, label]) => <button key={key} aria-pressed={mode === key}
          title={key === "speakers" ? "2011년 인도 인구조사 · 언어 집단별 전국 모어 화자 수" : undefined}
          onClick={() => setParams(key === "speakers" ? {} : { group: key })}>{label}</button>)}
      </div>
    </header>
    {[...groups].map(([label, entries]) => <section className="language-group" key={label}>
      {label && <div className="language-group-heading">
        <h2>{label} <small>{entries.length}{source && "개"}</small></h2>
        {source && <a href={source.href} target="_blank" rel="noreferrer" aria-label={source.title} title={source.title}>
          <Icon name="link" />
        </a>}
      </div>}
      <div className="language-grid">
        {entries.map(l => <Link key={l.id} className="language-card" data-family={l.family} to={`/bharat/languages/${l.id}${query}`}>
          {(l.id === "hindi" || l.id === "tamil") && <span aria-label="관심 언어" role="img" title="관심 언어" className={l.id === "tamil" ? "language-bookmark is-tamil" : "language-bookmark"}>★</span>}
          <NativeName language={l} />
          <span className="language-caption"><strong>{l.ko}</strong><span lang="en">{l.en}</span><Icon name="arrow" /></span>
        </Link>)}
      </div>
    </section>)}
  </section>;
}

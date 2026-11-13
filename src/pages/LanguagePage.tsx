import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import catalog from "../../data/content/languages.json";
import { siteTitle } from "../site/sections";
import { Icon } from "../site/Icon";
import { NotFoundPage } from "./NotFoundPage";
import "../styles/languages.css";

const modes = [
  ["alphabet", "영문명순"], ["constitution", "헌법 등재별"],
  ["family", "어족별"], ["classical", "고전어 지정별"],
] as const;
const families: Record<string, string> = {
  "Indo-European": "인도유럽어족", Dravidian: "드라비다어족",
  "Sino-Tibetan": "중국티베트어족", Austroasiatic: "오스트로아시아어족",
};
const languages = [...catalog].sort((a, b) => a.en.localeCompare(b.en, "en"));
type Language = typeof languages[number];

function NativeName({ language }: { language: Language }) {
  return <bdi className="native-name" lang={language.tag} dir="auto">{language.native}</bdi>;
}

export default function LanguagePage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = modes.find(([key]) => key === params.get("group"))?.[0] ?? "alphabet";
  const query = mode === "alphabet" ? "" : `?group=${mode}`;
  const selected = languages.find(l => l.id === id);
  useEffect(() => {
    if (!id || selected) document.title = `${selected?.ko ?? "언어 목록"} · ${siteTitle}`;
  }, [id, selected]);
  if (id && !selected) return <NotFoundPage />;
  if (selected) return <article className="language-page">
    <Link className="language-back" to={`/map/languages${query}`}>← 언어 목록</Link>
    <header className="language-identity">
      <NativeName language={selected} />
      <h1>{selected.ko}</h1><span lang="en">{selected.en}</span>
    </header>
  </article>;

  function group(l: Language) {
    if (mode === "family") return families[l.family];
    if (mode === "constitution") return l.scheduled ? "헌법 제8부속서 등재" : "제8부속서 미등재";
    if (mode === "classical") return l.classical ? "지정 고전어" : "고전어 미지정";
    return "";
  }
  const groups = new Map<string, Language[]>();
  for (const language of languages) {
    const label = group(language);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(language);
  }
  return <section className="language-page">
    <header className="language-toolbar">
      <h1>언어 목록 <small>{languages.length}개</small></h1>
      <div className="language-modes" role="group" aria-label="언어 분류">
        {modes.map(([key, label]) => <button key={key} aria-pressed={mode === key}
          onClick={() => setParams(key === "alphabet" ? {} : { group: key })}>{label}</button>)}
      </div>
    </header>
    {[...groups].map(([label, entries]) => <section className="language-group" key={label}>
      {label && <h2>{label} <small>{entries.length}</small></h2>}
      <div className="language-grid">
        {entries.map(l => <Link key={l.id} className="language-card" data-family={l.family} to={`/map/languages/${l.id}${query}`}>
          <NativeName language={l} />
          <span className="language-caption"><strong>{l.ko}</strong><span lang="en">{l.en}</span><Icon name="arrow" /></span>
        </Link>)}
      </div>
    </section>)}
  </section>;
}

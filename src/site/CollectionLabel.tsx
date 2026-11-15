import languages from "../../data/content/languages.json";
import { learningCollections } from "./sections";

export function CollectionLabel({ collection }: { collection: { id: string; title: string } }) {
  const language = learningCollections.some(item => item.id === collection.id)
    ? languages.find(item => item.id === collection.id) : undefined;
  return <span className="collection-label">{collection.title}{language && <>
    {" "}<span className="collection-native" lang={language.tag}>{language.native}</span>
  </>}</span>;
}

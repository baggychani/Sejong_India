export const siteTitle = "세종학당 인도 가보기 프로젝트";

export const mapSection = {
  id: "map",
  path: "/map",
  title: "인도 भारत",
} as const;

export const collections = [
  {
    id: "study",
    path: "/study",
    title: "면접대비",
  },
  {
    id: "lessons",
    path: "/lessons",
    title: "세종한국어 교안",
  },
  {
    id: "library",
    path: "/library",
    title: "서재",
  },
] as const;

export type CollectionId = (typeof collections)[number]["id"];

export function findCollection(id: string | undefined) {
  return collections.find((collection) => collection.id === id);
}

export const contents = [mapSection, ...collections];

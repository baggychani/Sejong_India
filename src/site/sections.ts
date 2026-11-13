export const siteTitle = "세종학당 인도 가보기 프로젝트";

export const mapSection = {
  id: "map",
  path: "/map",
  title: "인도",
} as const;

export const collections = [
  {
    id: "study",
    path: "/study",
    title: "공부",
  },
  {
    id: "lessons",
    path: "/lessons",
    title: "교안",
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

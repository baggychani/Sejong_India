export const siteTitle = "세종학당 인도 가보기 프로젝트";

export const mapSection = {
  id: "map",
  path: "/bharat",
  title: "인도",
} as const;

export const collections = [
  {
    id: "study",
    path: "/interview",
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
  return collections.find((collection) => collection.path === "/" + id);
}

// Former public routes, also emitted as directories for shared GitHub Pages links.
export const movedRoutes = [
  { from: "/map/languages", to: "/bharat/languages" },
  { from: "/map", to: "/bharat/map" },
  { from: "/study", to: "/interview" },
];

export const contents = [mapSection, ...collections];

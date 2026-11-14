export const siteTitle = "세종학당 인도 가보기 프로젝트";

export const mapSection = {
  id: "map",
  path: "/bharat",
  title: "인도",
} as const;

export const collections = [
  {
    id: "hindi",
    path: "/hindi",
    title: "힌디어",
  },
  {
    id: "study",
    path: "/interview",
    title: "면접대비",
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
  return collections.find((collection) => collection.path === "/" + id);
}

// Former public routes, also emitted as directories for shared GitHub Pages links.
export const movedRoutes = [
  { from: "/interview/classroom-management/encouraging-korean", to: "/interview/classroom/korean" },
  { from: "/interview/classroom-management/inclusive-classroom", to: "/interview/classroom/hindi" },
  { from: "/interview/classroom-management/participation-reluctance", to: "/interview/classroom/participation" },
  { from: "/interview/classroom-management", to: "/interview/classroom" },
  { from: "/map/languages", to: "/bharat/languages" },
  { from: "/map", to: "/bharat/map" },
  { from: "/study", to: "/interview" },
];

export function resolveMovedRoute(path: string) {
  const visited = new Set<string>();
  while (!visited.has(path)) {
    visited.add(path);
    const moved = movedRoutes.find(({ from }) => path === from || path.startsWith(from + "/"));
    if (!moved) return path;
    path = moved.to + path.slice(moved.from.length);
  }
  throw new Error(`Circular route migration: ${path}`);
}

export const contents = [mapSection, ...collections];

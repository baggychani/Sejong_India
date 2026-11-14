import { entriesFor, type Entry } from "../content/load";

/**
 * A book on the shelf, read from content/library/<slug>.md.
 *
 * Frontmatter fields:
 *   title, author          shown on the spine and the book page
 *   cover                  file name inside content/library/covers/
 *   spine                  spine colour (#rrggbb), usually picked from the cover
 *   ink                    optional spine text colour; derived from `spine` when absent
 *   pages                  page count, sets the spine thickness
 *   read                   when it was finished (YYYY-MM or YYYY-MM-DD); orders the shelf
 *   status                 "읽는 중" puts the book face-out on the shelf
 *   pose                   optional: "표지" faces out, "눕힘" lays it flat, "기울임" leans it
 */
export type Book = {
  slug: string;
  title: string;
  author: string;
  subtitle?: string;
  translator?: string;
  publisher?: string;
  cover?: string;
  spine: string;
  ink: string;
  pages?: number;
  shelfOrder?: number;
  /** Spine height in px before responsive scaling. */
  height: number;
  read?: string;
  reading: boolean;
  pose: "upright" | "flat" | "lean" | "face";
  /** Decorative spine variant, stable per book. */
  variant: 0 | 1 | 2;
  summary: string;
  body: string;
};

const covers = import.meta.glob<string>("../../content/library/covers/*", {
  query: "?url",
  import: "default",
  eager: true,
});
const coverByName = new Map(
  Object.entries(covers).map(([path, url]) => [path.split("/").pop() ?? path, url]),
);

function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.2;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toBook(entry: Entry): Book {
  const { meta } = entry;
  const h = hash(entry.slug);
  const spine = /^#[0-9a-f]{6}$/i.test(meta.spine ?? "") ? meta.spine : "#4b5d57";
  const poses: Record<string, Book["pose"]> = { "표지": "face", "눕힘": "flat", "기울임": "lean" };
  const pages = Number(meta.pages);
  return {
    slug: entry.slug,
    title: entry.title,
    author: meta.author ?? "",
    subtitle: meta.subtitle,
    translator: meta.translator,
    publisher: meta.publisher,
    cover: meta.cover ? coverByName.get(meta.cover) : undefined,
    spine,
    ink: meta.ink || (luminance(spine) > 0.36 ? "#2d2820" : "#f6eedd"),
    pages: Number.isSafeInteger(pages) && pages > 0 ? pages : undefined,
    shelfOrder: meta.order?.trim() && Number.isFinite(Number(meta.order)) ? Number(meta.order) : undefined,
    height: 176 + (h % 37),
    read: meta.read || undefined,
    reading: meta.status === "읽는 중",
    pose: poses[meta.pose] ?? "upright",
    variant: (h % 3) as Book["variant"],
    summary: entry.summary,
    body: entry.body,
  };
}

let cache: Book[] | undefined;

/** Explicit shelf order takes priority, followed by reading status and completion date. */
export function allBooks() {
  cache ??= entriesFor("library")
    .map(toBook)
    .sort((a, b) =>
      (a.shelfOrder ?? Infinity) - (b.shelfOrder ?? Infinity) ||
      Number(b.reading) - Number(a.reading) ||
      (a.read ?? "9999").localeCompare(b.read ?? "9999") ||
      a.title.localeCompare(b.title, "ko"));
  return cache;
}

export function findBook(slug: string) {
  return allBooks().find((book) => book.slug === slug);
}

/** Spine thickness in px for a page count. */
export function spineWidth(pages = 280) {
  return Math.round(Math.max(20, Math.min(48, pages / 10)));
}

export function formatRead(read: string | undefined) {
  if (!read) return "";
  const [y, m, d] = read.split("-");
  return [y && `${y}년`, m && `${Number(m)}월`, d && `${Number(d)}일`].filter(Boolean).join(" ");
}

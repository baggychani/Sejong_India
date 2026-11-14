import type { CollectionId } from "../site/sections";

export type Entry = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  /** Every frontmatter field as written, quotes stripped. */
  meta: Record<string, string>;
};

const files: Record<CollectionId, Record<string, string>> = {
  hindi: import.meta.glob("../../content/hindi/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  study: import.meta.glob("../../content/study/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  lessons: import.meta.glob("../../content/lessons/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  library: import.meta.glob("../../content/library/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
};

function parseEntry(filePath: string, raw: string): Entry {
  const slug = filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  let title = slug;
  let summary = "";
  let body = raw.trim();
  const meta: Record<string, string> = {};
  if (match) {
    body = match[2].trim();
    for (const line of match[1].split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
      meta[key] = value;
      if (key === "title") title = value;
      if (key === "summary") summary = value;
    }
  }
  return { slug, title, summary, body, meta };
}

const cache = new Map<CollectionId, Entry[]>();

function load(collectionId: CollectionId) {
  const existing = cache.get(collectionId);
  if (existing) return existing;
  const entries = Object.entries(files[collectionId])
    .map(([filePath, raw]) => parseEntry(filePath, raw))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  cache.set(collectionId, entries);
  return entries;
}

export function entriesFor(collectionId: CollectionId) {
  return load(collectionId);
}

export function findEntry(collectionId: CollectionId, slug: string) {
  return load(collectionId).find((entry) => entry.slug === slug);
}

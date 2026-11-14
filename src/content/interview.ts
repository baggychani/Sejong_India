import { parseEntry } from "./load";

const files = import.meta.glob("../../content/study/*/*.md", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

export function questionsFor(section: string) {
  return Object.entries(files)
    .filter(([path]) => path.split("/").at(-2) === section)
    .map(([path, raw]) => parseEntry(path, raw));
}

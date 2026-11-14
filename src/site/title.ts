import { useEffect } from "react";

const fallback = "세종학당 인도 가보기 프로젝트!";
let current = fallback;

/** Remember the title during render so the prerendered HTML can use it. */
export function usePageTitle(title: string) {
  current = title;
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export function resetRenderedTitle() {
  current = fallback;
}

export function renderedTitle() {
  return current;
}

// 단어 뜯어보기 애니메이션. 브라우저 기본 Web Animations API만 쓴다.
// 화면 구조는 React가 정하고, 여기서는 바뀌기 전후의 위치를 이어 주는 움직임만 더한다.

export type Spot = { x: number; y: number; size: number };

/** 동작 줄이기를 켰거나 애니메이션을 지원하지 않으면 움직이지 않는다. */
export const still = () =>
  typeof window === "undefined" || typeof Element.prototype.animate !== "function"
  || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 글자 요소의 중심과 글자 크기. */
export function spot(el: Element): Spot {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: parseFloat(getComputedStyle(el).fontSize) || 1 };
}

const STEP = 32; // 덩어리마다 시차(ms): 왼쪽부터 똑, 똑 끊긴다.
const SNAP = "cubic-bezier(.2, 1.18, .38, 1)"; // 끝에서 살짝 튕긴다.
const SMOOTH = "cubic-bezier(.25, .8, .3, 1)";

/** FLIP: 옛 위치(from)에 있던 글자가 지금 자리(to)로 옮겨 오게 한다. */
export function flyFrom(from: Spot[], to: Element[], duration = 420) {
  to.forEach((el, index) => {
    const start = from[index];
    if (!start) return;
    const end = spot(el);
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const scale = start.size / end.size;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "none" }],
      { duration, delay: index * STEP, easing: SNAP, fill: "backwards" },
    );
  });
}

/** 상자와 로마자처럼 따라 나타나는 요소. */
export function fadeIn(els: Element[], { delay = 140, rise = 6 } = {}) {
  els.forEach((el, index) => el.animate(
    [{ opacity: 0, transform: `translateY(${rise}px)` }, { opacity: 1, transform: "none" }],
    { duration: 260, delay: delay + index * STEP, easing: SMOOTH, fill: "backwards" },
  ));
}

export function fadeOut(els: Element[], duration = 140) {
  return Promise.all(els.map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-in", fill: "forwards" }).finished))
    .catch(() => undefined);
}

/** 상자 너비를 옛 값에서 지금 값으로 늘이거나 줄인다. 옆 칸들도 매 프레임 따라 밀린다. */
export function resize(el: HTMLElement, fromWidth: number, duration = 300) {
  const toWidth = el.getBoundingClientRect().width;
  if (Math.abs(toWidth - fromWidth) < 1) return;
  el.classList.add("is-morphing");
  el.animate([{ width: `${fromWidth}px` }, { width: `${toWidth}px` }], { duration, easing: SMOOTH })
    .finished.catch(() => undefined).finally(() => el.classList.remove("is-morphing"));
}

/** 갈라진 부품들이 상자 가운데에서 미끄러져 나온다. */
export function slideOut(box: HTMLElement, parts: Element[], duration = 300) {
  const center = box.getBoundingClientRect();
  const cx = center.left + center.width / 2;
  parts.forEach((el, index) => {
    const dx = cx - spot(el).x;
    el.animate(
      [{ opacity: 0, transform: `translateX(${dx * .85}px) scale(.9)` }, { opacity: 1, transform: "none" }],
      { duration, delay: 40 + index * 26, easing: SNAP, fill: "backwards" },
    );
  });
}

/** 부품들이 가운데로 모이며 사라진다. 끝나면 다시 붙인다. */
export function slideIn(box: HTMLElement, parts: Element[], duration = 170) {
  const center = box.getBoundingClientRect();
  const cx = center.left + center.width / 2;
  return Promise.all(parts.map(el => el.animate(
    [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${(cx - spot(el).x) * .7}px) scale(.92)` }],
    { duration, easing: "ease-in", fill: "forwards" },
  ).finished)).catch(() => undefined);
}

/** 붙기 전 덩어리 글자를 잠깐 남겨 부품과 겹쳐 흐려지게 한다. */
export function ghost(box: HTMLElement, text: string, glyph: Spot) {
  const rect = box.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = "unit-glyph akshara-ghost";
  el.lang = "hi";
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  el.style.top = `${glyph.y - rect.top}px`;
  box.append(el);
  el.animate([{ opacity: 1, transform: "translate(-50%, -50%)" }, { opacity: 0, transform: "translate(-50%, -50%) scale(1.06)" }],
    { duration: 220, easing: "ease-out", fill: "forwards" })
    .finished.catch(() => undefined).finally(() => el.remove());
}

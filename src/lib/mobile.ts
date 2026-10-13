// Мобильная версия: обычный скролл пальцем, главы в одну колонку (стили — src/styles/mobile.css).
export const MOBILE_QUERY = "(max-width: 820px)";
export const isMobile = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

// Поворот/ресайз через границу 820px — перезагрузка: раскладка (кулисы, конверт, Lenis) выбирается один раз при старте.
if (typeof window !== "undefined" && window.matchMedia) {
  const mq = window.matchMedia(MOBILE_QUERY);
  const start = mq.matches;
  mq.addEventListener?.("change", (e) => { if (e.matches !== start) location.reload(); });
}

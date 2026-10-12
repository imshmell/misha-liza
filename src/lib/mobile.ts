// Мобильная версия: обычный скролл пальцем, главы в одну колонку (стили — src/styles/mobile.css).
export const MOBILE_QUERY = "(max-width: 820px)";
export const isMobile = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

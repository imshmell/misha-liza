import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { SvgDefs } from "@/components/SvgDefs";
import { Preloader } from "@/components/Preloader";
import { AudioProvider } from "@/components/AudioProvider";
import { NowPlaying } from "@/components/NowPlaying";
import { Hero, Intro } from "@/story/Opening";
import { Bridges, Dacha, Kazan, October, Run } from "@/story/ChaptersA";
import { Care, Circles, Everything, Finale, PostScript, Year } from "@/story/ChaptersB";
import { isMobile } from "@/lib/mobile";

gsap.registerPlugin(ScrollTrigger);

const NAV = [
  { id: "hero", label: "начало" },
  { id: "intro", label: "немного музыки" },
  { id: "kazan", label: "Казань" },
  { id: "run", label: "бег" },
  { id: "bridges", label: "развод мостов" },
  { id: "october", label: "17 октября" },
  { id: "dacha", label: "дача" },
  { id: "care", label: "всё, что ты делаешь" },
  { id: "circles", label: "кружочки" },
  { id: "everything", label: "всего не уместишь" },
  { id: "year", label: "этот год" },
  { id: "finale", label: "скоро" },
  { id: "ps", label: "P.S." },
];

const FROM: Record<string, gsap.TweenVars> = {
  up: { y: 50, opacity: 0 },
  left: { x: -80, opacity: 0 },
  right: { x: 80, opacity: 0 },
  fade: { opacity: 0, scale: 0.97 },
  drop: { y: -40, rotate: -6, opacity: 0, scale: 0.92 },
};

function App() {
  const [active, setActive] = useState(0);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: false });
    lenisRef.current = lenis;

    // листание только стрелками ↑/↓: колесо, тачпад, тач-свайпы, пробел и Home/End страницу не двигают
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    // на телефоне стрелок нет — обычный скролл пальцем
    const mobile = isMobile();
    if (!mobile) {
      window.addEventListener("wheel", block, { passive: false, capture: true });
      window.addEventListener("touchmove", block, { passive: false, capture: true });
    }
    const blockKeys = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (e.key === " " || e.key === "Home" || e.key === "End") e.preventDefault();
    };
    window.addEventListener("keydown", blockKeys);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const from = FROM[el.dataset.reveal ?? "up"] ?? FROM.up;
        const inHero = !!el.closest("#hero");
        gsap.from(el, {
          ...from,
          duration: 1.1,
          ease: "power3.out",
          delay: inHero ? 1.2 + Math.random() * 0.4 : 0,
          scrollTrigger: inHero ? undefined : { trigger: el, start: "top 96%", once: true },
        });
      });

      NAV.forEach((n, i) => {
        ScrollTrigger.create({
          trigger: `#${n.id}`,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
    });

    // ↑/↓ (и PageUp/PageDown) листают слайды; внутри главы выше экрана сначала докручиваем её
    function onKey(e: KeyboardEvent) {
      const down = e.key === "ArrowDown" || e.key === "PageDown";
      const up = e.key === "ArrowUp" || e.key === "PageUp";
      if (!down && !up) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const y = window.scrollY;
      const vh = window.innerHeight;
      const tops = NAV.map((n) => document.getElementById(n.id)!).map((el) => ({ top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight }));
      let cur = tops.findIndex((t) => y >= t.top - 24 && y < t.bottom - 24);
      if (cur < 0) cur = 0;
      let target: number;
      if (down) {
        const sec = tops[cur];
        target = sec.bottom - (y + vh) > vh * 0.25 ? Math.min(y + vh * 0.85, sec.bottom - vh) : tops[Math.min(cur + 1, tops.length - 1)].top;
      } else {
        const sec = tops[cur];
        target = y - sec.top > vh * 0.25 ? Math.max(sec.top, y - vh * 0.85) : tops[Math.max(cur - 1, 0)].top;
        if (target === tops[Math.max(cur - 1, 0)].top && cur > 0) {
          const prev = tops[cur - 1];
          if (prev.bottom - prev.top > vh * 1.1) target = prev.bottom - vh;
        }
      }
      lenis.scrollTo(target, { duration: 1.1 });
    }
    window.addEventListener("keydown", onKey);

    // переход к главе из содержания во вступлении: window.dispatchEvent(new CustomEvent("goto", { detail: id }))
    const onGoto = (e: Event) => {
      const el = document.getElementById((e as CustomEvent<string>).detail);
      if (el) lenis.scrollTo(el, { duration: 1.6 });
    };
    window.addEventListener("goto", onGoto);

    // шрифты и картинки меняют высоту — пересчитать триггеры
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("goto", onGoto);
      window.removeEventListener("wheel", block, { capture: true });
      window.removeEventListener("touchmove", block, { capture: true });
      window.removeEventListener("keydown", blockKeys);
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  function goTo(id: string) {
    const el = document.getElementById(id);
    if (el) lenisRef.current?.scrollTo(el, { duration: 1.6 });
  }

  return (
    <AudioProvider>
      <Preloader />
      <SvgDefs />
      <nav className="chapter-nav" aria-label="главы">
        {NAV.map((n, i) => (
          <button key={n.id} type="button" className={i === active ? "active" : ""} onClick={() => goTo(n.id)}>
            <span className="cn-label">{n.label}</span>
            <span className="cn-dot" />
          </button>
        ))}
      </nav>
      <main>
        <Hero />
        <Intro />
        <Kazan />
        <Run />
        <Bridges />
        <October />
        <Dacha />
        <Care />
        <Circles />
        <Everything />
        <Year />
        <Finale />
        <PostScript />
      </main>
      <NowPlaying />
    </AudioProvider>
  );
}

export default App;

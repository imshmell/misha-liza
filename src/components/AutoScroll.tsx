import { useEffect, useRef, type ReactNode } from "react";
import { isMobile } from "@/lib/mobile";

// Область, которая едет сама (маятником вниз-вверх). Курсор над ней — пауза;
// зажал и тянешь — двигаешь ленту рукой (drag, с инерцией после отпускания). Увёл курсор — снова едет.
// Колесо/тачпад здесь не работают (на сайте листание только стрелками).
export function AutoScroll({ children, className = "", speed = 30 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isMobile()) return; // на телефоне фото просто идут столбцом в общем скролле
    let visible = false;
    let hover = false;
    let dragging = false;
    let dir = 1;
    let pos = el.scrollTop;
    let last = 0;
    let raf = 0;
    let lastY = 0;
    let vel = 0; // px/s инерция после броска

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.5 });
    io.observe(el);

    const max = () => el.scrollHeight - el.clientHeight;
    const clamp = (v: number) => Math.max(0, Math.min(max(), v));

    const onEnter = () => (hover = true);
    const onLeave = () => (hover = false);
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return; // кнопки видео работают как обычно
      dragging = true;
      vel = 0;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      pos = clamp(pos - dy);
      el.scrollTop = pos;
      vel = vel * 0.6 - dy * 60 * 0.25; // ~px/s при 60 кадрах
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (vel !== 0) dir = vel > 0 ? 1 : -1; // автопрокрутка продолжит в ту сторону, куда бросили
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    const tick = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (!dragging && Math.abs(vel) > 5) {
        // инерция броска
        pos = clamp(pos + vel * dt);
        vel *= Math.pow(0.04, dt);
        el.scrollTop = pos;
      } else if (visible && !hover && !dragging) {
        vel = 0;
        const m = max();
        pos += dir * speed * dt;
        if (pos >= m) {
          pos = m;
          dir = -1;
        } else if (pos <= 0) {
          pos = 0;
          dir = 1;
        }
        el.scrollTop = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [speed]);

  return (
    <div ref={ref} className={`autoscroll ${className}`} data-lenis-prevent>
      {children}
    </div>
  );
}

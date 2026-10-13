import { useEffect, useRef } from "react";

// Бесконечная лента: едет сама, тянется мышью/пальцем (с инерцией), мышью водят над лентой — пауза.
// В треке контент продублирован дважды; позиция крутится в пределах ширины одного набора.
// dir: 1 — кадры едут вправо, -1 — влево. Вертикальный свайп пальцем по-прежнему листает страницу (touch-action: pan-y).
export function useMarquee<T extends HTMLElement>(speed = 60, dir: 1 | -1 = -1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const track = (el?.querySelector("[data-track]") ?? el?.firstElementChild) as HTMLElement | null;
    if (!el || !track) return;
    el.style.touchAction = "pan-y";

    let set = 0; // ширина одного набора кадров
    let x = 0;
    let vel = 0; // инерция после броска, px/с
    let hover = false;
    let lastMouse = 0; // пауза только пока мышью водят над лентой: курсор, просто лежащий на ней, не стопорит
    let drag: { id: number; x: number; y: number; t: number; moved: boolean; axis: "" | "x" | "y" } | null = null;
    let visible = false;
    let raf = 0;
    let last = 0;

    const measure = () => {
      const n = track.children.length / 2;
      const a = track.children[0] as HTMLElement | undefined;
      const b = track.children[n] as HTMLElement | undefined;
      set = a && b ? b.offsetLeft - a.offsetLeft : track.scrollWidth / 2;
    };
    const wrap = () => {
      if (set > 0) x = ((x % set) - set) % set; // x всегда в (-set, 0]
    };
    const apply = () => (track.style.transform = `translate3d(${x}px,0,0)`);

    const tick = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (!drag) {
        if (Math.abs(vel) > 5) {
          x += vel * dt;
          vel *= Math.pow(0.05, dt);
        } else if (!(hover && t - lastMouse < 1500)) x += dir * speed * dt;
        wrap();
        apply();
      }
      raf = visible || drag || Math.abs(vel) > 5 ? requestAnimationFrame(tick) : 0;
      if (!raf) last = 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return; // кнопки видео работают как обычно
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, axis: e.pointerType === "mouse" ? "x" : "" };
      vel = 0;
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") lastMouse = performance.now();
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; // вертикально — это скролл страницы, не трогаем
        if (drag.axis === "x") el.setPointerCapture(e.pointerId);
      }
      if (drag.axis !== "x") return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.t) / 1000;
      x += dx;
      vel = vel * 0.5 + (dx / dt) * 0.5;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      drag.moved = true;
      wrap();
      apply();
      el.classList.add("is-dragging");
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.axis !== "x" || performance.now() - drag.t > 120) vel = 0;
      if (drag.moved) {
        el.classList.add("was-dragged");
        setTimeout(() => el.classList.remove("was-dragged"), 60);
      }
      drag = null;
      el.classList.remove("is-dragging");
      start();
    };
    // не открывать «клик» по видео после перетаскивания
    const onClick = (e: MouseEvent) => {
      if (el.classList.contains("was-dragged")) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onEnter = (e: PointerEvent) => e.pointerType === "mouse" && (hover = true);
    const onLeave = () => (hover = false);

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
    });
    io.observe(el);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", (e) => e.preventDefault());
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick, true);
    };
  }, [speed, dir]);

  return ref;
}

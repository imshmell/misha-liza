import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as snd from "@/lib/cupidSfx";

// Мини-игра перед финалом: зайчик-купидон слева натягивает лук (тянешь мышью назад и отпускаешь),
// стрела летит по дуге (гравитация), второй купидон справа парит вверх-вниз. Мимо → «Try again».
// Попал → сердечный взрыв, и экран раскрывается сердцем из точки попадания — под ним финал.
// После 2 промахов прицел показывает больше траектории, после 4 — цель замирает и хитбокс больше.

const BASE = import.meta.env.BASE_URL;
const G = 1500; // px/s²
const MAX_PULL = 190; // px
const VMAX = 2350; // px/s при полном натяжении

type Pt = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; heart: boolean; rot: number; vr: number; petal?: boolean };
type Bonus = { x: number; y: number; ph: number; alive: boolean; el: HTMLSpanElement };

function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.closePath();
}

export function CupidGame({ onWin }: { onWin: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shooter = useRef<HTMLImageElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const aimSvg = useRef<SVGSVGElement>(null);
  const toast = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const missRef = useRef(0);

  useEffect(() => {
    const el = root.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let W = 0,
      H = 0,
      dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = el.clientWidth;
      H = el.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const rel = (r: DOMRect, fx: number, fy: number): Pt => {
      const b = el.getBoundingClientRect();
      return { x: r.left - b.left + r.width * fx, y: r.top - b.top + r.height * fy };
    };
    const anchor = () => rel(shooter.current!.getBoundingClientRect(), 0.8, 0.42);

    // состояние
    let aiming = false;
    let pull: Pt = { x: 0, y: 0 };
    let flying = false;
    let won = false;
    let pos: Pt = { x: 0, y: 0 };
    let vel: Pt = { x: 0, y: 0 };
    let t0 = performance.now();
    let last = t0;
    const parts: Particle[] = [];
    let targetY = 0;

    // сердечки-бонусы в небе на пути стрелы: лопаются, если стрела пролетает сквозь
    const bonusLayer = el.querySelector<HTMLDivElement>(".cg-bonus")!;
    const bonuses: Bonus[] = [];
    const spawnBonuses = () => {
      bonusLayer.innerHTML = "";
      bonuses.length = 0;
      [[0.36, 0.42], [0.47, 0.6], [0.56, 0.36], [0.66, 0.52]].forEach(([fx, fy], i) => {
        const span = document.createElement("span");
        span.className = "cg-b";
        bonusLayer.appendChild(span);
        bonuses.push({ x: W * fx, y: H * fy, ph: i * 1.7, alive: true, el: span });
      });
    };
    spawnBonuses();

    const emit = (x: number, y: number, n: number, opts: Partial<Particle> & { spread?: number; speed?: number } = {}) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (opts.speed ?? 300) * (0.35 + Math.random() * 0.9);
        const max = 0.6 + Math.random() * 0.9;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * sp + (opts.vx ?? 0),
          vy: Math.sin(a) * sp + (opts.vy ?? 0),
          life: max,
          max,
          size: opts.size ?? 3 + Math.random() * 5,
          color: opts.color ?? ["#F3A9C0", "#C21807", "#F1E9D8", "#E8C98A"][i % 4],
          heart: opts.heart ?? Math.random() < 0.55,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 8,
        });
      }
    };

    const drawAim = () => {
      const svg = aimSvg.current!;
      if (!aiming) {
        svg.innerHTML = "";
        return;
      }
      const A = anchor();
      const len = Math.hypot(pull.x, pull.y);
      const k = Math.min(len, MAX_PULL) / MAX_PULL;
      const vx = (-pull.x / (len || 1)) * VMAX * k;
      const vy = (-pull.y / (len || 1)) * VMAX * k;
      const steps = missRef.current >= 2 ? 30 : 14; // после промахов — подсказка длиннее
      let dots = "";
      for (let i = 1; i <= steps; i++) {
        const t = i * 0.035;
        const x = A.x + vx * t;
        const y = A.y + vy * t + 0.5 * G * t * t;
        dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3.4 - (i / steps) * 2.2).toFixed(2)}" fill="#F3A9C0" opacity="${(1 - i / (steps + 2)).toFixed(2)}"/>`;
      }
      // кольцо силы натяжения
      const R = 46;
      const arc = 2 * Math.PI * R;
      dots += `<circle cx="${A.x}" cy="${A.y}" r="${R}" fill="none" stroke="rgba(241,233,216,.18)" stroke-width="3"/>`;
      dots += `<circle cx="${A.x}" cy="${A.y}" r="${R}" fill="none" stroke="#F3A9C0" stroke-width="3" stroke-linecap="round" stroke-dasharray="${arc * k} ${arc}" transform="rotate(-90 ${A.x} ${A.y})"/>`;
      // тетива — от концов лука к оттянутой стреле
      const ang = Math.atan2(vy, vx);
      const nx = -Math.sin(ang),
        ny = Math.cos(ang);
      const back = { x: A.x + pull.x * 0.45, y: A.y + pull.y * 0.45 };
      const tip1 = { x: A.x + nx * 62, y: A.y + ny * 62 };
      const tip2 = { x: A.x - nx * 62, y: A.y - ny * 62 };
      dots += `<path d="M${tip1.x} ${tip1.y} L${back.x} ${back.y} L${tip2.x} ${tip2.y}" stroke="#F1E9D8" stroke-width="1.6" fill="none" opacity=".85"/>`;
      svg.innerHTML = dots;
      placeArrow(back.x, back.y, ang);
    };

    const placeArrow = (x: number, y: number, ang: number) => {
      const a = arrow.current!;
      a.style.opacity = "1";
      a.style.transform = `translate(${x}px, ${y}px) rotate(${ang}rad)`;
    };
    const hideArrow = () => (arrow.current!.style.opacity = "0");

    const onDown = (e: PointerEvent) => {
      if (flying || won || (e.target as HTMLElement).closest("button")) return;
      aiming = true;
      el.setPointerCapture(e.pointerId);
      onMove(e);
      gsap.to(hint.current, { opacity: 0, duration: 0.3 });
      snd.aimStart();
      gsap.to(shooter.current, { scale: 1.04, duration: 0.3 });
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!aiming) return;
      const b = el.getBoundingClientRect();
      const A = anchor();
      let px = e.clientX - b.left - A.x;
      let py = e.clientY - b.top - A.y;
      // тянуть можно только назад (влево), чтобы стрела летела вправо
      px = Math.min(px, -8);
      const l = Math.hypot(px, py);
      if (l > MAX_PULL) {
        px *= MAX_PULL / l;
        py *= MAX_PULL / l;
      }
      const moved = Math.hypot(px - pull.x, py - pull.y) > 0.5;
      pull = { x: px, y: py };
      snd.aimUpdate(Math.min(Math.hypot(px, py), MAX_PULL) / MAX_PULL, moved);
      drawAim();
    };
    const onUp = () => {
      if (!aiming) return;
      aiming = false;
      snd.aimEnd();
      gsap.to(shooter.current, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
      const len = Math.hypot(pull.x, pull.y);
      drawAim();
      if (len < 24) {
        hideArrow();
        return;
      }
      const k = Math.min(len, MAX_PULL) / MAX_PULL;
      const A = anchor();
      pos = { x: A.x, y: A.y };
      vel = { x: (-pull.x / len) * VMAX * k, y: (-pull.y / len) * VMAX * k };
      flying = true;
      snd.release(k);
      snd.flightStart();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    const miss = () => {
      flying = false;
      hideArrow();
      missRef.current += 1;
      setMisses(missRef.current);
      snd.flightEnd();
      snd.miss();
      setTimeout(spawnBonuses, 900);
      gsap.fromTo(
        toast.current,
        { opacity: 0, scale: 0.6, rotate: -8 },
        { opacity: 1, scale: 1, rotate: -4, duration: 0.5, ease: "back.out(2.4)", yoyo: true, repeat: 1, repeatDelay: 1.1 }
      );
      gsap.fromTo(target.current, { x: 0 }, { x: 10, duration: 0.07, repeat: 5, yoyo: true, ease: "none", clearProps: "x" });
    };

    const hit = (p: Pt) => {
      flying = false;
      won = true;
      snd.flightEnd();
      snd.hit();
      hideArrow();
      emit(p.x, p.y, 90, { speed: 520 });
      emit(p.x, p.y, 40, { speed: 160, heart: true, size: 10, color: "#C21807" });
      // лепестки сыплются сверху по всему экрану
      for (let i = 0; i < 70; i++)
        parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80, life: 3.2, max: 3.2, size: 6 + Math.random() * 6, color: ["#F3A9C0", "#F6C9D6", "#E58FA8", "#FBE3EA"][i % 4], heart: false, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, petal: true });
      const tl = gsap.timeline();
      tl.to(target.current, { scale: 1.25, rotate: 12, duration: 0.25, ease: "back.out(3)" })
        .to(target.current, { scale: 1.05, rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" })
        .add(() => {
          setDone(true);
          // раскрытие сердцем из точки попадания
          el.style.setProperty("--hx", `${p.x}px`);
          el.style.setProperty("--hy", `${p.y}px`);
          el.classList.add("cg-opening");
        }, "+=0.35")
        .fromTo(el, { "--hs": "0px" }, { "--hs": `${Math.max(W, H) * 3.2}px`, duration: 1.8, ease: "power2.in" })
        .add(() => onWin());
    };

    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;

      // цель парит; после 4 промахов — замирает
      const tg = target.current!;
      const amp = missRef.current >= 4 ? 0 : H * 0.13;
      targetY = Math.sin(t * 1.25) * amp + Math.sin(t * 2.7) * amp * 0.18;
      if (!won) tg.style.translate = `0 ${targetY}px`;
      for (const b of bonuses) {
        b.ph += dt;
        b.el.style.transform = `translate(${b.x}px, ${b.y + Math.sin(b.ph * 1.6) * 10}px)`;
      }

      if (flying) {
        vel.y += G * dt;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        const ang = Math.atan2(vel.y, vel.x);
        placeArrow(pos.x, pos.y, ang);
        snd.flightUpdate(pos.x / W, Math.hypot(vel.x, vel.y));
        // искры за стрелой
        if (Math.random() < 0.9) emit(pos.x - Math.cos(ang) * 30, pos.y - Math.sin(ang) * 30, 1, { speed: 40, size: 2 + Math.random() * 3, heart: Math.random() < 0.3, vx: -vel.x * 0.05, vy: -vel.y * 0.05 });
        const tr = tg.getBoundingClientRect();
        const c = rel(tr, 0.5, 0.52);
        const r = tr.width * (missRef.current >= 4 ? 0.48 : 0.36);
        const tip = { x: pos.x + Math.cos(ang) * 64, y: pos.y + Math.sin(ang) * 64 };
        for (const b of bonuses)
          if (b.alive && Math.hypot(tip.x - b.x, tip.y - b.y) < 34) {
            b.alive = false;
            b.el.classList.add("pop");
            emit(b.x, b.y, 22, { speed: 220, heart: true, size: 6 });
            snd.pop();
          }
        if (Math.hypot(tip.x - c.x, tip.y - c.y) < r) hit(tip);
        else if (pos.x > W + 80 || pos.y > H + 80 || pos.x < -80) miss();
      }

      // частицы
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt;
        if (q.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        if (q.petal) {
          q.vx += Math.sin((now / 1000) * 2 + q.rot) * 30 * dt; // покачивание в воздухе
          q.vy = Math.min(q.vy + 20 * dt, 120);
        } else {
          q.vy += 380 * dt;
          q.vx *= 0.985;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        ctx.save();
        ctx.globalAlpha = Math.min(1, q.life / q.max * 1.6);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot * 0.2);
        ctx.fillStyle = q.color;
        if (q.petal) {
          ctx.rotate(q.rot * 3);
          ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(q.rot * 2))); // лепесток поворачивается в воздухе
          ctx.beginPath();
          ctx.ellipse(0, 0, q.size, q.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (q.heart) {
          heartPath(ctx, q.size);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, q.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      snd.aimEnd();
      snd.flightEnd();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [onWin]);

  return (
    <div className="cg" ref={root} data-lenis-prevent>
      <div className="cg-spot cg-spot-l" aria-hidden="true" />
      <div className="cg-spot cg-spot-r" aria-hidden="true" />
      <div className="cg-clouds" aria-hidden="true">
        <span className="cg-cloud c1" />
        <span className="cg-cloud c2" />
        <span className="cg-cloud c3" />
      </div>
      <div className="cg-twinkle" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${14 + ((i * 53) % 70)}%`, animationDelay: `${(i * 0.7) % 4}s`, scale: String(0.6 + ((i * 13) % 7) / 10) }} />
        ))}
      </div>
      <div className="cg-bonus" aria-hidden="true" />
      <header className="cg-head">
        <span className="caps cg-kicker">перед последним треком</span>
        <h2 className="cg-title scr">Попади в сердечко</h2>
        <div className="cg-tries" aria-label={`промахов: ${misses}`}>
          {Array.from({ length: Math.max(3, misses + 1) }, (_, i) => (
            <span key={i} className={i < misses ? "miss" : i === misses ? "now" : ""} />
          ))}
        </div>
      </header>

      <img ref={shooter} className="cg-shooter" src={`${BASE}decor/cupid-bunny.webp`} alt="" draggable={false} />
      <div ref={target} className="cg-target">
        <span className="cg-ring" aria-hidden="true" />
        <img src={`${BASE}decor/cupid-bunny-2.webp`} alt="" draggable={false} />
      </div>

      <svg ref={aimSvg} className="cg-aim" aria-hidden="true" />
      <svg ref={arrow} className="cg-arrow" viewBox="-40 -9 80 18" width="136" height="31" aria-hidden="true">
        <defs>
          <linearGradient id="cg-shaft" x1="0" x2="1">
            <stop offset="0" stopColor="#E8C98A" />
            <stop offset="1" stopColor="#F6E3B8" />
          </linearGradient>
        </defs>
        <path d="M-34 0 H26" stroke="url(#cg-shaft)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M-36 0 l-4 -7 h9 l5 7 l-5 7 h-9z" fill="#F3A9C0" />
        <path d="M24 0 c-3 -6 -9 -8 -9 -3 c0 3 6 5 9 3z M24 0 c-3 6 -9 8 -9 3 c0 -3 6 -5 9 -3z" fill="#C21807" />
        <path d="M26 -6 L40 0 L26 6 Q29 0 26 -6z" fill="#C21807" />
      </svg>
      <canvas ref={canvas} className="cg-fx" aria-hidden="true" />

      <div ref={hint} className="cg-hint">
        <span className="cg-hand" aria-hidden="true" />
        <span className="hand">потяни назад и отпусти</span>
      </div>
      <div ref={toast} className="cg-toast scr">
        Мимо! <span>Try again</span>
      </div>
      {misses >= 4 && !done && <span className="caps cg-assist">купидон замер — теперь точно получится</span>}
      <button type="button" className="cg-skip caps" onClick={onWin}>
        пропустить →
      </button>
    </div>
  );
}

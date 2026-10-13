import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CARE_LIST, FINALE, POSTSCRIPT, START_DATE } from "@/lib/story";
import { photo, video as videoUrl } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { VideoPlayer } from "@/components/VideoPlayer";
// three.js грузится только к главе с конвертом (и никогда на телефоне)
const Envelope3D = lazy(() => import("@/components/Envelope3D"));
import { Decor } from "@/components/Decor";
import { playTg } from "@/lib/sfx";
import { useAudio } from "@/components/AudioProvider";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { ChapterHead, Img, Section, tracksMeta } from "./Section";
import { ch } from "./ChaptersA";
import { isMobile } from "@/lib/mobile";
import { useMarquee } from "@/lib/useMarquee";

function useOnceVisible<T extends HTMLElement>(threshold = 0.5) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
const ANNIVERSARY = new Date(
  START_DATE.getFullYear() + 1,
  START_DATE.getMonth(),
  START_DATE.getDate(),
);

// содержимое письма: live — настоящее видео; иначе постер (письмо в конверте, без лишнего видео-потока)
function CareLetterBody({ live }: { live: boolean }) {
  const c = ch("care");
  return (
    <>
      <div className="cl-list">
        <p className="letter-intro">{CARE_LIST.intro}</p>
        <ul className="letter-list">
          {CARE_LIST.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </div>
      <div className="cl-video">
        {live ? <VideoPlayer name={c.videos[0]} /> : <img src={videoUrl(c.videos[0]).poster} alt="" />}
      </div>
      <div className="cl-right">
        <p className="letter-accent scr">{c.paragraphs[1]}</p>
        <TrackList tracks={c.tracks} side="B" label={c.title} bare />
      </div>
      <div className="cl-photos">
        {c.photos.slice(2).map((k) => (
          <figure key={k}>
            <Img src={photo(k)} />
          </figure>
        ))}
      </div>
    </>
  );
}

export function Care() {
  const c = ch("care");
  const [stageRef, seen] = useOnceVisible<HTMLDivElement>(0.6);
  const full = useRef<HTMLDivElement>(null);
  // на телефоне без 3D-конверта: письмо сразу открыто
  const [mobile] = useState(isMobile);
  const [opened, setOpened] = useState(mobile);
  const [size, setSize] = useState<[number, number] | null>(null);
  // 3D-сцену строим, когда глава в пределах экрана; после раскрытия письма — останавливаем
  const [nearRef, near] = useOnceVisible<HTMLDivElement>(0);
  const [hidden, setHidden] = useState(false);

  // размер полного письма — по нему строится письмо в конверте (то же, уменьшенное)
  useEffect(() => {
    const el = full.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize((p) => (p && p[0] === el.offsetWidth && p[1] === el.offsetHeight ? p : [el.offsetWidth, el.offsetHeight])));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // письмо вышло из кармана → конверт уходит вниз и гаснет, то же письмо вырастает из своего прямоугольника на весь экран
  const onOut = useCallback((r: DOMRect) => {
    const el = full.current;
    const stage = stageRef.current;
    if (!el || !stage) return;
    setOpened(true);
    const f = el.getBoundingClientRect();
    gsap.to(stage.querySelector(".env3d"), { yPercent: 40, opacity: 0, duration: 1.3, ease: "power2.in", delay: 0.15, onComplete: () => setHidden(true) });
    gsap.fromTo(
      el,
      { x: r.left - f.left, y: r.top - f.top, scaleX: r.width / f.width, scaleY: r.height / f.height, opacity: 1, visibility: "visible" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.5, ease: "power3.inOut" },
    );
  }, [stageRef]);

  return (
    <Section id={c.id} tone="burgundy" className="care">
      <div ref={nearRef} className="care-near" aria-hidden="true" />
      <div className="care-side">
        <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
        {/* скриншоты с текстом — крупно, при наведении ещё крупнее */}
        {c.photos.slice(0, 2).map((k) => (
          <figure key={k} className="care-meme" data-reveal="up">
            <img src={photo(k)} alt="" loading="lazy" />
          </figure>
        ))}
      </div>
      <div className={`care-stage ${opened ? "is-open" : ""}`} ref={stageRef}>
        {size && !mobile && near && (
          <Suspense fallback={null}>
          <Envelope3D
            paused={hidden}
            play={seen}
            onOut={onOut}
            letterSize={size}
            to="кому: Мише"
            from="от: Лизы"
            sealLabel="Lover"
            letter={
              <div className="care-letter care-letter-pv" style={{ width: size[0], height: size[1] }}>
                <CareLetterBody live={false} />
              </div>
            }
          />
          </Suspense>
        )}
        <div className="care-letter" ref={full}>
          <CareLetterBody live={opened} />
        </div>
      </div>
    </Section>
  );
}

// длительности реальных кружочков (ffprobe): 0:17 и 0:07
const CIRCLE_LEN = ["0:17", "0:07"];

export function Circles() {
  const c = ch("circles");
  const [chatRef, seen] = useOnceVisible<HTMLDivElement>(0.3);
  const status = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!seen) return;
    const root = chatRef.current;
    if (!root) return;
    const msgs = root.querySelectorAll(".tg-msg");
    const reacts = root.querySelectorAll(".tg-react");
    // «записывает видео…» → кружочек → её ответ → ещё кружочек; реакции всплывают
    gsap
      .timeline({ delay: 0.2 })
      .call(() => playTg("in"))
      .to(msgs[0], {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "back.out(1.4)",
      })
      .to(
        reacts[0],
        { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(3)" },
        "+=0.5",
      )
      .to(
        msgs[1],
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
        "+=0.3",
      )
      .call(() => playTg("out"), undefined, "<")
      .call(
        () =>
          status.current && (status.current.textContent = "записывает видео…"),
      )
      .to(
        msgs[2],
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.4)" },
        "+=0.5",
      )
      .call(() => playTg("in"), undefined, "<")
      .call(() => status.current && (status.current.textContent = "в сети"))
      .to(
        reacts[1],
        { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(3)" },
        "+=0.5",
      );
  }, [seen, chatRef]);

  return (
    <Section id={c.id} tone="night" className="circles">
      <div className="circles-side">
        <ChapterHead
          kicker={c.kicker}
          title={c.title}
          light
          meta=" · видеосообщения"
        />
        <div className="circles-count" data-reveal="up">
          <span className="circles-num">2</span>
          <span className="caps">кружочка · {CIRCLE_LEN.join(" + ")}</span>
        </div>
        <Decor name="cats" className="circles-cats" />
      </div>

      <div className="tg" ref={chatRef} data-reveal="up">
        <header className="tg-top">
          <svg className="tg-ico" viewBox="0 0 24 24">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <div className="tg-ava">
            <img src={videoUrl(c.videos[1]).poster} alt="" />
          </div>
          <div className="tg-who">
            <b>Миша</b>
            <span ref={status}>в сети</span>
          </div>
          <svg className="tg-ico" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6" />
            <path d="M16 16l4 4" />
          </svg>
          <svg className="tg-ico" viewBox="0 0 24 24">
            <path d="M6 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z" />
          </svg>
          <svg className="tg-ico" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="12" cy="19" r="1.4" />
          </svg>
        </header>

        <div className="tg-feed">
          <div className="tg-msg tg-in tg-circle tg-circle-a">
            <VideoPlayer name={c.videos[0]} round ring="#F3A9C0" />
            <span className="tg-len">{CIRCLE_LEN[0]}</span>
            <span className="tg-react">❤️</span>
          </div>

          <div className="tg-msg tg-out tg-bubble">
            <p>{c.paragraphs[0]}</p>
            <span className="tg-ticks" aria-hidden="true">
              <svg viewBox="0 0 22 12">
                <path d="M1 6l4 4 7-8M9 9l1 1 7-8" />
              </svg>
            </span>
          </div>

          <div className="tg-msg tg-in tg-circle tg-circle-b">
            <VideoPlayer name={c.videos[1]} round ring="#F3A9C0" />
            <span className="tg-len">{CIRCLE_LEN[1]}</span>
            <span className="tg-react">🥹</span>
          </div>
        </div>

        <footer className="tg-bottom">
          <svg className="tg-ico" viewBox="0 0 24 24">
            <path d="M16 7l-7 7a2.5 2.5 0 0 0 3.5 3.5l7-7a4.5 4.5 0 0 0-6.4-6.4l-7 7a6.5 6.5 0 0 0 9.2 9.2l6-6" />
          </svg>
          <span className="tg-input">Сообщение</span>
          <svg className="tg-ico" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 0 0 7 0" />
          </svg>
          <span className="tg-rec" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </span>
        </footer>
      </div>
    </Section>
  );
}

export function Everything() {
  const c = ch("everything");
  const items = [
    { k: c.photos[0], cls: "sb-1" },
    { v: c.videos[0], cls: "sb-2" },
    { k: c.photos[1], cls: "sb-3" },
    { v: c.videos[1], cls: "sb-4" },
    { k: c.photos[2], cls: "sb-5" },
    { v: c.videos[2], cls: "sb-6" },
    { k: c.photos[3], cls: "sb-7" },
    { v: c.videos[3], cls: "sb-8" },
  ];
  // бесконечная лента: едет влево сама (как плёнка в Казани), тянется мышью/пальцем
  const strip = useMarquee<HTMLDivElement>(60, -1);

  return (
    <Section id={c.id} tone="paper" className="everything">
      <div className="sb-top">
        <article className="sb-card">
          <ChapterHead kicker={c.kicker} title={c.title} meta={tracksMeta(c.tracks.length)} />
          <p className="body" data-reveal="up">{c.paragraphs[0]}</p>
          <p className="hand handnote-big" data-reveal="up">{c.paragraphs[1]}</p>
        </article>
        <div className="sb-tracks" data-reveal="up">
          <TrackList tracks={c.tracks} side="B" label={c.title} bare />
        </div>
      </div>
      <div className="sb-strip" ref={strip} data-reveal="fade">
        <div className="sb-strip-track" data-track>
          {[...items, ...items].map((it, i) => (
            <figure key={i} className={`sb-item ${it.cls} ${it.v ? "sb-video" : "sb-photo"}`} aria-hidden={i >= items.length || undefined}>
              {it.v ? <VideoPlayer name={it.v} /> : <Img src={photo(it.k!)} />}
            </figure>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Year() {
  const c = ch("year");
  // любимое фото — полароидом на скотче, кадр целиком (в рамке-сердце обрезались лица); видео горизонтальное
  return (
    <Section id={c.id} tone="blush" className="year">
      <Decor name="lace-cream" className="year-lace" reveal="fade" />
      <figure className="year-pol" data-reveal="drop">
        <div className="year-pol-img">
          <Img src={photo(c.photos[0])} />
        </div>
        <figcaption className="hand year-caption">{c.caption}</figcaption>
        <span className="tape tape-tc" />
      </figure>
      <div className="year-body">
        <ChapterHead kicker={c.kicker} title={c.title} />
        <p className="lead" data-reveal="up">
          {c.paragraphs[0]}
        </p>
        <p className="body" data-reveal="up">
          {c.paragraphs[1]}
        </p>
        <figure className="year-video" data-reveal="up">
          <VideoPlayer name={c.videos[0]} />
        </figure>
        <p className="hand year-note" data-reveal="up">{c.videoCaption}</p>
      </div>
    </Section>
  );
}

export function Finale() {
  const [ref, seen] = useOnceVisible<HTMLDivElement>(0.5);
  const confetti = useRef<ConfettiRef>(null);
  const { toggle } = useAudio();
  const [k, setK] = useState(0);
  // сайт — подарок к годовщине: до 17.10.2026 показываем ровно год (365 дней), после — живой счёт дальше
  const ms = Math.max(ANNIVERSARY.getTime(), Date.now()) - START_DATE.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000);

  useEffect(() => {
    if (!seen) return;
    gsap.from(".finale-photo", { scale: 1.12, duration: 2.4, ease: "power2.out" });
    const o = { v: 0 };
    gsap.to(o, {
      v: 1,
      duration: 2.6,
      ease: "power2.out",
      onUpdate: () => setK(o.v),
    });
    confetti.current?.fire({
      particleCount: 170,
      spread: 110,
      startVelocity: 40,
      colors: ["#551515", "#a8803f", "#f6ece0", "#f3a9c0", "#c21807"],
    });
  }, [seen]);

  const n = (x: number) => Math.round(x * k).toLocaleString("ru-RU");

  return (
    <Section id="finale" tone="night" className="finale">
      <Decor name="cosmos" className="finale-cosmos" />
      <Confetti ref={confetti} manualstart className="confetti-canvas" />
      <div className="finale-photo" data-reveal="left">
        <Img src={photo(FINALE.photo)} />
      </div>
      <div className="finale-body" ref={ref}>
        <p className="lead lead-light" data-reveal="up">
          {FINALE.text}
        </p>
        <p className="finale-love scr" data-reveal="up">
          {FINALE.love.replace(/\s*❤️?\s*$/u, "")} {/* сердечко-эмодзи убрано по просьбе заказчицы */}
        </p>
        <div className="finale-counters" data-reveal="up">
          <div>
            <b>{n(hours)}</b>
            <span className="caps">часов</span>
          </div>
          <div className="finale-days">
            <b>{n(days)}</b>
            <span className="caps">дней вместе</span>
          </div>
          <div>
            <b>{n(minutes)}</b>
            <span className="caps">минут</span>
          </div>
        </div>
        <button
          type="button"
          className="finale-track"
          onClick={() => toggle(FINALE.track)}
          data-reveal="up"
        >
          <span className="finale-track-btn">
            <svg viewBox="0 0 16 16">
              <path d="M5 3v10l8-5z" />
            </svg>
          </span>
          <span>
            <span className="caps">последний трек</span>
            <b>
              {FINALE.track.title} — <em>{FINALE.track.artist}</em>
            </b>
          </span>
        </button>
      </div>
    </Section>
  );
}

export function PostScript() {
  return (
    <Section id="ps" tone="paper" className="ps">
      <div className="ps-text-col">
        <div className="ps-mark scr" data-reveal="up">
          P.S.
        </div>
        <p className="ps-text" data-reveal="up">
          {POSTSCRIPT.text.replace(/^P\.S\.\s*/, "")}
        </p>
      </div>
      <div className="ps-photos">
        {POSTSCRIPT.photos.map((k, i) => (
          <figure
            key={k}
            className={`pol ps-pol ps-pol-${i}`}
            data-reveal="drop"
          >
            <Img src={photo(k)} />
          </figure>
        ))}
        <Decor name="cherries" className="ps-cherries" />
      </div>
      <footer className="site-foot">
        <span className="caps">М &amp; Е</span>
        <span className="caps">
          {fmt(START_DATE)} — {fmt(ANNIVERSARY)}
        </span>
        <span className="caps">конец стороны B</span>
      </footer>
    </Section>
  );
}

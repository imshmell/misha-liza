import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO, START_DATE } from "@/lib/story";
import { photo } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { useAudio } from "@/components/AudioProvider";
import { Vinyl } from "@/components/Vinyl";
import { Img, Section } from "./Section";
import { ch } from "./ChaptersA";

const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

export function Hero() {
  const { playing, toggle, current } = useAudio();
  const vinyl = useRef<HTMLDivElement>(null);
  const end = new Date(START_DATE);
  end.setFullYear(end.getFullYear() + 1);
  const first = INTRO.tracks[0];
  const firstPlaying = playing && current?.title === first.title;

  useEffect(() => {
    // пластинка выкатывается из-за края, фото медленно "наезжает" (Ken Burns)
    gsap.fromTo(vinyl.current, { xPercent: 40, opacity: 0 }, { xPercent: 0, opacity: 0.94, duration: 2, delay: 1.3, ease: "power3.out" });
    gsap.fromTo(".hero-bg img", { scale: 1.12 }, { scale: 1, duration: 9, ease: "power1.out", delay: 0.8 });
  }, []);

  return (
    <Section id="hero" tone="night" className="hero">
      <Img src={photo("p4")} className="hero-bg" bw />
      <div className="hero-scrim" />

      <div className="hero-vinyl-slot" ref={vinyl}>
        <Vinyl playing={playing} className="hero-vinyl" />
      </div>

      <div className="hero-top">
        <span className="caps">est. 17 · 10 · 2025</span>
        <span className="hero-top-mark scr">Миша &amp; Лиза</span>
        <span className="caps">пролог · сторона A</span>
      </div>

      <div className="hero-copy">
        <p className="caps hero-kicker" data-reveal="up">первая годовщина · музыкальный фотомемуар</p>
        <h1 className="hero-names" data-reveal="up">
          Миша <span className="hero-amp">&amp;</span> Лиза
        </h1>
        <div className="hero-sub" data-reveal="up">
          <span className="caps hero-dates">
            {fmt(START_DATE)} — {fmt(end)}
          </span>
          <span className="scr hero-sub-script">плейлист нашей истории</span>
        <button type="button" className="hero-play" onClick={() => toggle(first)}>
            <span className="hero-play-btn">
              {firstPlaying ? (
                <svg viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 16 16"><path d="M5 3v10l8-5z" /></svg>
              )}
            </span>
            <span>
              <span className="caps">слушать сторону A</span>
              <b>
                {first.title} — <em>{first.artist}</em>
              </b>
            </span>
          </button>
        </div>
      </div>

      <div className="hero-side">
        <div className="hero-keys" aria-label="листай стрелкой вниз">
          <kbd className="hero-key">
            <svg viewBox="0 0 16 16"><path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" /></svg>
          </kbd>
          <span className="caps">листай стрелкой</span>
        </div>
      </div>

      {/* рамка как на старом конверте пластинки: две тонкие золотые линии, вырезанные углы с сердечками */}
      <div className="hero-frame" aria-hidden="true">
        <span className="hero-frame-in" />
        {["tl", "tr", "bl", "br"].map((c) => (
          <svg key={c} className={`hero-frame-c hero-frame-${c}`} viewBox="0 0 40 40">
            <path d="M0 26 A26 26 0 0 0 26 0" />
            <path d="M0 34 A34 34 0 0 0 34 0" opacity=".45" />
            <path d="M9 13.5c-2.6-1.7-4.2-3.1-4.2-4.8a2.1 2.1 0 0 1 4.2-.8 2.1 2.1 0 0 1 4.2.8c0 1.7-1.6 3.1-4.2 4.8z" className="hero-frame-heart" />
          </svg>
        ))}
      </div>
    </Section>
  );
}

// Сторона A — главы I–IV, сторона B — V–IX (как у пластинки); содержание сайта = треклист альбома
const SIDES = [
  { side: "A", ids: ["kazan", "run", "bridges", "october"] },
  { side: "B", ids: ["dacha", "care", "circles", "everything", "year"] },
];
const plural = (n: number) => (n === 1 ? "трек" : n < 5 ? "трека" : "треков");

export function Intro() {
  const goto = (id: string) => window.dispatchEvent(new CustomEvent("goto", { detail: id }));
  return (
    <Section id="intro" tone="paper" className="intro">
      <div className="intro-left paper-tex">
        <span className="caps intro-kicker" data-reveal="up">вступление · оборот пластинки</span>
        <h2 className="intro-title scr" data-reveal="up">{INTRO.title}</h2>
        <p className="lead intro-lead" data-reveal="up">{INTRO.text}</p>
        <div className="intro-tracks" data-reveal="up">
          <TrackList tracks={INTRO.tracks} side="A" label="интро" bare />
        </div>
        <nav className="intro-toc" aria-label="содержание" data-reveal="up">
          {SIDES.map(({ side, ids }) => (
            <div key={side} className="toc-side">
              <span className="caps toc-head">сторона {side}</span>
              <ol>
                {ids.map((id) => {
                  const c = ch(id);
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => goto(id)}>
                        <span className="toc-n">{c.kicker}</span>
                        <span className="toc-t">{c.title}</span>
                        <span className="toc-dots" aria-hidden="true" />
                        {c.tracks.length > 0 && (
                          <span className="toc-c">
                            {String(c.tracks.length).padStart(2, "0")} {plural(c.tracks.length)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </div>
      <div className="intro-right vel">
        {INTRO.stories.map((k, i) => (
          <figure key={k} className={`phone phone-${i}`} data-reveal={i ? "right" : "left"}>
            <div className="phone-notch" />
            <img src={photo(k)} alt="" loading="lazy" />
            <span className={`tape ${i ? "g" : ""} ${i ? "tape-tr" : "tape-tl"}`} />
          </figure>
        ))}
        <figure className="pol intro-photo" data-reveal="drop">
          <Img src={photo(INTRO.hero)} />
          <span className="tape tape-tr" />
        </figure>
      </div>
    </Section>
  );
}

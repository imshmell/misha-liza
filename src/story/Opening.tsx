import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO } from "@/lib/story";
import { photo } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { useAudio } from "@/components/AudioProvider";
import { Vinyl } from "@/components/Vinyl";
import { Img, Section } from "./Section";

export function Hero() {
  const { playing, toggle, current } = useAudio();
  const vinyl = useRef<HTMLDivElement>(null);
  const first = INTRO.tracks[0];
  const firstPlaying = playing && current?.title === first.title;

  useEffect(() => {
    // пластинка выкатывается из-за края, фото медленно "наезжает" (Ken Burns)
    gsap.fromTo(vinyl.current, { xPercent: 40, opacity: 0 }, { xPercent: 0, opacity: 0.94, duration: 2, delay: 1.3, ease: "power3.out" });
    gsap.fromTo(".hero-bg img", { scale: 1.12 }, { scale: 1, duration: 9, ease: "power1.out", delay: 0.8 });
  }, []);

  return (
    <Section id="hero" tone="night" className="hero">
      <Img src={photo("p1")} className="hero-bg" bw eager />
      <div className="hero-scrim" />

      <div className="hero-vinyl-slot" ref={vinyl}>
        <Vinyl playing={playing} className="hero-vinyl" />
      </div>

      <span className="caps hero-est">est. 17 · 10 · 2025</span>

      <div className="hero-copy">
        <p className="caps hero-kicker" data-reveal="up">первая годовщина · музыкальный фотомемуар</p>
        <h1 className="hero-names" data-reveal="up">
          Миша <span className="hero-amp">&amp;</span> Елизавета
        </h1>
        <div className="hero-sub" data-reveal="up">
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


    </Section>
  );
}


export function Intro() {
  return (
    <Section id="intro" tone="paper" className="intro">
      <div className="intro-left">
        <span className="caps intro-kicker" data-reveal="up">вступление · оборот пластинки</span>
        <h2 className="intro-title scr" data-reveal="up">{INTRO.title}</h2>
        <p className="lead intro-lead" data-reveal="up">{INTRO.text}</p>
        <div className="intro-tracks" data-reveal="up">
          <TrackList tracks={INTRO.tracks} side="A" label="интро" bare />
        </div>
      </div>
      <div className="intro-right">
        {INTRO.stories.map((k, i) => (
          <figure key={k} className={`phone phone-${i}`} data-reveal={i ? "right" : "left"}>
            <div className="phone-notch" />
            <img src={photo(k)} alt="" loading="lazy" />
          </figure>
        ))}
      </div>
    </Section>
  );
}

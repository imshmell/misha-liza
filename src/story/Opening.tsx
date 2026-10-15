import { useEffect, useRef } from "react";
import gsap from "gsap";
import { INTRO } from "@/lib/story";
import { photo } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { useAudio } from "@/components/AudioProvider";
import { Vinyl } from "@/components/Vinyl";
import { Img, Section } from "./Section";

export function Hero() {
  const { playing } = useAudio();
  const vinyl = useRef<HTMLDivElement>(null);

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
        <h1 className="hero-names" data-reveal="up">
          Миша <span className="hero-amp">&amp;</span> Лиза
        </h1>
        <div className="hero-sub" data-reveal="up">
          <span className="scr hero-sub-script">музыкальный фотомемуар</span>
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

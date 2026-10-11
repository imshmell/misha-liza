import { CHAPTERS, type StoryChapter } from "@/lib/story";
import { photo } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { VideoPlayer } from "@/components/VideoPlayer";
import { FilmReel } from "@/components/FilmReel";
import { Curtains } from "@/components/Curtains";
import { WordHeart } from "@/components/WordHeart";
import { AutoScroll } from "@/components/AutoScroll";
import { Decor } from "@/components/Decor";
import { RunRoute } from "@/components/RunRoute";
import { ChapterHead, Img, Section, tracksMeta } from "./Section";

export const ch = (id: string): StoryChapter => CHAPTERS.find((c) => c.id === id)!;

function Arrow({ className = "", d = "M4 60C30 62 70 50 100 14" }: { className?: string; d?: string }) {
  return (
    <svg className={`hand-arrow ${className}`} width="110" height="70" viewBox="0 0 110 70" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d={d} />
      <path d="M88 12l12 2-2 12" />
    </svg>
  );
}

export function Kazan() {
  const c = ch("kazan");
  const frames = [
    <Img key="p5" src={photo(c.photos[1])} />,
    <VideoPlayer key="v1" name={c.videos[0]} />,
    <Img key="p8" src={photo(c.photos[4])} />,
    <Img key="p7" src={photo(c.photos[3])} />,
    <VideoPlayer key="v2" name={c.videos[1]} />,
    <Img key="p6" src={photo(c.photos[2])} />,
    <Img key="p4" src={photo(c.photos[0])} />,
  ];

  return (
    <Section id={c.id} tone="night" className="kazan">
      <div className="kazan-top">
        <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
        <p className="lead lead-light kazan-lead" data-reveal="up">{c.paragraphs[0]}</p>
      </div>
      <div data-reveal="fade">
        <FilmReel items={frames} label={`${c.photos.length} фото · ${c.videos.length} видео · наведи — остановится`} />
      </div>
      {/* низ — длинный билет на поезд: корешок с направлением и её фразой | перфорация | трек главы */}
      <div className="kazan-ticket" data-reveal="up">
        <div className="kt-stub">
          <span className="caps">поезд · вагон · место</span>
          <span className="ticket-dest">→ Казань</span>
        </div>
        <p className="hand kt-note">{c.caption}</p>
        <div className="kt-tracks">
          <TrackList tracks={c.tracks} side="A" label={c.title} bare />
        </div>
      </div>
    </Section>
  );
}

export function Run() {
  const c = ch("run");
  return (
    <Section id={c.id} tone="paper" className="run">
      <div className="run-photo" data-reveal="left">
        <Img src={photo(c.photos[3])} />
        <span className="caps run-vertical">глава II · бег</span>
      </div>
      <div className="run-body paper-tex">
        <RunRoute />
        <Decor name="vine" className="run-vine" reveal="fade" />
        <Decor name="you-make-me-happy" className="run-happy" />
        <ChapterHead kicker={c.kicker} title={c.title} meta={tracksMeta(c.tracks.length)} />
        {c.paragraphs.map((p, i) => (
          <p key={i} className={i ? "body" : "lead"} data-reveal="up">
            {p}
          </p>
        ))}
        <div className="run-row">
          <div data-reveal="up">
            <TrackList tracks={c.tracks} side="A" label={c.title} />
          </div>
        </div>
      </div>

      <figure className="pol run-pol" data-reveal="drop">
        <Img src={photo(c.photos[1])} />
        <span className="tape c tape-tc" />
      </figure>
      <figure className="sticker run-shot" data-reveal="drop">
        <img src={photo(c.photos[2])} alt="" loading="lazy" />
        <span className="tape g tape-tc" />
      </figure>
      <figure className="phone phone-sm run-phone" data-reveal="drop">
        <div className="phone-notch" />
        <img src={photo(c.photos[0])} alt="" loading="lazy" />
      </figure>
    </Section>
  );
}

export function Bridges() {
  const c = ch("bridges");
  return (
    <Section id={c.id} tone="night" className="bridges" laceUp>
      <Curtains>
        <VideoPlayer name={c.videos[1]} className="bridges-bg" controls={false} />
        <div className="bridges-scrim" />
        <div className="bridges-layout">
          <div className="bridges-text">
            <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
            <p className="lead lead-light" data-reveal="up">{c.paragraphs[0]}</p>
            <p className="hand handnote-big pink" data-reveal="up">{c.caption}</p>
            <div className="bridges-media">
              <figure className="pol" data-reveal="drop">
                <Img src={photo(c.photos[0])} />
                <span className="tape tape-tc" />
              </figure>
              <figure className="pol pol-tilt" data-reveal="drop">
                <Img src={photo(c.photos[1])} />
                <span className="tape g tape-tc" />
              </figure>
              <div className="bridges-video" data-reveal="drop">
                <VideoPlayer name={c.videos[0]} />
              </div>
            </div>
          </div>
          <div className="bridges-tracks" data-reveal="right">
            <TrackList tracks={c.tracks} side="A" label={c.title} tone="light" />
            <div className="bridges-note">
              <Arrow className="pink" d="M100 60C70 64 34 52 8 16" />
              <p className="hand pink">{c.tracksNote}</p>
            </div>
          </div>
        </div>
      </Curtains>
    </Section>
  );
}

export function October() {
  const c = ch("october");
  const half = Math.ceil(c.tracks.length / 2);
  return (
    <Section id={c.id} tone="burgundy" className="october">
      <div className="oct-left">
        <span className="caps october-kicker" data-reveal="up">
          глава {c.kicker} · без фотографий{tracksMeta(c.tracks.length)}
        </span>
        <div className="october-date" data-reveal="up">
          17<span>.</span>10
        </div>
        <div className="oct-story">
          <svg className="washer" width="64" height="72" viewBox="0 0 90 100" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="5" y="5" width="80" height="90" rx="8" /><path d="M5 26h80" /><circle cx="18" cy="15" r="3" /><circle cx="30" cy="15" r="3" />
            <rect x="56" y="11" width="20" height="8" rx="2" /><circle cx="45" cy="60" r="23" /><circle cx="45" cy="60" r="15" strokeDasharray="3 4" />
          </svg>
          <div>
            {c.paragraphs.map((p, i) => (
              <p key={i} className={i ? "body" : "lead"} data-reveal="up">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="oct-mid" data-reveal="fade">
        <div className="october-side-title">{c.title}</div>
        <WordHeart size={520} light />
      </div>
      <div className="oct-right">
        <div data-reveal="up">
          <TrackList tracks={c.tracks.slice(0, half)} side="A" label={c.title} tone="light" />
        </div>
        <div data-reveal="up">
          <TrackList tracks={c.tracks.slice(half)} side="A" label={c.title} tone="light" startAt={half + 1} />
        </div>
      </div>
    </Section>
  );
}

export function Dacha() {
  const c = ch("dacha");
  // порядок = клетки мозаики 4×4 из layout.css
  const tiles: { k?: string; v?: string }[] = [
    { k: c.photos[0] },
    { v: c.videos[0] },
    { k: c.photos[1] },
    { k: c.photos[2] },
    { k: c.photos[5] },
    { k: c.photos[3] },
    { k: c.photos[4] },
    { k: c.photos[6] },
    { v: c.videos[1] },
    { k: c.photos[7] },
  ];
  let ph = 0;
  let vi = 0;
  return (
    <Section id={c.id} tone="night" className="dacha">
      <Decor name="white-blossoms" className="dacha-blossoms" reveal="fade" />
      <article className="dacha-card paper-tex" data-reveal="up">
        <span className="tape c dacha-tape-a" />
        <ChapterHead kicker={c.kicker} title={c.title} meta={tracksMeta(c.tracks.length)} />
        {c.paragraphs.map((p, i) => (
          <p key={i} className={i ? "body" : "lead"}>
            {p}
          </p>
        ))}
        <TrackList tracks={c.tracks} side="B" label={c.title} bare />
      </article>
      <AutoScroll className="dacha-scroll">
        <div className="dacha-mosaic">
          {tiles.map((t, i) => (
            <div key={i} className="tile">
              {t.v ? <VideoPlayer name={t.v} /> : <Img src={photo(t.k!)} />}
              <span className="tile-label caps">{t.v ? `видео ${String(++vi).padStart(2, "0")}` : `фото ${String(++ph).padStart(2, "0")}`}</span>
            </div>
          ))}
        </div>
      </AutoScroll>
    </Section>
  );
}

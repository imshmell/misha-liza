import { CHAPTERS, type StoryChapter } from "@/lib/story";
import { photo } from "@/lib/media";
import { TrackList } from "@/components/TrackList";
import { VideoPlayer } from "@/components/VideoPlayer";
import { FilmReel } from "@/components/FilmReel";
import { Curtains } from "@/components/Curtains";
import { AutoScroll } from "@/components/AutoScroll";
import { ChapterHead, Img, Section, tracksMeta } from "./Section";

export const ch = (id: string): StoryChapter => CHAPTERS.find((c) => c.id === id)!;

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

  // сверху — текст, подпись и трек; снизу до конца экрана — плёнка
  return (
    <Section id={c.id} tone="night" className="kazan">
      <div className="kazan-top">
        <div className="kazan-text">
          <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
          <p className="lead lead-light" data-reveal="up">{c.paragraphs[0]}</p>
        </div>
        <div className="kazan-aside" data-reveal="up">
          <TrackList tracks={c.tracks} side="A" label={c.title} tone="light" bare />
          <p className="hand kazan-note">{c.caption}</p>
        </div>
      </div>
      <div className="kazan-reel" data-reveal="fade">
        <FilmReel items={frames} />
      </div>
    </Section>
  );
}

export function Run() {
  const c = ch("run");
  // фото с радугой (p14) убрано по просьбе заказчицы — три кадра крупно
  return (
    <Section id={c.id} tone="paper" className="run">
      <div className="run-media">
        <figure className="run-team" data-reveal="drop">
          <Img src={photo(c.photos[1])} />
        </figure>
        <figure className="run-shot" data-reveal="drop">
          <img src={photo(c.photos[2])} alt="" loading="lazy" />
        </figure>
        <figure className="run-story" data-reveal="drop">
          <img src={photo(c.photos[0])} alt="" loading="lazy" />
        </figure>
      </div>
      <div className="run-body">
        <ChapterHead kicker={c.kicker} title={c.title} meta={tracksMeta(c.tracks.length)} />
        {c.paragraphs.map((p, i) => (
          <p key={i} className={i ? "body" : "lead"} data-reveal="up">
            {p}
          </p>
        ))}
        <div className="run-tracks" data-reveal="up">
          <TrackList tracks={c.tracks} side="A" label={c.title} bare />
        </div>
      </div>
    </Section>
  );
}

export function Bridges() {
  const c = ch("bridges");
  // видео ночного развода — фоном, сразу со звуком (кнопка звука в углу)
  return (
    <Section id={c.id} tone="night" className="bridges">
      <Curtains>
        <div className="bridges-bg">
          <VideoPlayer name={c.videos[1]} controls="sound" sound />
        </div>
        <div className="bridges-scrim" />
        <div className="bridges-layout">
          <div className="bridges-text">
            <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
            <p className="lead lead-light" data-reveal="up">{c.paragraphs[0]}</p>
            <p className="hand bridges-caption" data-reveal="up">{c.caption}</p>
          </div>
          <div className="bridges-tracks" data-reveal="up">
            <TrackList tracks={c.tracks} side="A" label={c.title} tone="light" bare />
            <p className="hand bridges-note">{c.tracksNote}</p>
          </div>
          <div className="bridges-media" data-reveal="up">
            <figure className="bridges-ph bridges-ph-w">
              <Img src={photo(c.photos[0])} />
            </figure>
            <figure className="bridges-ph">
              <Img src={photo(c.photos[1])} />
            </figure>
            <div className="bridges-video">
              <VideoPlayer name={c.videos[0]} />
            </div>
          </div>
        </div>
      </Curtains>
    </Section>
  );
}

export function October() {
  const c = ch("october");
  return (
    <Section id={c.id} tone="burgundy" className="october">
      <div className="oct-left">
        <ChapterHead kicker={c.kicker} title={c.title} light meta={tracksMeta(c.tracks.length)} />
        <div className="october-date" data-reveal="up">
          17<span>.</span>10
        </div>
        {c.paragraphs.map((p, i) => (
          <p key={i} className={i ? "body" : "lead"} data-reveal="up">
            {p}
          </p>
        ))}
      </div>
      <div className="oct-tracks" data-reveal="up">
        <TrackList tracks={c.tracks} side="A" label={c.title} tone="light" bare />
      </div>
    </Section>
  );
}

export function Dacha() {
  const c = ch("dacha");
  // мозаика 2 колонки — фото крупнее; едет сама
  // w — горизонтальные кадры (на всю ширину ленты)
  const tiles: { k?: string; v?: string; w?: boolean }[] = [
    { k: c.photos[0] },
    { v: c.videos[0] },
    { k: c.photos[5], w: true },
    { k: c.photos[1] },
    { k: c.photos[2] },
    { k: c.photos[3] },
    { v: c.videos[1] },
    { k: c.photos[6], w: true },
    { k: c.photos[4] },
    { k: c.photos[7] },
  ];
  const half = 5;
  return (
    <Section id={c.id} tone="paper" className="dacha">
      <article className="dacha-card">
        <ChapterHead kicker={c.kicker} title={c.title} meta={tracksMeta(c.tracks.length)} />
        {c.paragraphs.map((p, i) => (
          <p key={i} className={i ? "body" : "lead"} data-reveal="up">
            {p}
          </p>
        ))}
        <div className="dacha-tracks" data-reveal="up">
          <TrackList tracks={c.tracks.slice(0, half)} side="B" label={c.title} bare />
          <TrackList tracks={c.tracks.slice(half)} side="B" label={c.title} bare startAt={half + 1} />
        </div>
      </article>
      <AutoScroll className="dacha-scroll" speed={55}>
        <div className="dacha-mosaic">
          {tiles.map((t, i) => (
            <div key={i} className={`tile ${t.w ? "tile-w" : ""}`}>
              {t.v ? <VideoPlayer name={t.v} /> : <Img src={photo(t.k!)} />}
            </div>
          ))}
        </div>
      </AutoScroll>
    </Section>
  );
}

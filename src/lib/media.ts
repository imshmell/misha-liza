import mediaMap from "./media-map.json";

const BASE = import.meta.env.BASE_URL;
const map = mediaMap as Record<string, { file: string }>;

function videoSlug(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/ /g, "_").replace(/[()]/g, "");
}

export function photo(key: string): string {
  const entry = map[key];
  const file = entry ? entry.file : key;
  return `${BASE}media/photos/${file}.webp`;
}

export function video(name: string): { src: string; poster: string } {
  const s = videoSlug(name);
  return { src: `${BASE}media/video/${s}.mp4`, poster: `${BASE}media/video/${s}.webp` };
}

export function audio(artist: string, title: string): string {
  const s = `${artist} - ${title}`.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${BASE}media/audio/${s}.mp3`;
}

// Звуки сообщений «как в Telegram». Если в public/media/audio/sfx/ лежат tg-in.mp3 / tg-out.mp3 —
// играют они; иначе синтезируем похожие в WebAudio (мягкий «дзынь» входящего, короткий «чпок» отправки).
// Браузер даёт звук только после жеста пользователя — у нас это нажатия стрелок/клики, к «Кружочкам» он уже есть.

let ctx: AudioContext | null = null;
const files: Record<string, HTMLAudioElement | null | undefined> = {};

function fileFor(kind: "in" | "out") {
  if (files[kind] !== undefined) return files[kind];
  const a = new Audio(`${import.meta.env.BASE_URL}media/audio/sfx/tg-${kind}.mp3`);
  a.preload = "auto";
  files[kind] = null; // пока не знаем, есть ли файл
  a.addEventListener("canplaythrough", () => (files[kind] = a), { once: true });
  a.load();
  return null;
}

function synth(kind: "in" | "out") {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.22;
  out.connect(ctx.destination);
  const tone = (f: number, at: number, dur: number, vol: number, type: OscillatorType = "sine", f2?: number) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t + at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + at + dur * 0.6);
    g.gain.setValueAtTime(0, t + at);
    g.gain.linearRampToValueAtTime(vol, t + at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + at + dur);
    o.connect(g).connect(out);
    o.start(t + at);
    o.stop(t + at + dur + 0.02);
  };
  if (kind === "in") {
    // входящее: два стеклянных тона вверх с обертоном
    tone(1046.5, 0, 0.32, 0.55);
    tone(2093, 0, 0.18, 0.12);
    tone(1396.9, 0.085, 0.42, 0.5);
    tone(2793.8, 0.085, 0.2, 0.1);
  } else {
    // отправка: короткий «чпок» со скольжением вверх
    tone(520, 0, 0.11, 0.6, "sine", 1180);
    tone(1500, 0.02, 0.06, 0.12, "triangle");
  }
}

export function playTg(kind: "in" | "out") {
  try {
    // есть ли настоящие файлы — проверяем при первом звуке (первый раз — синтез)
    fileFor("in");
    fileFor("out");
    const f = files[kind];
    if (f) {
      f.currentTime = 0;
      void f.play().catch(() => synth(kind));
    } else synth(kind);
  } catch {
    /* без звука */
  }
}

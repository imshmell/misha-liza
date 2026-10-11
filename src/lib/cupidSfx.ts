// Звуки мини-игры «Купидон» — не «бипы» осцилляторов, а физичные звуки:
// тетива — модель натянутой струны (Karplus–Strong), скрип натяжения — шум через узкий резонатор,
// свист стрелы — шум с плавающим фильтром и панорамой по полёту, попадание — глухой «тук» в цель + арфовый перебор.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const pluckCache = new Map<string, AudioBuffer>();

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.3; // общая громкость игры (было 0.9 — слишком громко)
    // лёгкий «зал» — короткая реверберация из затухающего шума
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    // компрессор на выходе — аккорд и арфа не «хрипят», тихие щипки слышнее
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master.connect(comp);
    master.connect(conv).connect(wet).connect(comp);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise() {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

// Karplus–Strong: шумовой импульс, прогнанный через линию задержки с усреднением = звук щипка струны
function pluckBuf(freq: number, dur: number, damp: number, bright: number) {
  const key = `${freq}|${dur}|${damp}|${bright}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const c = ac();
  const sr = c.sampleRate;
  const n = Math.floor(sr * dur);
  const buf = c.createBuffer(1, n, sr);
  const y = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp = lp + bright * ((Math.random() * 2 - 1) - lp); // мягче/ярче атака
    y[i] = lp;
  }
  for (let i = N; i < n; i++) y[i] = damp * 0.5 * (y[i - N] + y[i - N + 1]); // (i-N-1 при i=N даёт y[-1] = NaN — тишина)
  // нормализация: у модели струны громкость сильно зависит от высоты ноты — приводим пик к 1
  let peak = 0;
  for (let i = 0; i < Math.min(n, N * 8); i++) peak = Math.max(peak, Math.abs(y[i]));
  if (peak > 0) for (let i = 0; i < n; i++) y[i] /= peak;
  pluckCache.set(key, buf);
  return buf;
}

function pluck(freq: number, at = 0, vol = 0.5, dur = 1.6, damp = 0.996, bright = 0.6, pan = 0) {
  const c = ac();
  const s = c.createBufferSource();
  s.buffer = pluckBuf(freq, dur, damp, bright);
  const g = c.createGain();
  g.gain.value = vol;
  const p = c.createStereoPanner();
  p.pan.value = pan;
  s.connect(g).connect(p).connect(master!);
  s.start(c.currentTime + at);
}

// ---------- натяжение: скрип тетивы/дерева, тон растёт с силой ----------
let creak: { src: AudioBufferSourceNode; bp: BiquadFilterNode; g: GainNode; lfo: OscillatorNode } | null = null;

export function aimStart() {
  try {
    const c = ac();
    const src = noise();
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 18;
    bp.frequency.value = 380;
    const g = c.createGain();
    g.gain.value = 0;
    // «зубчатость» скрипа — амплитудная модуляция
    const lfo = c.createOscillator();
    lfo.frequency.value = 23;
    const lg = c.createGain();
    lg.gain.value = 0.5;
    const am = c.createGain();
    am.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain);
    src.connect(bp).connect(am).connect(g).connect(master!);
    src.start();
    lfo.start();
    creak = { src, bp, g, lfo };
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

export function aimUpdate(k: number, moving: boolean) {
  if (!creak || !ctx) return;
  const t = ctx.currentTime;
  creak.bp.frequency.setTargetAtTime(320 + k * 520, t, 0.05);
  creak.lfo.frequency.setTargetAtTime(14 + k * 30, t, 0.05);
  creak.g.gain.setTargetAtTime(moving ? 0.05 + k * 0.1 : 0.0, t, moving ? 0.03 : 0.12);
}

export function aimEnd() {
  if (!creak || !ctx) return;
  const t = ctx.currentTime;
  creak.g.gain.setTargetAtTime(0, t, 0.02);
  const { src, lfo } = creak;
  src.stop(t + 0.2);
  lfo.stop(t + 0.2);
  creak = null;
}

// ---------- выстрел: щелчок тетивы + низкий «тум» лука ----------
export function release(k: number) {
  try {
    const c = ac();
    const t = c.currentTime;
    pluck(98 + k * 30, 0, 0.32 + k * 0.22, 1.2, 0.985, 0.85, -0.5); // струна тетивы
    pluck(196 + k * 60, 0.002, 0.1, 0.6, 0.97, 0.9, -0.5);
    // древко/плечи лука — короткий глухой толчок
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + 0.18);
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

// ---------- полёт: свист, едет по панораме вместе со стрелой ----------
let whoosh: { src: AudioBufferSourceNode; bp: BiquadFilterNode; g: GainNode; p: StereoPannerNode } | null = null;

export function flightStart() {
  try {
    const c = ac();
    const src = noise();
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2.2;
    bp.frequency.value = 900;
    const g = c.createGain();
    g.gain.value = 0;
    const p = c.createStereoPanner();
    src.connect(bp).connect(g).connect(p).connect(master!);
    src.start();
    whoosh = { src, bp, g, p };
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

export function flightUpdate(xNorm: number, speed: number) {
  if (!whoosh || !ctx) return;
  const t = ctx.currentTime;
  whoosh.p.pan.setTargetAtTime(Math.max(-1, Math.min(1, xNorm * 2 - 1)), t, 0.03);
  whoosh.bp.frequency.setTargetAtTime(500 + Math.min(1, speed / 2400) * 2200, t, 0.04);
  whoosh.g.gain.setTargetAtTime(0.05 + Math.min(1, speed / 2400) * 0.22, t, 0.04);
}

export function flightEnd() {
  if (!whoosh || !ctx) return;
  const t = ctx.currentTime;
  whoosh.g.gain.setTargetAtTime(0, t, 0.06);
  whoosh.src.stop(t + 0.4);
  whoosh = null;
}

// ---------- попадание: «тук» в цель + арфовый перебор вверх ----------
export function hit() {
  try {
    const c = ac();
    const t = c.currentTime;
    // глухой удар: шум через низкочастотный фильтр + короткий низкий тон
    const src = noise();
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    src.connect(lp).connect(g).connect(master!);
    src.start(t);
    src.stop(t + 0.12);
    pluck(110, 0, 0.35, 0.5, 0.95, 0.4, 0.6);
    // арфа: D-мажорная пентатоника, щипки «разбегаются» по стерео
    const notes = [293.66, 369.99, 440, 554.37, 587.33, 739.99, 880, 1108.73, 1174.66];
    notes.forEach((f, i) => {
      pluck(f, 0.22 + i * 0.075, 0.42, 2.4, 0.9975, 0.55, -0.6 + (i / notes.length) * 1.2);
      pluck(f * 2, 0.22 + i * 0.075 + 0.004, 0.1, 1.2, 0.996, 0.8, -0.6 + (i / notes.length) * 1.2); // «колокольчик» октавой выше
    });
    // финальный аккорд
    [293.66, 587.33, 739.99, 880].forEach((f) => pluck(f, 0.22 + notes.length * 0.075 + 0.12, 0.34, 3, 0.998, 0.5, 0));
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

// ---------- промах: стрела улетает со свистом, грустная «пустая» струна ----------
export function miss() {
  try {
    pluck(146.83, 0.05, 0.6, 1.4, 0.993, 0.35, 0.4);
    pluck(138.59, 0.32, 0.52, 1.6, 0.993, 0.3, 0.4);
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

// ---------- бонус-сердечко лопнуло: короткий высокий щипок ----------
const POP = [1174.66, 1318.51, 1479.98, 1760];
let popI = 0;
export function pop() {
  try {
    pluck(POP[popI++ % POP.length], 0, 0.22, 0.7, 0.994, 0.75, 0.2);
  } catch (e) {
    console.warn("cupidSfx", e);
  }
}

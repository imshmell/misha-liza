import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import gsap from "gsap";

// 3D-конверт: бумага с толщиной, свет и тени, восковая печать трескается на две половинки,
// клапан изгибается как бумага, письмо (обычная вёрстка через CSS3D, та же камера) поднимается из кармана,
// камера наезжает с «конверт лежит на столе» в фронтальный вид — в финале письмо стоит ровно, текст чёткий.
// Слои: canvas «зад» (задняя стенка + открытый клапан) → письмо (DOM) → canvas «перед» (карман, закрытый клапан, печать).

const BACK = 1;
const FRONT = 2;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// сердце: x = 16 sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t
const heartPt = (t: number): [number, number] => [
  16 * Math.sin(t) ** 3,
  13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
];

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const redraw = () => {
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    tex.needsUpdate = true;
  };
  return { tex, redraw };
}

let noiseCanvas: HTMLCanvasElement | null = null;
function paperNoise(g: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = noiseCanvas.height = 256;
    const n = noiseCanvas.getContext("2d")!;
    const img = n.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    n.putImageData(img, 0, 0);
  }
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "overlay";
  g.fillStyle = g.createPattern(noiseCanvas, "repeat")!;
  g.fillRect(0, 0, w, h);
  g.restore();
}

function polka(g: CanvasRenderingContext2D, w: number, h: number, k: number) {
  g.fillStyle = "#F6E3DC";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#F3A9C0";
  const step = 18 * k;
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      g.beginPath();
      g.arc(x, y, 2.2 * k, 0, Math.PI * 2);
      g.fill();
    }
}

function heartPath(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  g.beginPath();
  for (let i = 0; i <= 64; i++) {
    const [x, y] = heartPt((i / 64) * Math.PI * 2);
    g.lineTo(cx + x * s, cy - y * s);
  }
  g.closePath();
}

// letter — превью письма внутри конверта; onOut — письмо вышло из кармана: дальше страница сама раскрывает полное письмо из этого прямоугольника
// letterSize — размер полного письма (px): письмо в конверте — то же письмо, уменьшенное (--k), с теми же пропорциями
type Props = {
  play: boolean;
  letter: ReactNode;
  to: string;
  from: string;
  sealLabel: string;
  onOut?: (rect: DOMRect) => void;
  letterSize?: [number, number];
  /** true — остановить отрисовку (rAF не крутится) */
  paused?: boolean;
};

export function Envelope3D({ play, letter, to, from, sealLabel, onOut, letterSize, paused = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [letterEl] = useState(() => document.createElement("div"));
  const [size, setSize] = useState<[number, number] | null>(null);
  const st = useRef({ seal: 0, flap: 0, rise: 0, cam: 0 }).current;
  const played = useRef(false);
  const onOutRef = useRef(onOut);
  onOutRef.current = onOut;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const kick = useRef<(() => void) | null>(null); // перезапуск цикла после паузы

  // размер сцены (пересборка при ресайзе — геометрия считается в пикселях)
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let t = 0;
    // тот же размер — не пересобирать сцену (первый вызов RO приходит с тем же размером)
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((p) => (p && p[0] === w && p[1] === h ? p : [w, h]));
    };
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(update, 120);
    });
    ro.observe(el);
    update();
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !size) return;
    const [vw, vh] = size;
    const k = Math.min(window.devicePixelRatio || 1, 2);

    // ---- геометрия (px) ----
    const W = Math.round(vw * 0.64);
    const Lw = Math.round(W * 0.9);
    const Lh = letterSize ? Math.round(Math.min(vh * 0.8, Lw * (letterSize[1] / letterSize[0]))) : Math.round(vh * 0.8);
    const H = Math.round(Lh / 0.9);
    const rise = Lh * 0.69; // насколько письмо выходит из кармана (низ письма остаётся у вершины выреза)
    const T = Lh * 0.575; // верх письма в финале (мир, y вверх от центра экрана)
    const letterTop0 = T - rise;
    const Et = letterTop0 + 0.04 * H;
    const cy = Et - H / 2; // центр конверта
    const fh = H * 0.42; // высота клапана
    const notch = H * 0.31; // глубина выреза кармана
    const R = Math.max(30, Math.min(66, W * 0.05)); // радиус печати
    const sc = W / 1230;

    // ---- рендеры ----
    const mk = (cls: string) => {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(k);
      r.setSize(vw, vh, false);
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.domElement.className = `env3d-gl ${cls}`;
      return r;
    };
    const glBack = mk("env3d-back");
    const glFront = mk("env3d-front");
    const css = new CSS3DRenderer();
    css.setSize(vw, vh);
    css.domElement.className = "env3d-css";
    el.append(glBack.domElement, css.domElement, glFront.domElement);

    const fov = 30;
    const z0 = vh / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const camera = new THREE.PerspectiveCamera(fov, vw / vh, 10, z0 * 4);
    const scene = new THREE.Scene();
    const env = new THREE.Group();
    env.position.set(0, cy, 0);
    scene.add(env);

    const disposables: { dispose(): void }[] = [];
    const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
    const aniso = glBack.capabilities.getMaxAnisotropy();
    const redraws: (() => void)[] = [];
    const tex = (w: number, h: number, draw: Parameters<typeof canvasTex>[2]) => {
      const t = canvasTex(Math.round(w * k), Math.round(h * k), draw);
      t.tex.anisotropy = aniso;
      keep(t.tex);
      redraws.push(t.redraw);
      return t.tex;
    };
    const paper = (map: THREE.Texture | null, color = "#ffffff", extra: THREE.MeshStandardMaterialParameters = {}) =>
      keep(new THREE.MeshStandardMaterial({ map, color, roughness: 0.86, metalness: 0, ...extra }));
    const edge = paper(null, "#4b0f16");

    // ---- свет ----
    const amb = new THREE.AmbientLight(0xfff4ee, 1.25);
    const sun = new THREE.DirectionalLight(0xfff1e6, 2.1);
    sun.position.set(-W * 0.45, cy + H * 1.1, z0 * 0.9);
    sun.target = env;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 6;
    const sc2 = sun.shadow.camera;
    sc2.left = -W * 0.8;
    sc2.right = W * 0.8;
    sc2.top = H * 1.4;
    sc2.bottom = -H * 1.4;
    sc2.near = 10;
    sc2.far = z0 * 3;
    const glint = new THREE.PointLight(0xffe2ea, 0.9, 0, 0);
    for (const l of [amb, sun, glint]) l.layers.enableAll();
    scene.add(amb, sun, glint);

    // ---- контактная тень под конвертом («лежит на столе») ----
    const shadowTex = tex(256, 256, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(10,0,2,.75)");
      r.addColorStop(0.55, "rgba(10,0,2,.45)");
      r.addColorStop(1, "rgba(10,0,2,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    });
    const drop = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(W * 1.25, H * 1.35)),
      keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
    );
    drop.position.set(W * 0.02, -H * 0.04, -8);
    drop.layers.set(BACK);
    env.add(drop);

    // ---- задняя стенка (изнанка в горошек видна, когда письмо выходит) ----
    const backTex = tex(W, H, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#4a0d14");
      gr.addColorStop(1, "#2a070d");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.save();
      g.beginPath();
      g.moveTo(w * 0.02, h * 0.02);
      g.lineTo(w * 0.98, h * 0.02);
      g.lineTo(w * 0.5, h * 0.5);
      g.closePath();
      g.clip();
      polka(g, w, h, k);
      const sh = g.createLinearGradient(0, 0, 0, h * 0.5);
      sh.addColorStop(0, "rgba(40,5,10,.35)");
      sh.addColorStop(1, "rgba(40,5,10,0)");
      g.fillStyle = sh;
      g.fillRect(0, 0, w, h);
      g.restore();
      paperNoise(g, w, h, 0.12);
    });
    const back = new THREE.Mesh(keep(new THREE.BoxGeometry(W, H, 2)), [edge, edge, edge, edge, paper(backTex), edge]);
    back.position.z = -3;
    back.receiveShadow = true;
    back.castShadow = true;
    back.layers.set(BACK);
    env.add(back);

    // ---- карман: экструзия с V-вырезом, бумажные клапаны, адрес, марка ----
    const pocketTex = tex(W, H, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w * 0.2, h);
      gr.addColorStop(0, "#8e2430");
      gr.addColorStop(1, "#5a1219");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // нижний клапан чуть светлее, боковые темнее
      g.fillStyle = "rgba(0,0,0,.10)";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w * 0.5, h * 0.5);
      g.lineTo(0, h);
      g.fill();
      g.beginPath();
      g.moveTo(w, 0);
      g.lineTo(w * 0.5, h * 0.5);
      g.lineTo(w, h);
      g.fill();
      const fold = (x1: number, y1: number, x2: number, y2: number) => {
        g.strokeStyle = "rgba(20,0,4,.35)";
        g.lineWidth = 2.2 * k;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.strokeStyle = "rgba(255,220,220,.08)";
        g.lineWidth = 1 * k;
        g.beginPath();
        g.moveTo(x1, y1 - 2 * k);
        g.lineTo(x2, y2 - 2 * k);
        g.stroke();
      };
      fold(0, h, w * 0.5, h * 0.42);
      fold(w, h, w * 0.5, h * 0.42);
      paperNoise(g, w, h, 0.16);
      // адрес
      const fs = 0.05 * w;
      g.save();
      g.translate(w * 0.06, h * 0.3); // видимая часть кармана — верхняя половина
      g.rotate(-0.05);
      g.fillStyle = "#F1E9D8";
      g.font = `${fs}px Caveat`;
      g.fillText(to, 0, 0);
      g.fillText(from, 0, fs * 1.05);
      g.restore();
      // марка с перфорацией + штемпель
      const sw = 124 * sc * k,
        shh = 150 * sc * k;
      g.save();
      g.translate(w * 0.89, h * 0.33);
      g.rotate(0.1);
      const st = document.createElement("canvas");
      st.width = sw;
      st.height = shh;
      const s = st.getContext("2d")!;
      s.fillStyle = "#FBF6EC";
      s.fillRect(0, 0, sw, shh);
      s.globalCompositeOperation = "destination-out";
      const pr = 6 * sc * k,
        ps = 18 * sc * k;
      for (let x = 0; x <= sw; x += ps) for (const y of [0, shh]) (s.beginPath(), s.arc(x, y, pr, 0, 7), s.fill());
      for (let y = 0; y <= shh; y += ps) for (const x of [0, sw]) (s.beginPath(), s.arc(x, y, pr, 0, 7), s.fill());
      s.globalCompositeOperation = "source-over";
      s.strokeStyle = "rgba(160,30,40,.35)";
      s.lineWidth = 1 * k;
      s.strokeRect(9 * sc * k, 9 * sc * k, sw - 18 * sc * k, shh - 18 * sc * k);
      s.fillStyle = "#C8102E";
      heartPath(s, sw / 2, shh / 2 + 3 * sc * k, 2.3 * sc * k);
      s.fill();
      g.shadowColor = "rgba(0,0,0,.35)";
      g.shadowBlur = 8 * k;
      g.shadowOffsetY = 3 * k;
      g.drawImage(st, -sw / 2, -shh / 2);
      g.restore();
      g.save();
      g.translate(w * 0.8, h * 0.27);
      g.strokeStyle = "rgba(25,4,8,.5)";
      g.lineWidth = 2.2 * k;
      g.beginPath();
      g.arc(0, 0, 62 * sc * k, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 50 * sc * k, 0, 7);
      g.stroke();
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        const y0 = (-24 + i * 16) * sc * k;
        for (let x = 0; x < 260 * sc * k; x += 2 * k) g.lineTo(-330 * sc * k + x, y0 + Math.sin(x / (12 * sc * k)) * 5 * sc * k);
        g.stroke();
      }
      g.font = `600 ${17 * sc * k}px "EB Garamond"`;
      g.fillStyle = "rgba(25,4,8,.55)";
      g.textAlign = "center";
      g.fillText("17.10", 0, -2 * sc * k);
      g.fillText("2025", 0, 17 * sc * k);
      g.restore();
    });
    pocketTex.repeat.set(1 / W, 1 / H);
    pocketTex.offset.set(0.5, 0.5);
    const pShape = new THREE.Shape();
    pShape.moveTo(-W / 2, -H / 2);
    pShape.lineTo(W / 2, -H / 2);
    pShape.lineTo(W / 2, H / 2);
    pShape.lineTo(0, H / 2 - notch);
    pShape.lineTo(-W / 2, H / 2);
    pShape.closePath();
    const pocket = new THREE.Mesh(
      keep(new THREE.ExtrudeGeometry(pShape, { depth: 2, bevelEnabled: false })),
      [paper(pocketTex), edge]
    );
    pocket.position.z = 2;
    pocket.receiveShadow = true;
    pocket.castShadow = true;
    pocket.layers.set(FRONT);
    env.add(pocket);

    // ---- клапан: сетка, гнётся как бумага (вершины считаются каждый кадр) ----
    const tri = (g: CanvasRenderingContext2D, w: number, h: number) => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(w / 2, h);
      g.closePath();
    };
    const flapFrontTex = tex(W, fh, (g, w, h) => {
      tri(g, w, h);
      g.save();
      g.clip();
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#a02c36");
      gr.addColorStop(1, "#6e171e");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      paperNoise(g, w, h, 0.16);
      g.restore();
      tri(g, w, h);
      g.strokeStyle = "rgba(30,0,6,.45)";
      g.lineWidth = 3 * k;
      g.stroke();
      g.save();
      g.translate(w / 2, h - (R * 2.05) * k);
      g.rotate(-0.1);
      g.fillStyle = "#F1E9D8";
      g.font = `${0.024 * w}px Caveat`;
      g.textAlign = "center";
      g.fillText(sealLabel, 0, 0);
      g.restore();
    });
    const flapBackTex = tex(W, fh, (g, w, h) => {
      tri(g, w, h);
      g.save();
      g.clip();
      polka(g, w, h, k);
      paperNoise(g, w, h, 0.1);
      g.restore();
    });
    const COLS = 36,
      ROWS = 28;
    const flapGeo = keep(new THREE.PlaneGeometry(W, fh, COLS, ROWS));
    const flapFront = new THREE.Mesh(flapGeo, paper(flapFrontTex, "#fff", { alphaTest: 0.5, side: THREE.FrontSide }));
    const flapBack = new THREE.Mesh(flapGeo, paper(flapBackTex, "#fff", { alphaTest: 0.5, side: THREE.BackSide }));
    const flap = new THREE.Group();
    flap.add(flapFront, flapBack);
    for (const m of [flapFront, flapBack]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.customDepthMaterial = keep(
        new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: flapFrontTex, alphaTest: 0.5 })
      );
    }
    env.add(flap);
    const fpos = flapGeo.attributes.position as THREE.BufferAttribute;
    const hingeZ = 4.6;
    const setFlap = (p: number) => {
      const theta = lerp(0, Math.PI * 1.04, p);
      const bend = Math.sin(p * Math.PI) * 0.95; // бумага прогибается в середине движения
      const twist = Math.sin(p * Math.PI) * 0.18;
      const ds = fh / ROWS;
      for (let i = 0; i <= COLS; i++) {
        const xn = i / COLS - 0.5;
        let y = H / 2,
          z = hingeZ;
        for (let j = 0; j <= ROWS; j++) {
          if (j > 0) {
            const phi = theta + bend * (j / ROWS) + twist * xn * (j / ROWS);
            y -= ds * Math.cos(phi);
            z += ds * Math.sin(phi);
          }
          fpos.setXYZ(j * (COLS + 1) + i, xn * W, y, z);
        }
      }
      fpos.needsUpdate = true;
      flapGeo.computeVertexNormals();
      flapGeo.computeBoundingSphere();
      const layer = theta > Math.PI / 2 ? BACK : FRONT;
      flapFront.layers.set(layer);
      flapBack.layers.set(layer);
    };

    // ---- восковая печать: две половинки по неровной трещине + выпуклое сердце ----
    const wax = keep(
      new THREE.MeshPhysicalMaterial({ color: "#ea8ca5", roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.3, transparent: true })
    );
    const waxHeart = keep(
      new THREE.MeshPhysicalMaterial({ color: "#d4688a", roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.2, transparent: true })
    );
    const rOf = (a: number) => R * (1 + 0.055 * Math.sin(13 * a + 0.7) + 0.03 * Math.sin(5 * a));
    const crackJit = [0, 0.1, -0.08, 0.13, -0.06, 0.09, -0.03, 0];
    const crack: [number, number][] = crackJit.map((jx, i, arr) => {
      const y = lerp(rOf(Math.PI / 2), -rOf(-Math.PI / 2), i / (arr.length - 1));
      return [jx * R, y];
    });
    const sealGroup = new THREE.Group();
    sealGroup.position.set(0, H / 2 - fh + R * 0.62, hingeZ + 3.4);
    const halves = [1, -1].map((side) => {
      const s = new THREE.Shape();
      crack.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
      for (let i = 1; i < 40; i++) {
        const a = -Math.PI / 2 + side * (i / 40) * Math.PI;
        s.lineTo(rOf(a) * Math.cos(a), rOf(a) * Math.sin(a));
      }
      s.closePath();
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        keep(new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelThickness: 3.2, bevelSize: 3, bevelSegments: 5, curveSegments: 4 })),
        wax
      );
      const hs = new THREE.Shape();
      const hk = (R * 0.52) / 17;
      for (let i = 0; i <= 30; i++) {
        const [x, y] = heartPt((i / 30) * Math.PI);
        const px = side * x * hk,
          py = (y + 2.5) * hk;
        i ? hs.lineTo(px, py) : hs.moveTo(px, py);
      }
      hs.closePath();
      const heart = new THREE.Mesh(
        keep(new THREE.ExtrudeGeometry(hs, { depth: 1.5, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.2, bevelSegments: 4 })),
        waxHeart
      );
      heart.position.z = 7;
      g.add(body, heart);
      g.traverse((o) => {
        o.castShadow = true;
        o.layers.set(FRONT);
      });
      sealGroup.add(g);
      return { g, side };
    });
    env.add(sealGroup);

    // ---- письмо (DOM через CSS3D) ----
    letterEl.className = "env-letter";
    letterEl.style.width = `${Lw}px`;
    letterEl.style.height = `${Lh}px`;
    if (letterSize) letterEl.style.setProperty("--k", String(Lw / letterSize[0]));
    const letterObj = new CSS3DObject(letterEl);
    const letterY0 = Et - cy - 0.04 * H - Lh / 2;
    env.add(letterObj);

    // ---- камера: «лежит на столе» → фронтально ----
    const camFrom = new THREE.Vector3(0, cy - H * 0.06, z0 * 1.16);
    const lookFrom = new THREE.Vector3(0, cy, 0);
    const camTo = new THREE.Vector3(0, 0, z0);
    const lookTo = new THREE.Vector3(0, 0, 0);
    const look = new THREE.Vector3();

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const clock = new THREE.Clock();
    let lastFlap = -1;
    const frame = () => {
      const t = clock.getElapsedTime();
      mouse.sx += (mouse.x - mouse.sx) * 0.06;
      mouse.sy += (mouse.y - mouse.sy) * 0.06;
      const c = smooth(0, 1, st.cam);
      const free = 1 - c;

      env.rotation.set(
        lerp(-0.52, 0, c) + mouse.sy * 0.05 * free,
        mouse.sx * 0.07 * free,
        lerp(0.03, 0, c)
      );
      env.position.y = cy + Math.sin(t * 1.1) * 3 * free;
      camera.position.lerpVectors(camFrom, camTo, c);
      look.lerpVectors(lookFrom, lookTo, c);
      camera.lookAt(look);
      glint.position.set(mouse.sx * W * 0.5, cy - mouse.sy * H * 0.6, z0 * 0.35);

      if (st.flap !== lastFlap) {
        setFlap(st.flap);
        lastFlap = st.flap;
      }

      // печать: вздрагивает → трескается, половинки падают и тают
      const s = st.seal;
      const pop = smooth(0, 0.3, s) * (1 - smooth(0.3, 0.45, s));
      sealGroup.scale.setScalar(1 + 0.14 * pop);
      const fly = smooth(0.35, 1, s) ** 1.6;
      for (const { g, side } of halves) {
        g.position.set(side * (R * 0.08 * smooth(0.3, 0.4, s) + R * 0.7 * fly), -R * 2.2 * fly, 50 * fly);
        g.rotation.set(0.6 * fly, side * 0.9 * fly, side * -0.7 * fly);
      }
      wax.opacity = waxHeart.opacity = 1 - smooth(0.55, 1, s);
      sealGroup.visible = s < 1;

      letterObj.position.set(0, letterY0 + rise * st.rise, 0);

      camera.layers.set(BACK);
      glBack.render(scene, camera);
      camera.layers.set(FRONT);
      glFront.render(scene, camera);
      camera.layers.enableAll();
      css.render(scene, camera);
    };

    let raf = 0;
    let visible = false;
    const loop = () => {
      frame();
      raf = visible && !pausedRef.current ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (visible && !raf && !pausedRef.current) raf = requestAnimationFrame(loop);
    };
    kick.current = start;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(el);
    if (!pausedRef.current) frame();

    // шрифты в текстурах (адрес, «Lover», штемпель) — перерисовать, когда загрузятся
    let alive = true;
    Promise.all(["40px Caveat", '600 20px "EB Garamond"'].map((f) => document.fonts.load(f))).then(() => {
      if (!alive) return;
      redraws.forEach((r) => r());
      if (!pausedRef.current) frame();
    });

    return () => {
      alive = false;
      kick.current = null;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      env.remove(letterObj);
      disposables.forEach((d) => d.dispose());
      glBack.dispose();
      glFront.dispose();
      glBack.forceContextLoss();
      glFront.forceContextLoss();
      glBack.domElement.remove();
      glFront.domElement.remove();
      css.domElement.remove();
    };
  }, [size, letterEl, st, to, from, sealLabel, letterSize]);

  // сняли с паузы — цикл снова крутится (на паузе loop сам не перезапускает rAF)
  useEffect(() => {
    if (!paused) kick.current?.();
  }, [paused]);

  // анимация вскрытия — один раз; состояние в st переживает пересборку сцены
  useEffect(() => {
    if (!play || played.current) return;
    played.current = true;
    gsap
      .timeline({ delay: 1 })
      .to(st, { seal: 1, duration: 1.7, ease: "none" })
      .to(st, { flap: 1, duration: 2.3, ease: "power2.inOut" }, 1.2)
      .to(st, { cam: 1, duration: 4.4, ease: "power2.inOut" }, 2.8)
      .to(st, { rise: 1, duration: 3.8, ease: "power3.out" }, 3.2)
      .call(() => onOutRef.current?.(letterEl.getBoundingClientRect()), undefined, 6.2);
  }, [play, st, letterEl]);

  return (
    <div className="env3d" ref={host}>
      {createPortal(letter, letterEl)}
    </div>
  );
}

export default Envelope3D;

import { isMobile } from "@/lib/mobile";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import gsap from "gsap";

// 3D-кулисы: две сетки ткани, форму считает вершинный шейдер (сборка к подхвату, складки, волна, сквозняк),
// фрагментный — бархат (тени складок + светлый отлив на гребнях) и золотая бахрома.

const VERT = /* glsl */ `
uniform float uOpen;   // 0 закрыто → 1 открыто
uniform float uWave;   // волна во время движения
uniform float uTime;
uniform float uSide;   // 1 левая, -1 правая
uniform vec2  uSize;   // размер сцены в px
varying vec2  vUv;
varying vec3  vN;
varying float vDepth;

const float PI = 3.14159265;
const float FOLDS = 9.0;

float gatherProfile(float v) {
  // ширина открытой шторы (доля полуширины): узко у подхвата (55%), шире к карнизу и к полу
  float tie = 0.45;
  float t = v > tie ? (v - tie) / (1.0 - tie) : (tie - v) / tie;
  float top = mix(0.12, 0.33, smoothstep(0.0, 1.0, t));
  float bot = mix(0.12, 0.26, smoothstep(0.0, 1.0, t));
  return v > tie ? top : bot;
}

void main() {
  vUv = uv;
  float u = uv.x;            // 0 внешний край → 1 внутренний
  float v = uv.y;            // 0 низ → 1 верх
  float hw = uSize.x * 0.52;

  // верх едет по карнизу раньше низа
  float o = clamp(uOpen - (1.0 - v) * 0.22 * sin(clamp(uOpen, 0.0, 1.0) * PI), 0.0, 1.06);
  float frac = mix(1.0, gatherProfile(v), o);

  float amp = mix(7.0, 24.0, clamp(o, 0.0, 1.0));
  float ph = u * FOLDS * 2.0 * PI;
  float z = sin(ph) * amp * (0.35 + 0.65 * u);

  // волна по полотну во время движения + лёгкий сквозняк всегда
  float wave = sin(v * 7.0 - uTime * 4.2 + u * 3.0) * uWave;
  float breeze = sin(uTime * 1.3 + v * 5.0 + u * 2.0) * (0.6 + 0.4 * u);
  float x = u * frac * hw + wave * 14.0 * u + breeze * 2.2;
  z += wave * 10.0 + sin(uTime * 1.1 + v * 4.0) * 2.5;

  float X = uSide > 0.0 ? x : uSize.x - x;
  float Y = v * uSize.y;

  // нормаль из наклона складок (dz/dx)
  float dzdu = cos(ph) * FOLDS * 2.0 * PI * amp * (0.35 + 0.65 * u);
  float slope = dzdu / max(frac * hw, 1.0);
  vN = normalize(vec3(-slope * uSide, wave * 0.35, 1.0));
  vDepth = sin(ph);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(X, Y, z, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2  vUv;
varying vec3  vN;
varying float vDepth;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float rim = pow(1.0 - clamp(N.z, 0.0, 1.0), 1.4);          // бархатный отлив на гранях складок

  vec3 deep  = vec3(0.16, 0.015, 0.03);
  vec3 base  = vec3(0.47, 0.06, 0.10);
  vec3 sheen = vec3(0.95, 0.42, 0.48);
  vec3 col = mix(deep, base, 0.25 + 0.75 * diff);
  col += sheen * rim * 0.55;
  col *= 0.78 + 0.22 * smoothstep(-1.0, 1.0, vDepth);           // впадины складок темнее

  // затемнение к полу и к карнизу, лёгкий ворс
  col *= mix(0.55, 1.0, smoothstep(0.0, 0.35, vUv.y)) * mix(0.7, 1.0, smoothstep(1.0, 0.82, vUv.y));
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.025;

  // золотая бахрома
  if (vUv.y < 0.03) {
    float stripe = step(0.5, fract(vUv.x * 160.0));
    col = mix(vec3(0.43, 0.32, 0.12), vec3(0.88, 0.72, 0.38), stripe) * (0.7 + 0.3 * diff);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Curtains({ children, delay = 0.9 }: { children: ReactNode; delay?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const holders = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || isMobile()) return; // на телефоне без кулис (WebGL тяжёлый, глава длиннее экрана)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "curtain-gl";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -200, 200);
    const geo = new THREE.PlaneGeometry(1, 1, 160, 80);
    const uniforms = {
      uOpen: { value: 0 },
      uWave: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: new THREE.Vector2(1, 1) },
    };
    const make = (side: number) =>
      new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: { ...uniforms, uSide: { value: side } },
          side: THREE.DoubleSide,
        })
      );
    const left = make(1);
    const right = make(-1);
    // все шейдеры смотрят в одни и те же объекты uniforms (кроме uSide)
    scene.add(left, right);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.right = w;
      camera.top = h;
      camera.updateProjectionMatrix();
      uniforms.uSize.value.set(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let visible = false;
    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };

    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
        if (entry.intersectionRatio >= 0.6 && !started) {
          started = true;
          gsap
            .timeline({ delay })
            .to(uniforms.uWave, { value: 1, duration: 1.1, ease: "sine.in" })
            .to(uniforms.uOpen, { value: 0.92, duration: 2.6, ease: "power2.inOut" }, 0.2)
            .to(uniforms.uOpen, { value: 1, duration: 1.6, ease: "elastic.out(1, 0.45)" })
            .to(uniforms.uWave, { value: 0, duration: 2, ease: "power2.out" }, 1.8)
            .to(holders.current?.children ?? [], { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, 2.6);
        }
      },
      { threshold: [0, 0.6] }
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      geo.dispose();
      (left.material as THREE.Material).dispose();
      (right.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [delay]);

  return (
    <div className="curtain-stage" ref={stage}>
      <div className="curtain-content">{children}</div>
      <div ref={holders}>
        <span className="curtain-holder curtain-holder-l" />
        <span className="curtain-holder curtain-holder-r" />
      </div>
      <div className="curtain-valance" />
    </div>
  );
}

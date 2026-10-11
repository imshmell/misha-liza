"""Генерирует бесшовный SVG-узор «гильош» (переплетённые синусоиды, как на банкнотах/билетах)
→ public/textures/guilloche.svg. Запуск: python scripts/make-guilloche.py"""
import math
from pathlib import Path

W, H = 480, 240          # плитка; длины волн делят W нацело → бесшовно по горизонтали
OUT = Path(__file__).resolve().parent.parent / "public" / "textures" / "guilloche.svg"


def wave(cy, amp, wl, phase, amp2=0.0, wl2=1.0):
    pts = []
    for i in range(0, W + 1, 4):
        x = i
        y = cy + amp * math.sin(2 * math.pi * x / wl + phase) + amp2 * math.sin(2 * math.pi * x / wl2 + phase * 2)
        pts.append(f"{x:.1f},{y:.2f}")
    return "M" + " L".join(pts)


paths = []
# две ленты на плитку (сверху и снизу), каждая — пучок сдвинутых по фазе волн
for cy, color in ((60, "#C9A35A"), (180, "#C9A35A")):
    for k in range(14):
        ph = k * math.pi / 7
        paths.append((wave(cy, 34, 240, ph, 6, 80), color, 0.55))
    for k in range(10):
        ph = k * math.pi / 5 + 0.3
        paths.append((wave(cy, 18, 120, ph, 3, 60), color, 0.4))
# тонкие разделительные волны между лентами (на стыке плиток — бесшовно)
for cy in (0, 120, 240):
    for k in range(4):
        paths.append((wave(cy, 6, 60, k * math.pi / 2), "#C9A35A", 0.35))

body = "\n".join(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}"/>' for d, c, w in paths)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n{body}\n</svg>\n'
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(svg, encoding="utf-8")
print(OUT, len(svg) // 1024, "KB")

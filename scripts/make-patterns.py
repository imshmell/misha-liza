"""Генерирует SVG-фоны глав (одна «гильош»-семья, у каждой главы свой мотив) → public/textures/pat-*.svg.
Цвет линий задаётся тут (C — кремовый для тёмных глав, W — винный для бумажных); яркость — opacity в layout.css."""
import math, random
random.seed(17)
C, W = "#F1E9D8", "#551515"
OUT = "public/textures/"

def svg(name, w, h, body, stroke, sw=1.2):
    open(OUT + f"pat-{name}.svg", "w", encoding="utf-8").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

def poly(pts, close=True):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<path d="{d}{" Z" if close else ""}"/>'

def heart(cx, cy, s, n=90):
    return [(cx + 16 * math.sin(t) ** 3 * s, cy - (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) * s)
            for t in (i / n * 2 * math.pi for i in range(n))]

def small_heart(cx, cy, s, fill=None):
    p = poly(heart(cx, cy, s, 40))
    return p.replace("<path", f'<path fill="{fill}"') if fill else p

# 1. Вступление — нотный стан с нотами (бумага)
b = ""
for row in range(2):
    y0 = 40 + row * 150
    for k in range(5):
        y = y0 + k * 10
        b += f'<path d="M0 {y} H560"/>'
    for i in range(7):
        x = 30 + i * 78 + random.uniform(-8, 8)
        y = y0 + random.choice([5, 10, 15, 20, 25, 30])
        b += f'<ellipse cx="{x:.0f}" cy="{y}" rx="6" ry="4.4" transform="rotate(-20 {x:.0f} {y})" fill="{W}"/><path d="M{x+5.6:.0f} {y-1} V{y-32}"/>'
        if i % 3 == 0:
            b += f'<path d="M{x+5.6:.0f} {y-32} q10 6 8 18"/>'
svg("notes", 560, 300, b, W, 1)

# 2. Бег — топографические горизонтали (как карта пробежки)
b = ""
for cx, cy, n in [(260, 300, 11), (900, 760, 13), (1100, 180, 8), (300, 1000, 9)]:
    ph = [random.uniform(0, 6.28) for _ in range(4)]
    for k in range(1, n + 1):
        r = k * 26
        pts = []
        for i in range(160):
            a = i / 160 * 2 * math.pi
            rr = r * (1 + 0.16 * math.sin(3 * a + ph[0]) + 0.09 * math.sin(5 * a + ph[1] + k * 0.15) + 0.05 * math.sin(2 * a + ph[2]))
            pts.append((cx + rr * math.cos(a) * 1.25, cy + rr * math.sin(a)))
        b += poly(pts)
svg("topo", 1300, 1200, b, W, 1.1)

# 3. 17 октября — сердце-гильош: концентрические сердца от центра
b = ""
for k in range(1, 26):
    s = k * 1.55
    pts = [(x + 0.6 * math.sin(i * 0.9 + k) , y) for i, (x, y) in enumerate(heart(800, 470, s, 220))]
    b += poly(pts)
svg("hearts", 1600, 1000, b, C, 1)

# 4. Дача — снежинки
def flake(cx, cy, r):
    o = ""
    for i in range(6):
        a = i * math.pi / 3
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        o += f'<path d="M{cx:.1f} {cy:.1f} L{x:.1f} {y:.1f}"/>'
        for f in (0.5, 0.75):
            bx, by = cx + r * f * math.cos(a), cy + r * f * math.sin(a)
            for d in (-0.6, 0.6):
                o += f'<path d="M{bx:.1f} {by:.1f} l{r*0.25*math.cos(a+d):.1f} {r*0.25*math.sin(a+d):.1f}"/>'
    return o
b = ""
for _ in range(14):
    b += flake(random.uniform(20, 380), random.uniform(20, 380), random.uniform(6, 15))
for _ in range(30):
    b += f'<circle cx="{random.uniform(0,400):.0f}" cy="{random.uniform(0,400):.0f}" r="1.3" fill="{C}" stroke="none"/>'
svg("snow", 400, 400, b, C, 1)

# 5. Конверт — почтовые штемпели: волны гашения + круглые штемпели
b = ""
for k in range(6):
    y = 30 + k * 14
    pts = [(x, y + 6 * math.sin(x / 18)) for x in range(0, 461, 4)]
    b += poly(pts, False)
for cx, cy in [(90, 180), (330, 190)]:
    b += f'<circle cx="{cx}" cy="{cy}" r="38"/><circle cx="{cx}" cy="{cy}" r="29"/>' + small_heart(cx, cy + 2, 0.7)
svg("postal", 460, 250, b, C, 1.1)

# 6. Кружочки — круги-волны (как от кружочка в чате)
b = ""
for cx, cy, n in [(300, 520, 22), (1250, 150, 12)]:
    for k in range(1, n + 1):
        b += f'<circle cx="{cx}" cy="{cy}" r="{k*30}"/>'
svg("rings", 1600, 1000, b, C, 1)

# 7. Скрапбук — дудлы: сердечки, звёздочки, спирали
b = ""
for _ in range(10):
    x, y = random.uniform(20, 340), random.uniform(20, 340)
    kind = random.choice("hsl")
    if kind == "h":
        b += small_heart(x, y, random.uniform(0.5, 0.9))
    elif kind == "s":
        r = random.uniform(6, 10)
        b += poly([(x + (r if i % 2 == 0 else r * 0.4) * math.cos(i * math.pi / 5 - math.pi / 2), y + (r if i % 2 == 0 else r * 0.4) * math.sin(i * math.pi / 5 - math.pi / 2)) for i in range(10)])
    else:
        b += poly([(x + t * 0.9 * math.cos(t * 0.5), y + t * 0.9 * math.sin(t * 0.5)) for t in range(0, 26)], False)
svg("doodles", 360, 360, b, W, 1.2)

# 8. Этот год — дамаск-медальоны
def medallion(cx, cy, s):
    o = poly([(cx + s * 34 * math.sin(t) * (1 + 0.25 * math.cos(4 * t)), cy - s * 46 * math.cos(t) * (1 + 0.12 * math.cos(6 * t))) for t in (i / 120 * 2 * math.pi for i in range(120))])
    o += small_heart(cx, cy + 4 * s, 1.2 * s)
    for d in (-1, 1):
        o += f'<path d="M{cx} {cy-46*s} c{d*14*s} {-10*s} {d*22*s} {4*s} {d*12*s} {14*s}"/>'
        o += f'<path d="M{cx} {cy+46*s} c{d*14*s} {10*s} {d*22*s} {-4*s} {d*12*s} {-14*s}"/>'
    return o
b = medallion(80, 90, 1) + medallion(240, 270, 1) + medallion(240, -90, 1) + medallion(-80, 270, 1) + medallion(400, 90, 1)
svg("damask", 320, 360, b, W, 1.1)

# 9. Финал — звёздное небо
b = ""
for _ in range(26):
    x, y, r = random.uniform(0, 420), random.uniform(0, 420), random.uniform(2.5, 6)
    b += f'<path d="M{x:.0f} {y-r:.0f} Q{x:.0f} {y:.0f} {x+r:.0f} {y:.0f} Q{x:.0f} {y:.0f} {x:.0f} {y+r:.0f} Q{x:.0f} {y:.0f} {x-r:.0f} {y:.0f} Q{x:.0f} {y:.0f} {x:.0f} {y-r:.0f}Z" fill="{C}" stroke="none"/>'
for _ in range(50):
    b += f'<circle cx="{random.uniform(0,420):.0f}" cy="{random.uniform(0,420):.0f}" r="{random.uniform(.6,1.4):.1f}" fill="{C}" stroke="none"/>'
svg("stars", 420, 420, b, C, 1)

# 10. P.S. — детский принт: сердечки и горошек
b = ""
for j in range(4):
    for i in range(4):
        x, y = i * 70 + (35 if j % 2 else 0) + 10, j * 70 + 20
        b += small_heart(x, y, 0.55) if (i + j) % 2 == 0 else f'<circle cx="{x}" cy="{y}" r="3" fill="{W}" stroke="none"/>'
svg("baby", 280, 280, b, W, 1.1)
print("ok")

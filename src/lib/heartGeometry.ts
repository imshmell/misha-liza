// Параметрическое сердце — общая математика для каллиграммы и кружевной рамки.

export function heartPoint(t: number): { x: number; y: number } {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
}

export function heartPath(scale: number, cx: number, cy: number, steps = 64): string {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const { x, y } = heartPoint(t);
    const px = cx + (x / 17) * scale;
    const py = cy + (y / 17) * scale;
    d += `${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)} `;
  }
  return d + "Z";
}

export function heartRingPoints(count: number, scale: number, cx: number, cy: number) {
  return Array.from({ length: count }).map((_, i) => {
    const t = (i / count) * Math.PI * 2;
    const { x, y } = heartPoint(t);
    return { x: cx + (x / 17) * scale, y: cy + (y / 17) * scale };
  });
}

export function normaliseMask(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter(
      (point) =>
        point &&
        Number.isFinite(Number(point.x)) &&
        Number.isFinite(Number(point.y))
    )
    .map((point) => ({
      x: Math.max(0, Math.min(100, Number(point.x))),
      y: Math.max(0, Math.min(100, Number(point.y)))
    }));
}

export function maskClipPath(points) {
  const clean = normaliseMask(points);
  if (clean.length < 3) return '';
  return `polygon(${clean.map((point) => `${point.x.toFixed(3)}% ${point.y.toFixed(3)}%`).join(', ')})`;
}

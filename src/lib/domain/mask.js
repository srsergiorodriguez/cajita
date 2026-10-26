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

function clampPoint(point) {
  return { x: Math.max(0, Math.min(100, point.x)), y: Math.max(0, Math.min(100, point.y)) };
}

/**
 * Sample a closed Catmull-Rom spline through the mask points. The curve is
 * flattened into a polygon for clip-path, so exports remain portable without
 * SVG clip paths or browser-specific path units.
 */
export function sampleMask(points, { curve = false, steps = 8 } = {}) {
  const clean = normaliseMask(points);
  if (!curve || clean.length < 3) return clean;
  const result = [];
  const count = clean.length;
  for (let index = 0; index < count; index += 1) {
    const p0 = clean[(index - 1 + count) % count];
    const p1 = clean[index];
    const p2 = clean[(index + 1) % count];
    const p3 = clean[(index + 2) % count];
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      result.push(
        clampPoint({
          x:
            0.5 *
            (2 * p1.x +
              (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y:
            0.5 *
            (2 * p1.y +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        })
      );
    }
  }
  return result;
}

export function maskClipPath(points, curve = false) {
  const clean = sampleMask(points, { curve });
  if (clean.length < 3) return '';
  return `polygon(${clean.map((point) => `${point.x.toFixed(3)}% ${point.y.toFixed(3)}%`).join(', ')})`;
}

function projectOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (!length) return { x: start.x, y: start.y, distance: Math.hypot(point.x - start.x, point.y - start.y) };
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length)
  );
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return { x, y, distance: Math.hypot(point.x - x, point.y - y) };
}

/**
 * Find the closest closed-polygon segment and the projected insertion point.
 * `threshold` is expressed in the same percentage units as the points.
 */
export function closestMaskSegment(points, point, threshold = Infinity) {
  const clean = normaliseMask(points);
  if (clean.length < 2) return null;
  let best = null;
  for (let index = 0; index < clean.length; index += 1) {
    const projected = projectOnSegment(
      point,
      clean[index],
      clean[(index + 1) % clean.length]
    );
    if (projected.distance > threshold) continue;
    if (!best || projected.distance < best.distance) {
      best = { ...projected, index };
    }
  }
  return best;
}

/**
 * Find the closest editable segment, following the flattened curve when
 * smoothing is enabled, and return the original segment index.
 */
export function closestMaskOutline(points, point, threshold = Infinity, curve = false) {
  if (!curve) return closestMaskSegment(points, point, threshold);
  const clean = normaliseMask(points);
  if (clean.length < 3) return closestMaskSegment(clean, point, threshold);
  const steps = 12;
  const sampled = sampleMask(clean, { curve: true, steps });
  let best = null;
  for (let index = 0; index < sampled.length; index += 1) {
    const projected = projectOnSegment(
      point,
      sampled[index],
      sampled[(index + 1) % sampled.length]
    );
    if (projected.distance <= threshold && (!best || projected.distance < best.distance)) {
      best = {
        ...projected,
        index: Math.floor(index / steps),
        sampleIndex: index
      };
    }
  }
  return best;
}

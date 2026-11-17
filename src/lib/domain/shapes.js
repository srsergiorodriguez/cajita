export const SHAPES = Object.freeze([
  { id: 'circle', label: 'círculo' },
  { id: 'square', label: 'cuadrado' },
  { id: 'triangle', label: 'triángulo' }
]);

export function isShape(value) {
  return SHAPES.some((shape) => shape.id === value);
}

export function shapeLabel(value, locale = 'es') {
  const labels = {
    es: { circle: 'Círculo', square: 'Cuadrado', triangle: 'Triángulo' },
    en: { circle: 'Circle', square: 'Square', triangle: 'Triangle' }
  };
  return (labels[locale] ?? labels.es)[value] ?? labels[locale]?.circle ?? 'Shape';
}

export function shapeRadius(value) {
  return Math.max(0, Math.min(50, Number(value) || 0));
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function unit(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
}

/** Build a closed path with quadratic-rounded corners. */
function roundedPolygon(points, radius) {
  const corners = points.map((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const incoming = unit(current, previous);
    const outgoing = unit(current, next);
    const amount = Math.min(
      radius,
      distance(current, previous) / 2,
      distance(current, next) / 2
    );
    return {
      current,
      entry: [current[0] + incoming[0] * amount, current[1] + incoming[1] * amount],
      exit: [current[0] + outgoing[0] * amount, current[1] + outgoing[1] * amount]
    };
  });
  const parts = [`M ${corners[0].exit[0]} ${corners[0].exit[1]}`];
  for (let index = 1; index < corners.length; index += 1) {
    parts.push(`L ${corners[index].entry[0]} ${corners[index].entry[1]}`);
    parts.push(
      `Q ${corners[index].current[0]} ${corners[index].current[1]} ${corners[index].exit[0]} ${corners[index].exit[1]}`
    );
  }
  parts.push(`L ${corners[0].entry[0]} ${corners[0].entry[1]}`);
  parts.push(
    `Q ${corners[0].current[0]} ${corners[0].current[1]} ${corners[0].exit[0]} ${corners[0].exit[1]}`
  );
  parts.push('Z');
  return parts.join(' ');
}

export function shapeMarkup(element) {
  const shape = isShape(element.shape) ? element.shape : 'circle';
  const radius = shapeRadius(element.radius);
  const stroke =
    Number(element.strokeWidth) > 0 && element.stroke ? element.stroke : 'none';
  const strokeWidth = Number(element.strokeWidth) > 0 ? Number(element.strokeWidth) : 0;
  const common = `fill="${element.fill}" stroke="${stroke}"${strokeWidth ? ` stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ''}`;
  if (shape === 'square') {
    return `<rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" ${common} />`;
  }
  if (shape === 'triangle') {
    if (radius <= 0) {
      return `<polygon points="50,0 100,100 0,100" ${common} />`;
    }
    return `<path d="${roundedPolygon([[50, 0], [100, 100], [0, 100]], radius)}" ${common} />`;
  }
  return `<circle cx="50" cy="50" r="50" ${common} />`;
}

export function shapeSvg(element) {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Forma" focusable="false">${shapeMarkup(element)}</svg>`;
}

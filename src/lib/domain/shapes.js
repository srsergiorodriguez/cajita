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

function shapeMarkup(element) {
  const shape = isShape(element.shape) ? element.shape : 'circle';
  const stroke =
    Number(element.strokeWidth) > 0 && element.stroke ? element.stroke : 'none';
  const strokeWidth = Number(element.strokeWidth) > 0 ? Number(element.strokeWidth) : 0;
  const common = `fill="${element.fill}" stroke="${stroke}"${strokeWidth ? ` stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ''}`;
  if (shape === 'square') {
    return `<rect x="0" y="0" width="100" height="100" ${common} />`;
  }
  if (shape === 'triangle') {
    return `<polygon points="50,0 100,100 0,100" ${common} />`;
  }
  return `<circle cx="50" cy="50" r="50" ${common} />`;
}

export function shapeSvg(element) {
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Forma" focusable="false">${shapeMarkup(element)}</svg>`;
}

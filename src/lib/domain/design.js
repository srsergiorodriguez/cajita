export const COLOR_TOKENS = Object.freeze([
  { id: 'background', name: 'Fondo', index: 0 },
  { id: 'text', name: 'Texto', index: 1 },
  { id: 'accent', name: 'Acento', index: 2 },
  { id: 'accent-2', name: 'Acento 2', index: 3 },
  { id: 'accent-3', name: 'Acento 3', index: 4 }
]);

export const RADIUS_TOKENS = Object.freeze([
  { id: 'square', name: 'Recto', value: 0 },
  { id: 'soft', name: 'Suave', value: 8 },
  { id: 'round', name: 'Redondo', value: 25 },
  { id: 'pill', name: 'Píldora', value: 50 }
]);

export const TEXT_STYLE_IDS = Object.freeze([
  'heading-1',
  'heading-2',
  'heading-3',
  'body'
]);

export const DEFAULT_TEXT_STYLES = Object.freeze({
  'heading-1': {
    id: 'heading-1',
    name: 'Título 1',
    font: 'fraunces',
    fontSize: 54,
    heading: true,
    lineHeight: 1.05,
    letterSpacing: 0,
    colorToken: 'text'
  },
  'heading-2': {
    id: 'heading-2',
    name: 'Título 2',
    font: 'fraunces',
    fontSize: 40,
    heading: true,
    lineHeight: 1.1,
    letterSpacing: 0,
    colorToken: 'text'
  },
  'heading-3': {
    id: 'heading-3',
    name: 'Título 3',
    font: 'fraunces',
    fontSize: 28,
    heading: true,
    lineHeight: 1.2,
    letterSpacing: 0,
    colorToken: 'text'
  },
  body: {
    id: 'body',
    name: 'Cuerpo',
    font: 'space-mono',
    fontSize: 18,
    heading: false,
    lineHeight: 1.5,
    letterSpacing: 0,
    colorToken: 'text'
  }
});

export function ensureDesign(project) {
  if (!project) return project;
  if (!Array.isArray(project.colorTokens)) {
    project.colorTokens = COLOR_TOKENS.map((token) => ({ ...token }));
  }
  if (
    project.siteBackgroundToken === undefined &&
    project.siteBackground &&
    project.siteBackground === project.palette?.[0]
  ) {
    project.siteBackgroundToken = 'background';
  }
  if (!Array.isArray(project.radiusTokens)) {
    project.radiusTokens = RADIUS_TOKENS.map((token) => ({ ...token }));
  }
  if (!project.textStyles) {
    project.textStyles = Object.fromEntries(
      Object.entries(DEFAULT_TEXT_STYLES).map(([id, style]) => [id, { ...style }])
    );
  } else {
    for (const [id, style] of Object.entries(DEFAULT_TEXT_STYLES)) {
      if (!project.textStyles[id]) project.textStyles[id] = { ...style };
    }
  }
  return project;
}

export function colorTokenIndex(project, tokenId) {
  return project?.colorTokens?.find((token) => token.id === tokenId)?.index ?? null;
}

export function colorForToken(project, tokenId, fallback = '#1c1917') {
  const index = colorTokenIndex(project, tokenId);
  return index === null ? fallback : project.palette?.[index] ?? fallback;
}

export function textStyleValues(project, styleId) {
  const style = project?.textStyles?.[styleId];
  if (!style) return null;
  return {
    font: style.font,
    fontSize: style.fontSize,
    heading: Boolean(style.heading),
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    color: colorForToken(project, style.colorToken),
    colorToken: style.colorToken
  };
}

export function radiusTokenValue(project, tokenId, fallback = 0) {
  return (
    project?.radiusTokens?.find((token) => token.id === tokenId)?.value ?? fallback
  );
}

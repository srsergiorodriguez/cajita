export const DEFAULT_FICHA_STYLE = Object.freeze({
  background: '#fffdf7',
  ink: '#24303f',
  accent: '#24303f',
  headingFont: 'fraunces',
  bodyFont: 'space-mono',
  borderWidth: 2,
  radius: 0
});

const HEX = /^#[0-9a-f]{6}$/i;

export function normaliseFichaStyle(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  return {
    background: HEX.test(raw.background ?? '') ? raw.background : DEFAULT_FICHA_STYLE.background,
    ink: HEX.test(raw.ink ?? '') ? raw.ink : DEFAULT_FICHA_STYLE.ink,
    accent: HEX.test(raw.accent ?? '') ? raw.accent : DEFAULT_FICHA_STYLE.accent,
    headingFont:
      typeof raw.headingFont === 'string'
        ? raw.headingFont
        : DEFAULT_FICHA_STYLE.headingFont,
    bodyFont:
      typeof raw.bodyFont === 'string' ? raw.bodyFont : DEFAULT_FICHA_STYLE.bodyFont,
    borderWidth: Math.max(
      0,
      Math.min(8, Number(raw.borderWidth ?? DEFAULT_FICHA_STYLE.borderWidth) || 0)
    ),
    radius: Math.max(
      0,
      Math.min(40, Number(raw.radius ?? DEFAULT_FICHA_STYLE.radius) || 0)
    )
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let rgb;
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return rgbToHex(rgb.map((channel) => (channel + m) * 255));
}

function luminance(hex) {
  const rgb = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function randomBetween(random, min, max) {
  return min + random() * (max - min);
}

function textForBackground(background, random) {
  const lightText = hslToRgb(randomBetween(random, 30, 50), 10, 96);
  const darkText = hslToRgb(randomBetween(random, 20, 40), 12, 12);
  return contrastRatio(darkText, background) >= contrastRatio(lightText, background)
    ? darkText
    : lightText;
}

function backgroundForText(text, random) {
  const lightBackground = hslToRgb(randomBetween(random, 35, 55), 8, 96);
  const darkBackground = hslToRgb(randomBetween(random, 15, 35), 10, 10);
  return contrastRatio(text, lightBackground) >= contrastRatio(text, darkBackground)
    ? lightBackground
    : darkBackground;
}

/**
 * Generate a role-aware five-color palette.
 * Indices: 0 background, 1 text, 2-4 accents.
 */
export function generatePalette({ project, locked = [], random = Math.random } = {}) {
  const lockedSet = new Set(locked);
  const colors = (project?.palette ?? []).slice(0, 5);
  const darkMode = random() < 0.22;

  if (!lockedSet.has(0)) {
    colors[0] = darkMode
      ? hslToRgb(randomBetween(random, 15, 35), 12, randomBetween(random, 8, 13))
      : hslToRgb(randomBetween(random, 35, 55), 10, randomBetween(random, 94, 98));
  }

  if (!lockedSet.has(1)) {
    colors[1] = textForBackground(colors[0], random);
    if (contrastRatio(colors[1], colors[0]) < 4.5) {
      // The two candidates above are already far apart, but keep the guard.
      colors[1] = contrastRatio(colors[1], colors[0]) > 4.5 ? colors[1] : '#111111';
    }
  } else if (!lockedSet.has(0) && contrastRatio(colors[1], colors[0]) < 4.5) {
    colors[0] = backgroundForText(colors[1], random);
  }

  const baseHue = random() * 360;
  const spread = randomBetween(random, 55, 110);
  for (let index = 2; index < 5; index += 1) {
    if (lockedSet.has(index)) continue;
    const hue = baseHue + (index - 2) * spread;
    const lightness = darkMode
      ? randomBetween(random, 62, 76)
      : randomBetween(random, 42, 62);
    colors[index] = hslToRgb(hue, randomBetween(random, 58, 82), lightness);
  }

  return colors;
}

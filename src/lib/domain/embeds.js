export const EMBED_PROVIDERS = Object.freeze({
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    sandbox: 'allow-scripts allow-same-origin allow-presentation',
    allow: 'fullscreen; picture-in-picture'
  },
  observable: {
    id: 'observable',
    label: 'Observable',
    sandbox: 'allow-scripts allow-same-origin',
    allow: ''
  },
  p5: {
    id: 'p5',
    label: 'p5',
    sandbox:
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads',
    allow: 'fullscreen; autoplay'
  }
});

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be'
]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,}$/;

function parseStart(value) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  return (
    Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  );
}

export function parseYoutube(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }
  let id = '';
  if (url.hostname === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v') ?? '';
  } else {
    const parts = url.pathname.split('/').filter(Boolean);
    if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1] ?? '';
  }
  if (!YOUTUBE_ID.test(id)) return null;
  const start = parseStart(url.searchParams.get('t') ?? url.searchParams.get('start'));
  return {
    provider: 'youtube',
    url: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ''}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`,
    title: 'YouTube',
    start
  };
}

export function parseObservable(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    !['observablehq.com', 'www.observablehq.com', 'old.observablehq.com'].includes(host)
  ) {
    return null;
  }
  let path;
  try {
    path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
  } catch {
    return null;
  }
  const notebookPath = path.startsWith('/embed/') ? path.slice('/embed'.length) : path;
  if (!/^\/(?:@|d\/)/.test(notebookPath)) return null;
  const sourceHost = host === 'www.observablehq.com' ? 'observablehq.com' : host;
  const segments = notebookPath.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? 'Observable';
  return {
    provider: 'observable',
    url: `https://${sourceHost}${notebookPath}${url.search}`,
    embedUrl: `https://${sourceHost}/embed${notebookPath}${url.search}`,
    title: slug.replace(/-/g, ' '),
    start: 0
  };
}

export function parseP5(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'editor.p5js.org') {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const full = parts.indexOf('full');
  if (full < 1 || !parts[full + 1]) return null;
  const path = `/${parts.slice(0, full + 2).join('/')}`;
  return {
    provider: 'p5',
    url: `https://editor.p5js.org${path}${url.search}`,
    embedUrl: `https://editor.p5js.org${path}${url.search}`,
    title: 'p5 sketch',
    start: 0
  };
}

export function parseEmbed(provider, input) {
  if (provider === 'p5') return parseP5(input);
  if (provider === 'youtube') return parseYoutube(input);
  if (provider === 'observable') return parseObservable(input);
  return null;
}

export function embedSrc(embed) {
  if (!embed) return '';
  if (embed.provider === 'youtube') return parseYoutube(embed.url)?.embedUrl ?? '';
  if (embed.provider === 'p5') return parseP5(embed.url)?.embedUrl ?? '';
  return parseObservable(embed.url)?.embedUrl ?? '';
}

export function embedProvider(provider) {
  return EMBED_PROVIDERS[provider] ?? null;
}

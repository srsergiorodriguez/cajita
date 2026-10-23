import { LIMITS } from '../../domain/model.js';
import {
  kindForMime,
  mimeFromName,
  sha256Hex,
  sniffMime,
  toBytes
} from '../../domain/assets.js';
import { validateFontFile } from '../../domain/fonts.js';

function qualitySettings(settings) {
  return settings?.imageQuality === 'high'
    ? { quality: LIMITS.highImageQuality, maxEdge: LIMITS.highImageMaxEdge }
    : { quality: LIMITS.imageQuality, maxEdge: LIMITS.imageMaxEdge };
}

async function canvasToBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function fitSize(width, height, maxEdge) {
  const largest = Math.max(width, height);
  if (largest <= maxEdge) return { width, height };
  const scale = maxEdge / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

async function drawAndEncode(bitmap, width, height, quality, mime) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, width, height);
  return canvasToBlob(canvas, mime, quality);
}

async function makeThumbnail(bitmap) {
  const size = fitSize(bitmap.width, bitmap.height, 480);
  const blob = await drawAndEncode(bitmap, size.width, size.height, 0.8, 'image/webp');
  if (!blob) return null;
  return { blob, hash: await sha256Hex(await blob.arrayBuffer()) };
}

async function decodeImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(file);
  }
}

async function optimizeImage(file, settings) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, file.type || mimeFromName(file.name));
  if (!mime.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (bytes.byteLength > LIMITS.fileBytes) {
    throw new Error('La imagen supera los 50 MB.');
  }

  const bitmap = await decodeImage(file);
  const pixels = bitmap.width * bitmap.height;
  if (pixels > LIMITS.imagePixels * 2) {
    bitmap.close();
    throw new Error('La imagen es demasiado grande (más de 80 megapíxeles).');
  }

  const { quality, maxEdge } = qualitySettings(settings);
  const isGif = mime === 'image/gif';
  let blob;
  let finalMime = mime;

  if (isGif) {
    blob = new Blob([bytes], { type: mime });
  } else {
    const size = fitSize(bitmap.width, bitmap.height, maxEdge);
    const webp = await drawAndEncode(
      bitmap,
      size.width,
      size.height,
      quality,
      'image/webp'
    );
    if (webp && webp.size < bytes.byteLength) {
      blob = webp;
      finalMime = 'image/webp';
    } else {
      blob = new Blob([bytes], { type: mime });
      finalMime = mime;
    }
  }

  const thumb = await makeThumbnail(bitmap);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();

  const finalBytes = new Uint8Array(await blob.arrayBuffer());
  return {
    blob,
    thumb: thumb?.blob ?? null,
    thumbHash: thumb?.hash,
    meta: {
      hash: await sha256Hex(finalBytes),
      kind: 'image',
      name: file.name,
      mime: finalMime,
      bytes: finalBytes.byteLength,
      width,
      height
    }
  };
}

function probeVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (result) => {
      video.remove();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timeout = setTimeout(
      () => done({ duration: 0, width: 0, height: 0, thumb: null }),
      6000
    );
    video.muted = true;
    video.preload = 'metadata';
    video.src = url;
    video.addEventListener('loadedmetadata', async () => {
      clearTimeout(timeout);
      const result = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
        thumb: null
      };
      try {
        video.currentTime = Math.min(0.1, Math.max(0.01, video.duration / 10));
        await new Promise((seeked) => {
          const timer = setTimeout(seeked, 2500);
          video.addEventListener(
            'seeked',
            () => {
              clearTimeout(timer);
              seeked();
            },
            { once: true }
          );
        });
        const size = fitSize(video.videoWidth, video.videoHeight, 480);
        const canvas = createCanvas(size.width, size.height);
        canvas.getContext('2d').drawImage(video, 0, 0, size.width, size.height);
        const blob = await canvasToBlob(canvas, 'image/webp', 0.8);
        if (blob) {
          result.thumb = { blob, hash: await sha256Hex(await blob.arrayBuffer()) };
        }
      } catch {
        // A poster frame is optional.
      }
      done(result);
    });
    video.addEventListener('error', () => {
      clearTimeout(timeout);
      done({ duration: 0, width: 0, height: 0, thumb: null });
    });
  });
}

function probeAudio(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const done = (duration) => {
      audio.remove();
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    const timeout = setTimeout(() => done(0), 6000);
    audio.preload = 'metadata';
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      done(audio.duration);
    });
    audio.addEventListener('error', () => {
      clearTimeout(timeout);
      done(0);
    });
  });
}

async function processVideo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, file.type || mimeFromName(file.name));
  if (!mime.startsWith('video/')) throw new Error('El archivo no es un video.');
  if (bytes.byteLength > LIMITS.fileBytes) throw new Error('El video supera los 50 MB.');
  const probe = await probeVideo(file);
  return {
    blob: new Blob([bytes], { type: mime }),
    thumb: probe.thumb?.blob ?? null,
    thumbHash: probe.thumb?.hash,
    meta: {
      hash: await sha256Hex(bytes),
      kind: 'video',
      name: file.name,
      mime,
      bytes: bytes.byteLength,
      width: probe.width,
      height: probe.height,
      duration: probe.duration
    }
  };
}

async function processAudio(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, file.type || mimeFromName(file.name));
  if (!mime.startsWith('audio/')) throw new Error('El archivo no es un audio.');
  if (bytes.byteLength > LIMITS.fileBytes) throw new Error('El audio supera los 50 MB.');
  const duration = await probeAudio(file);
  return {
    blob: new Blob([bytes], { type: mime }),
    thumb: null,
    thumbHash: undefined,
    meta: {
      hash: await sha256Hex(bytes),
      kind: 'audio',
      name: file.name,
      mime,
      bytes: bytes.byteLength,
      duration
    }
  };
}

export async function processMediaFile(file, settings) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes, file.type || mimeFromName(file.name));
  const kind = kindForMime(mime);
  if (!kind)
    throw new Error(
      'Formato no soportado. Usa PNG, JPEG, GIF, WebP, MP4, WebM, MP3, OGG, WAV o M4A.'
    );
  if (kind === 'image') return optimizeImage(file, settings);
  if (kind === 'video') return processVideo(file);
  if (kind === 'audio') return processAudio(file);
  throw new Error('Las tipografías se añaden desde el gestor de tipografías.');
}

export async function processFontFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateFontFile({
    name: file.name,
    bytes,
    mime: file.type || mimeFromName(file.name)
  });
  if (!validation.ok) throw new Error(validation.message);

  const blob = new Blob([bytes], { type: validation.mime });
  const url = URL.createObjectURL(blob);
  try {
    const face = new FontFace(`cajita-check-${Date.now()}`, `url(${url})`);
    await face.load();
  } finally {
    URL.revokeObjectURL(url);
  }

  return {
    blob,
    thumb: null,
    thumbHash: undefined,
    meta: {
      hash: await sha256Hex(bytes),
      kind: 'font',
      name: file.name,
      mime: validation.mime,
      bytes: bytes.byteLength,
      format: validation.format
    }
  };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBytes(bytes, filename, type = 'application/octet-stream') {
  downloadBlob(new Blob([bytes], { type }), filename);
}

export function pickFiles({ accept = '', multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    document.body.append(input);
    input.addEventListener(
      'change',
      () => {
        const files = [...(input.files ?? [])];
        input.remove();
        resolve(files);
      },
      { once: true }
    );
    input.addEventListener(
      'cancel',
      () => {
        input.remove();
        resolve([]);
      },
      { once: true }
    );
    input.click();
  });
}

export async function readFileBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

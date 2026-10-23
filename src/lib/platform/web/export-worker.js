import { zipSync } from 'fflate';

self.onmessage = (event) => {
  const data = event.data;
  if (!data || data.type !== 'zip') return;
  try {
    const entries = {};
    for (const item of data.entries) {
      entries[item.path] = [item.bytes, { level: item.level }];
    }
    const bytes = zipSync(entries);
    self.postMessage({ ok: true, bytes }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

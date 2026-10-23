import { platform } from '../platform/index.js';

export const library = $state({
  items: [],
  loading: true,
  error: null,
  usage: { bytes: 0, projects: 0 }
});

export async function refreshLibrary() {
  library.loading = true;
  library.error = null;
  try {
    const [items, usage] = await Promise.all([
      platform.projects.list(),
      platform.assets.usage()
    ]);
    library.items = items;
    library.usage = usage;
  } catch (error) {
    library.error = error instanceof Error ? error.message : String(error);
  } finally {
    library.loading = false;
  }
}

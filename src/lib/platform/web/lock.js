const PREFIX = 'cajita.lock.';
const TAB_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

function read(projectId) {
  try {
    const raw = localStorage.getItem(PREFIX + projectId);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value?.at === 'number' ? value : null;
  } catch {
    return null;
  }
}

function write(projectId) {
  try {
    localStorage.setItem(
      PREFIX + projectId,
      JSON.stringify({ tabId: TAB_ID, at: Date.now() })
    );
  } catch {
    // Storage disabled: no lock, but the app still works.
  }
}

/**
 * A small best-effort edit lock. It is not a security boundary; it prevents the
 * common "same project open in two tabs" overwrite.
 *
 * @param {string} projectId
 * @param {(conflict: boolean) => void} [onChange]
 */
export function createProjectLock(projectId, onChange = () => {}) {
  let active = true;
  let conflicted = false;

  const check = () => {
    const current = read(projectId);
    conflicted = Boolean(
      current && current.tabId !== TAB_ID && Date.now() - current.at < 15000
    );
    onChange(conflicted);
  };

  const beat = () => {
    if (!active) return;
    const current = read(projectId);
    if (current && current.tabId !== TAB_ID && Date.now() - current.at < 15000) {
      check();
      return;
    }
    write(projectId);
    conflicted = false;
    onChange(false);
  };

  const onStorage = (event) => {
    if (event.key === PREFIX + projectId) check();
  };

  const onUnload = () => {
    const current = read(projectId);
    if (current?.tabId === TAB_ID) {
      try {
        localStorage.removeItem(PREFIX + projectId);
      } catch {
        // ignore
      }
    }
  };

  beat();
  const timer = window.setInterval(beat, 5000);
  window.addEventListener('storage', onStorage);
  window.addEventListener('beforeunload', onUnload);

  return {
    get conflicted() {
      return conflicted;
    },
    takeover() {
      write(projectId);
      conflicted = false;
      onChange(false);
    },
    release() {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onUnload);
      onUnload();
    }
  };
}

/**
 * Shared trackpad/touch pinch handling for editor viewports.
 * Calls onzoom with an incremental scale factor; the owning editor clamps it.
 */
const activeNodes = new Set();
let globalBound = false;

function onGlobalWheel(event) {
  if (!(event.ctrlKey || event.metaKey)) return;
  for (const node of activeNodes) {
    if (node.contains(event.target)) {
      event.preventDefault();
      return;
    }
  }
}

function bindGlobalWheel() {
  if (globalBound || typeof window === 'undefined') return;
  window.addEventListener('wheel', onGlobalWheel, { capture: true, passive: false });
  globalBound = true;
}

function releaseGlobalWheel() {
  if (!globalBound || activeNodes.size) return;
  window.removeEventListener('wheel', onGlobalWheel, { capture: true });
  globalBound = false;
}

export function pinchZoom(node, params = {}) {
  let options = params;
  const pointers = new Map();
  let pinchDistance = 0;
  let gestureScale = 1;

  function apply(next) {
    options = { ...options, ...(next ?? {}) };
  }

  function distance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }


  function onGestureStart(event) {
    if (!options.enabled) return;
    event.preventDefault();
    gestureScale = 1;
  }

  function onGestureChange(event) {
    if (!options.enabled) return;
    event.preventDefault();
    const next = Number(event.scale) || 1;
    const factor = next / (gestureScale || 1);
    gestureScale = next;
    if (Number.isFinite(factor) && factor !== 1) options.onzoom?.(factor);
  }

  function onGestureEnd(event) {
    if (!options.enabled) return;
    event.preventDefault();
    gestureScale = 1;
  }

  function onWheel(event) {
    if (!options.enabled || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const factor = Math.min(2, Math.max(0.5, Math.exp(-event.deltaY * 0.01)));
    if (Number.isFinite(factor) && factor !== 1) options.onzoom?.(factor);
  }

  function onPointerDown(event) {
    if (!options.enabled || event.pointerType !== 'touch') return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      pinchDistance = distance();
      node.style.touchAction = 'none';
    }
  }

  function onPointerMove(event) {
    if (!options.enabled || event.pointerType !== 'touch' || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2) return;
    event.preventDefault();
    const nextDistance = distance();
    if (!pinchDistance || !nextDistance) return;
    const factor = nextDistance / pinchDistance;
    pinchDistance = nextDistance;
    if (Number.isFinite(factor) && factor !== 1) options.onzoom?.(factor);
  }

  function onPointerEnd(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinchDistance = 0;
      node.style.touchAction = '';
    }
  }

  activeNodes.add(node);
  bindGlobalWheel();
  node.addEventListener('wheel', onWheel, { passive: false, capture: true });
  node.addEventListener('gesturestart', onGestureStart, { passive: false });
  node.addEventListener('gesturechange', onGestureChange, { passive: false });
  node.addEventListener('gestureend', onGestureEnd, { passive: false });
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerEnd);
  node.addEventListener('pointercancel', onPointerEnd);

  return {
    update: apply,
    destroy() {
      activeNodes.delete(node);
      releaseGlobalWheel();
      node.removeEventListener('wheel', onWheel, { capture: true });
      node.removeEventListener('gesturestart', onGestureStart);
      node.removeEventListener('gesturechange', onGestureChange);
      node.removeEventListener('gestureend', onGestureEnd);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerEnd);
      node.removeEventListener('pointercancel', onPointerEnd);
      node.style.touchAction = '';
    }
  };
}

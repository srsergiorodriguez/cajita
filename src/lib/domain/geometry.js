/**
 * Shared frame math for the editor and (later) the exporter. Everything here is
 * pure and works in stage design pixels. Rotation is around the frame centre.
 */

export function frameCenter(frame) {
  return {
    x: frame.x + frame.w / 2,
    y: frame.y + frame.h / 2
  };
}

function percent(value, total) {
  return `${((value / total) * 100).toFixed(4)}%`;
}

/**
 * Convert a frame into the CSS custom properties shared by editor and export.
 */
export function frameToCss(frame, stage) {
  return {
    '--x': percent(frame.x, stage.width),
    '--y': percent(frame.y, stage.height),
    '--w': percent(frame.w, stage.width),
    '--h': percent(frame.h, stage.height),
    '--rot': `${Number(frame.rotation ?? 0).toFixed(2)}deg`
  };
}

export function elementToCss(element, stage) {
  return {
    ...frameToCss(element.frame, stage),
    '--z': String(element.z ?? 0),
    '--opacity': String(element.opacity ?? 1)
  };
}

/** Font size in container-query width units, so text scales with the stage. */
export function pxToCqw(px, stageWidth) {
  return `${((px / stageWidth) * 100).toFixed(4)}cqw`;
}

/** Normalise to (-180, 180]. */
export function normaliseAngle(deg) {
  let value = (((Number(deg) || 0) % 360) + 360) % 360;
  if (value > 180) value -= 360;
  return value;
}

export function rotatePoint(point, center, deg) {
  const radians = (deg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/** Convert a stage point into a frame's unrotated local space. */
export function pointToLocal(point, frame) {
  return rotatePoint(point, frameCenter(frame), -Number(frame.rotation ?? 0));
}

/** Convert a local point back into stage space. */
export function pointToStage(point, frame) {
  return rotatePoint(point, frameCenter(frame), Number(frame.rotation ?? 0));
}

export function frameContainsPoint(frame, point, tolerance = 0) {
  const local = pointToLocal(point, frame);
  return (
    local.x >= frame.x - tolerance &&
    local.x <= frame.x + frame.w + tolerance &&
    local.y >= frame.y - tolerance &&
    local.y <= frame.y + frame.h + tolerance
  );
}

export function clampFrame(frame, stage, padding = 0) {
  const w = Math.min(frame.w, stage.width - padding * 2);
  const h = Math.min(frame.h, stage.height - padding * 2);
  return {
    ...frame,
    w,
    h,
    x: Math.min(Math.max(frame.x, padding), stage.width - w - padding),
    y: Math.min(Math.max(frame.y, padding), stage.height - h - padding)
  };
}

/**
 * Resize from a handle. `pointer` is in the frame's unrotated local coordinate
 * space (stage design pixels). The UI converts the pointer before calling this.
 */
export function resizeFrame(
  frame,
  handle,
  pointer,
  { keepAspect = false, fromCenter = false, minSize = 24 } = {}
) {
  let left = frame.x;
  let top = frame.y;
  let right = frame.x + frame.w;
  let bottom = frame.y + frame.h;
  const center = frameCenter(frame);

  const movesWest = handle.includes('w');
  const movesEast = handle.includes('e');
  const movesNorth = handle.includes('n');
  const movesSouth = handle.includes('s');

  if (movesWest) left = pointer.x;
  if (movesEast) right = pointer.x;
  if (movesNorth) top = pointer.y;
  if (movesSouth) bottom = pointer.y;

  if (fromCenter) {
    if (movesWest) right = center.x * 2 - left;
    if (movesEast) left = center.x * 2 - right;
    if (movesNorth) bottom = center.y * 2 - top;
    if (movesSouth) top = center.y * 2 - bottom;
  }

  let w = right - left;
  let h = bottom - top;

  if (keepAspect && w > 0 && h > 0 && !fromCenter) {
    const ratio = frame.w / frame.h;
    if (handle === 'n' || handle === 's') {
      w = h * ratio;
      if (movesWest) left = right - w;
      else if (movesEast) right = left + w;
      else {
        left = center.x - w / 2;
        right = center.x + w / 2;
      }
    } else {
      h = w / ratio;
      if (movesNorth) top = bottom - h;
      else if (movesSouth) bottom = top + h;
      else {
        top = center.y - h / 2;
        bottom = center.y + h / 2;
      }
    }
  }

  if (w < minSize) {
    if (movesWest) left = right - minSize;
    else right = left + minSize;
    w = minSize;
  }
  if (h < minSize) {
    if (movesNorth) top = bottom - minSize;
    else bottom = top + minSize;
    h = minSize;
  }

  return {
    ...frame,
    x: left,
    y: top,
    w,
    h
  };
}

function anchorPoint(frame, handle) {
  const x = handle.includes('w')
    ? frame.x + frame.w
    : handle.includes('e')
      ? frame.x
      : frame.x + frame.w / 2;
  const y = handle.includes('n')
    ? frame.y + frame.h
    : handle.includes('s')
      ? frame.y
      : frame.y + frame.h / 2;
  return { x, y };
}

/**
 * Resize a rotated frame while keeping the opposite corner/edge pinned in stage
 * space. `resizeFrame` works in local coordinates; this corrects the frame's
 * origin so rotation does not make the element slide under the pointer.
 */
export function resizeRotatedFrame(frame, handle, pointer, options = {}) {
  const next = resizeFrame(frame, handle, pointer, options);
  const rotation = Number(frame.rotation ?? 0);
  if (!rotation || options.fromCenter) return next;

  const startCenter = frameCenter(frame);
  const startAnchor = anchorPoint(frame, handle);
  const pinned = rotatePoint(startAnchor, startCenter, rotation);

  const vx = handle.includes('w') ? next.w / 2 : handle.includes('e') ? -next.w / 2 : 0;
  const vy = handle.includes('n') ? next.h / 2 : handle.includes('s') ? -next.h / 2 : 0;
  const rotated = rotatePoint({ x: vx, y: vy }, { x: 0, y: 0 }, rotation);
  const center = { x: pinned.x - rotated.x, y: pinned.y - rotated.y };

  return {
    ...next,
    x: center.x - next.w / 2,
    y: center.y - next.h / 2
  };
}

export function snapAngle(angle, step = 15, threshold = 4) {
  if (!step) return normaliseAngle(angle);
  const snapped = Math.round(angle / step) * step;
  return Math.abs(angle - snapped) <= threshold
    ? normaliseAngle(snapped)
    : normaliseAngle(angle);
}

export function rotateFrame(frame, pointer, snap = 15) {
  const center = frameCenter(frame);
  const angle =
    (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  return { ...frame, rotation: snapAngle(angle, snap, 4) };
}

function axisCandidates(frame, axis) {
  if (axis === 'x') {
    return [frame.x, frame.x + frame.w / 2, frame.x + frame.w];
  }
  return [frame.y, frame.y + frame.h / 2, frame.y + frame.h];
}

function targetCandidates(stage, others, axis) {
  const targets =
    axis === 'x'
      ? [0, stage.width / 2, stage.width]
      : [0, stage.height / 2, stage.height];

  for (const other of others) {
    targets.push(...axisCandidates(other, axis));
  }
  return targets;
}

function bestSnap(frame, stage, others, axis, threshold) {
  const candidates = axisCandidates(frame, axis);
  const targets = targetCandidates(stage, others, axis);
  let best = null;

  for (const target of targets) {
    for (const candidate of candidates) {
      const delta = target - candidate;
      if (Math.abs(delta) > threshold) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) {
        best = { delta, at: target };
      }
    }
  }
  return best;
}

/**
 * Snap a moving frame to stage edges/centre and other element edges/centres.
 * Returns the snapped frame and at most one guide per axis.
 */
export function snapMove(
  frame,
  stage,
  others = [],
  { threshold = 6, enabled = true } = {}
) {
  if (!enabled) return { frame, guides: { x: null, y: null } };

  const x = bestSnap(frame, stage, others, 'x', threshold);
  const y = bestSnap(frame, stage, others, 'y', threshold);

  return {
    frame: {
      ...frame,
      x: frame.x + (x?.delta ?? 0),
      y: frame.y + (y?.delta ?? 0)
    },
    guides: {
      x: x?.at ?? null,
      y: y?.at ?? null
    }
  };
}

/** Distance in screen-ish design pixels; useful for handle hit testing. */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

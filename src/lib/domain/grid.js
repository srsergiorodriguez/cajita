export const GRID_DEFAULTS = Object.freeze({ cellSize: 80, marginPercent: 5 });

export function normaliseGrid(grid) {
  const cellSize = Math.max(24, Math.round(Number(grid?.cellSize) || GRID_DEFAULTS.cellSize));
  const marginPercent = Math.max(
    0,
    Math.min(50, Number(grid?.marginPercent ?? GRID_DEFAULTS.marginPercent))
  );
  const merges = Array.isArray(grid?.merges)
    ? grid.merges
        .filter((merge) => merge && [merge.x, merge.y, merge.w, merge.h].every(Number.isFinite))
        .map((merge) => ({
          x: Math.max(0, Math.round(merge.x)),
          y: Math.max(0, Math.round(merge.y)),
          w: Math.max(1, Math.round(merge.w)),
          h: Math.max(1, Math.round(merge.h))
        }))
    : [];
  return { cellSize, marginPercent, merges };
}

export function gridGeometry(grid, stage) {
  const clean = normaliseGrid(grid);
  const marginPx = Math.min(stage.width, stage.height) * (clean.marginPercent / 100);
  const availableW = Math.max(clean.cellSize, stage.width - marginPx * 2);
  const availableH = Math.max(clean.cellSize, stage.height - marginPx * 2);
  const cols = Math.max(1, Math.floor(availableW / clean.cellSize));
  const rows = Math.max(1, Math.floor(availableH / clean.cellSize));
  const width = cols * clean.cellSize;
  const height = rows * clean.cellSize;
  return {
    ...clean,
    marginPx,
    availableW,
    availableH,
    x: Math.floor((stage.width - width) / 2),
    y: Math.floor((stage.height - height) / 2),
    width,
    height,
    cols,
    rows,
    xs: Array.from({ length: cols + 1 }, (_, index) =>
      Math.floor((stage.width - width) / 2) + index * clean.cellSize
    ),
    ys: Array.from({ length: rows + 1 }, (_, index) =>
      Math.floor((stage.height - height) / 2) + index * clean.cellSize
    )
  };
}

export function reflowGrid(grid, stage) {
  const clean = normaliseGrid(grid);
  const geometry = gridGeometry(clean, stage);
  const merges = clean.merges
    .filter((merge) => merge.x < geometry.cols && merge.y < geometry.rows)
    .map((merge) => ({
      ...merge,
      w: Math.min(merge.w, geometry.cols - merge.x),
      h: Math.min(merge.h, geometry.rows - merge.y)
    }))
    .filter((merge) => merge.w > 0 && merge.h > 0);
  return { ...clean, merges };
}

export function gridCells(grid, stage) {
  const geometry = gridGeometry(grid, stage);
  const covered = new Set();
  const merges = geometry.merges
    .map((merge) => ({
      ...merge,
      w: Math.min(merge.w, geometry.cols - merge.x),
      h: Math.min(merge.h, geometry.rows - merge.y)
    }))
    .filter((merge) => merge.w > 0 && merge.h > 0);
  for (const merge of merges) {
    for (let y = merge.y; y < merge.y + merge.h; y += 1) {
      for (let x = merge.x; x < merge.x + merge.w; x += 1) covered.add(`${x},${y}`);
    }
  }
  const cells = [];
  for (let y = 0; y < geometry.rows; y += 1) {
    for (let x = 0; x < geometry.cols; x += 1) {
      if (covered.has(`${x},${y}`)) {
        const merge = merges.find(
          (item) =>
            x >= item.x &&
            y >= item.y &&
            x < item.x + item.w &&
            y < item.y + item.h
        );
        if (!merge || merge.x !== x || merge.y !== y) continue;
        cells.push({
          x,
          y,
          w: merge.w,
          h: merge.h,
          px: geometry.x + x * geometry.cellSize,
          py: geometry.y + y * geometry.cellSize,
          pw: merge.w * geometry.cellSize,
          ph: merge.h * geometry.cellSize
        });
        continue;
      }
      cells.push({
        x,
        y,
        w: 1,
        h: 1,
        px: geometry.x + x * geometry.cellSize,
        py: geometry.y + y * geometry.cellSize,
        pw: geometry.cellSize,
        ph: geometry.cellSize
      });
    }
  }
  return { geometry, cells, merges };
}

export function gridSnapSegments(grid, stage) {
  const { geometry, merges } = gridCells(grid, stage);
  const internalVertical = (column, row) =>
    merges.some(
      (merge) =>
        merge.x < column &&
        merge.x + merge.w > column &&
        row >= merge.y &&
        row < merge.y + merge.h
    );
  const internalHorizontal = (row, column) =>
    merges.some(
      (merge) =>
        merge.y < row &&
        merge.y + merge.h > row &&
        column >= merge.x &&
        column < merge.x + merge.w
    );
  const xs = [];
  for (let column = 0; column <= geometry.cols; column += 1) {
    let run = null;
    for (let row = 0; row <= geometry.rows; row += 1) {
      const internal =
        row < geometry.rows && internalVertical(column, row);
      if (!internal && run === null) run = row;
      if ((internal || row === geometry.rows) && run !== null) {
        xs.push({
          at: geometry.x + column * geometry.cellSize,
          from: geometry.y + run * geometry.cellSize,
          to: geometry.y + row * geometry.cellSize
        });
        run = null;
      }
    }
  }
  const ys = [];
  for (let row = 0; row <= geometry.rows; row += 1) {
    let run = null;
    for (let column = 0; column <= geometry.cols; column += 1) {
      const internal =
        column < geometry.cols && internalHorizontal(row, column);
      if (!internal && run === null) run = column;
      if ((internal || column === geometry.cols) && run !== null) {
        ys.push({
          at: geometry.y + row * geometry.cellSize,
          from: geometry.x + run * geometry.cellSize,
          to: geometry.x + column * geometry.cellSize
        });
        run = null;
      }
    }
  }
  return { xs, ys };
}

function snapSegment(value, segments, spanStart, spanEnd, threshold) {
  let best = value;
  let distance = Infinity;
  for (const segment of segments) {
    if (segment.to < spanStart || segment.from > spanEnd) continue;
    const next = Math.abs(value - segment.at);
    if (next < distance) {
      distance = next;
      best = segment.at;
    }
  }
  return distance <= threshold ? best : value;
}

export function snapFrameMove(frame, grid, stage, threshold = 8) {
  const segments = gridSnapSegments(grid, stage);
  return {
    ...frame,
    x: snapSegment(frame.x, segments.xs, frame.y, frame.y + frame.h, threshold),
    y: snapSegment(frame.y, segments.ys, frame.x, frame.x + frame.w, threshold)
  };
}

export function snapFrameResize(frame, handle, grid, stage, threshold = 8) {
  const segments = gridSnapSegments(grid, stage);
  const next = { ...frame };
  if (handle.includes('w')) {
    next.x = snapSegment(frame.x, segments.xs, frame.y, frame.y + frame.h, threshold);
    next.w = frame.x + frame.w - next.x;
  }
  if (handle.includes('e')) {
    next.w =
      snapSegment(frame.x + frame.w, segments.xs, frame.y, frame.y + frame.h, threshold) -
      frame.x;
  }
  if (handle.includes('n')) {
    next.y = snapSegment(frame.y, segments.ys, frame.x, frame.x + frame.w, threshold);
    next.h = frame.y + frame.h - next.y;
  }
  if (handle.includes('s')) {
    next.h =
      snapSegment(frame.y + frame.h, segments.ys, frame.x, frame.x + frame.w, threshold) -
      frame.y;
  }
  return next;
}

export function mergeGridCells(grid, selection, stage) {
  const { geometry, merges } = gridCells(grid, stage);
  const x = Math.max(0, Math.min(selection.x, selection.x + selection.w));
  const y = Math.max(0, Math.min(selection.y, selection.y + selection.h));
  const w = Math.min(geometry.cols - x, Math.abs(selection.w));
  const h = Math.min(geometry.rows - y, Math.abs(selection.h));
  if (w < 1 || h < 1) throw new Error('La selección de celdas no es válida.');
  const overlaps = merges.some(
    (merge) =>
      x < merge.x + merge.w &&
      x + w > merge.x &&
      y < merge.y + merge.h &&
      y + h > merge.y
  );
  if (overlaps) throw new Error('La selección se solapa con una celda ya fusionada.');
  return normaliseGrid({
    ...grid,
    merges: [...merges, { x, y, w, h }]
  });
}

export function unmergeGridCells(grid, selection, stage) {
  const { merges } = gridCells(grid, stage);
  const x = Math.min(selection.x, selection.x + selection.w);
  const y = Math.min(selection.y, selection.y + selection.h);
  const w = Math.abs(selection.w);
  const h = Math.abs(selection.h);
  return normaliseGrid({
    ...grid,
    merges: merges.filter(
      (merge) =>
        !(x < merge.x + merge.w && x + w > merge.x && y < merge.y + merge.h && y + h > merge.y)
    )
  });
}

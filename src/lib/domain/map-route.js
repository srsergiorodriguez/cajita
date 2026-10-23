/**
 * Route an edge through the gutters between cards. The line never runs behind
 * an intervening card: vertical movement uses a column gutter, horizontal
 * movement uses a row gap, then it enters the target from its nearest edge.
 */
export function routeEdge({
  from,
  to,
  fromColumn,
  columns,
  cardW,
  cardH,
  gapX,
  gapY,
  index = 0
}) {
  const below = to.y >= from.y;
  let direction;
  if (to.x > from.x) direction = 1;
  else if (to.x < from.x) direction = -1;
  else if (fromColumn === 0) direction = -1;
  else if (fromColumn >= columns - 1) direction = 1;
  else direction = index % 2 === 0 ? 1 : -1;

  const sourceX = direction > 0 ? from.x + cardW : from.x;
  const sourceY = from.y + cardH / 2;
  const gutterX = direction > 0 ? from.x + cardW + gapX / 2 : from.x - gapX / 2;
  const targetX = to.x + cardW / 2;
  const laneY = below ? to.y - gapY / 2 : to.y + cardH + gapY / 2;
  const targetY = below ? to.y : to.y + cardH;

  return {
    d: `M ${sourceX} ${sourceY} H ${gutterX} V ${laneY} H ${targetX} V ${targetY}`,
    sourceX,
    sourceY,
    gutterX,
    laneY,
    targetX,
    targetY
  };
}

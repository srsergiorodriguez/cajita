export const STAGE_MIN = 320;
export const STAGE_MAX = 4000;

/**
 * Resize the shared page stage without touching elements. New space appears to
 * the right/bottom; existing design positions and sizes stay put.
 */
export function resizeStage(project, width, height) {
  const nextWidth = Math.round(Number(width));
  const nextHeight = Math.round(Number(height));
  if (
    !Number.isFinite(nextWidth) ||
    !Number.isFinite(nextHeight) ||
    nextWidth < STAGE_MIN ||
    nextWidth > STAGE_MAX ||
    nextHeight < STAGE_MIN ||
    nextHeight > STAGE_MAX
  ) {
    throw new Error(
      `El tamaño de página debe estar entre ${STAGE_MIN} y ${STAGE_MAX} px.`
    );
  }
  const current = project.stage;
  if (nextWidth === current.width && nextHeight === current.height) return project;

  // Resizing changes the page frame only. Existing elements keep their design
  // positions and sizes; new space appears to the right/bottom.
  current.width = nextWidth;
  current.height = nextHeight;
  return project;
}

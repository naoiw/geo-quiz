/** Map-coordinate helpers for continuous horizontal panning.
 *
 * The SVG country dataset spans x=0..360 (longitude -180..+180).
 * Horizontal positions wrap; latitude remains bounded by the poles.
 * Keeping the viewport's x within [-180, 180) avoids unbounded drift,
 * while rendering the adjacent map tiles makes the wrap visually seamless.
 */
export interface MapView {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WORLD_WIDTH = 360;
export const WORLD_HEIGHT = 180;

/** Wrap a longitude-based SVG x into the stable [-180, 180) viewport range. */
export function wrapMapX(x: number): number {
  return ((x + WORLD_WIDTH / 2) % WORLD_WIDTH + WORLD_WIDTH) % WORLD_WIDTH -
    WORLD_WIDTH / 2;
}

/** Horizontal loop + vertical clamp, keeping a 2:1 SVG aspect ratio. */
export function constrainMapView(view: MapView, minimumWidth: number): MapView {
  const width = Math.max(minimumWidth, Math.min(WORLD_WIDTH, view.width));
  const height = width / 2;
  return {
    x: wrapMapX(view.x),
    y: Math.max(0, Math.min(WORLD_HEIGHT - height, view.y)),
    width,
    height,
  };
}

/**
 * Only render world copies that overlap the viewport (normally 1 or 2).
 * A 360-wide map can show Asia and America on opposite sides of the seam.
 */
export function visibleWorldOffsets(view: MapView): number[] {
  const start = Math.floor(view.x / WORLD_WIDTH);
  // The right boundary is exclusive, avoiding an unnecessary third tile.
  const end = Math.floor((view.x + view.width - 1e-9) / WORLD_WIDTH);
  return Array.from({ length: end - start + 1 },
    (_, index) => (start + index) * WORLD_WIDTH);
}

/** Choose the same country's representation nearest the current view center. */
export function nearestWorldOffset(x: number, view: MapView): number {
  const center = view.x + view.width / 2;
  return Math.round((center - x) / WORLD_WIDTH) * WORLD_WIDTH;
}

export function wrappedPointX(x: number, view: MapView): number {
  return x + nearestWorldOffset(x, view);
}

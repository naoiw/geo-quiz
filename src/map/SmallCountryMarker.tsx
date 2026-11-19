import type { ReactElement } from "react";

type MarkerKind = "highlighted" | "selected";
type Viewport = { x: number; y: number; width: number; height: number };

interface Props {
  center: readonly number[];
  viewport: Viewport;
  kind: MarkerKind;
}

/**
 * Pin tip targets the geographic label point, not a verified capital city.
 * Pin size is stable relative to the visible viewport as the user zooms.
 * Markers never receive pointer input or expose a country's name.
 */
export function SmallCountryMarker({ center, viewport, kind }: Props): ReactElement | null {
  const [x, y] = center;
  if (x < viewport.x || x > viewport.x + viewport.width ||
      y < viewport.y || y > viewport.y + viewport.height) return null;

  const scale = viewport.width / 360;
  const inset = 9 * scale;
  const bodyX = Math.min(viewport.x + viewport.width - inset,
    Math.max(viewport.x + inset, x));
  const bodyOffset = (bodyX - x) / scale;

  return (
    <g
      className={"world-map__location-pin world-map__location-pin--" + kind}
      transform={`translate(${x} ${y}) scale(${scale})`}
      pointerEvents="none"
      aria-hidden="true"
    >
      {Math.abs(bodyOffset) > 0.5 && (
        <line className="world-map__pin-leader" x1={0} y1={0}
          x2={bodyOffset} y2={0} />
      )}
      <g transform={`translate(${bodyOffset} 0)`}>
        <path className="world-map__pin-shape"
          d="M0 0 C-2 -3 -8 -9 -8 -12 A8 8 0 1 1 8 -12 C8 -9 2 -3 0 0 Z" />
        <circle className="world-map__pin-center" cx={0} cy={-12} r={3} />
      </g>
    </g>
  );
}

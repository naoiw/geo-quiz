/**
 * A location pin is useful only when the country's visible land shape is too
 * narrow or short to identify at the current zoom level.
 *
 * The map's coordinates are equirectangular (360 × 180 world units). A single
 * feature may span the antimeridian (e.g. Kiribati): use its representative
 * label point instead of an enormous bounding box.
 */
export function needsLocationPin(
  feature: { readonly bounds: readonly number[]; readonly tiny: boolean },
  viewWidth: number,
): boolean {
  const [x0, y0, x1, y1] = feature.bounds;
  const geographicWidth = x1 - x0;
  const geographicHeight = y1 - y0;
  const scatteredAcrossAntimeridian = feature.tiny && geographicWidth > 180;

  // A country taking under ~2.5% of the visible width in either dimension
  // is hard to recognize at the current zoom, especially on a phone.
  return scatteredAcrossAntimeridian
    || Math.min(geographicWidth, geographicHeight * 2) < viewWidth * 0.025;
}

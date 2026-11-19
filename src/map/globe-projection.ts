import type { RegionId } from "../country-data";

/** Natural Earth planar coordinates are x=longitude+180, y=90-latitude. */
export function mapPointToGlobe(x: number, y: number): readonly [number, number, number] {
  const longitude = (x - 180) * Math.PI / 180;
  const latitude = (90 - y) * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);
  return [
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude),
  ];
}

/** Three.js sphere UVs correspond to the same equirectangular country map. */
export function globeUvToMapPoint(u: number, v: number): { x: number; y: number } {
  return { x: u * 360, y: (1 - v) * 180 };
}

const centers: Readonly<Record<RegionId, readonly [number, number]>> = {
  africa: [200, 90],
  asia: [285, 55],
  europe: [195, 40],
  "north-america": [80, 45],
  "south-america": [120, 115],
  oceania: [320, 110],
};

export function globeRegionCenter(regionId: RegionId | "world"): readonly [number, number] {
  return regionId === "world" ? [180, 90] : centers[regionId];
}

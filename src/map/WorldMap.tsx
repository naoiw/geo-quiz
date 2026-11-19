import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { countriesById, regions, type RegionId } from "../country-data";
import type { Locale } from "../i18n/messages";
import { quizText, type QuizTextKey } from "../i18n/quizMessages";
import mapData from "./world-50m.json";
import "./WorldMap.css";

type View = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type MapFeature = (typeof mapData.features)[number];

const WORLD: View = { x: 0, y: 0, width: 360, height: 180 };
const MIN_WIDTH = 24;
const MIN_QUIZ_WIDTH = 8;

/** Broad geographic presets: never center the quiz on the correct answer. */
const REGION_VIEWS: Readonly<Record<RegionId, View>> = {
  africa: { x: 150, y: 53, width: 144, height: 72 },
  asia: { x: 190, y: 5, width: 170, height: 85 },
  europe: { x: 155, y: 7, width: 120, height: 60 },
  "north-america": { x: 4, y: 8, width: 164, height: 82 },
  "south-america": { x: 55, y: 67, width: 166, height: 83 },
  oceania: { x: 234, y: 74, width: 126, height: 63 },
};
const featureById = new Map(
  mapData.features.filter((feature) => feature.id).map((feature) => [feature.id, feature]),
);

function constrain(view: View, minimumWidth = MIN_WIDTH): View {
  const width = Math.max(minimumWidth, Math.min(WORLD.width, view.width));
  const height = width / 2;
  return {
    x: Math.max(0, Math.min(WORLD.width - width, view.x)),
    y: Math.max(0, Math.min(WORLD.height - height, view.y)),
    width,
    height,
  };
}

function pointerDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface WorldMapProps {
  locale: Locale;
  mode?: "explore" | "highlight" | "answer";
  highlightedCountryId?: string | null;
  selectedCountryId?: string | null;
  focusCountryId?: string | null;
  onCountrySelect?: (countryId: string) => void;
  /** Disable country selection and name labels while a country-name quiz is active. */
  readOnly?: boolean;
  /** Enables navigation between broad geographic areas in name-to-map questions. */
  showRegionNavigation?: boolean;
  initialRegionId?: RegionId | null;
}

/**
 * Purely visual map. The game engine owns question IDs, correctness and scoring.
 * All 197 selectable shapes use the shared country-master IDs.
 */
export function WorldMap({
  locale,
  mode = "explore",
  highlightedCountryId = null,
  selectedCountryId = null,
  focusCountryId = null,
  onCountrySelect,
  readOnly = false,
  showRegionNavigation = false,
  initialRegionId = null,
}: WorldMapProps) {
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ moved: boolean; candidate: string | null; start: Point }>({
    moved: false, candidate: null, start: { x: 0, y: 0 },
  });
  const [view, setView] = useState<View>(() => initialRegionId ? REGION_VIEWS[initialRegionId] : WORLD);
  const [mapArea, setMapArea] = useState<RegionId | "world">(initialRegionId ?? "world");
  const zoomFactor = WORLD.width / view.width;
  const minimumWidth = readOnly || showRegionNavigation ? MIN_QUIZ_WIDTH : MIN_WIDTH;

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    setView((current) => {
      const fx = rect && clientX !== undefined ? (clientX - rect.left) / rect.width : 0.5;
      const fy = rect && clientY !== undefined ? (clientY - rect.top) / rect.height : 0.5;
      const width = Math.max(minimumWidth, Math.min(WORLD.width, current.width / factor));
      const height = width / 2;
      return constrain({
        x: current.x + current.width * fx - width * fx,
        y: current.y + current.height * fy - height * fy,
        width,
        height,
      }, minimumWidth);
    });
  }, [minimumWidth]);

  // Native, non-passive handler prevents the browser from scrolling while zooming the map.
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const focusOn = useCallback((feature: MapFeature) => {
    const [x0, y0, x1, y1] = feature.bounds;
    const spread = Math.max(x1 - x0, (y1 - y0) * 2);
    // Countries spanning the antimeridian (or scattered islands) use their label location.
    const width = spread > 170 ? 60 : Math.max(feature.tiny && readOnly ? 12 : MIN_WIDTH, Math.min(360, spread * 1.6 + 12));
    setView(constrain({
      x: feature.center[0] - width / 2,
      y: feature.center[1] - width / 4,
      width,
      height: width / 2,
    }, minimumWidth));
  }, [minimumWidth, readOnly]);

  useEffect(() => {
    const feature = focusCountryId ? featureById.get(focusCountryId) : null;
    if (feature) focusOn(feature);
  }, [focusCountryId, focusOn]);

  const navigateRegion = (id: RegionId | "world") => {
    setMapArea(id);
    setView(id === "world" ? WORLD : REGION_VIEWS[id]);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.size) {
      const target = event.target as Element;
      gesture.current = {
        moved: false,
        candidate: target.closest("[data-country-id]")?.getAttribute("data-country-id") ?? null,
        start: { x: event.clientX, y: event.clientY },
      };
    } else {
      gesture.current.moved = true;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const before = [...pointers.current.values()];
    pointers.current.set(event.pointerId, next);
    const after = [...pointers.current.values()];
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (pointerDistance(next, gesture.current.start) > 5) gesture.current.moved = true;
    if (after.length === 1) {
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      if (!dx && !dy) return;
      setView((current) => constrain({
        ...current,
        x: current.x - dx * current.width / rect.width,
        y: current.y - dy * current.height / rect.height,
      }, minimumWidth));
    } else if (after.length === 2) {
      gesture.current.moved = true;
      const beforeMid = midpoint(before[0], before[1]);
      const afterMid = midpoint(after[0], after[1]);
      const oldDistance = pointerDistance(before[0], before[1]);
      const newDistance = pointerDistance(after[0], after[1]);
      if (!oldDistance || !newDistance) return;
      setView((current) => {
        const width = Math.max(minimumWidth, Math.min(360, current.width * oldDistance / newDistance));
        const height = width / 2;
        const px = (beforeMid.x - rect.left) / rect.width;
        const py = (beforeMid.y - rect.top) / rect.height;
        const qx = (afterMid.x - rect.left) / rect.width;
        const qy = (afterMid.y - rect.top) / rect.height;
        return constrain({
          x: current.x + current.width * px - width * qx,
          y: current.y + current.height * py - height * qy,
          width,
          height,
        }, minimumWidth);
      });
    }
  };

  const finishPointer = (event: PointerEvent<SVGSVGElement>, canceled = false) => {
    const isSingleTap = pointers.current.size === 1 && !gesture.current.moved;
    const candidate = gesture.current.candidate;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!canceled && isSingleTap && candidate && countriesById.has(candidate)) {
      onCountrySelect?.(candidate);
    }
    if (!pointers.current.size) gesture.current.candidate = null;
  };

  const onCountryKey = (event: KeyboardEvent<SVGPathElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCountrySelect?.(id);
    }
  };

  const focusId = mode === "answer" ? null : focusCountryId ?? selectedCountryId;
  const focusFeature = focusId ? featureById.get(focusId) : null;
  const instructions = readOnly
    ? qt("identify_the_highlighted_country_drag_and_zoom_to_inspect")
    : qt("tap_or_click_to_select_a_country_drag_to");

  return (
    <div className={"world-map" + (readOnly ? " world-map--quiz" : "")}>
      <div className="world-map__toolbar">
        <span className="world-map__hint">{instructions}</span>
        <div className="world-map__controls" role="group" aria-label={qt("mapControls")}>
          <button type="button" onClick={() => zoomAt(1.8)} aria-label={qt("zoomIn")} title={qt("zoomIn")}>+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.8)} aria-label={qt("zoomOut")} title={qt("zoomOut")}>−</button>
          {focusFeature && <button type="button" onClick={() => focusOn(focusFeature)}>{qt("focusCountry")}</button>}
          <button type="button" onClick={() => navigateRegion("world")}>{qt("resetMap")}</button>
        </div>
        {showRegionNavigation && (
          <label className="world-map__region-navigation">
            {qt("mapArea")}
            <select value={mapArea} onChange={(event) => navigateRegion(event.target.value as RegionId | "world")}>
              <option value="world">{qt("world")}</option>
              {regions.map((region) => (
                <option value={region.id} key={region.id}>{region.names[locale]}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="world-map__viewport">
        <svg
          ref={svgRef}
          className="world-map__svg"
          viewBox={view.x + " " + view.y + " " + view.width + " " + view.height}
          role="group"
          aria-label={readOnly
            ? (qt("mysteryMap"))
            : (qt("interactiveMap"))}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event)}
          onPointerCancel={(event) => finishPointer(event, true)}
        >
          <rect x="0" y="0" width="360" height="180" fill="#e7f2fa" />
          <g stroke="#c9dfe9" strokeWidth="0.22" fill="none" pointerEvents="none">
            {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x) =>
              <path key={"meridian-" + x} d={"M" + x + " 0V180"} />,
            )}
            {[30, 60, 90, 120, 150].map((y) =>
              <path key={"parallel-" + y} d={"M0 " + y + "H360"} />,
            )}
          </g>
          <g className="world-map__land">
            {mapData.features.map((feature, index) => {
              const country = feature.id ? countriesById.get(feature.id) : null;
              const highlighted = !!country && country.id === highlightedCountryId;
              const selected = !!country && country.id === selectedCountryId;
              const state = !country ? "inactive" : highlighted ? "highlighted" : selected ? "selected" : "selectable";
              return (
                <path
                  key={index}
                  d={feature.d}
                  fillRule="evenodd"
                  className={"world-map__country world-map__country--" + state}
                  vectorEffect="non-scaling-stroke"
                  data-country-id={country?.id}
                  data-tiny={feature.tiny ? "true" : undefined}
                  pointerEvents={country ? "auto" : "none"}
                  role={!readOnly && country ? "button" : undefined}
                  tabIndex={!readOnly && country ? 0 : undefined}
                  aria-label={!readOnly ? country?.names[locale] : undefined}
                  onKeyDown={!readOnly && country ? (event) => onCountryKey(event, country.id) : undefined}
                />
              );
            })}
          </g>
          {/* Keep microstates tappable without drawing circles over the map. */}
          {!readOnly && <g className="world-map__microstate-hit-areas" aria-hidden="true">
            {mapData.features.filter((feature) => feature.tiny && feature.id && countriesById.has(feature.id)).map((feature) => {
              const id = feature.id as string;
              return (
                <circle
                  key={id}
                  cx={feature.center[0]}
                  cy={feature.center[1]}
                  r={2.8 / zoomFactor}
                  className="world-map__microstate-hit-area"
                  vectorEffect="non-scaling-stroke"
                  data-country-id={id}
                  pointerEvents="all"
                />
              );
            })}
          </g>}
        </svg>
      </div>
      <div className="world-map__bottom">
        <span>{qt("mapCredit")}</span>
        <span>{zoomFactor.toFixed(1)}×</span>
      </div>
    </div>
  );
}

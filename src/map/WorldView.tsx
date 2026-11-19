import { lazy, Suspense, useState } from "react";
import { quizText } from "../i18n/quizMessages";
import { WorldMap, type WorldMapProps } from "./WorldMap";
import "./WorldGlobe.css";

const WorldGlobe = lazy(() => import("./WorldGlobe").then((module) => ({
  default: module.WorldGlobe,
})));

/** Select only the renderer; all quiz and score state remains in useQuizSession. */
export function WorldView(props: WorldMapProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  return (
    <div className="world-view">
      <div className="world-view__switch" role="group"
        aria-label={quizText(props.locale, "mapDisplayMode")}>
        {(["2d", "3d"] as const).map((kind) => (
          <button key={kind} type="button" aria-pressed={view === kind}
            className={view === kind ? "world-view__option is-active" : "world-view__option"}
            onClick={() => setView(kind)}>
            {quizText(props.locale, kind === "2d" ? "mapView2D" : "mapView3D")}
          </button>
        ))}
      </div>
      {view === "2d" ? (
        <WorldMap {...props} />
      ) : (
        <Suspense fallback={<p className="world-globe__message">3D…</p>}>
          <WorldGlobe {...props} onUnavailable={() => setView("2d")} />
        </Suspense>
      )}
    </div>
  );
}

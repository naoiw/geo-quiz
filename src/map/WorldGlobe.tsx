import { useEffect, useRef, useState } from "react";
import {
  AmbientLight, CanvasTexture, Color, DirectionalLight, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, Raycaster, Scene, SphereGeometry,
  SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { countriesById, regions, type RegionId } from "../country-data";
import { quizText } from "../i18n/quizMessages";
import type { WorldMapProps } from "./WorldMap";
import { globeRegionCenter, globeUvToMapPoint, mapPointToGlobe } from "./globe-projection";
import mapData from "./world-50m.json";

type Feature = (typeof mapData.features)[number];
const features: readonly Feature[] = mapData.features;
const byId = new Map<string, Feature>(
  features.filter((feature) => feature.id !== null)
    .map((feature) => [feature.id as string, feature]),
);
const playable = features.filter((feature) => feature.id !== null && countriesById.has(feature.id));
const OCEAN = "#15334e";
const LAND = "#dce8da";
const OTHER = "#849a9b";
const BORDER = "#426578";
const YELLOW = "#facc15";
const BLUE = "#3b82f6";

type GlobeRuntime = {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  scene: Scene;
  textureCanvas: HTMLCanvasElement;
  texture: CanvasTexture;
  markerMeshes: Mesh[];
  render: () => void;
  focusOn: (mapPoint: readonly number[], distance?: number) => void;
};

function toPosition(point: readonly number[], radius = 1): Vector3 {
  const [x, y, z] = mapPointToGlobe(point[0], point[1]);
  return new Vector3(x * radius, y * radius, z * radius);
}

function createLandTexture(canvas: HTMLCanvasElement, selected: string | null, highlighted: string | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = OCEAN;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / 360, canvas.height / 180);
  context.lineWidth = 0.18;
  for (const feature of features) {
    const path = new Path2D(feature.d);
    context.fillStyle = feature.id && countriesById.has(feature.id) ? LAND : OTHER;
    context.fill(path, "evenodd");
    context.strokeStyle = BORDER;
    context.stroke(path);
  }
  // Draw the current answer in blue, but prioritize the known correct answer in yellow.
  for (const [id, color] of [[selected, BLUE], [highlighted, YELLOW]] as const) {
    const feature = id ? byId.get(id) : null;
    if (feature) {
      context.fillStyle = color;
      context.fill(new Path2D(feature.d), "evenodd");
    }
  }
  context.restore();
}

function createPickCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.scale(canvas.width / 360, canvas.height / 180);
  playable.forEach((feature, index) => {
    const value = index + 1;
    context.fillStyle = `rgb(${value & 255},${(value >> 8) & 255},${(value >> 16) & 255})`;
    context.fill(new Path2D(feature.d), "evenodd");
  });
  return { canvas, context };
}

interface Props extends WorldMapProps {
  onUnavailable?: () => void;
}

/** Optional WebGL renderer; every click returns the same country ID as the 2D map. */
export function WorldGlobe({
  locale, mode = "explore", highlightedCountryId = null,
  selectedCountryId = null, focusCountryId = null,
  onCountrySelect, readOnly = false, showRegionNavigation = false,
  initialRegionId = null, onUnavailable,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GlobeRuntime | null>(null);
  const selectionRef = useRef({ readOnly, onCountrySelect });
  selectionRef.current = { readOnly, onCountrySelect };
  const [mapArea, setMapArea] = useState<RegionId | "world">(initialRegionId ?? "world");

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const picking = createPickCanvas();
    const surface = document.createElement("canvas");
    surface.width = 2048;
    surface.height = 1024;
    if (!picking || !surface.getContext("2d")) {
      onUnavailable?.();
      return;
    }
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      onUnavailable?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.setAttribute("aria-label", quizText(locale, "mapView3D"));
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color("#e8f0f8");
    scene.add(new AmbientLight(0xffffff, 1.6));
    const light = new DirectionalLight(0xffffff, 2.3);
    light.position.set(2, 3, 4);
    scene.add(light);
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(3.1, 0, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 1.45;
    controls.maxDistance = 4.8;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.65;
    const texture = new CanvasTexture(surface);
    texture.colorSpace = SRGBColorSpace;
    const globe = new Mesh(
      new SphereGeometry(1, 96, 64),
      new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
    );
    scene.add(globe);

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };
    const focusOn = (point: readonly number[], distance = camera.position.length()) => {
      camera.position.copy(toPosition(point, distance));
      controls.update();
      render();
    };
    const runtime: GlobeRuntime = {
      renderer, camera, controls, scene, textureCanvas: surface, texture,
      markerMeshes: [], render, focusOn,
    };
    runtimeRef.current = runtime;
    focusOn(globeRegionCenter(initialRegionId ?? "world"), 3.1);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.addEventListener("change", render);
    resize();

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let start: { x: number; y: number } | null = null;
    const pointerDown = (event: PointerEvent) => {
      start = { x: event.clientX, y: event.clientY };
    };
    const pointerUp = (event: PointerEvent) => {
      if (!start || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 6) {
        start = null;
        return;
      }
      start = null;
      if (selectionRef.current.readOnly || !selectionRef.current.onCountrySelect) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(globe)[0];
      if (!hit?.uv) return;

      // Small countries have the same generous invisible tap area as in 2D.
      const candidate = playable.filter((feature) => feature.tiny)
        .map((feature) => {
          const position = toPosition(feature.center);
          if (position.dot(camera.position) <= 0) return null;
          const projected = position.project(camera);
          const x = rect.left + (projected.x + 1) * rect.width / 2;
          const y = rect.top + (1 - projected.y) * rect.height / 2;
          return { id: feature.id, distance: Math.hypot(x - event.clientX, y - event.clientY) };
        })
        .filter((item) => item !== null && item.distance <= 13)
        .sort((a, b) => a!.distance - b!.distance)[0];
      if (candidate?.id) {
        selectionRef.current.onCountrySelect(candidate.id);
        return;
      }

      const point = globeUvToMapPoint(hit.uv.x, hit.uv.y);
      const x = Math.min(picking.canvas.width - 1, Math.max(0, Math.floor(point.x * picking.canvas.width / 360)));
      const y = Math.min(picking.canvas.height - 1, Math.max(0, Math.floor(point.y * picking.canvas.height / 180)));
      const color = picking.context.getImageData(x, y, 1, 1).data;
      const index = color[0] + (color[1] << 8) + (color[2] << 16) - 1;
      const id = playable[index]?.id;
      if (id) selectionRef.current.onCountrySelect(id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", () => { start = null; });

    return () => {
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      globe.geometry.dispose();
      (globe.material as MeshStandardMaterial).dispose();
      texture.dispose();
      runtime.markerMeshes.forEach((marker) => {
        scene.remove(marker);
        marker.geometry.dispose();
        (marker.material as MeshBasicMaterial).dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  // Renderer lifetime is independent from changing quiz questions and timer updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const highlighted = mode === "answer" ? null : highlightedCountryId;
    createLandTexture(runtime.textureCanvas, selectedCountryId, highlighted);
    runtime.texture.needsUpdate = true;
    for (const marker of runtime.markerMeshes) {
      runtime.scene.remove(marker);
      marker.geometry.dispose();
      (marker.material as MeshBasicMaterial).dispose();
    }
    runtime.markerMeshes = [];
    const shown = new Set<string>();
    for (const [id, color] of [[selectedCountryId, BLUE], [highlighted, YELLOW]] as const) {
      const feature = id ? byId.get(id) : null;
      if (!feature?.tiny || !id || shown.has(id)) continue;
      shown.add(id);
      const marker = new Mesh(
        new SphereGeometry(0.024, 12, 10),
        new MeshBasicMaterial({ color }),
      );
      marker.position.copy(toPosition(feature.center, 1.02));
      runtime.scene.add(marker);
      runtime.markerMeshes.push(marker);
    }
    runtime.render();
  }, [mode, highlightedCountryId, selectedCountryId]);

  useEffect(() => {
    const feature = focusCountryId ? byId.get(focusCountryId) : null;
    if (feature) runtimeRef.current?.focusOn(feature.center, feature.tiny ? 2.1 : 2.8);
  }, [focusCountryId]);

  const navigateRegion = (region: RegionId | "world") => {
    setMapArea(region);
    runtimeRef.current?.focusOn(globeRegionCenter(region), 3.1);
  };
  const zoom = (factor: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const distance = Math.min(runtime.controls.maxDistance,
      Math.max(runtime.controls.minDistance, runtime.camera.position.length() * factor));
    runtime.camera.position.setLength(distance);
    runtime.controls.update();
    runtime.render();
  };

  return (
    <div className="world-globe">
      <div ref={viewportRef} className="world-globe__viewport"
        aria-label={quizText(locale, "mapView3D")} />
      <div className="world-globe__controls">
        {showRegionNavigation && (
          <label>
            {quizText(locale, "mapArea")}
            <select value={mapArea} onChange={(event) =>
              navigateRegion(event.target.value as RegionId | "world")}>
              <option value="world">{quizText(locale, "world")}</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>{region.names[locale]}</option>
              ))}
            </select>
          </label>
        )}
        <div className="world-globe__buttons">
          <button type="button" onClick={() => zoom(0.8)}>{quizText(locale, "zoomIn")}</button>
          <button type="button" onClick={() => zoom(1.25)}>{quizText(locale, "zoomOut")}</button>
          <button type="button" onClick={() => navigateRegion("world")}>{quizText(locale, "resetMap")}</button>
        </div>
      </div>
      <p className="world-globe__hint">
        {locale === "ja"
          ? "ドラッグで回転、ピンチ・ホイールで拡大縮小。国をタップして選択できます。"
          : "Drag to rotate, pinch or scroll to zoom. Tap a country to select it."}
      </p>
    </div>
  );
}

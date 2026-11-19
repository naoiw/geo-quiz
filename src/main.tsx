import { StrictMode } from "react";
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/App.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Only register the service worker on production/preview builds, never during Vite dev.
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", {
      scope: import.meta.env.BASE_URL,
    }).catch((error: unknown) => {
      console.warn("Geo Quiz offline cache could not be registered.", error);
    });
  });
}

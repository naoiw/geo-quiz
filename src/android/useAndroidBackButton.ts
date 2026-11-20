import { useEffect, useRef } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

/**
 * Handle Android's system back without depending on browser history entries.
 * When a quiz is open, leave it using the same action as the visible back button.
 * At the mode selection screen, leave the application.
 */
export function useAndroidBackButton(inQuiz: boolean, returnToModes: () => void): void {
  const current = useRef({ inQuiz, returnToModes });
  current.current = { inQuiz, returnToModes };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listener: PluginListenerHandle | undefined;

    void NativeApp.addListener("backButton", () => {
      const state = current.current;
      if (state.inQuiz) {
        state.returnToModes();
      } else {
        void NativeApp.exitApp();
      }
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        listener = handle;
      }
    }).catch((error: unknown) => {
      console.warn("Android back button handler could not be registered.", error);
    });

    return () => {
      disposed = true;
      void listener?.remove();
    };
  }, []);
}

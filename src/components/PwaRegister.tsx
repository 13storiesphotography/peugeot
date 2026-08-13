"use client";

import { useEffect } from "react";

/** Register the lightweight service worker for installable / offline shell. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW is best-effort (e.g. unsupported on some previews).
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

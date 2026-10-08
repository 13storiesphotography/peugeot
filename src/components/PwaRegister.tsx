"use client";

import { useEffect } from "react";

/** Register the lightweight service worker for installable / offline shell. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registration = reg;
          void reg.update();
        })
        .catch(() => {
          // SW is best-effort (e.g. unsupported on some previews).
        });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void registration?.update();
      }
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

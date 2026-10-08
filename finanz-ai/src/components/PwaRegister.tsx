"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore offline register failures in dev */
      });
    }

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      Boolean(navigator.standalone);
    const dismissed = sessionStorage.getItem("kontura_ios_hint") === "1";
    if (isIos && !standalone && !dismissed) {
      setShowIosHint(true);
    }
  }, []);

  if (!showIosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 rounded-md bg-ink px-4 py-3 text-sm text-white shadow-lg md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <p className="font-semibold">Kontura aufs iPhone</p>
      <p className="mt-1 text-white/75">
        Teilen → „Zum Home-Bildschirm“ — öffnet wie eine App mit Face-ID am Gerät.
      </p>
      <button
        type="button"
        className="mt-2 text-teal underline"
        onClick={() => {
          sessionStorage.setItem("kontura_ios_hint", "1");
          setShowIosHint(false);
        }}
      >
        Verstanden
      </button>
    </div>
  );
}

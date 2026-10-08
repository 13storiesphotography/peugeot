"use client";

import { useEffect, useState } from "react";

/**
 * Soft lock for Capacitor / installed PWA.
 * Native Face ID is enforced in ios/Kontura (LocalAuthentication).
 * This gate adds an unlock step when the app is opened as standalone.
 */
export function BiometricLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      Boolean(navigator.standalone);
    const native = /KonturaNative/i.test(navigator.userAgent);
    const shouldLock = standalone || native;
    if (shouldLock && sessionStorage.getItem("kontura_unlocked") !== "1") {
      setLocked(true);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (locked) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink px-6 text-center text-white">
        <p className="font-display text-4xl font-bold">Kontura</p>
        <p className="mt-3 max-w-sm text-white/75">
          App-Sperre aktiv. Auf dem iPhone entsperrt die native Shell zusätzlich
          mit Face ID.
        </p>
        <button
          type="button"
          className="mt-8 rounded-md bg-teal px-5 py-3 text-sm font-semibold"
          onClick={() => {
            sessionStorage.setItem("kontura_unlocked", "1");
            setLocked(false);
          }}
        >
          Entsperren
        </button>
      </div>
    );
  }

  return children;
}

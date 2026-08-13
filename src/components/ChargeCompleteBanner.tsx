"use client";

import { useEffect, useState } from "react";
import type { VehicleState } from "@/lib/types";

const STORAGE_KEY = "e3008.chargeComplete.dismissed";

function completionKey(vehicle: VehicleState): string {
  // Stable for one finished session; changes when a new charge cycle completes.
  return `${Math.round(vehicle.batteryPercent)}:${vehicle.lastUpdatedAt.slice(0, 13)}`;
}

/** Banner when charging just finished — dismissible until the next cycle. */
export function ChargeCompleteBanner({
  vehicle,
  onOpenCharge,
}: {
  vehicle: VehicleState;
  onOpenCharge: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (vehicle.chargeStatus !== "complete") {
      setVisible(false);
      return;
    }
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      setVisible(dismissed !== completionKey(vehicle));
    } catch {
      setVisible(true);
    }
  }, [vehicle.chargeStatus, vehicle.batteryPercent, vehicle.lastUpdatedAt]);

  if (!visible || vehicle.chargeStatus !== "complete") return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, completionKey(vehicle));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      className="animate-rise flex items-start gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: "rgba(95,227,192,0.4)",
        background:
          "linear-gradient(135deg, rgba(95,227,192,0.16), rgba(14,28,40,0.6))",
      }}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--accent-bright)]">
          Laden fertig · {Math.round(vehicle.batteryPercent)}%
        </p>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
          Ziel {Math.round(vehicle.chargeLimitPercent)}% erreicht
          {vehicle.rangeKm > 0 ? ` · ${vehicle.rangeKm} km` : ""}
        </p>
        <button
          type="button"
          onClick={onOpenCharge}
          className="mt-2 text-xs font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
        >
          Zum Laden
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--fg-muted)]"
        aria-label="Hinweis schließen"
      >
        Schließen
      </button>
    </div>
  );
}

"use client";

import type { VehicleState } from "@/lib/types";

interface BatteryRingProps {
  vehicle: VehicleState;
}

export function BatteryRing({ vehicle }: BatteryRingProps) {
  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, vehicle.batteryPercent)) / 100;
  const offset = circumference * (1 - progress);
  const charging = vehicle.chargeStatus === "charging";

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: size, height: size }}>
      <div
        className="battery-glow pointer-events-none absolute inset-8 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(95,227,192,0.22) 0%, transparent 70%)",
        }}
      />
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(143,168,181,0.16)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={charging ? "#5fe3c0" : "#3da8a0"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={charging ? "charging-arc" : undefined}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)",
            filter: charging ? "drop-shadow(0 0 10px rgba(95,227,192,0.45))" : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--fg-muted)]">
          Batterie
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-display)] text-6xl font-semibold leading-none tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(vehicle.batteryPercent)}
          <span className="text-3xl text-[var(--accent-bright)]">%</span>
        </p>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          ca. <span className="text-[var(--fg)]">{vehicle.rangeKm} km</span> Restreichweite
        </p>
      </div>
    </div>
  );
}

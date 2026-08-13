"use client";

import type { VehicleState } from "@/lib/types";

/** Side-profile SUV silhouette — Peugeot E-3008 proportions, not a photo. */
export function VehicleHero({ vehicle }: { vehicle: VehicleState }) {
  const locked = vehicle.locked;
  const charging = vehicle.chargeStatus === "charging";
  const climateOn = vehicle.climateStatus !== "off";

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="pointer-events-none absolute inset-x-8 top-6 h-40 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(95,227,192,0.18), transparent 70%)",
          animation: "soft-breathe 5s ease-in-out infinite",
        }}
      />
      <svg
        viewBox="0 0 640 280"
        className="relative z-[1] h-auto w-full"
        role="img"
        aria-label={`${vehicle.model} ${vehicle.nickname}`}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a3a48" />
            <stop offset="45%" stopColor="#0f2430" />
            <stop offset="100%" stopColor="#163544" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ec8d4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2a5a68" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="320"
          cy="248"
          rx="210"
          ry="14"
          fill="rgba(0,0,0,0.35)"
        />

        {/* Body */}
        <path
          d="M92 188c8-38 28-62 58-78 42-22 96-34 168-36h78c54 2 98 14 128 42 18 16 34 40 42 68l6 16H86l6-12Z"
          fill="url(#bodyGrad)"
          stroke="rgba(143,168,181,0.35)"
          strokeWidth="1.5"
        />
        {/* Roofline / cabin */}
        <path
          d="M168 112c28-28 68-42 122-44h54c48 2 86 16 108 42l8 12H176l-8-10Z"
          fill="url(#glassGrad)"
          stroke="rgba(143,168,181,0.28)"
          strokeWidth="1"
        />
        {/* Character line */}
        <path
          d="M110 168h430"
          stroke="rgba(95,227,192,0.22)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Headlight */}
        <path
          d="M508 168c18 2 28 10 32 22h-48c0-10 6-18 16-22Z"
          fill={locked ? "#5fe3c0" : "#e8b86d"}
          opacity={0.85}
        />
        {/* Taillight */}
        <path
          d="M96 170c-8 2-12 10-12 20h36c-2-12-10-18-24-20Z"
          fill="#e07a6a"
          opacity={0.75}
        />
        {/* Wheels */}
        <circle cx="180" cy="210" r="34" fill="#0a1218" stroke="#8fa8b5" strokeWidth="3" />
        <circle cx="180" cy="210" r="14" fill="#1c2e38" stroke="rgba(95,227,192,0.35)" strokeWidth="2" />
        <circle cx="460" cy="210" r="34" fill="#0a1218" stroke="#8fa8b5" strokeWidth="3" />
        <circle cx="460" cy="210" r="14" fill="#1c2e38" stroke="rgba(95,227,192,0.35)" strokeWidth="2" />

        {/* Charge port glow */}
        {charging ? (
          <circle cx="250" cy="175" r="8" fill="#5fe3c0" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        ) : null}

        {/* Climate air hint */}
        {climateOn ? (
          <g opacity="0.55" stroke="#5fe3c0" strokeWidth="1.5" fill="none">
            <path d="M300 96c8-10 18-10 26 0" />
            <path d="M312 88c8-10 18-10 26 0" />
          </g>
        ) : null}
      </svg>

      <div className="relative z-[2] -mt-2 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight tabular-nums leading-none">
            {Math.round(vehicle.batteryPercent)}
            <span className="text-2xl text-[var(--accent-bright)]">%</span>
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {vehicle.rangeKm} km ·{" "}
            {locked ? "Verriegelt" : "Entriegelt"}
            {charging ? " · Lädt" : ""}
            {climateOn ? " · Klima an" : ""}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--fg-muted)]">
          <p className="uppercase tracking-[0.2em]">{vehicle.color}</p>
          <p className="mt-1 tabular-nums">
            {vehicle.mileageKm.toLocaleString("de-DE")} km
          </p>
        </div>
      </div>
    </div>
  );
}

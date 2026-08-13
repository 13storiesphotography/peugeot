"use client";

import type { VehicleState } from "@/lib/types";
import {
  chargeSpeedLabel,
  normalizeChargeSpeedMode,
  type ChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";

/** Side-profile SUV — tinted to live paint, with official Peugeot render when available. */
export function VehicleHero({ vehicle }: { vehicle: VehicleState }) {
  const locked = vehicle.locked;
  const charging = vehicle.chargeStatus === "charging";
  const plugged =
    vehicle.chargeStatus === "plugged" ||
    vehicle.chargeStatus === "charging" ||
    vehicle.chargeStatus === "complete";
  const climateOn = vehicle.climateStatus !== "off";
  const speed = normalizeChargeSpeedMode(vehicle.chargingMode);
  const body = vehicle.colorHex ?? "#1a3a48";
  const bodyLight = lighten(body, 0.18);
  const accent =
    charging && speed === "quick" ? "#e8b86d" : "var(--accent-bright)";
  const halo =
    charging && speed === "quick"
      ? "rgba(232,184,109,0.38)"
      : charging
        ? "rgba(95,227,192,0.35)"
        : hexAlpha(body, 0.28);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="pointer-events-none absolute inset-x-8 top-6 h-40 rounded-full opacity-70"
        style={{
          background: `radial-gradient(ellipse at center, ${halo}, transparent 70%)`,
          animation: charging
            ? speed === "quick"
              ? "charge-halo 1.6s ease-in-out infinite"
              : "charge-halo 2.8s ease-in-out infinite"
            : "soft-breathe 5s ease-in-out infinite",
        }}
      />

      <div className="relative">
        {vehicle.pictureUrl ? (
          // Official Peugeot 3D asset (includes correct paint).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.pictureUrl}
            alt={`${vehicle.model} ${vehicle.color}`}
            className="relative z-[1] mx-auto h-auto w-full max-w-sm object-contain drop-shadow-lg"
            style={{ animation: "rise-in 0.7s cubic-bezier(0.22,1,0.36,1) both" }}
          />
        ) : (
          <svg
            viewBox="0 0 640 280"
            className="relative z-[1] h-auto w-full"
            role="img"
            aria-label={`${vehicle.model} ${vehicle.nickname}`}
          >
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={bodyLight} />
                <stop offset="45%" stopColor={body} />
                <stop offset="100%" stopColor={body} />
              </linearGradient>
              <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7ec8d4" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#2a5a68" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <ellipse cx="320" cy="248" rx="210" ry="14" fill="rgba(0,0,0,0.35)" />
            <path
              d="M92 188c8-38 28-62 58-78 42-22 96-34 168-36h78c54 2 98 14 128 42 18 16 34 40 42 68l6 16H86l6-12Z"
              fill="url(#bodyGrad)"
              stroke="rgba(143,168,181,0.35)"
              strokeWidth="1.5"
            />
            <path
              d="M168 112c28-28 68-42 122-44h54c48 2 86 16 108 42l8 12H176l-8-10Z"
              fill="url(#glassGrad)"
              stroke="rgba(143,168,181,0.28)"
              strokeWidth="1"
            />
            <path
              d="M110 168h430"
              stroke="rgba(95,227,192,0.22)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M508 168c18 2 28 10 32 22h-48c0-10 6-18 16-22Z"
              fill={locked ? "#5fe3c0" : "#e8b86d"}
              opacity={0.85}
            />
            <path
              d="M96 170c-8 2-12 10-12 20h36c-2-12-10-18-24-20Z"
              fill="#e07a6a"
              opacity={0.75}
            />
            <circle
              cx="180"
              cy="210"
              r="34"
              fill="#0a1218"
              stroke="#8fa8b5"
              strokeWidth="3"
            />
            <circle
              cx="180"
              cy="210"
              r="14"
              fill="#1c2e38"
              stroke="rgba(95,227,192,0.35)"
              strokeWidth="2"
            />
            <circle
              cx="460"
              cy="210"
              r="34"
              fill="#0a1218"
              stroke="#8fa8b5"
              strokeWidth="3"
            />
            <circle
              cx="460"
              cy="210"
              r="14"
              fill="#1c2e38"
              stroke="rgba(95,227,192,0.35)"
              strokeWidth="2"
            />
            {climateOn ? (
              <g opacity="0.55" stroke="#5fe3c0" strokeWidth="1.5" fill="none">
                <path d="M300 96c8-10 18-10 26 0" />
                <path d="M312 88c8-10 18-10 26 0" />
              </g>
            ) : null}
          </svg>
        )}

        {plugged ? (
          <ChargeCableOverlay
            charging={charging}
            complete={vehicle.chargeStatus === "complete"}
            speed={speed}
          />
        ) : null}
      </div>

      <div className="relative z-[2] -mt-2 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight tabular-nums leading-none">
            {Math.round(vehicle.batteryPercent)}
            <span className="text-2xl" style={{ color: accent }}>
              %
            </span>
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {vehicle.rangeKm} km · {locked ? "Verriegelt" : "Entriegelt"}
            {charging
              ? ` · ${chargeSpeedLabel(speed)}`
              : plugged
                ? " · Angeschlossen"
                : ""}
            {climateOn ? " · Klima an" : ""}
          </p>
          {charging && vehicle.chargePowerKw != null ? (
            <p
              className="mt-1 text-xs font-semibold tabular-nums"
              style={{
                color: speed === "quick" ? "var(--warn)" : "var(--accent-bright)",
                animation: "soft-breathe 2.4s ease-in-out infinite",
              }}
            >
              {vehicle.chargePowerKw.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
              })}{" "}
              kW
              {vehicle.chargeLimitKnown
                ? vehicle.chargeLimitPercent <= 80
                  ? " · Ziel 80%"
                  : " · Ziel voll"
                : ""}
            </p>
          ) : null}
        </div>
        <div className="text-right text-xs text-[var(--fg-muted)]">
          <p className="flex items-center justify-end gap-2 uppercase tracking-[0.2em]">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--line)]"
              style={{ background: body }}
              aria-hidden
            />
            {vehicle.color}
          </p>
          <p className="mt-1 tabular-nums">
            {vehicle.mileageKm.toLocaleString("de-DE")} km
          </p>
        </div>
      </div>
    </div>
  );
}

/** Animated CCS-style cable — Slow (calm teal) vs Quick (faster amber). */
function ChargeCableOverlay({
  charging,
  complete,
  speed,
}: {
  charging: boolean;
  complete: boolean;
  speed: ChargeSpeedMode;
}) {
  const active = charging;
  const quick = speed === "quick";
  const energy = quick ? "#e8b86d" : "#5fe3c0";
  const energyBright = quick ? "#ffe0a8" : "#a8fff0";
  const cableColor = active
    ? energy
    : complete
      ? "rgba(95,227,192,0.55)"
      : "rgba(143,168,181,0.65)";
  const postLabel = quick ? "DC" : "AC";

  return (
    <svg
      viewBox="0 0 400 220"
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="cableSheath" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a2832" />
          <stop offset="50%" stopColor="#2a3d4a" />
          <stop offset="100%" stopColor="#1a2832" />
        </linearGradient>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={energy} stopOpacity="0" />
          <stop offset="40%" stopColor={energy} stopOpacity="1" />
          <stop offset="100%" stopColor={energyBright} stopOpacity="0.2" />
        </linearGradient>
        <filter id="cableGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={quick ? 5 : 3.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="portGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={quick ? 5.5 : 4} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(18, 118)">
        <rect
          x="0"
          y="0"
          width="22"
          height="78"
          rx="4"
          fill="#121c24"
          stroke="rgba(143,168,181,0.35)"
          strokeWidth="1.2"
        />
        <rect
          x="5"
          y="10"
          width="12"
          height="18"
          rx="2"
          fill={
            active
              ? quick
                ? "rgba(232,184,109,0.28)"
                : "rgba(95,227,192,0.25)"
              : "rgba(143,168,181,0.12)"
          }
          stroke={cableColor}
          strokeWidth="1"
        />
        {active ? (
          <circle cx="11" cy="19" r="3" fill={energy} filter="url(#portGlow)">
            <animate
              attributeName="opacity"
              values="0.45;1;0.45"
              dur={quick ? "0.7s" : "1.4s"}
              repeatCount="indefinite"
            />
          </circle>
        ) : (
          <circle cx="11" cy="19" r="2.5" fill={cableColor} opacity="0.7" />
        )}
        <text
          x="11"
          y="48"
          textAnchor="middle"
          fill="rgba(143,168,181,0.55)"
          fontSize="7"
          fontFamily="system-ui,sans-serif"
        >
          {postLabel}
        </text>
      </g>

      <path
        d="M40 145 C 70 168, 110 188, 155 192 C 210 196, 255 175, 292 148"
        fill="none"
        stroke="url(#cableSheath)"
        strokeWidth={quick ? 8 : 7}
        strokeLinecap="round"
      />
      <path
        d="M40 145 C 70 168, 110 188, 155 192 C 210 196, 255 175, 292 148"
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={quick ? 9.5 : 8.5}
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M40 145 C 70 168, 110 188, 155 192 C 210 196, 255 175, 292 148"
        fill="none"
        stroke={cableColor}
        strokeWidth={quick ? 2.8 : 2.2}
        strokeLinecap="round"
        opacity={active ? 0.9 : 0.45}
        filter={active ? "url(#cableGlow)" : undefined}
      />

      {active ? (
        <>
          <path
            d="M40 145 C 70 168, 110 188, 155 192 C 210 196, 255 175, 292 148"
            fill="none"
            stroke="url(#energyGrad)"
            strokeWidth={quick ? 4 : 3}
            strokeLinecap="round"
            strokeDasharray={quick ? "14 10" : "10 18"}
            className={quick ? "charging-cable-flow-fast" : "charging-cable-flow"}
          />
          <path
            d="M40 145 C 70 168, 110 188, 155 192 C 210 196, 255 175, 292 148"
            fill="none"
            stroke={energyBright}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={quick ? "6 12" : "4 22"}
            className="charging-cable-flow-fast"
            opacity="0.95"
          />
        </>
      ) : null}

      <g
        transform="translate(286, 138)"
        filter={active ? "url(#portGlow)" : undefined}
      >
        <rect
          x="0"
          y="0"
          width="28"
          height="16"
          rx="3"
          fill="#0e1820"
          stroke={cableColor}
          strokeWidth="1.5"
        />
        <rect
          x="22"
          y="3"
          width="10"
          height="10"
          rx="2"
          fill={active ? energy : "#3a4d58"}
          opacity={active ? 0.95 : 0.8}
        />
        {active ? (
          <g>
            <circle cx="14" cy="8" r="2.2" fill="#031016" />
            <path
              d="M12.6 8.8 L14 5.8 L15.4 8.8 Z"
              fill="#031016"
              opacity="0.9"
            />
          </g>
        ) : null}
      </g>

      {active ? (
        <g transform="translate(308, 146)">
          <circle
            r="10"
            fill="none"
            stroke={energy}
            strokeWidth="1.2"
            className={quick ? "charge-ring charge-ring-fast" : "charge-ring"}
          />
          <circle
            r="10"
            fill="none"
            stroke={energy}
            strokeWidth="1"
            className={
              quick
                ? "charge-ring charge-ring-fast charge-ring-delay"
                : "charge-ring charge-ring-delay"
            }
          />
        </g>
      ) : null}

      {active ? (
        <g fill={energy} opacity="0.85">
          <circle cx="320" cy="128" r="1.8" className="charge-spark" />
          <circle
            cx="334"
            cy="136"
            r="1.4"
            className="charge-spark charge-spark-delay"
          />
          <circle
            cx="318"
            cy="158"
            r="1.2"
            className="charge-spark charge-spark-delay-2"
          />
        </g>
      ) : null}
    </svg>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return `rgba(95,227,192,${alpha})`;
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighten(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const ch = (i: number) => {
    const v = Number.parseInt(n.slice(i, i + 2), 16);
    return Math.min(255, Math.round(v + (255 - v) * amount))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

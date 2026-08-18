"use client";

import type { VehicleState } from "@/lib/types";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  normalizeChargeSpeedMode,
  type ChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";

/** Side-profile SUV — tinted to live paint, with official Peugeot render when available. */
export function VehicleHero({ vehicle }: { vehicle: VehicleState }) {
  const { t } = useI18n();
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

  const statusParts: string[] = [
    locked ? t("dash.locked") : t("dash.unlocked"),
  ];
  if (charging) statusParts.push(t("dash.charging"));
  else if (plugged) statusParts.push(t("dash.plugged"));
  if (climateOn) statusParts.push(t("dash.climateOnShort"));

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden">
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

      <div className="relative mx-auto w-full max-w-sm overflow-hidden">
        {vehicle.pictureUrl ? (
          // Official Peugeot 3D asset (includes correct paint).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.pictureUrl}
            alt={`${vehicle.model} ${vehicle.color}`}
            className="relative z-[1] h-auto w-full object-contain drop-shadow-lg"
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
            <rect
              x="392"
              y="152"
              width="18"
              height="5"
              rx="2"
              fill="rgba(200,220,230,0.45)"
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

        {/* TEMP: charge cable overlay disabled until port alignment is settled */}
        {false && plugged ? (
          <ChargeCableOverlay
            charging={charging}
            complete={vehicle.chargeStatus === "complete"}
            speed={speed}
          />
        ) : null}
      </div>

      <div className="relative z-[2] -mt-1 px-1">
        <div className="flex items-end justify-between gap-4">
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight tabular-nums leading-none">
            {Math.round(vehicle.batteryPercent)}
            <span className="text-2xl" style={{ color: accent }}>
              %
            </span>
          </p>
          <div className="pb-1 text-right">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums leading-none">
              {vehicle.rangeKm}
              <span className="ml-1 text-sm font-medium text-[var(--fg-muted)]">
                km
              </span>
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-[var(--fg-muted)]">
              {vehicle.mileageKm.toLocaleString("de-DE")} km gesamt
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-sm text-[var(--fg-muted)]">
          {statusParts.map((part, i) => (
            <span key={part}>
              {i > 0 ? " · " : null}
              {part === "Lädt" ? (
                <span
                  className="font-semibold"
                  style={{
                    color:
                      speed === "quick"
                        ? "var(--warn)"
                        : "var(--accent-bright)",
                  }}
                >
                  Lädt
                  {vehicle.chargePowerKw != null
                    ? ` ${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`
                    : ""}
                </span>
              ) : (
                part
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/**
 * Cable only — plugs into the rear driver-side charge port (above the rear
 * wheel arch), drops to the ground, waves along the floor, then exits right.
 * Coordinates match the official Peugeot render (600×360).
 */
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
      : "rgba(143,168,181,0.7)";

  const portX = 444;
  const portY = 141;
  const floorY = 335;
  const cablePath = [
    `M ${portX} ${portY}`,
    `C ${portX + 2} ${portY + 70}, ${portX + 2} ${portY + 140}, ${portX + 6} ${floorY}`,
    `C ${portX + 80} ${floorY + 18}, ${portX + 130} ${floorY - 16}, ${portX + 200} ${floorY + 5}`,
    `C ${portX + 290} ${floorY + 18}, ${portX + 380} ${floorY - 14}, ${portX + 500} ${floorY + 3}`,
    `C 1400 ${floorY + 14}, 2400 ${floorY - 8}, 4200 ${floorY}`,
  ].join(" ");

  return (
    <svg
      viewBox="0 0 600 360"
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="cableSheath" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2a3d4a" />
          <stop offset="55%" stopColor="#1a2832" />
          <stop offset="100%" stopColor="#243542" />
        </linearGradient>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={energyBright} stopOpacity="0.15" />
          <stop offset="45%" stopColor={energy} stopOpacity="1" />
          <stop offset="100%" stopColor={energy} stopOpacity="0" />
        </linearGradient>
        <filter id="cableGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={quick ? 5 : 3.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={cablePath}
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={quick ? 16 : 14}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
        transform="translate(0 4)"
      />
      <path
        d={cablePath}
        fill="none"
        stroke="url(#cableSheath)"
        strokeWidth={quick ? 12 : 11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={cablePath}
        fill="none"
        stroke={cableColor}
        strokeWidth={quick ? 3.8 : 3.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 0.95 : 0.5}
        filter={active ? "url(#cableGlow)" : undefined}
      />

      {active ? (
        <>
          <path
            d={cablePath}
            fill="none"
            stroke="url(#energyGrad)"
            strokeWidth={quick ? 5.5 : 4.5}
            strokeLinecap="round"
            strokeDasharray={quick ? "20 14" : "14 24"}
            className={
              quick ? "charging-cable-flow-fast" : "charging-cable-flow"
            }
          />
          <path
            d={cablePath}
            fill="none"
            stroke={energyBright}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={quick ? "8 16" : "6 28"}
            className="charging-cable-flow-fast"
            opacity="0.95"
          />
        </>
      ) : null}

      <circle
        cx={portX}
        cy={portY}
        r={active ? 6.5 : 5}
        fill={active ? energy : "#1a2832"}
        stroke={cableColor}
        strokeWidth="2"
        opacity={active ? 0.95 : 0.75}
        filter={active ? "url(#cableGlow)" : undefined}
      />
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

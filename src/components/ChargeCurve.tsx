"use client";

import type { ChargeSample } from "@/lib/vehicle/repository";
import { chargingRateKmhToKw } from "@/lib/stellantis/charge-power";

interface ChargeCurveProps {
  samples: ChargeSample[];
  live?: boolean;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000,
    ),
  );
  if (mins < 60) return `${mins} Min.`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} Std. ${m} Min.` : `${h} Std.`;
}

function formatKw(kw: number): string {
  return `${kw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`;
}

/** Prefer measured kW; fall back to Tempo (km/h) → kW. */
function samplePowerKw(s: ChargeSample): number | null {
  if (
    s.chargePowerKw != null &&
    Number.isFinite(s.chargePowerKw) &&
    s.chargePowerKw > 0
  ) {
    return s.chargePowerKw;
  }
  if (
    s.chargeRateKmh != null &&
    Number.isFinite(s.chargeRateKmh) &&
    s.chargeRateKmh > 0
  ) {
    return chargingRateKmhToKw(s.chargeRateKmh, 6.3);
  }
  return null;
}

type PowerPoint = {
  at: number;
  kw: number;
  percent: number;
  recordedAt: string;
  chargeStatus: string;
};

/** SVG Ladegeschwindigkeit — Leistung (kW) über die Session. */
export function ChargeCurve({ samples }: ChargeCurveProps) {
  const points: PowerPoint[] = [];
  for (const s of samples) {
    const kw = samplePowerKw(s);
    if (kw == null) continue;
    points.push({
      at: new Date(s.recordedAt).getTime(),
      kw,
      percent: s.batteryPercent,
      recordedAt: s.recordedAt,
      chargeStatus: s.chargeStatus,
    });
  }

  if (points.length < 2) {
    return (
      <div className="ui-surface px-4 py-4">
        <p className="text-sm font-semibold">Ladegeschwindigkeit</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Kurve erscheint beim nächsten Laden mit Leistungsdaten.
        </p>
      </div>
    );
  }

  const width = 360;
  const height = 160;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const tMin = points[0]!.at;
  const tMax = points[points.length - 1]!.at;
  const tSpan = Math.max(1, tMax - tMin);

  const kws = points.map((p) => p.kw);
  const peakKw = Math.max(...kws);
  const lastKw = kws[kws.length - 1]!;
  // Nice Y scale: 0 … ceil peak to a readable step.
  const yMaxRaw = Math.max(peakKw * 1.08, peakKw + 1);
  const step =
    yMaxRaw > 100 ? 25 : yMaxRaw > 40 ? 10 : yMaxRaw > 15 ? 5 : yMaxRaw > 5 ? 2 : 1;
  const yMax = Math.max(step, Math.ceil(yMaxRaw / step) * step);

  const xAt = (t: number) => padL + ((t - tMin) / tSpan) * plotW;
  const yAt = (kw: number) => padT + (1 - kw / yMax) * plotH;

  const line = points
    .map((p, i) => {
      const x = xAt(p.at);
      const y = yAt(p.kw);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${line} L${xAt(tMax).toFixed(1)},${(padT + plotH).toFixed(1)} L${xAt(tMin).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = Math.round(last.percent - first.percent);
  const yTicks = [0, yMax / 2, yMax].map((v) => Math.round(v * 10) / 10);
  const live = last.chargeStatus === "charging";

  return (
    <div className="ui-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Ladegeschwindigkeit</p>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            {live ? "" : "Letzte Session · "}
            {formatTime(first.recordedAt)}–{formatTime(last.recordedAt)} ·{" "}
            {formatDuration(first.recordedAt, last.recordedAt)}
          </p>
        </div>
        <div className="text-right text-xs tabular-nums text-[var(--fg-muted)]">
          <p>
            <span className="font-semibold text-[var(--accent-bright)]">
              Max. {formatKw(peakKw)}
            </span>
          </p>
          <p>
            {live ? "Jetzt" : "Ende"} {formatKw(lastKw)}
            {delta !== 0 ? (
              <>
                {" "}
                · {delta >= 0 ? "+" : ""}
                {delta}%
              </>
            ) : null}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Ladegeschwindigkeit, Maximum ${formatKw(peakKw)}`}
      >
        <defs>
          <linearGradient id="speedCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5fe3c0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5fe3c0" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="rgba(143,168,181,0.18)"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(143,168,181,0.7)"
                fontSize="9"
              >
                {tick % 1 === 0 ? String(tick) : tick.toLocaleString("de-DE")}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#speedCurveFill)" />
        <path
          d={line}
          fill="none"
          stroke="#5fe3c0"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={xAt(tMin)}
          cy={yAt(first.kw)}
          r="3.2"
          fill="#031016"
          stroke="#5fe3c0"
          strokeWidth="1.5"
        />
        <circle
          cx={xAt(tMax)}
          cy={yAt(last.kw)}
          r="3.5"
          fill="#5fe3c0"
        />

        <text
          x={padL}
          y={height - 8}
          fill="rgba(143,168,181,0.7)"
          fontSize="9"
        >
          {formatTime(first.recordedAt)} · {Math.round(first.percent)}%
        </text>
        <text
          x={width - padR}
          y={height - 8}
          textAnchor="end"
          fill="rgba(143,168,181,0.7)"
          fontSize="9"
        >
          {formatTime(last.recordedAt)} · {Math.round(last.percent)}%
        </text>
      </svg>
    </div>
  );
}

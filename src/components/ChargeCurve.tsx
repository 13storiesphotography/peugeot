"use client";

import type { ChargeSample } from "@/lib/vehicle/repository";

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

/** SVG charge curve from recorded samples (SoC over time). */
export function ChargeCurve({ samples }: ChargeCurveProps) {
  if (samples.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-5">
        <p className="text-sm font-semibold">Ladekurve</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Erscheint während des Ladens.
        </p>
      </div>
    );
  }

  const width = 360;
  const height = 160;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const times = samples.map((s) => new Date(s.recordedAt).getTime());
  const tMin = times[0]!;
  const tMax = times[times.length - 1]!;
  const tSpan = Math.max(1, tMax - tMin);

  const percents = samples.map((s) => s.batteryPercent);
  const pMin = Math.max(0, Math.floor(Math.min(...percents) / 5) * 5 - 5);
  const pMax = Math.min(100, Math.ceil(Math.max(...percents) / 5) * 5 + 5);
  const pSpan = Math.max(1, pMax - pMin);

  const xAt = (t: number) => padL + ((t - tMin) / tSpan) * plotW;
  const yAt = (p: number) => padT + (1 - (p - pMin) / pSpan) * plotH;

  const line = samples
    .map((s, i) => {
      const x = xAt(times[i]!);
      const y = yAt(s.batteryPercent);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const area = `${line} L${xAt(tMax).toFixed(1)},${(padT + plotH).toFixed(1)} L${xAt(tMin).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const delta = Math.round(last.batteryPercent - first.batteryPercent);
  const peakKw = samples.reduce(
    (max, s) =>
      s.chargePowerKw != null && s.chargePowerKw > max ? s.chargePowerKw : max,
    0,
  );
  const mode = last.chargingMode ?? first.chargingMode;

  const yTicks = [pMin, Math.round((pMin + pMax) / 2), pMax];

  return (
    <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Ladekurve</p>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            {formatTime(first.recordedAt)}–{formatTime(last.recordedAt)} ·{" "}
            {formatDuration(first.recordedAt, last.recordedAt)}
          </p>
        </div>
        <div className="text-right text-xs tabular-nums text-[var(--fg-muted)]">
          <p>
            <span className="font-semibold text-[var(--accent-bright)]">
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
          </p>
          {peakKw > 0 ? (
            <p>
              Peak{" "}
              {peakKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW
            </p>
          ) : null}
          {mode ? <p>{mode}</p> : null}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Ladekurve von ${Math.round(first.batteryPercent)}% auf ${Math.round(last.batteryPercent)}%`}
      >
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
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
                {tick}%
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#curveFill)" />
        <path
          d={line}
          fill="none"
          stroke="#5fe3c0"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* start/end dots */}
        <circle
          cx={xAt(tMin)}
          cy={yAt(first.batteryPercent)}
          r="3.2"
          fill="#031016"
          stroke="#5fe3c0"
          strokeWidth="1.5"
        />
        <circle
          cx={xAt(tMax)}
          cy={yAt(last.batteryPercent)}
          r="3.5"
          fill="#5fe3c0"
        />

        <text
          x={padL}
          y={height - 8}
          fill="rgba(143,168,181,0.7)"
          fontSize="9"
        >
          {formatTime(first.recordedAt)}
        </text>
        <text
          x={width - padR}
          y={height - 8}
          textAnchor="end"
          fill="rgba(143,168,181,0.7)"
          fontSize="9"
        >
          {formatTime(last.recordedAt)} · {Math.round(last.batteryPercent)}%
        </text>
      </svg>
    </div>
  );
}

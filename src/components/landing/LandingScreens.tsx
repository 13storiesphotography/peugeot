"use client";

import { useEffect, useState, useEffectEvent } from "react";

type ScreenId = "overview" | "charge" | "climate";

const tabs: { id: ScreenId; label: string; blurb: string }[] = [
  {
    id: "overview",
    label: "Übersicht",
    blurb: "Batterie, Reichweite und Schnellaktionen auf einem Screen.",
  },
  {
    id: "charge",
    label: "Laden",
    blurb: "Ladekurve, Wallbox und 80%-Limit, ohne App-Wirrwarr.",
  },
  {
    id: "climate",
    label: "Klima",
    blurb: "Vorklima starten und den Fortschritt live sehen.",
  },
];

function PhoneFrame({
  children,
  activeLabel,
}: {
  children: React.ReactNode;
  activeLabel: string;
}) {
  return (
    <div className="landing-phone relative mx-auto w-full max-w-[300px]">
      <div
        className="landing-phone-glow pointer-events-none absolute -inset-8 rounded-[3rem]"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[#08131d] shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[var(--fg-muted)]">
          <span>9:41</span>
          <span className="h-5 w-16 rounded-full bg-black/45" />
          <span>LTE</span>
        </div>
        <div
          className="landing-screen-swap flex min-h-[17.5rem] flex-col"
          key={activeLabel}
        >
          {children}
        </div>
        <div className="flex justify-around border-t border-[var(--line)] bg-[#071018]/95 px-2 py-2.5 text-[10px] font-semibold">
          {tabs.map((tab) => (
            <span
              key={tab.id}
              className={
                tab.label === activeLabel
                  ? "text-[var(--accent-bright)]"
                  : "text-[var(--fg-muted)]"
              }
            >
              {tab.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewScreen({ percent }: { percent: number }) {
  return (
    <>
      <div className="px-4 pb-3 pt-1">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--fg)]">
          E-3008
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums">
              {percent}
              <span className="text-lg text-[var(--fg-muted)]">%</span>
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">412 km Reichweite</p>
          </div>
          <p className="text-[10px] text-[var(--fg-muted)]">Verriegelt · Lädt</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="landing-charge-bar h-full rounded-full bg-[var(--accent-bright)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/30 p-3">
        <p className="text-[10px] text-[var(--fg-muted)]">Schnellaktionen</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Vorklima", "Entriegeln", "Finden"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--line)] bg-[#0d1b28] px-1 py-2.5 text-center text-[9px] font-semibold"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--accent-bright)]/35 bg-[var(--accent-bright)]/10 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-[var(--accent-bright)]">
          Lädt · Ziel 80%
        </p>
        <p className="text-[10px] text-[var(--fg-muted)]">Wallbox · +42 km/h</p>
      </div>
    </>
  );
}

function ChargeScreen({ percent }: { percent: number }) {
  return (
    <>
      <div className="px-4 pb-2 pt-1">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold">
          Laden
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
          {percent}%
        </p>
        <p className="text-[11px] text-[var(--fg-muted)]">Ziel 80% · Wallbox</p>
      </div>
      <div className="mx-4 mb-3 flex gap-2">
        <div className="flex-1 rounded-lg border border-[var(--accent-bright)] bg-[var(--accent-bright)]/15 px-2 py-2 text-center text-[9px] font-semibold text-[var(--accent-bright)]">
          Limit 80%
        </div>
        <div className="flex-1 rounded-lg border border-[var(--line)] px-2 py-2 text-center text-[9px] text-[var(--fg-muted)]">
          100%
        </div>
      </div>
      <div className="mx-4 mb-2 h-20 rounded-xl border border-[var(--line)] bg-black/25 p-2">
        <p className="text-[9px] text-[var(--fg-muted)]">Ladekurve</p>
        <svg viewBox="0 0 200 40" className="mt-1 h-10 w-full" aria-hidden>
          <polyline
            className="landing-curve-draw"
            fill="none"
            stroke="var(--accent-bright)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="0,35 40,28 80,18 120,14 160,12 200,10"
          />
        </svg>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg border border-[var(--line)] p-2">
          <p className="text-[var(--fg-muted)]">Leistung</p>
          <p className="font-semibold">7,4 kW</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] p-2">
          <p className="text-[var(--fg-muted)]">Fertig gegen</p>
          <p className="font-semibold">22:15</p>
        </div>
      </div>
    </>
  );
}

function ClimateScreen() {
  return (
    <>
      <div className="px-4 pb-2 pt-1">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold">
          Klima
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
          Vorklima
        </p>
        <p className="text-[11px] text-[var(--fg-muted)]">Innen 18°C · Außen 4°C</p>
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/30 p-5 text-center">
        <div className="landing-climate-orb mx-auto mb-3 h-14 w-14 rounded-full border border-[var(--accent-bright)]/45 bg-[var(--accent-bright)]/12" />
        <p className="text-[11px] font-semibold">Vorklima starten</p>
        <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
          Heizt oder kühlt vor Abfahrt
        </p>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-3 py-2.5">
        <p className="text-[10px] font-semibold text-[var(--warn)]">Vorklima läuft</p>
        <p className="text-[9px] text-[var(--fg-muted)]">Noch ca. 8 Min.</p>
      </div>
    </>
  );
}

export function LandingScreens({
  compact = false,
  autoCycle = true,
}: {
  compact?: boolean;
  autoCycle?: boolean;
}) {
  const [active, setActive] = useState<ScreenId>("overview");
  const [percent, setPercent] = useState(62);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]!;

  const onTick = useEffectEvent(() => {
    setPercent((p) => (p >= 79 ? 62 : p + 1));
  });

  const onCycle = useEffectEvent(() => {
    setActive((current) => {
      const idx = tabs.findIndex((t) => t.id === current);
      return tabs[(idx + 1) % tabs.length]!.id;
    });
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(onTick, 900);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoCycle) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(onCycle, 4200);
    return () => window.clearInterval(id);
  }, [autoCycle]);

  return (
    <div className={compact ? "" : "grid items-center gap-10 lg:grid-cols-[1fr_320px]"}>
      {!compact ? (
        <div className="max-w-md">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            Die App, die du öffnest
          </h2>
          <p className="mt-3 text-[var(--fg-muted)]">
            Vier Tabs. Große Aktionen. Live-Status vom Fahrzeug, ohne Umwege.
          </p>
          <div className="mt-8 space-y-2" role="tablist" aria-label="App-Bereiche">
            {tabs.map((tab) => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(tab.id)}
                  className={`action-btn w-full rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[var(--accent-bright)]/50 bg-[var(--accent-bright)]/10"
                      : "border-[var(--line)] bg-transparent hover:border-[var(--accent-bright)]/30"
                  }`}
                >
                  <span className="block font-semibold text-[var(--fg)]">
                    {tab.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--fg-muted)]">
                    {tab.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <PhoneFrame activeLabel={activeTab.label}>
          {active === "overview" ? <OverviewScreen percent={percent} /> : null}
          {active === "charge" ? <ChargeScreen percent={percent} /> : null}
          {active === "climate" ? <ClimateScreen /> : null}
        </PhoneFrame>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

type ScreenId = "overview" | "charge" | "climate";

const tabs: { id: ScreenId; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "charge", label: "Laden" },
  { id: "climate", label: "Klima" },
];

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-[var(--accent-bright)]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[#0a1622] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[var(--fg-muted)]">
          <span>9:41</span>
          <span className="h-5 w-16 rounded-full bg-black/40" />
          <span>LTE</span>
        </div>
        {children}
        <div className="flex justify-around border-t border-[var(--line)] bg-[#071018]/90 px-2 py-2.5 text-[10px] font-semibold">
          {tabs.map((tab) => (
            <span
              key={tab.id}
              className={
                tab.id === "overview"
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

function OverviewScreen() {
  return (
    <>
      <div className="px-4 pb-3 pt-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          E-3008
        </p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold">
              68<span className="text-lg text-[var(--fg-muted)]">%</span>
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">412 km Reichweite</p>
          </div>
          <p className="text-[10px] text-[var(--fg-muted)]">Verriegelt · Lädt</p>
        </div>
        <div className="mt-3 h-16 rounded-xl bg-gradient-to-r from-[#1f6f5f]/40 to-[#5fe3c0]/20" />
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/25 p-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
          Schnellaktionen
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Vorklima", "Entriegeln", "Finden"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--line)] bg-[#0d1b28] px-1 py-2 text-center text-[9px] font-semibold"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--accent-bright)]/30 bg-[var(--accent-bright)]/10 px-3 py-2">
        <p className="text-[11px] font-semibold text-[var(--accent-bright)]">
          Lädt · 68% · Ziel 80%
        </p>
        <p className="text-[10px] text-[var(--fg-muted)]">Wallbox · +42 km/h</p>
      </div>
    </>
  );
}

function ChargeScreen() {
  return (
    <>
      <div className="px-4 pb-2 pt-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          Laden
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
          68%
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
      <div className="mx-4 mb-2 h-20 rounded-xl border border-[var(--line)] bg-black/20 p-2">
        <p className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">
          Ladekurve
        </p>
        <svg viewBox="0 0 200 40" className="mt-1 h-10 w-full">
          <polyline
            fill="none"
            stroke="var(--accent-bright)"
            strokeWidth="2"
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
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          Klima
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold">
          Vorklima
        </p>
        <p className="text-[11px] text-[var(--fg-muted)]">Innen 18°C · Außen 4°C</p>
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/25 p-4 text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full border-2 border-[var(--accent-bright)]/50 bg-[var(--accent-bright)]/10" />
        <p className="text-[11px] font-semibold">Vorklima starten</p>
        <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
          Heizt oder kühlt vor Abfahrt
        </p>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-3 py-2">
        <p className="text-[10px] font-semibold text-[var(--warn)]">
          Vorklima läuft
        </p>
        <p className="text-[9px] text-[var(--fg-muted)]">Noch ca. 8 Min.</p>
      </div>
    </>
  );
}

const screens: Record<ScreenId, () => React.ReactNode> = {
  overview: OverviewScreen,
  charge: ChargeScreen,
  climate: ClimateScreen,
};

export function LandingScreens() {
  const [active, setActive] = useState<ScreenId>("overview");
  const Screen = screens[active];

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === tab.id
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "border border-[var(--line)] text-[var(--fg-muted)] hover:border-[var(--accent-bright)]/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <PhoneFrame>
        <Screen />
      </PhoneFrame>
    </div>
  );
}

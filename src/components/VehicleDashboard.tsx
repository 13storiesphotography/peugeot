"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ActivityLog } from "@/components/ActivityLog";
import { ChargePanel } from "@/components/ChargePanel";
import { ClimatePanel } from "@/components/ClimatePanel";
import {
  ControlBottomNav,
  type ControlTab,
} from "@/components/ControlBottomNav";
import { ControlsPanel } from "@/components/ControlsPanel";
import { QuickActions } from "@/components/QuickActions";
import { SchedulePanel } from "@/components/SchedulePanel";
import { VehicleHero } from "@/components/VehicleHero";
import type { VehicleCommand } from "@/lib/types";
import type { VehicleBundle } from "@/lib/vehicle/repository";

function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

const TAB_QUERY = "tab";

function readTab(): ControlTab {
  if (typeof window === "undefined") return "home";
  const value = new URLSearchParams(window.location.search).get(TAB_QUERY);
  if (
    value === "climate" ||
    value === "charge" ||
    value === "controls" ||
    value === "schedule"
  ) {
    return value;
  }
  return "home";
}

export function VehicleDashboard({ initial }: { initial: VehicleBundle }) {
  const [bundle, setBundle] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ControlTab>("home");

  useEffect(() => {
    setTab(readTab());
  }, []);

  const selectTab = (next: ControlTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "home") url.searchParams.delete(TAB_QUERY);
    else url.searchParams.set(TAB_QUERY, next);
    window.history.replaceState({}, "", url.toString());
  };

  const vehicle = bundle.vehicle;

  const refresh = useCallback(async (forceSync = false) => {
    const qs = forceSync ? "?sync=1" : "";
    const res = await fetch(`/api/vehicle${qs}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as VehicleBundle;
    startTransition(() => setBundle(data));
  }, []);

  useEffect(() => {
    // Immediate live pull once on mount when connected.
    if (initial.connection.connected) {
      void refresh(true);
    }
  }, [initial.connection.connected, refresh]);

  useEffect(() => {
    const live = bundle.connection.connected;
    const charging = bundle.vehicle.chargeStatus === "charging";
    // Live + charging: poll + force sync cadence ~20s. Demo: soft 8s tick.
    const intervalMs = live ? (charging ? 20_000 : 45_000) : 10_000;
    const id = window.setInterval(() => {
      void refresh(live);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [
    bundle.connection.connected,
    bundle.vehicle.chargeStatus,
    refresh,
  ]);

  const runCommand = async (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number; targetTempC?: number },
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/vehicle/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          chargeLimitPercent: opts?.chargeLimitPercent,
          targetTempC: opts?.targetTempC,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message: string;
        vehicle: VehicleBundle["vehicle"];
      };
      setBundle((prev) => ({
        ...prev,
        vehicle: data.vehicle,
        activity: [
          {
            id: crypto.randomUUID(),
            command,
            message: data.message,
            ok: data.ok,
            createdAt: new Date().toISOString(),
          },
          ...prev.activity,
        ].slice(0, 12),
      }));
      setMessage(data.message);
      void refresh();
    } catch {
      setMessage("Befehl fehlgeschlagen – bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  const climateOn = vehicle.climateStatus !== "off";
  const charging = vehicle.chargeStatus === "charging";
  const plugged = vehicle.chargeStatus !== "idle";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-28 pt-2 sm:max-w-xl sm:px-6">
      <header className="animate-rise flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
            Peugeot
          </p>
          <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {vehicle.nickname}
          </h1>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {vehicle.mode === "demo" ? "Demo" : "Live"} · aktualisiert{" "}
            {formatUpdated(vehicle.lastUpdatedAt)}
            {isPending ? " · sync…" : ""}
          </p>
        </div>
        <Link
          href="/control/settings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)]"
          aria-label="Einstellungen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </header>

      {tab === "home" ? (
        <div className="animate-rise-delay-1 space-y-6 pt-2">
          <VehicleHero vehicle={vehicle} />
          <QuickActions
            locked={vehicle.locked}
            climateOn={climateOn}
            charging={charging}
            plugged={plugged}
            busy={busy}
            onCommand={(command) => void runCommand(command)}
            onOpenClimate={() => selectTab("climate")}
          />
          {message ? (
            <p
              role="status"
              className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--accent-bright)]"
            >
              {message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => selectTab("charge")}
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] px-4 py-3 text-left"
            style={{ background: "rgba(14,28,40,0.4)" }}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                Laden
              </p>
              <p className="mt-1 text-sm font-semibold">
                {charging
                  ? `Lädt · Limit ${vehicle.chargeLimitPercent}%`
                  : plugged
                    ? `Bereit · Limit ${vehicle.chargeLimitPercent}%`
                    : "Nicht angeschlossen"}
              </p>
            </div>
            <span className="text-[var(--accent-bright)]">→</span>
          </button>
          <div className="rounded-2xl border border-[var(--line)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Standort
            </p>
            <p className="mt-1 text-sm font-medium">{vehicle.location.address}</p>
          </div>
          <ActivityLog items={bundle.activity.slice(0, 5)} />
        </div>
      ) : null}

      {tab === "climate" ? (
        <ClimatePanel
          vehicle={vehicle}
          busy={busy}
          onCommand={(command, opts) => void runCommand(command, opts)}
        />
      ) : null}

      {tab === "charge" ? (
        <ChargePanel
          vehicle={vehicle}
          busy={busy}
          onCommand={(command, opts) => void runCommand(command, opts)}
        />
      ) : null}

      {tab === "controls" ? (
        <ControlsPanel
          vehicle={vehicle}
          busy={busy}
          onCommand={(command) => void runCommand(command)}
        />
      ) : null}

      {tab === "schedule" ? (
        <div className="animate-rise space-y-4 pt-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Planen
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Laden und Klima nach deinem Alltag.
            </p>
          </div>
          <SchedulePanel
            schedules={bundle.schedules}
            onChanged={() => void refresh()}
          />
        </div>
      ) : null}

      {tab !== "home" && message ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--accent-bright)]"
        >
          {message}
        </p>
      ) : null}

      <ControlBottomNav tab={tab} onChange={selectTab} />
    </div>
  );
}

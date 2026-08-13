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
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ControlTab>("home");
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

  useEffect(() => {
    setTab(readTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selectTab = (next: ControlTab) => {
    setToast(null);
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

  const executeCommand = async (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number; targetTempC?: number },
  ) => {
    setBusy(true);
    setToast(null);
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
      setToast({ text: data.message, ok: data.ok });
      void refresh();
    } catch {
      setToast({
        text: "Befehl fehlgeschlagen – bitte erneut versuchen.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  };

  const runCommand = (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number; targetTempC?: number },
  ) => {
    if (command === "unlock") {
      setUnlockConfirmOpen(true);
      return;
    }
    void executeCommand(command, opts);
  };

  const confirmUnlock = () => {
    setUnlockConfirmOpen(false);
    void executeCommand("unlock");
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
                  ? `Lädt${vehicle.chargePowerKw != null ? ` · ${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW` : ""}${vehicle.chargeRateKmh != null ? ` (${Math.round(vehicle.chargeRateKmh)} km/h)` : ""}`
                  : plugged
                    ? vehicle.chargeLimitKnown
                      ? `Bereit · Limit ${vehicle.chargeLimitPercent}%`
                      : "Bereit · Limit unbekannt"
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
          schedules={bundle.schedules}
          onCommand={(command, opts) => void runCommand(command, opts)}
          onSchedulesChanged={() => void refresh()}
        />
      ) : null}

      {tab === "charge" ? (
        <ChargePanel
          vehicle={vehicle}
          busy={busy}
          chargeCurve={bundle.chargeCurve}
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
              Beliebig viele Pläne für Laden, Vorklima und Akku-Vorwärmung.
              Zeit und Wochentage je Plan — unter Klima auch direkt editierbar.
            </p>
          </div>
          <SchedulePanel
            schedules={bundle.schedules}
            onChanged={() => void refresh()}
            hint="Tipp: Für unterschiedliche Routinen einfach mehrere Vorklima-Pläne anlegen (Werktag / Wochenende)."
          />
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4"
        >
          <p
            className="max-w-sm rounded-full border px-4 py-2.5 text-center text-sm shadow-lg"
            style={{
              background: "rgba(7, 16, 24, 0.94)",
              borderColor: toast.ok
                ? "rgba(95,227,192,0.4)"
                : "rgba(224,122,106,0.45)",
              color: toast.ok ? "var(--accent-bright)" : "var(--danger)",
            }}
          >
            {toast.text}
          </p>
        </div>
      ) : null}

      {unlockConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 px-4 pb-28 sm:items-center sm:pb-4"
          role="presentation"
          onClick={() => setUnlockConfirmOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unlock-confirm-title"
            aria-describedby="unlock-confirm-desc"
            className="animate-rise w-full max-w-sm rounded-[1.5rem] border border-[var(--line)] p-5 shadow-2xl"
            style={{ background: "rgba(10, 20, 30, 0.97)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="unlock-confirm-title"
              className="font-[family-name:var(--font-display)] text-xl font-semibold"
            >
              Wirklich entriegeln?
            </p>
            <p
              id="unlock-confirm-desc"
              className="mt-2 text-sm text-[var(--fg-muted)]"
            >
              Die Türen werden geöffnet. Nur bestätigen, wenn du in der Nähe
              bist.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="action-btn rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold"
                onClick={() => setUnlockConfirmOpen(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={busy}
                className="action-btn rounded-full px-4 py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #e8b86d, #d4924a)",
                  color: "#1a1005",
                }}
                onClick={confirmUnlock}
              >
                Entriegeln
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ControlBottomNav tab={tab} onChange={selectTab} />
    </div>
  );
}

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
import { LocationLink } from "@/components/LocationLink";
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

function formatAge(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return "gerade eben";
  if (mins === 1) return "vor 1 Min.";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? "vor 1 Std." : `vor ${hours} Std.`;
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
    const ms = /neu verbinden|abgelaufen/i.test(toast.text) ? 6000 : 2500;
    const id = window.setTimeout(() => setToast(null), ms);
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
    if (!res.ok) {
      setToast({
        text: "Aktualisierung fehlgeschlagen.",
        ok: false,
      });
      return;
    }
    const data = (await res.json()) as VehicleBundle;
    startTransition(() => setBundle(data));
    if (data.syncError) {
      setToast({ text: data.syncError, ok: false });
    }
  }, []);

  useEffect(() => {
    // Immediate live pull once on mount when connected (and auth still valid).
    if (initial.connection.connected && !initial.connection.needsReconnect) {
      void refresh(true);
    }
  }, [initial.connection.connected, initial.connection.needsReconnect, refresh]);

  useEffect(() => {
    const live = bundle.connection.connected;
    if (live && bundle.connection.needsReconnect) {
      return;
    }
    const intervalSec = Math.max(
      15,
      bundle.connection.syncIntervalSec || 45,
    );
    // Demo tick stays snappy; live uses the configured interval.
    const intervalMs = live ? intervalSec * 1000 : 10_000;
    const id = window.setInterval(() => {
      void refresh(live);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [
    bundle.connection.connected,
    bundle.connection.needsReconnect,
    bundle.connection.syncIntervalSec,
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
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="mt-1 block text-left text-xs text-[var(--fg-muted)]"
            title="Tippen zum Aktualisieren"
          >
            <span className="block">
              Fahrzeugdaten {formatUpdated(vehicle.lastUpdatedAt)}
              <span className="text-[var(--fg-muted)]/80">
                {" "}
                ({formatAge(vehicle.lastUpdatedAt)})
              </span>
            </span>
            <span className="mt-0.5 block">
              App-Abruf{" "}
              {bundle.connection.lastSyncAt
                ? formatUpdated(bundle.connection.lastSyncAt)
                : "—"}
              {isPending ? "…" : ""}
            </span>
          </button>
        </div>
        <Link
          href="/control/settings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)]"
          aria-label="Einstellungen"
          title="Einstellungen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M19.4 13.1a7.7 7.7 0 0 0 .1-1.1 7.7 7.7 0 0 0-.1-1.1l1.8-1.4-1.7-3-2.1.7a7.4 7.4 0 0 0-1.9-1.1L15.2 3h-3.4l-.3 2.2a7.4 7.4 0 0 0-1.9 1.1l-2.1-.7-1.7 3 1.8 1.4a7.7 7.7 0 0 0-.1 1.1c0 .4 0 .7.1 1.1L4.8 14.5l1.7 3 2.1-.7c.6.5 1.2.8 1.9 1.1l.3 2.2h3.4l.3-2.2c.7-.3 1.3-.6 1.9-1.1l2.1.7 1.7-3-1.8-1.4Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </header>

      {bundle.connection.needsReconnect ? (
        <div
          className="mb-3 rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(224,122,106,0.45)",
            background: "rgba(224,122,106,0.1)",
          }}
          role="alert"
        >
          <p className="font-semibold text-[var(--danger)]">
            MyPeugeot-Anmeldung abgelaufen
          </p>
          <p className="mt-1 text-[var(--fg-muted)]">
            Keine neuen Fahrzeugdaten, bis du dich erneut verbindest.{" "}
            <Link
              href="/control/settings"
              className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
            >
              Zu den Einstellungen
            </Link>
          </p>
        </div>
      ) : null}

      {tab === "home" ? (
        <div className="animate-rise-delay-1 space-y-6 pt-2">
          <VehicleHero vehicle={vehicle} />
          <QuickActions
            locked={vehicle.locked}
            climateOn={climateOn}
            busy={busy}
            onCommand={(command) => void runCommand(command)}
            onOpenClimate={() => selectTab("climate")}
          />
          <LocationLink location={vehicle.location} />
          <ActivityLog items={bundle.activity.slice(0, 3)} />
        </div>
      ) : null}

      {tab === "climate" ? (
        <ClimatePanel
          vehicle={vehicle}
          busy={busy}
          remoteReady={bundle.connection.remoteReady}
          onCommand={(command, opts) => void runCommand(command, opts)}
          onOpenSchedule={() => selectTab("schedule")}
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
        <div className="animate-rise space-y-6 pt-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              Planen
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Laden, Vorklima und Batterie
            </p>
          </div>
          <SchedulePanel
            schedules={bundle.schedules}
            onChanged={() => void refresh()}
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
                  background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                  color: "#031016",
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

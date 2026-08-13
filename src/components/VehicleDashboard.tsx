"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
  }).format(new Date(iso));
}

function ageMinutes(iso: string, nowMs = Date.now()): number {
  return Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 60_000),
  );
}

function formatAge(iso: string, nowMs = Date.now()): string {
  const mins = ageMinutes(iso, nowMs);
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
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ControlTab>("home");
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const refreshInFlight = useRef(false);
  const followUpTimer = useRef<number | null>(null);

  useEffect(() => {
    setTab(readTab());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = /neu verbinden|abgelaufen|Ruhemodus/i.test(toast.text)
      ? 5500
      : 2500;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (followUpTimer.current) window.clearTimeout(followUpTimer.current);
    };
  }, []);

  const selectTab = (next: ControlTab) => {
    setToast(null);
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "home") url.searchParams.delete(TAB_QUERY);
    else url.searchParams.set(TAB_QUERY, next);
    window.history.replaceState({}, "", url.toString());
  };

  const vehicle = bundle.vehicle;

  const refresh = useCallback(
    async (
      forceSync = false,
      opts?: { silent?: boolean; feedback?: boolean },
    ): Promise<VehicleBundle | null> => {
      if (refreshInFlight.current) {
        return null;
      }
      refreshInFlight.current = true;
      if (!opts?.silent) setRefreshing(true);
      try {
        const qs = forceSync ? "?sync=1" : "";
        const res = await fetch(`/api/vehicle${qs}`, { cache: "no-store" });
        if (!res.ok) {
          if (!opts?.silent) {
            setToast({
              text: "Aktualisierung fehlgeschlagen.",
              ok: false,
            });
          }
          return null;
        }
        const data = (await res.json()) as VehicleBundle;
        startTransition(() => setBundle(data));
        setNowMs(Date.now());
        if (data.syncError) {
          setToast({ text: data.syncError, ok: false });
        } else if (opts?.feedback) {
          const age = ageMinutes(data.vehicle.lastUpdatedAt);
          if (age >= 5) {
            setToast({
              text: `Stand noch ${formatAge(data.vehicle.lastUpdatedAt)} — Fahrzeug evtl. im Ruhemodus.`,
              ok: true,
            });
          } else {
            setToast({
              text: `Aktualisiert (${formatAge(data.vehicle.lastUpdatedAt)}).`,
              ok: true,
            });
          }
        }
        return data;
      } finally {
        refreshInFlight.current = false;
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [],
  );

  const manualRefresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    const data = await refresh(true, { feedback: true });
    if (!data || data.syncError) return;
    // Peugeot cache sometimes catches up a few seconds later.
    if (followUpTimer.current) window.clearTimeout(followUpTimer.current);
    followUpTimer.current = window.setTimeout(() => {
      void refresh(true, { silent: true });
    }, 8_000);
  }, [refresh]);

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
    const intervalMs = live ? intervalSec * 1000 : 10_000;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refresh(live);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Catch up immediately when returning to the app.
      void refresh(live);
    };

    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
      // Force Peugeot pull after remotes; status often lags a few seconds.
      window.setTimeout(() => {
        void refresh(true, { silent: true });
      }, 2_500);
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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6">
      <header className="animate-rise flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
            Peugeot
          </p>
          <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {vehicle.nickname}
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 text-xs text-[var(--fg-muted)]">
              {formatUpdated(vehicle.lastUpdatedAt)}
              <span className="text-[var(--fg-muted)]/80">
                {" "}
                · {formatAge(vehicle.lastUpdatedAt, nowMs)}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void manualRefresh()}
              disabled={refreshing || busy || bundle.connection.needsReconnect}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)] disabled:opacity-50"
              aria-label="Fahrzeugdaten aktualisieren"
              title="Jetzt aktualisieren"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className={refreshing || isPending ? "animate-spin" : undefined}
              >
                <path
                  d="M20 12a8 8 0 1 1-2.2-5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M20 5v5h-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <Link
          href="/control/settings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)]"
          aria-label="Einstellungen"
          title="Einstellungen"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="1.75"
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
            onChanged={() => void refresh(true, { silent: true })}
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

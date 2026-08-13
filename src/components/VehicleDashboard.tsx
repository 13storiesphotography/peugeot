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
import { SectionHeader } from "@/components/SectionHeader";
import { VehicleHero } from "@/components/VehicleHero";
import type { VehicleCommand } from "@/lib/types";
import type { VehicleBundle } from "@/lib/vehicle/repository";

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
  const [pendingConfirm, setPendingConfirm] = useState<
    null | "unlock" | "climate_start" | "flash"
  >(null);
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
    const ms = /neu verbinden|abgelaufen|Ruhemodus|Fernbedienung|Aufwecken|langsam/i.test(
      toast.text,
    )
      ? 6500
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
      opts?: { silent?: boolean; feedback?: boolean; hard?: boolean },
    ): Promise<VehicleBundle | null> => {
      if (refreshInFlight.current) {
        return null;
      }
      refreshInFlight.current = true;
      if (!opts?.silent) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (opts?.hard) params.set("hard", "1");
        else if (forceSync) params.set("sync", "1");
        const qs = params.toString() ? `?${params}` : "";
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
          const hard = data.hardRefresh;
          const age = hard?.ageMinutes ?? ageMinutes(data.vehicle.lastUpdatedAt);
          if (hard?.improved || age < 5) {
            setToast({
              text: `Aktualisiert (${formatAge(data.vehicle.lastUpdatedAt)}).`,
              ok: true,
            });
          } else if (hard?.wakeAttempted && hard.wakeOk) {
            setToast({
              text: `Stand noch ${formatAge(data.vehicle.lastUpdatedAt)} — Aufwecken gesendet, Peugeot meldet sich langsam.`,
              ok: true,
            });
          } else if (hard?.wakeAttempted && hard.wakeOk === false) {
            setToast({
              text: `Stand ${formatAge(data.vehicle.lastUpdatedAt)}. Aufwecken: ${hard.wakeSkippedReason ?? "fehlgeschlagen"}`,
              ok: false,
            });
          } else if (hard?.wakeSkippedReason) {
            setToast({
              text: `Stand ${formatAge(data.vehicle.lastUpdatedAt)}. ${hard.wakeSkippedReason}`,
              ok: true,
            });
          } else if (age >= 5) {
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
    setToast({ text: "Hole Fahrzeugdaten…", ok: true });
    await refresh(true, { feedback: true, hard: true });
  }, [refresh]);

  useEffect(() => {
    // Soft catch-up on mount. Force Peugeot only when SSR stand is already stale.
    if (!initial.connection.connected || initial.connection.needsReconnect) {
      return;
    }
    const intervalSec = Math.max(
      30,
      initial.connection.syncIntervalSec || 60,
    );
    const lastSyncMs = initial.connection.lastSyncAt
      ? new Date(initial.connection.lastSyncAt).getTime()
      : 0;
    const stale =
      !lastSyncMs || Date.now() - lastSyncMs > intervalSec * 1000;
    void refresh(stale, { silent: true });
  }, [
    initial.connection.connected,
    initial.connection.needsReconnect,
    initial.connection.lastSyncAt,
    initial.connection.syncIntervalSec,
    refresh,
  ]);

  useEffect(() => {
    const live = bundle.connection.connected;
    if (live && bundle.connection.needsReconnect) {
      return;
    }

    const configuredSec = Math.max(
      30,
      bundle.connection.syncIntervalSec || 60,
    );
    // While charging, check a bit more often — server still throttles Peugeot.
    const intervalSec =
      live && bundle.vehicle.chargeStatus === "charging"
        ? Math.min(configuredSec, 30)
        : configuredSec;
    const intervalMs = live ? intervalSec * 1000 : 10_000;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      // Soft poll: server decides whether Peugeot is due (avoids hammering).
      void refresh(false, { silent: true });
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const lastSyncMs = bundle.connection.lastSyncAt
        ? new Date(bundle.connection.lastSyncAt).getTime()
        : 0;
      const stale =
        !lastSyncMs || Date.now() - lastSyncMs > configuredSec * 1000;
      void refresh(stale, { silent: true });
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
    bundle.connection.lastSyncAt,
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
      // Force Peugeot pull after remotes; wakeup needs longer for a fresh stand.
      if (followUpTimer.current) window.clearTimeout(followUpTimer.current);
      followUpTimer.current = window.setTimeout(() => {
        followUpTimer.current = null;
        void refresh(true, {
          silent: true,
          hard: command === "wakeup",
        });
      }, command === "wakeup" ? 8_000 : 2_500);
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
    if (
      command === "unlock" ||
      command === "climate_start" ||
      command === "flash"
    ) {
      setPendingConfirm(command);
      return;
    }
    void executeCommand(command, opts);
  };

  const confirmPending = () => {
    if (!pendingConfirm) return;
    const command = pendingConfirm;
    setPendingConfirm(null);
    void executeCommand(command);
  };

  const confirmCopy =
    pendingConfirm === "unlock"
      ? {
          title: "Wirklich entriegeln?",
          body: "Die Türen werden entriegelt. Nur bestätigen, wenn du in der Nähe bist.",
          action: "Entriegeln",
        }
      : pendingConfirm === "climate_start"
        ? {
            title: "Vorklima wirklich starten?",
            body: "Die Fernvorklimatisierung schaltet sich ein und verbraucht Strom. Nur bestätigen, wenn das beabsichtigt ist.",
            action: "Vorklima starten",
          }
        : pendingConfirm === "flash"
          ? {
              title: "Fahrzeug wirklich finden?",
              body: "Lichter blinken — in ruhiger Umgebung oder nachts kann das stören. Nur bestätigen, wenn du das Auto suchen willst.",
              action: "Finden",
            }
          : null;

  const climateOn = vehicle.climateStatus !== "off";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col overflow-x-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6">
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
              Stand {formatAge(vehicle.lastUpdatedAt, nowMs)}
            </p>
            <button
              type="button"
              onClick={() => void manualRefresh()}
              disabled={refreshing || busy || bundle.connection.needsReconnect}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)] disabled:opacity-50"
              aria-label="Fahrzeugdaten aktualisieren"
              title="Fahrzeug wecken und Daten holen"
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
        <div className="ui-alert mb-3" role="alert">
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
            remoteReady={bundle.connection.remoteReady}
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
          schedules={bundle.schedules}
          onCommand={(command) => void runCommand(command)}
          onSchedulesChanged={() => void refresh(true, { silent: true })}
        />
      ) : null}

      {tab === "charge" ? (
        <ChargePanel vehicle={vehicle} chargeCurve={bundle.chargeCurve} />
      ) : null}

      {tab === "controls" ? (
        <ControlsPanel
          vehicle={vehicle}
          busy={busy}
          remoteReady={bundle.connection.remoteReady}
          onCommand={(command) => void runCommand(command)}
        />
      ) : null}

      {tab === "schedule" ? (
        <div className="animate-rise space-y-6 pt-2">
          <SectionHeader
            title="Planen"
            hint="Vorklima-Pläne vom Fahrzeug; App-Pläne startet die App zur Uhrzeit"
          />
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

      {pendingConfirm && confirmCopy ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 px-4 pb-28 sm:items-center sm:pb-4"
          role="presentation"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="action-confirm-title"
            aria-describedby="action-confirm-desc"
            className="animate-rise w-full max-w-sm rounded-[1.5rem] border border-[var(--line)] p-5 shadow-2xl"
            style={{ background: "rgba(10, 20, 30, 0.97)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="action-confirm-title"
              className="font-[family-name:var(--font-display)] text-xl font-semibold"
            >
              {confirmCopy.title}
            </p>
            <p
              id="action-confirm-desc"
              className="mt-2 text-sm text-[var(--fg-muted)]"
            >
              {confirmCopy.body}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="action-btn rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold"
                onClick={() => setPendingConfirm(null)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={busy}
                className="action-btn btn-primary rounded-full px-4 py-3 text-sm font-semibold"
                onClick={confirmPending}
              >
                {confirmCopy.action}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ControlBottomNav tab={tab} onChange={selectTab} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Peugeot supports 4 ThermalPrecond program slots. */
export const MAX_CLIMATE_SCHEDULES = 4;

const KIND_LABEL: Partial<Record<VehicleSchedule["kind"], string>> = {
  charge: "Laden starten",
  climate: "Vorklima",
};

interface SchedulePanelProps {
  schedules: VehicleSchedule[];
  onChanged: () => void;
  kinds?: VehicleSchedule["kind"][];
  title?: string;
  hint?: string;
  /** Pull onboard Peugeot Vorklima programs into the app. */
  onImportFromVehicle?: () => Promise<void>;
  importBusy?: boolean;
  editable?: boolean;
}

export function SchedulePanel({
  schedules,
  onChanged,
  kinds,
  title = "Vorklima-Pläne",
  hint,
  onImportFromVehicle,
  importBusy = false,
  editable = true,
}: SchedulePanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [local, setLocal] = useState(schedules);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocal(schedules);
  }, [schedules]);

  const visible = useMemo(() => {
    const base = kinds
      ? local.filter((item) => kinds.includes(item.kind))
      : local;
    return base.filter((item) => item.kind !== "battery_preheat");
  }, [local, kinds]);

  const climateCount = visible.filter((s) => s.kind === "climate").length;
  const atCap = climateCount >= MAX_CLIMATE_SCHEDULES;

  const kindOrdinal = (schedule: VehicleSchedule) => {
    const same = visible.filter((item) => item.kind === schedule.kind);
    if (same.length <= 1) return "";
    return ` ${same.findIndex((item) => item.id === schedule.id) + 1}`;
  };

  const applyWarning = (data: { vehicleSyncWarning?: string | null }) => {
    setNotice(data.vehicleSyncWarning ?? null);
  };

  const persist = async (schedule: VehicleSchedule) => {
    if (!editable) return;
    setBusyId(schedule.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/vehicle/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: schedule.id,
          enabled: schedule.enabled,
          timeLocal: schedule.timeLocal,
          daysOfWeek: schedule.daysOfWeek,
          payload: schedule.payload,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        vehicleSyncWarning?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      applyWarning(data);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (scheduleId: string) => {
    if (!editable) return;
    setBusyId(scheduleId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/vehicle/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const data = (await res.json()) as {
        error?: string;
        vehicleSyncWarning?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Löschen fehlgeschlagen");
      setLocal((prev) => prev.filter((item) => item.id !== scheduleId));
      applyWarning(data);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    if (!editable || atCap) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/vehicle/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "climate",
          enabled: true,
          payload: { source: "app" },
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        vehicleSyncWarning?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Anlegen fehlgeschlagen");
      applyWarning(data);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setCreating(false);
    }
  };

  const patchLocal = (id: string, patch: Partial<VehicleSchedule>) => {
    setLocal((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const toggleEnabled = (schedule: VehicleSchedule) => {
    const next = { ...schedule, enabled: !schedule.enabled };
    patchLocal(schedule.id, { enabled: next.enabled });
    void persist(next);
  };

  const setTime = (schedule: VehicleSchedule, timeLocal: string) => {
    patchLocal(schedule.id, { timeLocal });
  };

  const commitTime = (schedule: VehicleSchedule, timeLocal: string) => {
    if (timeLocal === schedule.timeLocal) return;
    void persist({ ...schedule, timeLocal });
  };

  const toggleDay = (schedule: VehicleSchedule, day: number) => {
    const has = schedule.daysOfWeek.includes(day);
    const daysOfWeek = has
      ? schedule.daysOfWeek.filter((d) => d !== day)
      : [...schedule.daysOfWeek, day].sort((a, b) => a - b);
    const next = { ...schedule, daysOfWeek };
    patchLocal(schedule.id, { daysOfWeek });
    void persist(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {hint ? (
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{hint}</p>
          ) : null}
        </div>
        {editable && onImportFromVehicle ? (
          <button
            type="button"
            disabled={importBusy}
            onClick={() => void onImportFromVehicle()}
            className="action-btn shrink-0 text-xs font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline disabled:opacity-45"
          >
            {importBusy ? "Lädt…" : "Vom Auto"}
          </button>
        ) : null}
      </div>

      {visible.map((schedule) => {
        const busy = busyId === schedule.id;
        return (
          <div
            key={schedule.id}
            className={`ui-surface px-4 py-4 ${
              schedule.enabled ? "ui-surface-active" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {KIND_LABEL[schedule.kind] ?? schedule.kind}
                  {kindOrdinal(schedule)}
                </p>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  {schedule.enabled ? "Aktiv" : "Pausiert"}
                  {busy ? " · Speichern…" : ""}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={schedule.enabled}
                aria-label="Zeitplan aktiv"
                disabled={!editable || busy}
                onClick={() => toggleEnabled(schedule)}
                className={`action-btn ui-switch${schedule.enabled ? " ui-switch-on" : ""}`}
              >
                <span className="ui-switch-knob" />
              </button>
            </div>

            {editable ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="time"
                    value={schedule.timeLocal}
                    disabled={busy}
                    onChange={(e) => setTime(schedule, e.target.value)}
                    onBlur={(e) => commitTime(schedule, e.target.value)}
                    className="ui-field w-auto"
                  />
                  <div className="flex flex-wrap gap-1">
                    {DAY_LABELS.map((label, dayIndex) => {
                      const day = dayIndex + 1;
                      const dayOn = schedule.daysOfWeek.includes(day);
                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={busy}
                          onClick={() => toggleDay(schedule, day)}
                          className={`action-btn ui-chip${dayOn ? " ui-chip-on" : ""}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(schedule.id)}
                  className="action-btn mt-3 text-xs font-semibold text-[var(--danger)] underline-offset-2 hover:underline"
                >
                  Löschen
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm tabular-nums text-[var(--fg-muted)]">
                {schedule.timeLocal} ·{" "}
                {schedule.daysOfWeek
                  .map((d) => DAY_LABELS[d - 1])
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
          </div>
        );
      })}

      {editable ? (
        <button
          type="button"
          disabled={creating || atCap}
          onClick={() => void add()}
          className="action-btn btn-secondary w-full rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          {creating
            ? "…"
            : atCap
              ? "Maximal 4 Pläne"
              : "+ Plan hinzufügen"}
        </button>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? (
        <p className="text-sm text-[var(--fg-muted)]">{notice}</p>
      ) : null}
    </div>
  );
}

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
  /** Limit to these kinds (e.g. climate-only under Klima). */
  kinds?: VehicleSchedule["kind"][];
  title?: string;
  hint?: string;
  compact?: boolean;
  /** Pull onboard Peugeot Vorklima programs into the app. */
  onImportFromVehicle?: () => Promise<void>;
  importBusy?: boolean;
  /** When false, editing is disabled (e.g. Free tier). */
  editable?: boolean;
}

export function SchedulePanel({
  schedules,
  onChanged,
  kinds,
  title,
  hint,
  compact = false,
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

  const addableKinds = (
    kinds?.length
      ? kinds
      : (["climate", "charge"] as VehicleSchedule["kind"][])
  ).filter((kind) => kind !== "battery_preheat");

  const kindCounts = useMemo(() => {
    const counts: Partial<Record<VehicleSchedule["kind"], number>> = {};
    for (const item of visible) {
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    }
    return counts;
  }, [visible]);

  const kindOrdinal = (schedule: VehicleSchedule) => {
    if ((kindCounts[schedule.kind] ?? 0) <= 1) return "";
    const n =
      visible
        .filter((item) => item.kind === schedule.kind)
        .findIndex((item) => item.id === schedule.id) + 1;
    return ` ${n}`;
  };

  const isFromVehicle = (schedule: VehicleSchedule) =>
    schedule.payload?.source === "vehicle";

  const applyWarning = (data: { vehicleSyncWarning?: string | null }) => {
    if (data.vehicleSyncWarning) {
      setNotice(data.vehicleSyncWarning);
    } else {
      setNotice(null);
    }
  };

  const save = async (schedule: VehicleSchedule) => {
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

  const add = async (kind: VehicleSchedule["kind"]) => {
    if (!editable) return;
    if (
      kind === "climate" &&
      (kindCounts.climate ?? 0) >= MAX_CLIMATE_SCHEDULES
    ) {
      setError("Maximal 4 Vorklima-Pläne (wie in MyPeugeot).");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const payload =
        kind === "charge" ? { chargeLimitPercent: 80 } : { source: "app" };
      const res = await fetch("/api/vehicle/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, enabled: true, payload }),
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

  const update = (id: string, patch: Partial<VehicleSchedule>) => {
    if (!editable) return;
    setLocal((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const toggleDay = (schedule: VehicleSchedule, day: number) => {
    const has = schedule.daysOfWeek.includes(day);
    const daysOfWeek = has
      ? schedule.daysOfWeek.filter((d) => d !== day)
      : [...schedule.daysOfWeek, day].sort((a, b) => a - b);
    update(schedule.id, { daysOfWeek });
  };

  return (
    <div className="space-y-4">
      {(title || hint) && (
        <div>
          {title ? (
            <h3
              className={
                compact
                  ? "text-sm font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]"
                  : "font-[family-name:var(--font-display)] text-xl font-semibold"
              }
            >
              {title}
            </h3>
          ) : null}
          {hint ? (
            <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>
          ) : null}
        </div>
      )}

      {editable && onImportFromVehicle ? (
        <button
          type="button"
          disabled={importBusy}
          onClick={() => void onImportFromVehicle()}
          className="action-btn btn-secondary w-full rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          {importBusy ? "Lade vom Fahrzeug…" : "Pläne vom Fahrzeug laden"}
        </button>
      ) : null}

      {visible.length === 0 ? (
        <p className="ui-surface px-4 py-5 text-sm text-[var(--fg-muted)]">
          Noch kein Zeitplan — vom Fahrzeug laden oder neu anlegen.
        </p>
      ) : null}

      {visible.map((schedule) => (
        <div key={schedule.id} className="ui-surface px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {KIND_LABEL[schedule.kind] ?? schedule.kind}
                {kindOrdinal(schedule)}
              </p>
              <p className="text-xs text-[var(--fg-muted)]">
                {schedule.enabled ? "Aktiv" : "Pausiert"}
                {isFromVehicle(schedule) ? " · vom Fahrzeug" : ""}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={schedule.enabled}
              aria-label="Zeitplan aktiv"
              disabled={!editable}
              onClick={() =>
                update(schedule.id, { enabled: !schedule.enabled })
              }
              className={`action-btn ui-switch${schedule.enabled ? " ui-switch-on" : ""}`}
            >
              <span className="ui-switch-knob" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="time"
              value={schedule.timeLocal}
              disabled={!editable}
              onChange={(e) =>
                update(schedule.id, { timeLocal: e.target.value })
              }
              className="ui-field w-auto disabled:opacity-55"
            />
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, dayIndex) => {
                const day = dayIndex + 1;
                const dayOn = schedule.daysOfWeek.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!editable}
                    onClick={() => toggleDay(schedule, day)}
                    className={`action-btn ui-chip${dayOn ? " ui-chip-on" : ""} disabled:opacity-55`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {editable ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === schedule.id}
                onClick={() => void save(schedule)}
                className="action-btn btn-secondary rounded-2xl px-4 py-2 text-xs font-semibold"
              >
                {busyId === schedule.id ? "Speichern…" : "Speichern"}
              </button>
              <button
                type="button"
                disabled={busyId === schedule.id}
                onClick={() => void remove(schedule.id)}
                className="action-btn btn-danger-soft rounded-2xl px-4 py-2 text-xs font-semibold"
              >
                Löschen
              </button>
            </div>
          ) : null}
        </div>
      ))}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          {addableKinds.map((kind) => {
            const atCap =
              kind === "climate" &&
              (kindCounts.climate ?? 0) >= MAX_CLIMATE_SCHEDULES;
            return (
              <button
                key={kind}
                type="button"
                disabled={creating || atCap}
                onClick={() => void add(kind)}
                className="action-btn btn-accent-soft rounded-2xl px-4 py-2.5 text-xs font-semibold"
              >
                {creating
                  ? "…"
                  : atCap
                    ? "Max. 4 Pläne"
                    : `+ ${KIND_LABEL[kind] ?? kind}`}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? (
        <p className="text-sm text-[var(--fg-muted)]">{notice}</p>
      ) : null}
    </div>
  );
}

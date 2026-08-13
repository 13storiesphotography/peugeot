"use client";

import { useEffect, useMemo, useState } from "react";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_LABEL: Partial<Record<VehicleSchedule["kind"], string>> = {
  charge: "Laden starten",
  climate: "Vorklima",
};

interface SchedulePanelProps {
  schedules: VehicleSchedule[];
  onChanged: () => void;
  /** Limit to these kinds (e.g. charge-only under Planen). */
  kinds?: VehicleSchedule["kind"][];
  title?: string;
  hint?: string;
  compact?: boolean;
}

export function SchedulePanel({
  schedules,
  onChanged,
  kinds,
  title,
  hint,
  compact = false,
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
      : local.filter((item) => item.kind !== "climate");
    return base.filter((item) => item.kind !== "battery_preheat");
  }, [local, kinds]);

  const addableKinds = (kinds?.length
    ? kinds
    : (["charge"] as VehicleSchedule["kind"][])
  ).filter((kind) => kind !== "battery_preheat" && kind !== "climate");

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

  const applyWarning = (data: { vehicleSyncWarning?: string | null }) => {
    if (data.vehicleSyncWarning) {
      setNotice(data.vehicleSyncWarning);
    } else {
      setNotice(null);
    }
  };

  const save = async (schedule: VehicleSchedule) => {
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
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const payload =
        kind === "charge" ? { chargeLimitPercent: 80 } : {};
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

      {visible.length === 0 ? (
        <p className="ui-surface px-4 py-5 text-sm text-[var(--fg-muted)]">
          Noch kein Ladezeitplan — neu hinzufügen.
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
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={schedule.enabled}
              aria-label="Zeitplan aktiv"
              onClick={() =>
                update(schedule.id, { enabled: !schedule.enabled })
              }
              className="action-btn relative h-8 w-14 shrink-0 rounded-full transition"
              style={{
                background: schedule.enabled
                  ? "linear-gradient(135deg, #5fe3c0, #3da8a0)"
                  : "rgba(143,168,181,0.25)",
              }}
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition"
                style={{ left: schedule.enabled ? "1.75rem" : "0.25rem" }}
              />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="time"
              value={schedule.timeLocal}
              onChange={(e) =>
                update(schedule.id, { timeLocal: e.target.value })
              }
              className="rounded-xl border border-[var(--line)] bg-black/25 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, dayIndex) => {
                const day = dayIndex + 1;
                const active = schedule.daysOfWeek.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(schedule, day)}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: active
                        ? "rgba(95,227,192,0.18)"
                        : "transparent",
                      border: `1px solid ${active ? "rgba(95,227,192,0.45)" : "var(--line)"}`,
                      color: active
                        ? "var(--accent-bright)"
                        : "var(--fg-muted)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === schedule.id}
              onClick={() => void save(schedule)}
              className="action-btn rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold"
            >
              {busyId === schedule.id ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              disabled={busyId === schedule.id}
              onClick={() => void remove(schedule.id)}
              className="action-btn btn-danger-soft rounded-full px-4 py-2 text-xs font-semibold"
            >
              Löschen
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {addableKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={creating}
            onClick={() => void add(kind)}
            className="action-btn rounded-full border px-4 py-2.5 text-xs font-semibold"
            style={{
              background: "rgba(95,227,192,0.08)",
              borderColor: "rgba(95,227,192,0.35)",
              color: "var(--accent-bright)",
            }}
          >
            {creating ? "…" : `+ ${KIND_LABEL[kind] ?? kind}`}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? (
        <p className="text-sm text-[var(--fg-muted)]">{notice}</p>
      ) : null}
    </div>
  );
}

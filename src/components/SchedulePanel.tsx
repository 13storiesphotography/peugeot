"use client";

import { useEffect, useState } from "react";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const KIND_LABEL: Record<VehicleSchedule["kind"], string> = {
  charge: "Laden starten",
  climate: "Vorklima",
  battery_preheat: "Akku vorwärmen",
};

interface SchedulePanelProps {
  schedules: VehicleSchedule[];
  onChanged: () => void;
}

export function SchedulePanel({ schedules, onChanged }: SchedulePanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [local, setLocal] = useState(schedules);

  useEffect(() => {
    setLocal(schedules);
  }, [schedules]);

  const save = async (schedule: VehicleSchedule) => {
    setBusyId(schedule.id);
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
      if (!res.ok) {
        throw new Error("Speichern fehlgeschlagen");
      }
      onChanged();
    } finally {
      setBusyId(null);
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
      {local.map((schedule) => (
        <div
          key={schedule.id}
          className="rounded-2xl border border-[var(--line)] px-4 py-4"
          style={{ background: "rgba(14,28,40,0.4)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{KIND_LABEL[schedule.kind]}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {schedule.enabled ? "Aktiv" : "Pausiert"}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(e) =>
                  update(schedule.id, { enabled: e.target.checked })
                }
              />
              An
            </label>
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
              {DAY_LABELS.map((label, index) => {
                const day = index + 1;
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

          <button
            type="button"
            disabled={busyId === schedule.id}
            onClick={() => void save(schedule)}
            className="action-btn mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold"
          >
            {busyId === schedule.id ? "Speichern…" : "Zeitplan speichern"}
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import {
  saveSyncIntervalAction,
  type SettingsState,
} from "@/app/actions/settings";
import { useI18n } from "@/components/i18n/I18nProvider";

export function SyncIntervalForm({
  syncIntervalSec,
}: {
  syncIntervalSec: number;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    saveSyncIntervalAction,
    {} as SettingsState,
  );

  const OPTIONS = [
    { value: 30, label: t("sync.opt30") },
    { value: 60, label: t("sync.opt1") },
    { value: 120, label: t("sync.opt2") },
    { value: 300, label: t("sync.opt5") },
  ];

  const selected = OPTIONS.some((opt) => opt.value === syncIntervalSec)
    ? syncIntervalSec
    : 60;

  return (
    <form action={action} className="space-y-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {t("sync.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("sync.hint")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[10rem] flex-1 text-sm">
          <span className="text-[var(--fg-muted)]">{t("sync.interval")}</span>
          <select
            name="syncIntervalSec"
            defaultValue={selected}
            className="mt-1 ui-field"
          >
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-btn btn-primary rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          {pending ? "…" : t("common.save")}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--accent-bright)]">{state.success}</p>
      ) : null}
    </form>
  );
}

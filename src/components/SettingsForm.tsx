"use client";

import { useActionState } from "react";
import {
  saveVehicleSettings,
  type SettingsState,
} from "@/app/actions/settings";

import { useI18n } from "@/components/i18n/I18nProvider";

const initial: SettingsState = {};

type ProfileVehicle = {
  nickname: string;
  color: string;
  vin: string;
};

export function SettingsForm({ vehicle }: { vehicle: ProfileVehicle }) {
  const [state, action, pending] = useActionState(saveVehicleSettings, initial);
  const { t } = useI18n();

  return (
    <form action={action} className="ui-surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {t("settings.profile")}
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {t("settings.profileHint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-[var(--fg-muted)]">{t("settings.nickname")}</span>
          <input
            name="nickname"
            defaultValue={vehicle.nickname}
            required
            className="mt-1 ui-field"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">{t("settings.color")}</span>
          <input
            name="color"
            defaultValue={vehicle.color}
            className="mt-1 ui-field"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">{t("settings.vin")}</span>
          <input
            name="vin"
            defaultValue={vehicle.vin}
            placeholder="VR3…"
            className="mt-1 ui-field"
          />
        </label>
      </div>

      <input type="hidden" name="countryCode" value="DE" />
      <input type="hidden" name="mypeugeotEmail" value="" />
      <input type="hidden" name="connected" value="" />

      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-[var(--accent-bright)]">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="action-btn btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
      >
        {pending ? t("common.saving") : t("settings.saveProfile")}
      </button>
    </form>
  );
}

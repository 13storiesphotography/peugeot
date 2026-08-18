"use server";

import { revalidatePath } from "next/cache";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { getTranslator } from "@/i18n/server";
import {
  updateSyncInterval,
  updateVehicleProfile,
} from "@/lib/vehicle/repository";

export type SettingsState = {
  error?: string;
  success?: string;
};

export async function saveVehicleSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) {
    return { error: t("settings.notSignedIn") };
  }

  const nickname = String(formData.get("nickname") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const vin = String(formData.get("vin") ?? "").trim();

  if (!nickname) {
    return { error: t("settings.nicknameMissing") };
  }

  try {
    await updateVehicleProfile(session.supabase, session.userId, {
      nickname,
      color,
      vin,
    });
    revalidatePath("/control");
    revalidatePath("/control/settings");
    return { success: t("settings.saved") };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("settings.saveFailed"),
    };
  }
}

function clampSyncInterval(value: number): number {
  if (!Number.isFinite(value)) return 60;
  return Math.min(600, Math.max(30, Math.round(value)));
}

export async function saveSyncIntervalAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) {
    return { error: t("settings.notSignedIn") };
  }

  const raw = Number(formData.get("syncIntervalSec"));
  try {
    const sec = await updateSyncInterval(
      session.supabase,
      session.userId,
      clampSyncInterval(raw),
    );
    revalidatePath("/control");
    revalidatePath("/control/settings");
    return {
      success:
        sec < 60
          ? t("settings.syncEverySec", { n: sec })
          : t("settings.syncEveryMin", { n: Math.round(sec / 60) }),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : t("settings.intervalSaveFail"),
    };
  }
}

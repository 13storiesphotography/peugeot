"use server";

import { revalidatePath } from "next/cache";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
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
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Nicht angemeldet." };
  }

  const nickname = String(formData.get("nickname") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const vin = String(formData.get("vin") ?? "").trim();

  if (!nickname) {
    return { error: "Spitzname fehlt." };
  }

  try {
    await updateVehicleProfile(session.supabase, session.userId, {
      nickname,
      color,
      vin,
    });
    revalidatePath("/control");
    revalidatePath("/control/settings");
    return { success: "Profil gespeichert." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
    };
  }
}

function clampSyncInterval(value: number): number {
  if (!Number.isFinite(value)) return 45;
  return Math.min(600, Math.max(15, Math.round(value)));
}

export async function saveSyncIntervalAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Nicht angemeldet." };
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
          ? `Aktualisierung alle ${sec} Sekunden.`
          : `Aktualisierung alle ${Math.round(sec / 60)} Minute${sec >= 120 ? "n" : ""}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Intervall konnte nicht gespeichert werden.",
    };
  }
}

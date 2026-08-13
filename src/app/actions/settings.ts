"use server";

import { revalidatePath } from "next/cache";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { updateVehicleProfile } from "@/lib/vehicle/repository";

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

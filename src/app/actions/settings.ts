"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updatePeugeotConnection,
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
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    return { error: "Nicht angemeldet." };
  }

  const nickname = String(formData.get("nickname") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const vin = String(formData.get("vin") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "DE").trim();
  const mypeugeotEmail = String(formData.get("mypeugeotEmail") ?? "").trim();
  const accessToken = String(formData.get("accessToken") ?? "").trim();
  const vehicleApiId = String(formData.get("vehicleApiId") ?? "").trim();
  const connected = formData.get("connected") === "on";

  if (!nickname) {
    return { error: "Spitzname fehlt." };
  }

  try {
    await updateVehicleProfile(supabase, userId, { nickname, color, vin });
    await updatePeugeotConnection(supabase, userId, {
      countryCode: countryCode || "DE",
      mypeugeotEmail,
      accessToken: accessToken || undefined,
      vehicleApiId,
      connected,
    });
    revalidatePath("/control");
    revalidatePath("/control/settings");
    return { success: "Einstellungen gespeichert." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
    };
  }
}

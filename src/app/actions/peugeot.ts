"use server";

import { revalidatePath } from "next/cache";
import {
  exchangeAuthorizationCode,
  fetchVehicleStatus,
  listVehicles,
  mapStatusToVehicleState,
} from "@/lib/stellantis/api";
import { getAuthorizeUrl } from "@/lib/stellantis/peugeot-config";
import { extractOAuthCode } from "@/lib/stellantis/oauth-code";
import { createClient } from "@/lib/supabase/server";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export type ConnectState = {
  error?: string;
  success?: string;
  authorizeUrl?: string;
};

export async function getPeugeotAuthorizeUrl(
  countryCode: string,
): Promise<string> {
  return getAuthorizeUrl(countryCode || "DE");
}

export async function connectPeugeotWithCode(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    return { error: "Nicht angemeldet." };
  }

  const countryCode = String(formData.get("countryCode") ?? "DE").trim() || "DE";
  const mypeugeotEmail = String(formData.get("mypeugeotEmail") ?? "").trim();
  const oauthCode = extractOAuthCode(String(formData.get("oauthCode") ?? ""));

  if (!oauthCode) {
    return {
      error:
        "Kein Code gefunden. Nach „Weiter“ die mymap://…-URL (oder nur code=…) hier einfügen.",
    };
  }

  try {
    const tokens = await exchangeAuthorizationCode(countryCode, oauthCode);
    const vehicles = await listVehicles(tokens.accessToken, countryCode);
    if (vehicles.length === 0) {
      return {
        error:
          "Login ok, aber kein Fahrzeug gefunden. Prüfe, ob das Auto in MyPeugeot sichtbar ist.",
      };
    }

    const remote = vehicles[0];
    const bundle = await getVehicleBundle(supabase, userId);

    let liveState = bundle.vehicle;
    try {
      const status = await fetchVehicleStatus(
        tokens.accessToken,
        countryCode,
        remote.vehicleId,
      );
      liveState = mapStatusToVehicleState(status, bundle.vehicle, {
        vehicleId: remote.vehicleId,
        vin: remote.vin,
      });
    } catch {
      // Status can lag; connection still succeeds with vehicle id/vin.
      liveState = {
        ...bundle.vehicle,
        id: remote.vehicleId,
        vin: remote.vin,
        mode: "live",
      };
    }

    await supabase
      .from("vehicles")
      .update({
        vin: remote.vin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.vehicleId)
      .eq("user_id", userId);

    await supabase.from("vehicle_state").upsert({
      vehicle_id: bundle.vehicleId,
      user_id: userId,
      state: liveState,
      updated_at: new Date().toISOString(),
    });

    await supabase.from("peugeot_connections").upsert(
      {
        user_id: userId,
        vehicle_id: bundle.vehicleId,
        country_code: countryCode,
        mypeugeot_email: mypeugeotEmail || null,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        token_expires_at: tokens.expiresAt,
        vehicle_api_id: remote.vehicleId,
        connected: true,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        oauth_meta: {
          vin: remote.vin,
          motorization: remote.motorization ?? null,
        },
      },
      { onConflict: "user_id" },
    );

    await supabase.from("activity_log").insert({
      user_id: userId,
      vehicle_id: bundle.vehicleId,
      command: "connect",
      message: `MyPeugeot verbunden (${remote.vin}).`,
      ok: true,
    });

    revalidatePath("/control");
    revalidatePath("/control/settings");
    return {
      success: `Verbunden: VIN ${remote.vin}. Status wird live geladen.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Verbindung fehlgeschlagen. Code ggf. abgelaufen – neu anmelden.",
    };
  }
}

export async function syncPeugeotStatus(): Promise<ConnectState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    return { error: "Nicht angemeldet." };
  }

  const bundle = await getVehicleBundle(supabase, userId);
  const { data: connection } = await supabase
    .from("peugeot_connections")
    .select(
      "access_token, refresh_token, token_expires_at, country_code, vehicle_api_id, connected",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection?.connected || !connection.access_token || !connection.vehicle_api_id) {
    return { error: "Noch nicht verbunden." };
  }

  try {
    let accessToken = connection.access_token as string;
    const countryCode = String(connection.country_code ?? "DE");

    // Refresh if expired / near expiry
    const expiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at as string).getTime()
      : 0;
    if (
      connection.refresh_token &&
      expiresAt &&
      expiresAt < Date.now() + 60_000
    ) {
      const { refreshAccessToken } = await import("@/lib/stellantis/api");
      const refreshed = await refreshAccessToken(
        countryCode,
        String(connection.refresh_token),
      );
      accessToken = refreshed.accessToken;
      await supabase
        .from("peugeot_connections")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          token_expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const status = await fetchVehicleStatus(
      accessToken,
      countryCode,
      String(connection.vehicle_api_id),
    );
    const vin =
      bundle.vehicle.vin && !bundle.vehicle.vin.includes("xxx")
        ? bundle.vehicle.vin
        : bundle.vehicle.vin;
    const liveState = mapStatusToVehicleState(status, bundle.vehicle, {
      vehicleId: String(connection.vehicle_api_id),
      vin,
    });

    await supabase.from("vehicle_state").upsert({
      vehicle_id: bundle.vehicleId,
      user_id: userId,
      state: liveState,
      updated_at: new Date().toISOString(),
    });
    await supabase
      .from("peugeot_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    revalidatePath("/control");
    return { success: "Status aktualisiert." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Sync fehlgeschlagen.",
    };
  }
}

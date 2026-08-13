"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  exchangeAuthorizationCode,
  fetchVehicleDetails,
  fetchVehicleStatus,
  listVehicles,
  mapStatusToVehicleStateWithAddress,
} from "@/lib/stellantis/api";
import { getAuthorizeUrl } from "@/lib/stellantis/peugeot-config";
import { extractOAuthCode } from "@/lib/stellantis/oauth-code";
import { capturePeugeotOAuthCode } from "@/lib/stellantis/oauth-auto-login";
import { capturePeugeotOAuthCodeRemote } from "@/lib/stellantis/oauth-remote";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
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

async function persistPeugeotConnection(
  supabase: SupabaseClient,
  userId: string,
  input: {
    countryCode: string;
    mypeugeotEmail: string;
    oauthCode: string;
  },
): Promise<ConnectState> {
  const tokens = await exchangeAuthorizationCode(
    input.countryCode,
    input.oauthCode,
  );
  const vehicles = await listVehicles(tokens.accessToken, input.countryCode);
  if (vehicles.length === 0) {
    return {
      error:
        "Login ok, aber kein Fahrzeug gefunden. Prüfe, ob das Auto in MyPeugeot sichtbar ist.",
    };
  }

  const remote = vehicles[0];
  let details = remote;
  try {
    const full = await fetchVehicleDetails(
      tokens.accessToken,
      input.countryCode,
      remote.vehicleId,
    );
    if (full) details = { ...remote, ...full };
  } catch {
    // list payload may already include pictures
  }

  const bundle = await getVehicleBundle(supabase, userId);

  let liveState: import("@/lib/types").VehicleState = {
    ...bundle.vehicle,
    vin: details.vin,
    color: details.color ?? bundle.vehicle.color,
    colorHex: details.colorHex ?? bundle.vehicle.colorHex ?? null,
    pictureUrl: details.pictureUrl ?? bundle.vehicle.pictureUrl ?? null,
    mode: "live",
  };
  try {
    const status = await fetchVehicleStatus(
      tokens.accessToken,
      input.countryCode,
      remote.vehicleId,
    );
    liveState = {
      ...(await mapStatusToVehicleStateWithAddress(status, liveState, {
        vehicleId: remote.vehicleId,
        vin: details.vin,
      })),
      color: details.color ?? liveState.color,
      colorHex: details.colorHex ?? liveState.colorHex,
      pictureUrl: details.pictureUrl ?? liveState.pictureUrl,
      mode: "live",
    };
  } catch {
    // Status can lag; connection still succeeds with vehicle id/vin.
  }

  await supabase
    .from("vehicles")
    .update({
      vin: details.vin,
      color: details.color ?? bundle.vehicle.color,
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
      country_code: input.countryCode,
      mypeugeot_email: input.mypeugeotEmail || null,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || null,
      token_expires_at: tokens.expiresAt,
      vehicle_api_id: remote.vehicleId,
      connected: true,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      oauth_meta: {
        vin: details.vin,
        motorization: details.motorization ?? null,
        brand: details.brand ?? null,
        color: details.color ?? null,
        colorCode: details.pictures?.[0] ? details.pictures[0] : null,
        pictureUrl: details.pictureUrl ?? null,
        needsReconnect: false,
        authError: null,
      },
    },
    { onConflict: "user_id" },
  );

  await supabase.from("activity_log").insert({
    user_id: userId,
    vehicle_id: bundle.vehicleId,
    command: "connect",
    message: `MyPeugeot verbunden (${details.vin}${details.color ? ` · ${details.color}` : ""}).`,
    ok: true,
  });

  revalidatePath("/control");
  revalidatePath("/control/settings");
  return {
    success: `Verbunden: VIN ${details.vin}${details.color ? ` · ${details.color}` : ""}. Status wird live geladen.`,
  };
}

export async function connectPeugeotWithCode(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Nicht angemeldet." };
  }
  const { supabase, userId } = session;

  const countryCode = String(formData.get("countryCode") ?? "DE").trim() || "DE";
  const mypeugeotEmail = String(formData.get("mypeugeotEmail") ?? "").trim();
  const oauthRaw = String(formData.get("oauthCode") ?? "");
  const oauthCode = extractOAuthCode(oauthRaw);

  if (!oauthCode) {
    if (/id-dcr\.peugeot\.com|authorize-consentments|gotoparam=/i.test(oauthRaw)) {
      return {
        error:
          "Das ist noch die Peugeot-Login-Seite — darin steckt kein Code. Am iPhone zeigt Safari die mymap://-Adresse nicht. Login-Link am Computer öffnen, nach „Weiter“ die fehlgeschlagene mymap://-Adresse kopieren und hier einfügen.",
      };
    }
    return {
      error:
        "Kein Code gefunden. Am zuverlässigsten: Login-Link am Computer öffnen, nach „Weiter“ die mymap://…-Adresse kopieren und hier einfügen.",
    };
  }

  try {
    return await persistPeugeotConnection(supabase, userId, {
      countryCode,
      mypeugeotEmail,
      oauthCode,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Verbindung fehlgeschlagen. Code ggf. abgelaufen – neu anmelden.",
    };
  }
}

/** Email/password login — password is only used in-memory to capture the OAuth code. */
export async function connectPeugeotWithPassword(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Nicht angemeldet." };
  }
  const { supabase, userId } = session;

  const countryCode = String(formData.get("countryCode") ?? "DE").trim() || "DE";
  const email = String(formData.get("mypeugeotEmail") ?? "").trim();
  const password = String(formData.get("mypeugeotPassword") ?? "");

  if (!email || !password) {
    return { error: "MyPeugeot E-Mail und Passwort eingeben." };
  }

  try {
    // Prefer community OAuth helper (works without mymap:// on iPhone).
    // Fall back to local Puppeteer when the helper is unreachable; local is
    // often blocked by Gigya reCAPTCHA on Vercel.
    let captured = await capturePeugeotOAuthCodeRemote({
      countryCode,
      email,
      password,
    });

    if (!captured.ok) {
      const remoteError = captured.error;
      const loginRejected = /LOGIN_FAILED|E-Mail oder Passwort|Login abgelehnt/i.test(
        remoteError,
      );
      if (!loginRejected) {
        const local = await capturePeugeotOAuthCode({
          countryCode,
          email,
          password,
        });
        if (local.ok) {
          captured = local;
        } else {
          return {
            error: `${remoteError} (lokaler Fallback: ${local.error})`,
          };
        }
      } else {
        return { error: remoteError };
      }
    }

    return await persistPeugeotConnection(supabase, userId, {
      countryCode,
      mypeugeotEmail: email,
      oauthCode: captured.code,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Automatische Anmeldung fehlgeschlagen.",
    };
  }
}

export async function syncPeugeotStatus(): Promise<ConnectState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Nicht angemeldet." };
  }
  const { supabase, userId } = session;

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
    const { fetchVehicleDetails } = await import("@/lib/stellantis/api");
    let paint = {
      color: bundle.vehicle.color,
      colorHex: bundle.vehicle.colorHex,
      pictureUrl: bundle.vehicle.pictureUrl,
      vin: bundle.vehicle.vin,
    };
    try {
      const details = await fetchVehicleDetails(
        accessToken,
        countryCode,
        String(connection.vehicle_api_id),
      );
      if (details) {
        paint = {
          color: details.color ?? paint.color,
          colorHex: details.colorHex ?? paint.colorHex,
          pictureUrl: details.pictureUrl ?? paint.pictureUrl,
          vin: details.vin || paint.vin,
        };
        await supabase
          .from("vehicles")
          .update({
            color: paint.color,
            vin: paint.vin,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bundle.vehicleId)
          .eq("user_id", userId);
      }
    } catch {
      // optional
    }

    const liveState = {
      ...(await mapStatusToVehicleStateWithAddress(status, bundle.vehicle, {
        vehicleId: String(connection.vehicle_api_id),
        vin: paint.vin,
      })),
      color: paint.color,
      colorHex: paint.colorHex,
      pictureUrl: paint.pictureUrl,
    };

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

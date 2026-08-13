"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { refreshAccessToken } from "@/lib/stellantis/api";
import type { OtpPersistedState } from "@/lib/stellantis/otp/session";
import { requestRemoteSms, setupRemotePin } from "@/lib/stellantis/remote";

export type RemotePinState = {
  error?: string;
  success?: string;
  ready?: boolean;
};

type ConnectionRow = {
  connected: boolean | null;
  country_code: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  customer_id: string | null;
  remote_ready: boolean | null;
  otp_state: OtpPersistedState | null;
  remote_access_token: string | null;
  remote_refresh_token: string | null;
  remote_token_updated_at: string | null;
};

async function loadConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("peugeot_connections")
    .select(
      "connected, country_code, access_token, refresh_token, token_expires_at, customer_id, remote_ready, otp_state, remote_access_token, remote_refresh_token, remote_token_updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ConnectionRow | null;
}

async function ensureOauthToken(
  supabase: SupabaseClient,
  userId: string,
  connection: ConnectionRow,
): Promise<string> {
  let accessToken = String(connection.access_token ?? "");
  const countryCode = String(connection.country_code ?? "DE");
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;
  if (
    connection.refresh_token &&
    expiresAt &&
    expiresAt < Date.now() + 60_000
  ) {
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
      })
      .eq("user_id", userId);
  }
  if (!accessToken) throw new Error("MyPeugeot ist nicht verbunden.");
  return accessToken;
}

export async function sendRemoteSmsAction(): Promise<RemotePinState> {
  try {
    const session = await assertOwnerSession();
    if (!session) return { error: "Nicht angemeldet." };
    const connection = await loadConnection(session.supabase, session.userId);
    if (!connection?.connected) {
      return { error: "Zuerst MyPeugeot verbinden." };
    }
    const accessToken = await ensureOauthToken(
      session.supabase,
      session.userId,
      connection,
    );
    await requestRemoteSms(
      accessToken,
      String(connection.country_code ?? "DE"),
    );
    return { success: "SMS wurde gesendet." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "SMS fehlgeschlagen.",
    };
  }
}

export async function activateRemotePinAction(
  _prev: RemotePinState,
  formData: FormData,
): Promise<RemotePinState> {
  // Strip spaces/dashes — SMS autofill and copy-paste often include them.
  const smsCode = String(formData.get("smsCode") ?? "").replace(/\D/g, "");
  const pin = String(formData.get("pin") ?? "").replace(/\D/g, "");

  if (!smsCode) {
    return {
      error:
        "SMS-Code fehlt. Code aus der SMS ins erste Feld eintragen (nicht die PIN).",
    };
  }
  if (!/^\d{4,10}$/.test(smsCode)) {
    return {
      error: `SMS-Code ungültig („${smsCode.slice(0, 12)}“). Bitte nur die Ziffern aus der SMS.`,
    };
  }
  if (!/^\d{4}$/.test(pin)) {
    return {
      error:
        "MyPeugeot-PIN fehlt oder ist ungültig — bitte deine 4-stellige App-PIN (nicht den SMS-Code).",
    };
  }

  try {
    const session = await assertOwnerSession();
    if (!session) return { error: "Nicht angemeldet." };
    const connection = await loadConnection(session.supabase, session.userId);
    if (!connection?.connected) {
      return { error: "Zuerst MyPeugeot verbinden." };
    }
    const accessToken = await ensureOauthToken(
      session.supabase,
      session.userId,
      connection,
    );
    const result = await setupRemotePin({
      accessToken,
      countryCode: String(connection.country_code ?? "DE"),
      smsCode,
      pin,
      deviceIdSeed: accessToken,
      previousOtp: connection.otp_state,
    });

    await session.supabase
      .from("peugeot_connections")
      .update({
        customer_id: result.customerId,
        otp_state: result.otpState,
        remote_access_token: result.remote.accessToken,
        remote_refresh_token: result.remote.refreshToken,
        remote_token_updated_at: result.remote.updatedAt,
        remote_ready: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.userId);

    revalidatePath("/control");
    revalidatePath("/control/settings");
    return { success: "Fernbedienung eingerichtet.", ready: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "PIN-Einrichtung fehlgeschlagen.",
    };
  }
}

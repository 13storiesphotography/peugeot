import "server-only";
import { getFinapiConfig } from "./config";

export type FinapiToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

async function requestToken(
  params: Record<string, string>,
): Promise<FinapiToken> {
  const { accessBase, clientId, clientSecret } = getFinapiConfig();
  if (!clientId || !clientSecret) {
    throw new Error("FINAPI_CLIENT_ID / FINAPI_CLIENT_SECRET fehlen.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    ...params,
  });

  const res = await fetch(`${accessBase}/api/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`finAPI OAuth fehlgeschlagen (${res.status}): ${text}`);
  }

  return res.json() as Promise<FinapiToken>;
}

export function getClientToken() {
  return requestToken({ grant_type: "client_credentials" });
}

export function getUserToken(username: string, password: string) {
  return requestToken({
    grant_type: "password",
    username,
    password,
  });
}

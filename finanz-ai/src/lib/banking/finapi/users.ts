import "server-only";
import { getFinapiConfig } from "./config";
import { getClientToken } from "./oauth";

export type FinapiUser = {
  id: string;
  password: string;
};

/** Erstellt einen finAPI-User (nicht den Bank-Login). */
export async function createFinapiUser(): Promise<FinapiUser> {
  const { accessBase } = getFinapiConfig();
  const client = await getClientToken();
  const id = `kontura_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const password = `Kw_${crypto.randomUUID().replace(/-/g, "")}`;

  const res = await fetch(`${accessBase}/api/v2/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${client.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`finAPI User anlegen fehlgeschlagen (${res.status}): ${text}`);
  }

  return { id, password };
}

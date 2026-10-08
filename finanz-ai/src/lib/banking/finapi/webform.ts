import "server-only";
import { getFinapiConfig } from "./config";
import { getUserToken } from "./oauth";

export type WebFormCreateResult = {
  id: string;
  url: string;
  status?: string;
};

export type WebFormStatus = {
  id: string;
  status: string;
  payload?: {
    bankConnectionId?: number;
  };
};

export async function createBankConnectionWebForm(
  username: string,
  password: string,
): Promise<WebFormCreateResult> {
  const { webformBase, callbackUrl } = getFinapiConfig();
  const userToken = await getUserToken(username, password);

  const res = await fetch(`${webformBase}/api/webForms/bankConnectionImport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountTypes: ["CHECKING", "SAVINGS", "CREDIT_CARD"],
      callbackUrl,
      // Optional: preselect demo bank in sandbox via bankId when known
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Web Form anlegen fehlgeschlagen (${res.status}): ${text}`);
  }

  const data = (await res.json()) as WebFormCreateResult;
  return data;
}

export async function getWebFormStatus(
  username: string,
  password: string,
  webFormId: string,
): Promise<WebFormStatus> {
  const { webformBase } = getFinapiConfig();
  const userToken = await getUserToken(username, password);

  const res = await fetch(`${webformBase}/api/webForms/${webFormId}`, {
    headers: { Authorization: `Bearer ${userToken.access_token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Web Form Status fehlgeschlagen (${res.status}): ${text}`);
  }

  return res.json() as Promise<WebFormStatus>;
}

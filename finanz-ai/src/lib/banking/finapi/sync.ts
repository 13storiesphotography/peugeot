import "server-only";
import { getFinapiConfig } from "./config";
import { getUserToken } from "./oauth";

export type FinapiAccount = {
  id: number;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  accountType?: string;
  balance?: number;
  bankName?: string;
};

export type FinapiTransaction = {
  id: number;
  accountId: number;
  amount: number;
  purpose?: string;
  counterpartName?: string;
  bankBookingDate?: string;
  finapiBookingDate?: string;
};

export async function fetchAccounts(username: string, password: string) {
  const { accessBase } = getFinapiConfig();
  const token = await getUserToken(username, password);
  const res = await fetch(`${accessBase}/api/v2/accounts?page=1&perPage=100`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Accounts laden fehlgeschlagen (${res.status})`);
  }
  const data = (await res.json()) as { accounts?: FinapiAccount[] };
  return data.accounts ?? [];
}

export async function fetchTransactions(
  username: string,
  password: string,
  opts?: { minBankBookingDate?: string },
) {
  const { accessBase } = getFinapiConfig();
  const token = await getUserToken(username, password);
  const qs = new URLSearchParams({ page: "1", perPage: "100" });
  if (opts?.minBankBookingDate) {
    qs.set("minBankBookingDate", opts.minBankBookingDate);
  }
  const res = await fetch(`${accessBase}/api/v2/transactions?${qs}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Transactions laden fehlgeschlagen (${res.status})`);
  }
  const data = (await res.json()) as { transactions?: FinapiTransaction[] };
  return data.transactions ?? [];
}

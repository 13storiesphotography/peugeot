import { AppShell } from "@/components/app/AppShell";
import { buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";
import { getBankSession } from "@/lib/banking/session";

export const metadata = { title: "Umsätze" };

const CATEGORY_LABEL: Record<string, string> = {
  income: "Einkommen",
  housing: "Wohnen",
  groceries: "Lebensmittel",
  transport: "Mobilität",
  subscriptions: "Abos",
  leisure: "Freizeit",
  shopping: "Einkäufe",
  insurance: "Versicherung",
  transfer: "Umbuchung",
  other: "Sonstiges",
};

export default async function TransactionsPage() {
  const snapshot = buildDemoSnapshot();
  const bank = await getBankSession();

  return (
    <AppShell title="Umsätze">
      <p className="max-w-2xl text-ink-soft">
        {bank.connected
          ? `Verbunden mit ${bank.bankLabel} · letzter Sync ${
              bank.lastSyncAt
                ? new Date(bank.lastSyncAt).toLocaleString("de-DE")
                : "—"
            }`
          : "Demo-Umsätze — verbinde die Bank unter „Bank“, um den Sync-Status zu sehen."}
      </p>

      <ul className="mt-8 divide-y divide-[#10253a]/10">
        {snapshot.transactions.map((tx) => (
          <li
            key={tx.id}
            className="flex items-start justify-between gap-4 py-4 animate-rise"
          >
            <div>
              <p className="font-semibold text-ink">{tx.counterparty}</p>
              <p className="text-sm text-ink-soft">
                {tx.bookedAt} · {CATEGORY_LABEL[tx.category] ?? tx.category}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{tx.purpose}</p>
            </div>
            <p
              className={`shrink-0 font-display text-lg font-bold ${
                tx.amountCents >= 0 ? "text-teal" : "text-ink"
              }`}
            >
              {formatEur(tx.amountCents)}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

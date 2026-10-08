import { AppShell } from "@/components/app/AppShell";
import { ConnectBankPanel } from "@/components/app/ConnectBankPanel";
import { getMockConnection } from "@/lib/banking/open-banking";

export const metadata = { title: "Bank" };

export default function ConnectPage() {
  const connection = getMockConnection();

  return (
    <AppShell title="Bank verbinden">
      <p className="max-w-2xl text-ink-soft">
        Live-Anbindung über PSD2 Open Banking (finAPI / Tink). Kein Speichern von
        Online-Banking-Passwörtern in Kontura.
      </p>
      <ConnectBankPanel initial={connection} />
    </AppShell>
  );
}

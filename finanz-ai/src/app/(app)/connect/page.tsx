import { AppShell } from "@/components/app/AppShell";
import { ConnectBankPanel } from "@/components/app/ConnectBankPanel";
import { getConnectionView } from "@/lib/banking/session";
import { isFinapiReady } from "@/lib/banking/finapi/config";

export const metadata = { title: "Bank" };

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const connection = await getConnectionView();
  const params = await searchParams;
  const notice =
    params.connected === "1"
      ? "Bank verbunden. Umsätze sind bereit."
      : params.synced === "1"
        ? "Sync abgeschlossen."
        : params.disconnected === "1"
          ? "Bankverbindung getrennt."
          : params.error === "sync_failed"
            ? "Sync fehlgeschlagen — Credentials oder SCA prüfen."
            : params.error
              ? "Consent fehlgeschlagen — bitte erneut versuchen."
              : null;

  return (
    <AppShell title="Bank verbinden">
      <p className="max-w-2xl text-ink-soft">
        Live-Anbindung über PSD2 Open Banking (finAPI Web Form 2.0). Kein Speichern
        von Online-Banking-Passwörtern in Kontura.
      </p>
      <ConnectBankPanel
        initial={connection}
        notice={notice}
        finapiReady={isFinapiReady()}
      />
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import type { BankingConnection } from "@/lib/banking/open-banking";

export function ConnectBankPanel({
  initial,
}: {
  initial: BankingConnection;
}) {
  const [connection, setConnection] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/banking/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Verbindung nicht möglich");
        if (data.connection) setConnection(data.connection);
        return;
      }
      setMessage(
        "Consent-URL erzeugt (Platzhalter). Mit echten Provider-Credentials öffnet sich die Sparkasse-SCA.",
      );
    } catch {
      setMessage("Netzwerkfehler");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 max-w-xl animate-rise">
      <div className="border-t border-[#10253a]/15 pt-6">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink-soft">
          Status
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold">
          {connection.bankLabel}
        </h2>
        <p className="mt-2 text-ink-soft">{connection.message}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-ink-soft">Provider</dt>
            <dd className="font-semibold">{connection.provider}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Status</dt>
            <dd className="font-semibold">{connection.status}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Konten</dt>
            <dd className="font-semibold">{connection.accountsLinked}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Letzter Sync</dt>
            <dd className="font-semibold">
              {connection.lastSyncAt ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={connect}
        disabled={pending}
        className="mt-8 rounded-md bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-50"
      >
        {pending ? "Prüfe…" : "Sparkasse verbinden (bald)"}
      </button>

      {message && <p className="mt-4 text-sm text-ink-soft">{message}</p>}

      <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
        <li>OPEN_BANKING_ENABLED=true</li>
        <li>OPEN_BANKING_PROVIDER=finapi (oder tink)</li>
        <li>OPEN_BANKING_CLIENT_ID + Secret vom AISP</li>
        <li>Redirect-URI freischalten, Consent + SCA testen</li>
      </ol>
    </section>
  );
}

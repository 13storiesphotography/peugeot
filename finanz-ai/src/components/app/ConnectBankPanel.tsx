"use client";

import { useState, useTransition } from "react";
import {
  connectDemoBank,
  disconnectDemoBank,
  syncDemoBank,
} from "@/app/actions/banking";
import type { BankingConnection } from "@/lib/banking/open-banking";

export function ConnectBankPanel({
  initial,
  notice,
}: {
  initial: BankingConnection;
  notice?: string | null;
}) {
  const [connection, setConnection] = useState(initial);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [pending, startTransition] = useTransition();
  const [livePending, setLivePending] = useState(false);

  function connectDemo() {
    setMessage(null);
    startTransition(async () => {
      await connectDemoBank();
    });
  }

  function sync() {
    startTransition(async () => {
      await syncDemoBank();
    });
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectDemoBank();
    });
  }

  async function tryLive() {
    setLivePending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/banking/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "live" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Live-Verbindung nicht möglich");
        if (data.connection) setConnection(data.connection);
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setMessage("Netzwerkfehler");
    } finally {
      setLivePending(false);
    }
  }

  const connected = connection.status === "connected";

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
            <dd className="font-semibold text-teal">{connection.status}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Konten</dt>
            <dd className="font-semibold">{connection.accountsLinked}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Letzter Sync</dt>
            <dd className="font-semibold">
              {connection.lastSyncAt
                ? new Date(connection.lastSyncAt).toLocaleString("de-DE")
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {!connected ? (
          <button
            type="button"
            onClick={connectDemo}
            disabled={pending}
            className="rounded-md bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-50"
          >
            {pending ? "Verbinde…" : "Demo-Sparkasse verbinden"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={sync}
              disabled={pending}
              className="rounded-md bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-50"
            >
              {pending ? "Sync…" : "Umsätze syncen"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={pending}
              className="rounded-md border border-[#10253a]/20 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mist disabled:opacity-50"
            >
              Trennen
            </button>
          </>
        )}
        <button
          type="button"
          onClick={tryLive}
          disabled={livePending}
          className="rounded-md border border-[#10253a]/20 px-5 py-3 text-sm font-semibold text-ink-soft transition hover:bg-mist disabled:opacity-50"
        >
          {livePending ? "…" : "Live finAPI/Tink"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-ink-soft">{message}</p>}

      <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
        <li>Demo-Consent simuliert SCA ohne echte Bank-Zugangsdaten</li>
        <li>Live: OPEN_BANKING_ENABLED=true + Client-ID/Secret</li>
        <li>Callback: /api/banking/callback</li>
        <li>Tokens später nur verschlüsselt serverseitig speichern</li>
      </ol>
    </section>
  );
}

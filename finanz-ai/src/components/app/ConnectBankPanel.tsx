"use client";

import { useState, useTransition } from "react";
import {
  completeFinapiWebForm,
  connectDemoBank,
  disconnectDemoBank,
  startFinapiWebForm,
  syncDemoBank,
} from "@/app/actions/banking";
import type { BankingConnection } from "@/lib/banking/open-banking";

export function ConnectBankPanel({
  initial,
  notice,
  finapiReady,
}: {
  initial: BankingConnection;
  notice?: string | null;
  finapiReady: boolean;
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

  async function startFinapi() {
    setLivePending(true);
    setMessage(null);
    try {
      const result = await startFinapiWebForm();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      window.location.href = result.url;
    } catch {
      setMessage("Netzwerkfehler");
    } finally {
      setLivePending(false);
    }
  }

  function finishFinapi() {
    setLivePending(true);
    setMessage(null);
    startTransition(async () => {
      const result = await completeFinapiWebForm();
      setLivePending(false);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setConnection((c) => ({ ...c, status: "connected" }));
      setMessage("finAPI-Verbindung übernommen.");
      window.location.href = "/connect?connected=1";
    });
  }

  const connected = connection.status === "connected";
  const pendingConsent = connection.status === "pending_consent";

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
          onClick={startFinapi}
          disabled={livePending || !finapiReady}
          title={
            finapiReady
              ? "finAPI Web Form (Sandbox/Live)"
              : "FINAPI_CLIENT_ID/SECRET + OPEN_BANKING_ENABLED setzen"
          }
          className="rounded-md border border-[#10253a]/20 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-mist disabled:opacity-40"
        >
          {livePending ? "…" : "finAPI Sandbox verbinden"}
        </button>

        {pendingConsent && (
          <button
            type="button"
            onClick={finishFinapi}
            disabled={livePending || pending}
            className="rounded-md border border-teal px-5 py-3 text-sm font-semibold text-teal transition hover:bg-mist disabled:opacity-50"
          >
            SCA abgeschlossen — Status prüfen
          </button>
        )}
      </div>

      {message && <p className="mt-4 text-sm text-ink-soft">{message}</p>}

      <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
        <li>
          Sandbox-Credentials:{" "}
          <a
            className="text-teal underline"
            href="https://www.finapi.io/"
            target="_blank"
            rel="noreferrer"
          >
            finAPI
          </a>{" "}
          → Access Sandbox Client ID/Secret
        </li>
        <li>
          Env: <code>FINAPI_CLIENT_ID</code>, <code>FINAPI_CLIENT_SECRET</code>,{" "}
          <code>OPEN_BANKING_ENABLED=true</code>, <code>KONTURA_VAULT_KEY</code>
        </li>
        <li>Web Form 2.0 führt Bank-Login + SCA — nie in Kontura selbst</li>
        <li>Callback: /api/banking/callback</li>
      </ol>
    </section>
  );
}

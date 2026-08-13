"use client";

import { useActionState, useMemo, useState } from "react";
import {
  connectPeugeotWithCode,
  syncPeugeotStatus,
  type ConnectState,
} from "@/app/actions/peugeot";
import type { PeugeotConnection } from "@/lib/vehicle/repository";

const initial: ConnectState = {};

function buildAuthorizeUrl(countryCode: string): string {
  // Mirror server helper for immediate open without roundtrip.
  const configs: Record<string, { locale: string; client_id: string }> = {
    DE: { locale: "de-DE", client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530" },
    AT: { locale: "de-AT", client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530" },
    CH: { locale: "de-CH", client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530" },
    FR: { locale: "fr-FR", client_id: "1eebc2d5-5df3-459b-a624-20abfcf82530" },
  };
  const code = countryCode.toUpperCase();
  const cfg = configs[code] ?? configs.DE;
  const params = new URLSearchParams({
    client_id: cfg.client_id,
    response_type: "code",
    redirect_uri: `mymap://oauth2redirect/${code.toLowerCase()}`,
    scope: "openid profile email",
    locale: cfg.locale,
  });
  return `https://idpcvs.peugeot.com/am/oauth2/authorize?${params.toString()}`;
}

export function PeugeotConnectForm({
  connection,
}: {
  connection: PeugeotConnection;
}) {
  const [countryCode, setCountryCode] = useState(connection.countryCode || "DE");
  const [state, action, pending] = useActionState(
    connectPeugeotWithCode,
    initial,
  );
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const authorizeUrl = useMemo(
    () => buildAuthorizeUrl(countryCode),
    [countryCode],
  );

  const onSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const result = await syncPeugeotStatus();
    setSyncMsg(result.error ?? result.success ?? null);
    setSyncing(false);
  };

  return (
    <section className="panel rounded-[1.5rem] p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        MyPeugeot verbinden
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Stellantis hat keine öffentliche Auto-API. Wir nutzen denselben Login
        wie die MyPeugeot-App (Community-OAuth).
      </p>

      <ol className="mt-5 space-y-3 text-sm text-[var(--fg-muted)]">
        <li>
          <span className="font-semibold text-[var(--fg)]">1.</span> MyPeugeot
          App muss funktionieren, E-Remote/Connect aktiv.
        </li>
        <li>
          <span className="font-semibold text-[var(--fg)]">2.</span> Unten auf
          „Bei Peugeot anmelden“ klicken und mit MyPeugeot-Account einloggen.
        </li>
        <li>
          <span className="font-semibold text-[var(--fg)]">3.</span> Nach Login
          erscheint oft ein Fehler wegen{" "}
          <code className="text-[var(--accent-bright)]">mymap://…</code> — das
          ist ok. In der Browser-Adresse / Network den Parameter{" "}
          <code className="text-[var(--accent-bright)]">code=…</code> kopieren.
        </li>
        <li>
          <span className="font-semibold text-[var(--fg)]">4.</span> Code hier
          einfügen und verbinden.
        </li>
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={authorizeUrl}
          target="_blank"
          rel="noreferrer"
          className="action-btn rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          Bei Peugeot anmelden
        </a>
        {connection.connected ? (
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={syncing}
            className="action-btn rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold"
          >
            {syncing ? "Sync…" : "Status jetzt syncen"}
          </button>
        ) : null}
      </div>

      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Land
          </span>
          <select
            name="countryCode"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
          >
            <option value="DE">Deutschland</option>
            <option value="AT">Österreich</option>
            <option value="CH">Schweiz</option>
            <option value="FR">Frankreich</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            MyPeugeot E-Mail (optional)
          </span>
          <input
            name="mypeugeotEmail"
            type="email"
            defaultValue={connection.mypeugeotEmail ?? ""}
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            OAuth-Code
          </span>
          <input
            name="oauthCode"
            required
            placeholder="Code aus mymap://oauth2redirect/…?code=…"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="action-btn rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold"
          >
            {pending ? "Verbinde…" : "Code einlösen & verbinden"}
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2 text-sm">
        {connection.connected ? (
          <p className="text-[var(--accent-bright)]">
            Verbunden
            {connection.vehicleApiId ? ` · ID ${connection.vehicleApiId}` : ""}
            {connection.lastSyncAt
              ? ` · Sync ${new Date(connection.lastSyncAt).toLocaleString("de-DE")}`
              : ""}
          </p>
        ) : (
          <p className="text-[var(--warn)]">Noch nicht verbunden (Demo-Daten).</p>
        )}
        {state.error ? (
          <p role="alert" className="text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-[var(--accent-bright)]">
            {state.success}
          </p>
        ) : null}
        {syncMsg ? (
          <p role="status" className="text-[var(--fg-muted)]">
            {syncMsg}
          </p>
        ) : null}
      </div>

      <p className="mt-5 text-xs text-[var(--fg-muted)]">
        Hinweis: Fernbefehle (Verriegeln/Klima per MQTT) brauchen zusätzlich den
        Sicherheits-PIN aus der MyPeugeot-App. Status & Laden-Info gehen nach dem
        OAuth-Connect bereits live.
      </p>
    </section>
  );
}

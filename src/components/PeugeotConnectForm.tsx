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
    <section className="ui-surface p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
        MyPeugeot verbinden
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Fahrzeugkonto verbinden, damit Status und Fernbedienung funktionieren.
      </p>

      {connection.needsReconnect ? (
        <div
          className="mt-5 rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: "rgba(224,122,106,0.5)",
            background: "rgba(224,122,106,0.1)",
          }}
          role="alert"
        >
          <p className="font-semibold text-[var(--danger)]">
            Anmeldung abgelaufen
          </p>
          <p className="mt-1 text-[var(--fg-muted)]">
            Bitte erneut bei Peugeot anmelden und den neuen Code speichern.
          </p>
        </div>
      ) : connection.connected ? (
        <p className="mt-4 text-xs text-[var(--fg-muted)]">
          Sitzung wird im Hintergrund automatisch erneuert.
        </p>
      ) : null}

      <details className="mt-5 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[var(--warn)]">
          So holst du den Anmeldecode
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--fg-muted)]">
          <li>
            Auf der Peugeot-Seite <kbd className="text-[var(--fg)]">F12</kbd> →
            Tab Netzwerk / Network
          </li>
          <li>
            Haken: Protokoll beibehalten / Preserve log
          </li>
          <li>
            Auf <strong className="text-[var(--fg)]">WEITER</strong> klicken
          </li>
          <li>
            Nach <code className="text-[var(--accent-bright)]">mymap://</code>{" "}
            oder oauth2redirect suchen und die URL kopieren
          </li>
          <li>URL unten einfügen</li>
        </ol>
      </details>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={authorizeUrl}
          target="_blank"
          rel="noreferrer"
          className="action-btn btn-primary rounded-full px-5 py-3 text-sm font-semibold"
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
            {syncing ? "Aktualisiere…" : "Jetzt aktualisieren"}
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
            Redirect-URL oder OAuth-Code
          </span>
          <textarea
            name="oauthCode"
            required
            rows={3}
            placeholder="mymap://oauth2redirect/de?code=…&scope=…  (komplette URL einfügen)"
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
          <p className="text-[var(--warn)]">Noch nicht verbunden.</p>
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
    </section>
  );
}

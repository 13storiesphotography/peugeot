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
    <section className="panel rounded-[1.5rem] p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        MyPeugeot verbinden
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Wenn „Weiter“ nichts tut: Peugeot will die{" "}
        <strong className="text-[var(--fg)]">MyPeugeot-App</strong> öffnen (
        <code className="text-[var(--accent-bright)]">mymap://…</code>). Am PC
        gibt es die nicht — der Code steckt trotzdem in dem Redirect.
      </p>

      <div
        className="mt-5 rounded-2xl border px-4 py-4 text-sm"
        style={{
          borderColor: "rgba(232,184,109,0.45)",
          background: "rgba(232,184,109,0.08)",
        }}
      >
        <p className="font-semibold text-[var(--warn)]">
          So holst du den Code (Chrome / Edge)
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[var(--fg-muted)]">
          <li>
            Auf der Peugeot-Seite <kbd className="text-[var(--fg)]">F12</kbd> →
            Tab <strong className="text-[var(--fg)]">Netzwerk</strong> /
            Network
          </li>
          <li>
            Haken setzen:{" "}
            <strong className="text-[var(--fg)]">Protokoll beibehalten</strong>{" "}
            / Preserve log
          </li>
          <li>
            Jetzt erst auf <strong className="text-[var(--fg)]">WEITER</strong>{" "}
            klicken
          </li>
          <li>
            In der Liste nach{" "}
            <code className="text-[var(--accent-bright)]">oauth2redirect</code>{" "}
            oder einem fehlgeschlagenen Aufruf mit{" "}
            <code className="text-[var(--accent-bright)]">mymap://</code> suchen
          </li>
          <li>
            Rechtsklick → Copy →{" "}
            <strong className="text-[var(--fg)]">Copy URL</strong> / Linkadresse
            kopieren
          </li>
          <li>Die ganze URL unten einfügen (wir extrahieren den code=…)</li>
        </ol>
        <p className="mt-3 text-xs text-[var(--fg-muted)]">
          Alternative in Firefox: Nach „Weiter“ erscheint oft direkt die
          Fehlermeldung mit der <code>mymap://…?code=…</code>-Adresse — die
          komplette Zeile kopieren.
        </p>
      </div>

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
    </section>
  );
}

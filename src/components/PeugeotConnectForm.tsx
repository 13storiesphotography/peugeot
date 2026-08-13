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

function formatSync(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PeugeotConnectForm({
  connection,
  compact = false,
}: {
  connection: PeugeotConnection;
  /** Settings layout: collapse reconnect UI when already linked. */
  compact?: boolean;
}) {
  const [countryCode, setCountryCode] = useState(connection.countryCode || "DE");
  const [state, action, pending] = useActionState(
    connectPeugeotWithCode,
    initial,
  );
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(
    !connection.connected || connection.needsReconnect,
  );

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

  const syncLabel = formatSync(connection.lastSyncAt);
  const showForm = !compact || open || connection.needsReconnect;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            MyPeugeot
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {connection.needsReconnect
              ? "Anmeldung abgelaufen — bitte neu verbinden."
              : connection.connected
                ? syncLabel
                  ? `Verbunden · letzter Sync ${syncLabel}`
                  : "Verbunden — Sitzung erneuert sich automatisch."
                : "Konto verbinden für Status und Fernbedienung."}
          </p>
        </div>
        {compact && connection.connected && !connection.needsReconnect ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)]"
            aria-expanded={open}
          >
            {open ? "Schließen" : "Verwalten"}
          </button>
        ) : null}
      </div>

      {connection.needsReconnect ? (
        <div
          className="mt-4 rounded-xl border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(224,122,106,0.45)",
            background: "rgba(224,122,106,0.1)",
          }}
          role="alert"
        >
          <p className="font-semibold text-[var(--danger)]">
            Neu anmelden erforderlich
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Code von Peugeot holen und unten speichern.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-[var(--accent-bright)]">
              So holst du den Anmeldecode
            </summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-[var(--fg-muted)]">
              <li>
                Peugeot-Seite öffnen, <kbd className="text-[var(--fg)]">F12</kbd>{" "}
                → Netzwerk
              </li>
              <li>Protokoll beibehalten aktivieren</li>
              <li>
                Auf <strong className="text-[var(--fg)]">WEITER</strong> klicken
              </li>
              <li>
                Nach <code className="text-[var(--accent-bright)]">mymap://</code>{" "}
                suchen und URL kopieren
              </li>
            </ol>
          </details>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={authorizeUrl}
              target="_blank"
              rel="noreferrer"
              className="action-btn btn-primary rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              Bei Peugeot anmelden
            </a>
            {connection.connected ? (
              <button
                type="button"
                onClick={() => void onSync()}
                disabled={syncing}
                className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
              >
                {syncing ? "Aktualisiere…" : "Jetzt syncen"}
              </button>
            ) : null}
          </div>

          <form action={action} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">Land</span>
                <select
                  name="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/25 px-3 py-2.5 outline-none focus:border-[var(--accent-bright)]"
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="FR">Frankreich</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">E-Mail (optional)</span>
                <input
                  name="mypeugeotEmail"
                  type="email"
                  defaultValue={connection.mypeugeotEmail ?? ""}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/25 px-3 py-2.5 outline-none focus:border-[var(--accent-bright)]"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">
                Redirect-URL oder OAuth-Code
              </span>
              <textarea
                name="oauthCode"
                required
                rows={2}
                placeholder="mymap://oauth2redirect/de?code=…"
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/25 px-3 py-2.5 outline-none focus:border-[var(--accent-bright)]"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
            >
              {pending ? "Verbinde…" : "Code einlösen"}
            </button>
          </form>
        </>
      ) : null}

      <div className="mt-3 space-y-1 text-sm">
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
    </div>
  );
}

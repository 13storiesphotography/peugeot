"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  connectPeugeotWithCode,
  connectPeugeotWithPassword,
  syncPeugeotStatus,
  type ConnectState,
} from "@/app/actions/peugeot";
import { buildPeugeotAuthorizeUrl } from "@/lib/stellantis/authorize-url";
import { extractOAuthCode } from "@/lib/stellantis/oauth-code";
import type { PeugeotConnection } from "@/lib/vehicle/repository";

const initial: ConnectState = {};

function formatSync(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function useIsIos(): boolean {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  return ios;
}

function useIsMacSafari(): boolean {
  const [macSafari, setMacSafari] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const isMac = /Macintosh|Mac OS X/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Firefox/i.test(ua);
    setMacSafari(isMac && isSafari);
  }, []);
  return macSafari;
}

export function PeugeotConnectForm({
  connection,
  compact = false,
  initialOAuthCode = null,
  initialOAuthCountry = null,
  initialOAuthError = null,
}: {
  connection: PeugeotConnection;
  compact?: boolean;
  initialOAuthCode?: string | null;
  initialOAuthCountry?: string | null;
  initialOAuthError?: string | null;
}) {
  const isIos = useIsIos();
  const isMacSafari = useIsMacSafari();
  const [countryCode, setCountryCode] = useState(
    initialOAuthCountry || connection.countryCode || "DE",
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    connectPeugeotWithPassword,
    initial,
  );
  const [codeState, codeAction, codePending] = useActionState(
    connectPeugeotWithCode,
    initial,
  );
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(
    !connection.connected ||
      connection.needsReconnect ||
      Boolean(initialOAuthCode) ||
      Boolean(initialOAuthError),
  );
  const [oauthCode, setOauthCode] = useState(initialOAuthCode ?? "");
  const [pasteHint, setPasteHint] = useState<string | null>(
    initialOAuthError
      ? decodeURIComponent(initialOAuthError)
      : null,
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const codeFormRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const authorizeUrl = useMemo(
    () => buildPeugeotAuthorizeUrl(countryCode),
    [countryCode],
  );

  useEffect(() => {
    if (initialOAuthError) {
      window.history.replaceState({}, "", "/control/settings");
    }
  }, [initialOAuthError]);

  useEffect(() => {
    if (!initialOAuthCode || autoStarted) return;
    const code = extractOAuthCode(initialOAuthCode);
    if (!code) {
      setPasteHint(
        "Rückkehr ohne gültigen Code — bitte Schritte wiederholen oder Computer nutzen.",
      );
      return;
    }
    setOauthCode(initialOAuthCode);
    setOpen(true);
    setAutoStarted(true);
    setPasteHint("Code empfangen — verbinde…");
    window.history.replaceState({}, "", "/control/settings");
    const t = window.setTimeout(() => {
      codeFormRef.current?.requestSubmit();
    }, 50);
    return () => window.clearTimeout(t);
  }, [initialOAuthCode, autoStarted]);

  const copyLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(authorizeUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
      setPasteHint("Login-Link kopiert — am Computer öffnen.");
    } catch {
      setPasteHint("Link konnte nicht kopiert werden.");
    }
  };

  const fillFromText = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const code = extractOAuthCode(trimmed);
    if (!code) return false;
    setOauthCode(trimmed.includes("code=") ? trimmed : code);
    setPasteHint(null);
    return true;
  };

  const onPasteClipboard = async () => {
    setPasteHint(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!fillFromText(text)) {
        setPasteHint("Zwischenablage enthält keinen Peugeot-Code.");
        return;
      }
      setPasteHint("Code übernommen — „Code einlösen“ tippen.");
      codeRef.current?.focus();
    } catch {
      setPasteHint("Zwischenablage gesperrt — manuell einfügen.");
      codeRef.current?.focus();
    }
  };

  const onSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const result = await syncPeugeotStatus();
    setSyncMsg(result.error ?? result.success ?? null);
    setSyncing(false);
  };

  const syncLabel = formatSync(connection.lastSyncAt);
  const showForm = !compact || open || connection.needsReconnect;
  const state =
    passwordState.success || passwordState.error
      ? passwordState
      : codeState;
  const pending = passwordPending || codePending;

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
        <div className="ui-alert mt-4" role="alert">
          <p className="font-semibold text-[var(--danger)]">
            Neu anmelden erforderlich
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Am iPhone: E-Mail und Passwort — kein mymap:// nötig.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
            <p className="font-semibold text-[var(--fg)]">
              {isIos
                ? "Am iPhone: mit E-Mail und Passwort verbinden"
                : isMacSafari
                  ? "Am Mac mit Safari verbinden"
                  : "MyPeugeot verbinden"}
            </p>
            {isIos ? (
              <>
                <p className="mt-1.5">
                  Safari kann den Peugeot-Code (
                  <code className="text-[var(--accent-bright)]">mymap://</code>
                  ) nicht zuverlässig zurückgeben. Deshalb läuft der Login
                  serverseitig über einen Community-OAuth-Helper — du gibst nur
                  MyPeugeot E-Mail und Passwort ein.
                </p>
                <p className="mt-2">
                  E-Mail und Passwort gehen einmalig an{" "}
                  <span className="text-[var(--fg)]">stelloauth.tollet.me</span>{" "}
                  (werden dort und bei uns nicht gespeichert). Alternative ohne
                  Passwort: unten Code vom Computer einfügen.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1.5">
                  Am einfachsten: unten E-Mail und Passwort — der Login läuft
                  serverseitig. Oder manuell: Peugeot-Login öffnen, nach WEITER
                  die Adresse{" "}
                  <code className="text-[var(--accent-bright)]">mymap://…?code=…</code>{" "}
                  kopieren und einlösen.
                </p>
                {isMacSafari ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[var(--accent-bright)]">
                      Manuell in Safari (Adresszeile / Web-Inspektor)
                    </summary>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                      <li>
                        <strong className="text-[var(--fg)]">Peugeot-Login öffnen</strong>,
                        einloggen, WEITER.
                      </li>
                      <li>
                        Adresszeile:{" "}
                        <code className="text-[var(--accent-bright)]">mymap://…?code=…</code>{" "}
                        kopieren → unten einlösen.
                      </li>
                      <li>
                        Falls unsichtbar: Entwickler → Web-Inspektor (⌥⌘I) →
                        Netzwerk → Location-Header mit{" "}
                        <code className="text-[var(--accent-bright)]">mymap</code>.
                      </li>
                    </ol>
                  </details>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">Land</span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-1 ui-field"
              >
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="FR">Frankreich</option>
              </select>
            </label>

            <div className="rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3">
              <p className="text-sm font-semibold text-[var(--fg)]">
                Mit E-Mail / Passwort
              </p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Empfohlen am iPhone. Kann bis zu einer Minute dauern.
              </p>
              <form action={passwordAction} className="mt-3 grid gap-3">
                <input type="hidden" name="countryCode" value={countryCode} />
                <label className="block text-sm">
                  <span className="text-[var(--fg-muted)]">MyPeugeot E-Mail</span>
                  <input
                    name="mypeugeotEmail"
                    type="email"
                    required
                    defaultValue={connection.mypeugeotEmail ?? ""}
                    className="mt-1 ui-field"
                    autoComplete="username"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--fg-muted)]">Passwort</span>
                  <input
                    name="mypeugeotPassword"
                    type="password"
                    required
                    className="mt-1 ui-field"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="action-btn btn-primary rounded-full px-4 py-2.5 text-sm font-semibold"
                >
                  {passwordPending ? "Melde an…" : "Verbinden"}
                </button>
              </form>
            </div>

            {!isIos ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={authorizeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  Peugeot-Login öffnen
                </a>
                <button
                  type="button"
                  onClick={() => void copyLoginLink()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {linkCopied ? "Login-Link kopiert" : "Login-Link kopieren"}
                </button>
              </div>
            ) : null}
          </div>

          {connection.connected ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => void onSync()}
                disabled={syncing}
                className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
              >
                {syncing ? "Aktualisiere…" : "Jetzt syncen"}
              </button>
            </div>
          ) : null}

          <details className="mt-4 text-sm" open={Boolean(initialOAuthCode)}>
            <summary className="cursor-pointer text-[var(--accent-bright)]">
              Alternativ: Code vom Computer einfügen
            </summary>

            <p className="mt-2 text-xs text-[var(--fg-muted)]">
              Am Mac/PC Peugeot-Login öffnen → WEITER →{" "}
              <code className="text-[var(--accent-bright)]">mymap://…?code=…</code>{" "}
              kopieren und hier einlösen.
            </p>

            {isIos ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyLoginLink()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {linkCopied ? "Login-Link kopiert" : "Login-Link für PC kopieren"}
                </button>
              </div>
            ) : null}

            <form
              ref={codeFormRef}
              action={codeAction}
              className="mt-3 grid gap-3"
            >
              <input type="hidden" name="countryCode" value={countryCode} />
              <input
                type="hidden"
                name="mypeugeotEmail"
                value={connection.mypeugeotEmail ?? ""}
              />
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">
                  Redirect-URL oder OAuth-Code
                </span>
                <textarea
                  ref={codeRef}
                  name="oauthCode"
                  required
                  rows={3}
                  value={oauthCode}
                  onChange={(e) => setOauthCode(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text && extractOAuthCode(text)) {
                      e.preventDefault();
                      fillFromText(text);
                      setPasteHint("Code erkannt.");
                    }
                  }}
                  placeholder="mymap://oauth2redirect/de?code=…"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mt-1 ui-field font-mono text-xs"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onPasteClipboard()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  Aus Zwischenablage
                </button>
                <button
                  type="submit"
                  disabled={codePending || !oauthCode.trim()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {codePending ? "Verbinde…" : "Code einlösen"}
                </button>
              </div>
            </form>
          </details>
        </>
      ) : null}

      <div className="mt-3 space-y-1 text-sm">
        {pasteHint ? (
          <p role="status" className="text-[var(--fg-muted)]">
            {pasteHint}
          </p>
        ) : null}
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

"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  connectPeugeotWithCode,
  connectPeugeotWithPassword,
  syncPeugeotStatus,
  type ConnectState,
} from "@/app/actions/peugeot";
import { buildPeugeotAuthorizeUrl } from "@/lib/stellantis/authorize-url";
import { buildCodeCatcherBookmarklet } from "@/lib/stellantis/code-catcher";
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

export function PeugeotConnectForm({
  connection,
  compact = false,
  initialOAuthCode = null,
  initialOAuthCountry = null,
}: {
  connection: PeugeotConnection;
  /** Settings layout: collapse reconnect UI when already linked. */
  compact?: boolean;
  /** From Code-Fänger redirect (?code=…). */
  initialOAuthCode?: string | null;
  initialOAuthCountry?: string | null;
}) {
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
      Boolean(initialOAuthCode),
  );
  const [oauthCode, setOauthCode] = useState(initialOAuthCode ?? "");
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [catcherCopied, setCatcherCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [autoStarted, setAutoStarted] = useState(false);
  const codeFormRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const authorizeUrl = useMemo(
    () => buildPeugeotAuthorizeUrl(countryCode),
    [countryCode],
  );

  const catcherHref = useMemo(() => {
    if (!origin) return "";
    return buildCodeCatcherBookmarklet({
      returnBaseUrl: origin,
      countryCode,
    });
  }, [origin, countryCode]);

  // Returning from Code-Fänger: redeem code automatically.
  useEffect(() => {
    if (!initialOAuthCode || autoStarted) return;
    const code = extractOAuthCode(initialOAuthCode);
    if (!code) {
      setPasteHint(
        "Rückkehr vom Code-Fänger ohne gültigen Code — bitte Schritte wiederholen.",
      );
      return;
    }
    setOauthCode(initialOAuthCode);
    setOpen(true);
    setAutoStarted(true);
    setPasteHint("Code empfangen — verbinde…");
    // Drop query params without remounting, then submit.
    window.history.replaceState({}, "", "/control/settings");
    const t = window.setTimeout(() => {
      codeFormRef.current?.requestSubmit();
    }, 50);
    return () => window.clearTimeout(t);
  }, [initialOAuthCode, autoStarted]);

  const copyCatcher = async () => {
    if (!catcherHref) return;
    try {
      await navigator.clipboard.writeText(catcherHref);
      setCatcherCopied(true);
      window.setTimeout(() => setCatcherCopied(false), 2500);
      setPasteHint(
        "Code-Fänger kopiert. In Safari als Lesezeichen speichern (siehe Schritte).",
      );
    } catch {
      setPasteHint("Kopieren blockiert — Lesezeichen unten lange drücken.");
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
      : codeState.success || codeState.error
        ? codeState
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
            Captcha selbst lösen, Code-Fänger holt den Rest.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
            <p className="font-semibold text-[var(--fg)]">
              Empfohlen: Captcha selbst, Rest automatisch
            </p>
            <p className="mt-1.5">
              Peugeot blockiert den vollautomatischen Login oft mit Captcha. Deshalb
              meldest du dich einmal manuell an — ein kleines Lesezeichen fängt danach
              den Code ab und schickt dich zurück in die App.
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                <strong className="text-[var(--fg)]">Code-Fänger kopieren</strong> und in
                Safari als Lesezeichen speichern: Teilen/Lesezeichen → neues Lesezeichen →
                bearbeiten → Adresse durch den kopierten Text ersetzen (muss mit{" "}
                <code className="text-[var(--accent-bright)]">javascript:</code> beginnen).
              </li>
              <li>
                Unten <strong className="text-[var(--fg)]">Peugeot-Login öffnen</strong>,
                Captcha + Login wie gewohnt.
              </li>
              <li>
                Auf der Seite „Anmeldung erfolgreich“ zuerst das{" "}
                <strong className="text-[var(--fg)]">Code-Fänger-Lesezeichen</strong> tippen,
                dann <strong className="text-[var(--fg)]">WEITER</strong>.
              </li>
              <li>Du landest zurück hier — die App löst den Code automatisch ein.</li>
            </ol>
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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyCatcher()}
                disabled={!catcherHref}
                className="action-btn btn-primary rounded-full px-4 py-2.5 text-sm font-semibold"
              >
                {catcherCopied ? "Code-Fänger kopiert" : "1. Code-Fänger kopieren"}
              </button>
              <a
                href={authorizeUrl}
                target="_blank"
                rel="noreferrer"
                className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
              >
                2. Peugeot-Login öffnen
              </a>
            </div>

            {/* iOS: long-press also works for some browsers */}
            {catcherHref ? (
              <a
                href={catcherHref}
                className="text-[11px] text-[var(--accent-bright)] underline-offset-2 hover:underline"
                onClick={(e) => {
                  // Don't navigate — users should save as bookmark.
                  e.preventDefault();
                  void copyCatcher();
                }}
              >
                Falls Kopieren scheitert: Link lange drücken → „Link kopieren“
              </a>
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

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-[var(--accent-bright)]">
              Alternativen (Automatik / Code einfügen)
            </summary>

            <div className="mt-3 rounded-2xl border border-[var(--line)]/60 p-3 text-xs text-[var(--fg-muted)]">
              <p className="font-semibold text-[var(--fg)]">
                Automatisch mit Passwort
              </p>
              <p className="mt-1">
                Oft durch Captcha blockiert. Passwort wird nicht gespeichert.
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
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {passwordPending
                    ? "Melde an…"
                    : "Trotzdem automatisch versuchen"}
                </button>
              </form>
            </div>

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

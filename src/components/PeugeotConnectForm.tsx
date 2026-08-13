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
const OAUTH_STARTED_KEY = "peugeot-oauth-started";

function formatSync(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px), (pointer: coarse)");
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return phone;
}

function clearOAuthStarted() {
  try {
    sessionStorage.removeItem(OAUTH_STARTED_KEY);
  } catch {
    /* ignore */
  }
}

function setOAuthStartedFlag() {
  try {
    sessionStorage.setItem(OAUTH_STARTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wasOAuthStarted(): boolean {
  try {
    return sessionStorage.getItem(OAUTH_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function PeugeotConnectForm({
  connection,
  compact = false,
}: {
  connection: PeugeotConnection;
  /** Settings layout: collapse reconnect UI when already linked. */
  compact?: boolean;
}) {
  const isPhone = useIsPhone();
  const [countryCode, setCountryCode] = useState(connection.countryCode || "DE");
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
    !connection.connected || connection.needsReconnect,
  );
  const [oauthCode, setOauthCode] = useState("");
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const authorizeUrl = useMemo(
    () => buildPeugeotAuthorizeUrl(countryCode),
    [countryCode],
  );

  const fillFromText = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    const code = extractOAuthCode(trimmed);
    if (!code) return false;
    setOauthCode(trimmed.includes("code=") ? trimmed : code);
    setPasteHint(null);
    setAwaitingReturn(false);
    clearOAuthStarted();
    return true;
  };

  const onPasteClipboard = async () => {
    setPasteHint(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!fillFromText(text)) {
        setPasteHint(
          "Zwischenablage enthält keinen Peugeot-Code. Adresszeile mit mymap://… kopieren.",
        );
        return;
      }
      setPasteHint("Code übernommen — jetzt „Code einlösen“ tippen.");
      codeRef.current?.focus();
    } catch {
      setPasteHint(
        "Zwischenablage gesperrt. URL manuell einfügen (langes Drücken → Einfügen).",
      );
      codeRef.current?.focus();
    }
  };

  const markOAuthStarted = () => {
    setAwaitingReturn(true);
    setPasteHint(
      "Nach „Weiter“ die mymap://-URL kopieren (am Computer aus der Adresszeile / Netzwerk-Tab).",
    );
    setOAuthStartedFlag();
  };

  const copyAuthorizeLink = async () => {
    try {
      await navigator.clipboard.writeText(authorizeUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setPasteHint(
        "Link konnte nicht kopiert werden — lange auf „Bei Peugeot anmelden“ tippen.",
      );
    }
  };

  useEffect(() => {
    if (wasOAuthStarted()) setAwaitingReturn(true);

    const onReturn = () => {
      if (!wasOAuthStarted()) return;
      setAwaitingReturn(true);
      setPasteHint(
        "Zurück von Peugeot? mymap://…-Adresse einfügen — oder oben mit E-Mail/Passwort verbinden.",
      );
      codeRef.current?.focus();
    };

    const onVis = () => {
      if (document.visibilityState === "visible") onReturn();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onReturn);
    };
  }, []);

  const onSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const result = await syncPeugeotStatus();
    setSyncMsg(result.error ?? result.success ?? null);
    setSyncing(false);
  };

  const syncLabel = formatSync(connection.lastSyncAt);
  const showForm = !compact || open || connection.needsReconnect;
  const state = passwordState.success || passwordState.error ? passwordState : codeState;
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
            Am einfachsten: MyPeugeot E-Mail und Passwort unten eingeben.
          </p>
        </div>
      ) : null}

      {showForm ? (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
            <p className="font-semibold text-[var(--fg)]">
              Automatisch anmelden
            </p>
            <p className="mt-1.5">
              E-Mail und Passwort von MyPeugeot eingeben — die App meldet sich im
              Hintergrund an und speichert die Sitzung. Das Passwort wird{" "}
              <strong className="text-[var(--fg)]">nicht gespeichert</strong>, nur
              einmalig für den Login genutzt. Wenn Peugeot ein Captcha verlangt,
              scheitert die Automatik — dann unten den Code manuell (am Computer)
              einlösen.
            </p>
          </div>

          <form action={passwordAction} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">Land</span>
                <select
                  name="countryCode"
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
            </div>
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">MyPeugeot Passwort</span>
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
              {passwordPending ? "Melde an… (kann ~30–60 Sek. dauern)" : "Automatisch verbinden"}
            </button>
          </form>

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

          <details
            className="mt-4 text-sm"
            open={showManual}
            onToggle={(e) => setShowManual((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-[var(--accent-bright)]">
              Alternativ: Code manuell einlösen
            </summary>

            {isPhone ? (
              <p className="mt-2 text-xs text-[var(--fg-muted)]">
                Am iPhone geht der Code in Safari oft verloren. Wenn die
                Automatik scheitert: Login-Link am Computer öffnen und{" "}
                <code className="text-[var(--accent-bright)]">mymap://…</code>{" "}
                von dort kopieren.
              </p>
            ) : (
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-[var(--fg-muted)]">
                <li>
                  Peugeot öffnen, <kbd className="text-[var(--fg)]">F12</kbd> → Netzwerk
                </li>
                <li>Auf WEITER klicken, <code className="text-[var(--accent-bright)]">mymap://</code>{" "}
                  kopieren
                </li>
              </ol>
            )}

            {awaitingReturn ? (
              <div className="ui-alert mt-3" role="status">
                <p className="text-sm font-semibold text-[var(--fg)]">
                  Warte auf den Code
                </p>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  <code className="text-[var(--accent-bright)]">mymap://…</code> einfügen
                  oder oben automatisch verbinden.
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={authorizeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => markOAuthStarted()}
                className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
              >
                Bei Peugeot anmelden
              </a>
              <button
                type="button"
                onClick={() => void copyAuthorizeLink()}
                className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
              >
                {linkCopied ? "Link kopiert" : "Login-Link kopieren"}
              </button>
            </div>

            <form action={codeAction} className="mt-3 grid gap-3">
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
                  rows={isPhone ? 3 : 2}
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

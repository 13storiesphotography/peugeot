"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
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

const LOGIN_PHASES = [
  "Verbinde mit MyPeugeot…",
  "Melde dich an — das kann einen Moment dauern…",
  "Hole den Freigabe-Code…",
  "Speichere die Sitzung…",
] as const;

function LoginSpinner({ className }: { className?: string }) {
  return (
    <span
      className={`block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden
    />
  );
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

function useIsIos(): boolean {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  return ios;
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
  const [countryCode, setCountryCode] = useState(
    initialOAuthCountry || connection.countryCode || "DE",
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    connectPeugeotWithPassword,
    initial,
  );
  const [, startPasswordTransition] = useTransition();
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
  const [loginPhase, setLoginPhase] = useState(0);
  const [loginSlow, setLoginSlow] = useState(false);

  useEffect(() => {
    if (!passwordPending) {
      setLoginPhase(0);
      setLoginSlow(false);
      return;
    }
    setLoginPhase(0);
    setLoginSlow(false);
    const id = window.setInterval(() => {
      setLoginPhase((p) => Math.min(p + 1, LOGIN_PHASES.length - 1));
    }, 8_000);
    // Every spinner needs an ending: after ~70s offer an exit path.
    const slowId = window.setTimeout(() => setLoginSlow(true), 70_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(slowId);
    };
  }, [passwordPending]);

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
                  : "Verbunden."
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
        </div>
      ) : null}

      {showForm ? (
        <>
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

            {/* Safari ignores autocomplete=off on username/password-looking fields.
                Avoid login heuristics: non-credential names, text+masked password,
                readonly until focus. */}
            <form
              autoComplete="off"
              className="relative grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                startPasswordTransition(() => {
                  passwordAction(formData);
                });
              }}
            >
              <input type="hidden" name="countryCode" value={countryCode} />
              {/* Honeypot login fields — absorb iOS Autofill for peugeotcontrol.app */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
              >
                <input type="text" name="email" autoComplete="username" tabIndex={-1} />
                <input
                  type="password"
                  name="site-password"
                  autoComplete="current-password"
                  tabIndex={-1}
                />
              </div>
              <p className="text-xs text-[var(--fg-muted)]">
                MyPeugeot-Zugangsdaten (nicht peugeotcontrol.app). Auf dem iPhone:
                Tastatur → Schlüssel → „Andere Passwörter…“ → nach Peugeot suchen.
              </p>
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">MyPeugeot E-Mail</span>
                <input
                  id="mypeugeot-email"
                  name="mypeugeotEmail"
                  type="text"
                  required
                  defaultValue={connection.mypeugeotEmail ?? ""}
                  className="mt-1 ui-field"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.readOnly = false;
                  }}
                  disabled={passwordPending}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--fg-muted)]">Passwort</span>
                <input
                  id="mypeugeot-secret"
                  name="mypeugeotPassword"
                  type="text"
                  required={!connection.hasPasswordStored}
                  placeholder={
                    connection.hasPasswordStored
                      ? "Gespeichert — nur bei Wechsel neu eingeben"
                      : undefined
                  }
                  className="mt-1 ui-field"
                  style={{ WebkitTextSecurity: "disc" } as CSSProperties}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.readOnly = false;
                  }}
                  disabled={passwordPending}
                />
                {connection.hasPasswordStored ? (
                  <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                    Passwort liegt verschlüsselt für Auto-Login vor.
                  </p>
                ) : null}
              </label>
              {passwordPending ? (
                <div
                  className="rounded-2xl border border-[var(--line)] bg-white/[0.04] px-3 py-3"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div className="flex items-start gap-3">
                    <LoginSpinner className="mt-0.5 shrink-0 text-[var(--accent-bright)]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--fg)]">
                        {LOGIN_PHASES[loginPhase]}
                      </p>
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">
                        {loginSlow
                          ? "Dauert länger als erwartet. Wenn nichts passiert: Seite neu laden und erneut verbinden."
                          : "Seite nicht schließen — oft 20–60 Sekunden. Der Button hängt nicht, der Login läuft auf dem Server."}
                      </p>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--accent-bright)] transition-[width] duration-700 ease-out"
                          style={{
                            width: `${loginSlow ? 96 : 18 + loginPhase * 22}%`,
                          }}
                        />
                      </div>
                      {loginSlow ? (
                        <button
                          type="button"
                          className="mt-3 text-xs font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
                          onClick={() => window.location.reload()}
                        >
                          Neu laden & erneut versuchen
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={pending}
                className="action-btn btn-primary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-80"
              >
                {passwordPending ? (
                  <>
                    <LoginSpinner />
                    Melde an…
                  </>
                ) : (
                  "Verbinden"
                )}
              </button>
            </form>

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
                  className="action-btn inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {codePending ? (
                    <>
                      <LoginSpinner />
                      Verbinde…
                    </>
                  ) : (
                    "Code einlösen"
                  )}
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

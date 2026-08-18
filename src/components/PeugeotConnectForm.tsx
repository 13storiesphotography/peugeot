"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  connectPeugeotWithCode,
  connectPeugeotWithPassword,
  syncPeugeotStatus,
  type ConnectState,
} from "@/app/actions/peugeot";
import { useI18n } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/i18n/format";
import { buildPeugeotAuthorizeUrl } from "@/lib/stellantis/authorize-url";
import { extractOAuthCode } from "@/lib/stellantis/oauth-code";
import type { PeugeotConnection } from "@/lib/vehicle/repository";

const initial: ConnectState = {};

function formatSync(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale, {
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
  const { locale, t } = useI18n();
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
      setPasteHint(t("connect.noCodeReturn"));
      return;
    }
    setOauthCode(initialOAuthCode);
    setOpen(true);
    setAutoStarted(true);
    setPasteHint(t("connect.codeReceived"));
    window.history.replaceState({}, "", "/control/settings");
    const timer = window.setTimeout(() => {
      codeFormRef.current?.requestSubmit();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [initialOAuthCode, autoStarted, t]);

  const copyLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(authorizeUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
      setPasteHint(t("connect.copiedOpenPc"));
    } catch {
      setPasteHint(t("connect.copyFail"));
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
        setPasteHint(t("connect.clipboardNoCode"));
        return;
      }
      setPasteHint(t("connect.codeReady"));
      codeRef.current?.focus();
    } catch {
      setPasteHint(t("connect.clipboardBlocked"));
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

  const syncLabel = formatSync(connection.lastSyncAt, intlLocale(locale));
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
              ? t("connect.reconnect")
              : connection.connected
                ? syncLabel
                  ? t("connect.connectedSync", { time: syncLabel })
                  : t("connect.connectedAuto")
                : t("connect.connectHint")}
          </p>
        </div>
        {compact && connection.connected && !connection.needsReconnect ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)]"
            aria-expanded={open}
          >
            {open ? t("connect.close") : t("connect.manage")}
          </button>
        ) : null}
      </div>

      {connection.needsReconnect ? (
        <div className="ui-alert mt-4" role="alert">
          <p className="font-semibold text-[var(--danger)]">
            {t("connect.needLogin")}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {t("connect.needLoginHint")}
          </p>
        </div>
      ) : null}

      {showForm ? (
        <>
          <div className="mt-4 rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
            <p className="font-semibold text-[var(--fg)]">
              {isIos
                ? t("connect.titleIos")
                : isMacSafari
                  ? t("connect.titleMac")
                  : t("connect.title")}
            </p>
            {isIos ? (
              <>
                <p className="mt-1.5">{t("connect.iosBody1")}</p>
                <p className="mt-2">{t("connect.iosBody2")}</p>
              </>
            ) : (
              <>
                <p className="mt-1.5">{t("connect.desktopBody")}</p>
                {isMacSafari ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[var(--accent-bright)]">
                      {t("connect.safariManual")}
                    </summary>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                      <li>{t("connect.safari1")}</li>
                      <li>{t("connect.safari2")}</li>
                      <li>{t("connect.safari3")}</li>
                    </ol>
                  </details>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">{t("connect.country")}</span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="mt-1 ui-field"
              >
                <option value="DE">{t("connect.de")}</option>
                <option value="AT">{t("connect.at")}</option>
                <option value="CH">{t("connect.ch")}</option>
                <option value="FR">{t("connect.fr")}</option>
              </select>
            </label>

            <div className="rounded-2xl border border-[var(--line)]/80 bg-black/[0.03] p-3">
              <p className="text-sm font-semibold text-[var(--fg)]">
                {t("connect.withPassword")}
              </p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                {t("connect.withPasswordHint")}
              </p>
              <form action={passwordAction} className="mt-3 grid gap-3">
                <input type="hidden" name="countryCode" value={countryCode} />
                <label className="block text-sm">
                  <span className="text-[var(--fg-muted)]">{t("connect.myEmail")}</span>
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
                  <span className="text-[var(--fg-muted)]">{t("common.password")}</span>
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
                  {passwordPending ? t("connect.signingIn") : t("connect.connect")}
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
                  {t("connect.openLogin")}
                </a>
                <button
                  type="button"
                  onClick={() => void copyLoginLink()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {linkCopied ? t("connect.linkCopied") : t("connect.copyLink")}
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
                {syncing ? t("connect.syncing") : t("connect.syncNow")}
              </button>
            </div>
          ) : null}

          <details className="mt-4 text-sm" open={Boolean(initialOAuthCode)}>
            <summary className="cursor-pointer text-[var(--accent-bright)]">
              {t("connect.altCode")}
            </summary>

            <p className="mt-2 text-xs text-[var(--fg-muted)]">
              {t("connect.altHint")}
            </p>

            {isIos ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyLoginLink()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {linkCopied ? t("connect.linkCopied") : t("connect.copyLinkPc")}
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
                  {t("connect.pasteLabel")}
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
                      setPasteHint(t("connect.codeDetected"));
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
                  {t("connect.pasteClipboard")}
                </button>
                <button
                  type="submit"
                  disabled={codePending || !oauthCode.trim()}
                  className="action-btn rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                >
                  {codePending ? t("connect.connecting") : t("connect.redeem")}
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

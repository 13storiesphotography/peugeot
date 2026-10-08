"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import {
  activateRemotePinAction,
  sendRemoteSmsAction,
  type RemotePinState,
} from "@/app/actions/remote";

type Props = {
  ready: boolean;
  /** Compact layout for the Klima tab (default settings-style). */
  compact?: boolean;
  /** Called after PIN setup succeeds so the parent can unlock climate. */
  onReady?: () => void;
};

export function RemotePinForm({ ready, compact = false, onReady }: Props) {
  const [state, action, pending] = useActionState(
    activateRemotePinAction,
    {} as RemotePinState,
  );
  const [smsMsg, setSmsMsg] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState("");
  const [pin, setPin] = useState("");
  const [smsPending, startSms] = useTransition();
  const [open, setOpen] = useState(!ready);
  const notified = useRef(false);

  useEffect(() => {
    if ((state.success || state.ready) && !notified.current) {
      notified.current = true;
      onReady?.();
    }
  }, [state.success, state.ready, onReady]);

  const showSetup = compact || open || !ready;

  return (
    <section className={compact ? "ui-surface space-y-4 px-4 py-4" : undefined}>
      {!compact ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Fernbedienung
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {ready
                ? "Klima/Aufwecken aktiv. Schloss/Hupe/Licht brauchen zusätzlich Connect PLUS in MyPeugeot."
                : "Einmalig: SMS-Code + 4-stellige MyPeugeot-PIN (für Klima/e-Remote). Bei Sperre kurz warten und neue SMS holen."}
            </p>
          </div>
          {ready ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)]"
              aria-expanded={open}
            >
              {open ? "Schließen" : "Neu einrichten"}
            </button>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="font-semibold">Klima freischalten</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            1) SMS anfordern · 2) Code aus der SMS · 3) MyPeugeot-PIN
          </p>
        </div>
      )}

      {showSetup ? (
        <>
          <div className={`${compact ? "" : "mt-4 "}flex flex-wrap gap-2`}>
            <button
              type="button"
              disabled={smsPending}
              className="action-btn rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
              onClick={() => {
                startSms(async () => {
                  setSmsMsg(null);
                  const res = await sendRemoteSmsAction();
                  setSmsMsg(res.error ?? res.success ?? null);
                });
              }}
            >
              {smsPending ? "Sende…" : "1. SMS anfordern"}
            </button>
            {ready ? (
              <span className="self-center text-xs font-semibold text-[var(--accent-bright)]">
                Aktiv
              </span>
            ) : null}
          </div>
          {smsMsg ? (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">{smsMsg}</p>
          ) : null}

          {/* Safari/iOS treats type=password + nearby code fields as a site
              login and offers peugeotcontrol.app credentials. Same evasion as
              PeugeotConnectForm: absorb autofill, mask PIN without password. */}
          <form
            action={action}
            autoComplete="off"
            className={`${compact ? "mt-1" : "mt-4"} relative grid gap-3 sm:grid-cols-2`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
            >
              <input
                type="text"
                name="email"
                autoComplete="username"
                tabIndex={-1}
              />
              <input
                type="password"
                name="site-password"
                autoComplete="current-password"
                tabIndex={-1}
              />
            </div>
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">SMS-Code</span>
              <input
                name="smsCode"
                value={smsCode}
                onChange={(e) =>
                  setSmsCode(e.target.value.replace(/[^\d\s-]/g, ""))
                }
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
                className="mt-1 ui-field"
                placeholder="z. B. 123456"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">PIN (4 Ziffern)</span>
              <input
                name="pin"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                type="text"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
                style={{ WebkitTextSecurity: "disc" } as CSSProperties}
                className="mt-1 ui-field"
                placeholder="••••"
                required
                readOnly
                onFocus={(e) => {
                  e.currentTarget.readOnly = false;
                }}
              />
            </label>
            <button
              type="submit"
              disabled={
                pending ||
                smsCode.replace(/\D/g, "").length < 4 ||
                pin.length !== 4
              }
              className="action-btn btn-primary sm:col-span-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-55"
            >
              {pending
                ? "Richte ein…"
                : ready
                  ? "Erneut freischalten"
                  : "2. Freischalten"}
            </button>
          </form>
        </>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 text-sm text-[var(--accent-bright)]">{state.success}</p>
      ) : null}
    </section>
  );
}

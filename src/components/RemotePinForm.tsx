"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
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
                ? "Klima und Aufwecken ohne erneute PIN."
                : "Einmalig: SMS-Code + 4-stellige MyPeugeot-PIN."}
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

          <form
            action={action}
            className={`${compact ? "mt-1" : "mt-4"} grid gap-3 sm:grid-cols-2`}
          >
            <label className="block text-sm">
              <span className="text-[var(--fg-muted)]">SMS-Code</span>
              <input
                name="smsCode"
                value={smsCode}
                onChange={(e) =>
                  setSmsCode(e.target.value.replace(/[^\d\s-]/g, ""))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="next"
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
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 ui-field"
            placeholder="••••"
            required
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

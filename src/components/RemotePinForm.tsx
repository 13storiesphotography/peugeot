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
  const [smsPending, startSms] = useTransition();
  const notified = useRef(false);

  useEffect(() => {
    if ((state.success || state.ready) && !notified.current) {
      notified.current = true;
      onReady?.();
    }
  }, [state.success, state.ready, onReady]);

  return (
    <section className={compact ? "ui-surface space-y-4 px-4 py-4" : undefined}>
      {!compact ? (
        <>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Fernbedienung
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {ready
              ? "Einmal eingerichtet — Klima und Aufwecken laufen ohne erneute PIN."
              : "Einmalig SMS-Code + MyPeugeot-PIN (4 Ziffern). Danach Klima ohne PIN."}
          </p>
        </>
      ) : (
        <div>
          <p className="font-semibold">Klima freischalten</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Peugeot verlangt einmalig SMS + deine MyPeugeot-PIN. Danach startet
            Klima hier ohne erneute PIN — wie in der Original-App.
          </p>
        </div>
      )}

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
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="123456"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">MyPeugeot-PIN</span>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="••••"
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-btn btn-primary sm:col-span-2 rounded-full px-5 py-3 text-sm font-semibold"
        >
          {pending
            ? "Richte ein…"
            : ready
              ? "Erneut einrichten"
              : "2. Freischalten"}
        </button>
      </form>

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

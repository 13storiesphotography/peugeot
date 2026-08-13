"use client";

import { useActionState, useState, useTransition } from "react";
import {
  activateRemotePinAction,
  sendRemoteSmsAction,
  type RemotePinState,
} from "@/app/actions/remote";

export function RemotePinForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(
    activateRemotePinAction,
    {} as RemotePinState,
  );
  const [smsMsg, setSmsMsg] = useState<string | null>(null);
  const [smsPending, startSms] = useTransition();

  return (
    <section className="rounded-2xl border border-[var(--line)] p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
        Fernbedienung
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        {ready
          ? "PIN eingerichtet — Vorklima An/Aus ist freigeschaltet."
          : "SMS-Code und MyPeugeot-PIN einmalig hinterlegen."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
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
          {smsPending ? "Sende…" : "SMS anfordern"}
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

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <span className="text-[var(--fg-muted)]">PIN (4 Ziffern)</span>
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
          className="action-btn sm:col-span-2 rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending ? "Richte ein…" : ready ? "Erneut einrichten" : "Einrichten"}
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

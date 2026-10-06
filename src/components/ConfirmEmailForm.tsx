"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  confirmEmailWithToken,
  type AuthState,
} from "@/app/actions/auth";

const initial: AuthState = {};

/** Click-through confirm — Safe Links / mail scanners must not burn the OTP on GET. */
export function ConfirmEmailForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: string;
}) {
  const [state, action, pending] = useActionState(
    confirmEmailWithToken,
    initial,
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--fg-muted)]">
        Tippe auf den Button, um dein Konto zu aktivieren. Der Link wird erst
        jetzt eingelöst — so bleibt er auch bei Outlook / Microsoft 365 gültig.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      <form action={action} className="space-y-3">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <button
          type="submit"
          disabled={pending}
          className="action-btn w-full rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending ? "Wird bestätigt…" : "E-Mail bestätigen"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--fg-muted)]">
        Schon bestätigt?{" "}
        <Link
          href="/#start"
          className="font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
        >
          Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}

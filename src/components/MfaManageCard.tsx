"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  removeOwnMfa,
  type AccountState,
} from "@/app/actions/account";
import { MfaEnrollForm } from "@/components/MfaEnrollForm";
import type { MfaDecisionResult } from "@/lib/auth/mfa";
import { MFA_GRACE_DAYS } from "@/lib/auth/mfa-policy";

const initial: AccountState = {};

export function MfaManageCard({
  mfa,
}: {
  mfa: MfaDecisionResult;
}) {
  const [enrolling, setEnrolling] = useState(false);
  const [state, action, pending] = useActionState(removeOwnMfa, initial);

  const isActive = mfa.status === "ok";
  const needsSetup =
    mfa.status === "enroll_optional" || mfa.status === "enroll_required";

  return (
    <section id="mfa" className="ui-surface scroll-mt-24 p-4 sm:p-5">
      <p className="eyebrow">Sicherheit</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        Zwei-Faktor-Authentifizierung
      </h2>

      {isActive ? (
        <>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            Authenticator-App ist aktiv. Beim Login brauchst du zusätzlich den
            6-stelligen Code.
          </p>
          {state.error ? (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="mt-3 text-sm text-[var(--accent-bright)]">
              {state.success}
            </p>
          ) : null}
          {mfa.factorId ? (
            <form action={action} className="mt-4">
              <input type="hidden" name="factorId" value={mfa.factorId} />
              <button
                type="submit"
                disabled={pending}
                className="action-btn w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {pending ? "Entferne…" : "MFA entfernen"}
              </button>
            </form>
          ) : null}
        </>
      ) : needsSetup ? (
        <>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {mfa.status === "enroll_optional"
              ? `Noch optional · ${mfa.daysLeft} Tag${mfa.daysLeft === 1 ? "" : "e"} Grace-Zeit (Pflicht nach ${MFA_GRACE_DAYS} Tagen).`
              : "MFA ist Pflicht — bitte jetzt einrichten."}
          </p>
          {enrolling ? (
            <div className="mt-4">
              <MfaEnrollForm
                forced={mfa.status === "enroll_required"}
                redirectTo="/control/account"
                embedded
              />
              <button
                type="button"
                onClick={() => setEnrolling(false)}
                className="mt-3 mx-auto block text-sm font-semibold text-[var(--fg-muted)] underline-offset-4 hover:underline"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setEnrolling(true)}
                className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold"
              >
                MFA einrichten
              </button>
              <Link
                href="/mfa"
                className="block text-center text-sm text-[var(--fg-muted)] underline-offset-4 hover:underline"
              >
                Zur MFA-Seite
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Bitte zuerst den MFA-Code bestätigen.{" "}
          <Link
            href="/mfa"
            className="font-semibold text-[var(--accent-bright)] underline-offset-4 hover:underline"
          >
            Weiter zur Bestätigung
          </Link>
        </p>
      )}
    </section>
  );
}

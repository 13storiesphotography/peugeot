"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/billing";
import type { Entitlement } from "@/lib/billing/entitlement";
import { PRO_YEAR_CENTS, formatEuroFromCents } from "@/lib/billing/catalog";

const initial: CheckoutState = {};

export function ProUpgradeCard({
  entitlement,
  stripeReady,
  notice,
}: {
  entitlement: Entitlement;
  stripeReady: boolean;
  notice?: CheckoutState;
}) {
  const [state, action, pending] = useActionState(startCheckout, initial);
  const error = notice?.error ?? state.error;
  const success = notice?.success ?? state.success;

  return (
    <section id="pro" className="ui-surface scroll-mt-24 p-4 sm:p-5">
      <p className="eyebrow">Abo</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        {entitlement.isPro ? "Pro aktiv" : "Pro freischalten"}
      </h2>
      {entitlement.isPro ? (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Steuern und 80%-Limit sind an.{" "}
          {entitlement.periodEnd
            ? `Gültig bis ${new Intl.DateTimeFormat("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(entitlement.periodEnd))}.`
            : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {formatEuroFromCents(PRO_YEAR_CENTS)} / Jahr — Vorklima, Schloss,
          Finden und 80%-Limit.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="mt-3 text-sm text-[var(--accent-bright)]">
          {success}
        </p>
      ) : null}

      {!entitlement.isPro ? (
        <form action={action} className="mt-4">
          <button
            type="submit"
            disabled={pending || !stripeReady}
            className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {pending
              ? "Weiter zur Zahlung…"
              : stripeReady
                ? `Pro für ${formatEuroFromCents(PRO_YEAR_CENTS)} / Jahr`
                : "Zahlung noch nicht eingerichtet"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

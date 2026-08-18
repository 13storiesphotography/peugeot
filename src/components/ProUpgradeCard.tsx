"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/app/actions/billing";
import type { Entitlement } from "@/lib/billing/entitlement";
import {
  FOUNDER_CAP,
  FOUNDER_CENTS,
  PRO_YEAR_CENTS,
  formatEuroFromCents,
} from "@/lib/billing/catalog";

const initial: CheckoutState = {};

export function ProUpgradeCard({
  entitlement,
  founderTaken,
  stripeReady,
  stripeTest,
  notice,
}: {
  entitlement: Entitlement;
  founderTaken: number;
  stripeReady: boolean;
  stripeTest: boolean;
  notice?: CheckoutState;
}) {
  const [state, action, pending] = useActionState(startCheckout, initial);
  const founderOpen = founderTaken < FOUNDER_CAP;
  const price = founderOpen ? FOUNDER_CENTS : PRO_YEAR_CENTS;
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
          80%-Ladelimit ist an.{" "}
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
          {founderOpen
            ? `Founder-Preis ${formatEuroFromCents(price)} für 12 Monate — noch ${FOUNDER_CAP - founderTaken} von ${FOUNDER_CAP} Plätzen.`
            : `Pro ${formatEuroFromCents(price)} für 12 Monate.`}{" "}
          Schaltet das 80%-Limit frei.
        </p>
      )}

      {stripeTest ? (
        <p className="mt-3 text-xs text-[var(--warn)]">
          Stripe Testmodus — Karte 4242 4242 4242 4242, beliebiges Datum, CVC
          123.
        </p>
      ) : null}

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
              ? "Weiter zu Stripe…"
              : stripeReady
                ? `Jetzt ${formatEuroFromCents(price)} zahlen`
                : "Stripe noch nicht verbunden"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

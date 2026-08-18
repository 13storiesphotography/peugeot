"use client";

import { useActionState } from "react";
import {
  cancelSubscriptionAtPeriodEnd,
  changeSubscriptionPlan,
  openBillingPortal,
  resumeSubscription,
  startCheckout,
  type CheckoutState,
} from "@/app/actions/billing";
import type { Entitlement } from "@/lib/billing/entitlement";
import type { SubscriptionSnapshot } from "@/lib/billing/subscription";
import {
  PRO_MONTH_CENTS,
  PRO_YEAR_CENTS,
  PRO_YEAR_IF_MONTHLY_CENTS,
  formatEuroFromCents,
  yearlySavingsCents,
} from "@/lib/billing/catalog";

const initial: CheckoutState = {};

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function ProUpgradeCard({
  entitlement,
  subscription,
  stripeReady,
  notice,
}: {
  entitlement: Entitlement;
  subscription: SubscriptionSnapshot | null;
  stripeReady: boolean;
  notice?: CheckoutState;
}) {
  const [checkoutState, checkoutAction, checkoutPending] = useActionState(
    startCheckout,
    initial,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelSubscriptionAtPeriodEnd,
    initial,
  );
  const [resumeState, resumeAction, resumePending] = useActionState(
    resumeSubscription,
    initial,
  );
  const [changeState, changeAction, changePending] = useActionState(
    changeSubscriptionPlan,
    initial,
  );
  const [portalState, portalAction, portalPending] = useActionState(
    openBillingPortal,
    initial,
  );

  const pending =
    checkoutPending ||
    cancelPending ||
    resumePending ||
    changePending ||
    portalPending;
  const error =
    notice?.error ??
    checkoutState.error ??
    cancelState.error ??
    resumeState.error ??
    changeState.error ??
    portalState.error;
  const success =
    notice?.success ??
    checkoutState.success ??
    cancelState.success ??
    resumeState.success ??
    changeState.success;
  const periodEnd = subscription?.periodEnd ?? entitlement.periodEnd;
  const interval = subscription?.interval;
  const cancelScheduled = Boolean(subscription?.cancelAtPeriodEnd);

  return (
    <section id="pro" className="ui-surface scroll-mt-24 p-4 sm:p-5">
      <p className="eyebrow">Abo</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        {entitlement.isPro ? "Pro aktiv" : "Pro freischalten"}
      </h2>
      {entitlement.isPro ? (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {cancelScheduled
            ? `Gekündigt. Steuern bleibt bis ${periodEnd ? formatDay(periodEnd) : "Periodenende"} an, danach Free.`
            : `Steuern und 80%-Limit sind an${
                interval === "month"
                  ? " · monatlich"
                  : interval === "year"
                    ? " · jährlich"
                    : ""
              }${periodEnd ? ` · gültig bis ${formatDay(periodEnd)}` : ""}.`}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Vorklima, Schloss, Finden und 80%-Limit. Jahr spart{" "}
          {formatEuroFromCents(yearlySavingsCents())} gegenüber Monat für Monat.
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
        <form action={checkoutAction} className="mt-4 space-y-2">
          <button
            type="submit"
            name="interval"
            value="year"
            disabled={pending || !stripeReady}
            className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {checkoutPending
              ? "Weiter zur Zahlung…"
              : stripeReady
                ? `Jahr · ${formatEuroFromCents(PRO_YEAR_CENTS)}`
                : "Zahlung noch nicht eingerichtet"}
          </button>
          <button
            type="submit"
            name="interval"
            value="month"
            disabled={pending || !stripeReady}
            className="action-btn w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            Monat · {formatEuroFromCents(PRO_MONTH_CENTS)}
          </button>
          <p className="text-center text-[11px] text-[var(--fg-muted)]">
            Monatlich {formatEuroFromCents(PRO_YEAR_IF_MONTHLY_CENTS)} / Jahr ·
            jährlich {formatEuroFromCents(PRO_YEAR_CENTS)}
          </p>
        </form>
      ) : subscription ? (
        <div className="mt-4 space-y-2">
          {cancelScheduled ? (
            <form action={resumeAction}>
              <button
                type="submit"
                disabled={pending}
                className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {resumePending ? "Bitte warten…" : "Kündigung zurücknehmen"}
              </button>
            </form>
          ) : (
            <form action={cancelAction}>
              <button
                type="submit"
                disabled={pending}
                className="action-btn w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {cancelPending
                  ? "Bitte warten…"
                  : "Kündigen zum Periodenende"}
              </button>
            </form>
          )}

          {!cancelScheduled ? (
            <form action={changeAction} className="grid gap-2 sm:grid-cols-2">
              {interval !== "year" ? (
                <button
                  type="submit"
                  name="interval"
                  value="year"
                  disabled={pending}
                  className="action-btn w-full rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {changePending
                    ? "Wechsel…"
                    : `Auf Jahr · ${formatEuroFromCents(PRO_YEAR_CENTS)}`}
                </button>
              ) : null}
              {interval !== "month" ? (
                <button
                  type="submit"
                  name="interval"
                  value="month"
                  disabled={pending}
                  className="action-btn w-full rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {changePending
                    ? "Wechsel…"
                    : `Auf Monat · ${formatEuroFromCents(PRO_MONTH_CENTS)}`}
                </button>
              ) : null}
            </form>
          ) : null}

          <form action={portalAction}>
            <button
              type="submit"
              disabled={pending}
              className="w-full pt-1 text-center text-sm text-[var(--fg-muted)] underline-offset-4 hover:text-[var(--fg)] hover:underline disabled:opacity-60"
            >
              {portalPending
                ? "Öffne Portal…"
                : "Zahlungsdaten und Rechnungen"}
            </button>
          </form>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Planwechsel gilt sofort, Stripe verrechnet die Differenz. Kündigung
            erst zum Ende der bezahlten Laufzeit.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Pro ist manuell oder ohne Stripe-Abo aktiv — Kündigung hier nicht
          möglich.
        </p>
      )}
    </section>
  );
}

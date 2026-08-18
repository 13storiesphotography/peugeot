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
import { useI18n } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/i18n/format";

const initial: CheckoutState = {};

function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
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
  const { locale, t } = useI18n();
  const dates = intlLocale(locale);
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
      <p className="eyebrow">{t("billing.eyebrow")}</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        {entitlement.isPro ? t("billing.proOn") : t("billing.unlockPro")}
      </h2>
      {entitlement.isPro ? (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {cancelScheduled
            ? t("billing.canceledUntil", {
                day: periodEnd ? formatDay(periodEnd, dates) : t("billing.untilEnd"),
              })
            : `${t("billing.controlsOn")}${
                interval === "month"
                  ? t("billing.monthlyShort")
                  : interval === "year"
                    ? t("billing.yearlyShort")
                    : ""
              }${periodEnd ? t("billing.validUntil", { day: formatDay(periodEnd, dates) }) : ""}.`}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {t("billing.saveVsMonth", {
            amount: formatEuroFromCents(yearlySavingsCents()),
          })}
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
              ? t("billing.toPayment")
              : stripeReady
                ? t("billing.yearPrice", {
                    amount: formatEuroFromCents(PRO_YEAR_CENTS),
                  })
                : t("billing.notReady")}
          </button>
          <button
            type="submit"
            name="interval"
            value="month"
            disabled={pending || !stripeReady}
            className="action-btn w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {t("billing.monthPrice", {
              amount: formatEuroFromCents(PRO_MONTH_CENTS),
            })}
          </button>
          <p className="text-center text-[11px] text-[var(--fg-muted)]">
            {t("billing.yearVsMonth", {
              month: formatEuroFromCents(PRO_YEAR_IF_MONTHLY_CENTS),
              year: formatEuroFromCents(PRO_YEAR_CENTS),
            })}
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
                {resumePending ? t("billing.wait") : t("billing.takeBack")}
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
                  ? t("billing.wait")
                  : t("billing.cancel")}
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
                    ? t("billing.switching")
                    : t("billing.toYear", {
                        amount: formatEuroFromCents(PRO_YEAR_CENTS),
                      })}
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
                    ? t("billing.switching")
                    : t("billing.toMonth", {
                        amount: formatEuroFromCents(PRO_MONTH_CENTS),
                      })}
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
                ? t("billing.openingPortal")
                : t("billing.invoices")}
            </button>
          </form>
          <p className="text-[11px] text-[var(--fg-muted)]">
            {t("billing.changeNote")}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {t("billing.manualPro")}
        </p>
      )}
    </section>
  );
}

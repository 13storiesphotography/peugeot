"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function useHardRedirect(url: string | undefined) {
  useEffect(() => {
    if (!url) return;
    window.location.assign(url);
  }, [url]);
}

export function ProUpgradeCard({
  entitlement,
  subscription,
  stripeReady,
  stripeTestMode = false,
  stripeSetupError,
  notice,
}: {
  entitlement: Entitlement;
  subscription: SubscriptionSnapshot | null;
  stripeReady: boolean;
  stripeTestMode?: boolean;
  stripeSetupError?: string;
  notice?: CheckoutState;
}) {
  const router = useRouter();
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

  useHardRedirect(checkoutState.redirectUrl);
  useHardRedirect(portalState.redirectUrl);

  const periodEnd = subscription?.periodEnd ?? entitlement.periodEnd;
  const interval = subscription?.interval;
  const [cancelScheduled, setCancelScheduled] = useState(
    Boolean(subscription?.cancelAtPeriodEnd),
  );
  const [chooseInterval, setChooseInterval] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptWiderruf, setAcceptWiderruf] = useState(false);
  const legalOk = acceptTerms && acceptWiderruf;

  useEffect(() => {
    setCancelScheduled(Boolean(subscription?.cancelAtPeriodEnd));
  }, [subscription?.cancelAtPeriodEnd]);

  useEffect(() => {
    if (typeof cancelState.cancelAtPeriodEnd === "boolean") {
      setCancelScheduled(cancelState.cancelAtPeriodEnd);
    }
  }, [cancelState.cancelAtPeriodEnd, cancelState.success]);

  useEffect(() => {
    if (typeof resumeState.cancelAtPeriodEnd === "boolean") {
      setCancelScheduled(resumeState.cancelAtPeriodEnd);
    }
  }, [resumeState.cancelAtPeriodEnd, resumeState.success]);

  useEffect(() => {
    if (cancelState.success || resumeState.success || changeState.success) {
      router.refresh();
    }
  }, [
    cancelState.success,
    resumeState.success,
    changeState.success,
    router,
  ]);

  const pending =
    checkoutPending ||
    cancelPending ||
    resumePending ||
    changePending ||
    portalPending ||
    Boolean(checkoutState.redirectUrl || portalState.redirectUrl);
  const error =
    notice?.error ??
    stripeSetupError ??
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

  return (
    <section id="pro" className="ui-surface scroll-mt-24 p-4 sm:p-5">
      <p className="eyebrow">Abo</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        {!entitlement.isPro
          ? "Pro freischalten"
          : cancelScheduled
            ? "Pro gekündigt"
            : "Pro aktiv"}
      </h2>
      {entitlement.isPro ? (
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {cancelScheduled
            ? `Kündigung vorgemerkt. Steuern bleibt bis ${periodEnd ? formatDay(periodEnd) : "Periodenende"} an, danach Free.`
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
          Vorklima, Schloss, Finden und 80%-Limit.
        </p>
      )}

      {entitlement.isPro && cancelScheduled ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-3 py-2 text-sm text-[var(--warn)]"
        >
          Gekündigt zum Periodenende
          {periodEnd ? ` · aktiv bis ${formatDay(periodEnd)}` : ""}. Danach
          Free.
        </p>
      ) : null}

      {stripeTestMode ? (
        <p role="status" className="mt-3 text-sm text-[var(--warn)]">
          Stripe läuft noch im Testmodus (Sandbox). Für echte Zahlungen in
          Vercel den Live-Secret-Key und den Live-Webhook setzen.
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
        <div className="mt-4 space-y-2">
          {!chooseInterval ? (
            <>
              <button
                type="button"
                onClick={() => setChooseInterval(true)}
                disabled={pending || !stripeReady || Boolean(stripeSetupError)}
                className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {stripeReady && !stripeSetupError
                  ? "Pro freischalten"
                  : "Zahlung noch nicht eingerichtet"}
              </button>
              {stripeReady && !stripeSetupError ? null : (
                <p className="text-center text-[11px] text-[var(--fg-muted)]">
                  {stripeSetupError ??
                    "Stripe muss in Vercel konfiguriert werden."}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-left text-[12px] leading-snug text-[var(--fg-muted)]">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Ich akzeptiere die{" "}
                    <Link
                      href="/agb"
                      target="_blank"
                      className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--fg)]"
                    >
                      AGB
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-2 text-left text-[12px] leading-snug text-[var(--fg-muted)]">
                  <input
                    type="checkbox"
                    checked={acceptWiderruf}
                    onChange={(e) => setAcceptWiderruf(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Ich habe die{" "}
                    <Link
                      href="/widerruf"
                      target="_blank"
                      className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--fg)]"
                    >
                      Widerrufsbelehrung
                    </Link>{" "}
                    zur Kenntnis genommen.
                  </span>
                </label>

                <form action={checkoutAction}>
                  <input type="hidden" name="interval" value="year" />
                  <input
                    type="hidden"
                    name="accept_terms"
                    value={acceptTerms ? "1" : "0"}
                  />
                  <input
                    type="hidden"
                    name="accept_widerruf"
                    value={acceptWiderruf ? "1" : "0"}
                  />
                  <button
                    type="submit"
                    disabled={
                      pending ||
                      !stripeReady ||
                      Boolean(stripeSetupError) ||
                      !legalOk
                    }
                    className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {checkoutPending || checkoutState.redirectUrl
                      ? "Weiter zur Zahlung…"
                      : `Jahr · ${formatEuroFromCents(PRO_YEAR_CENTS)} inkl. MwSt.`}
                  </button>
                </form>
                <form action={checkoutAction}>
                  <input type="hidden" name="interval" value="month" />
                  <input
                    type="hidden"
                    name="accept_terms"
                    value={acceptTerms ? "1" : "0"}
                  />
                  <input
                    type="hidden"
                    name="accept_widerruf"
                    value={acceptWiderruf ? "1" : "0"}
                  />
                  <button
                    type="submit"
                    disabled={
                      pending ||
                      !stripeReady ||
                      Boolean(stripeSetupError) ||
                      !legalOk
                    }
                    className="action-btn w-full rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {checkoutPending || checkoutState.redirectUrl
                      ? "Weiter zur Zahlung…"
                      : `Monat · ${formatEuroFromCents(PRO_MONTH_CENTS)} inkl. MwSt.`}
                  </button>
                </form>
                {!legalOk ? (
                  <p className="text-center text-[11px] text-[var(--fg-muted)]">
                    Bitte AGB und Widerrufsbelehrung bestätigen, um zur Zahlung
                    zu gehen.
                  </p>
                ) : null}
                <p className="text-center text-[11px] text-[var(--fg-muted)]">
                  Preise inkl. MwSt. · 12× monatlich ={" "}
                  {formatEuroFromCents(PRO_YEAR_IF_MONTHLY_CENTS)} pro Jahr ·
                  jährlich {formatEuroFromCents(PRO_YEAR_CENTS)} · du sparst{" "}
                  {formatEuroFromCents(yearlySavingsCents())}
                </p>
                <p className="text-center text-[11px] text-[var(--fg-muted)]">
                  Nach der Zahlung schickt Stripe die Rechnung als PDF per
                  E-Mail. Name, Adresse und optional USt-Id werden im Checkout
                  erfasst.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setChooseInterval(false);
                  setAcceptTerms(false);
                  setAcceptWiderruf(false);
                }}
                disabled={pending}
                className="mx-auto block text-sm font-semibold text-[var(--fg-muted)] underline-offset-4 hover:underline"
              >
                Abbrechen
              </button>
            </>
          )}
        </div>
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
              {portalPending || portalState.redirectUrl
                ? "Öffne Portal…"
                : "Zahlungsdaten und Rechnungen"}
            </button>
          </form>
          <p className="text-[11px] text-[var(--fg-muted)]">
            {cancelScheduled
              ? "Die Kündigung greift erst zum Periodenende. Bis dahin bleibt Pro nutzbar."
              : "Planwechsel gilt sofort, Stripe verrechnet die Differenz. Kündigung erst zum Ende der bezahlten Laufzeit."}
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

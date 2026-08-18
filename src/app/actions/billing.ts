"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  parseBillingInterval,
  type BillingInterval,
} from "@/lib/billing/catalog";
import { grantProFromStripe } from "@/lib/billing/grant";
import { getProPriceId } from "@/lib/billing/prices";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import {
  getActiveSubscription,
  resolveStripeCustomerId,
  subscriptionPeriodEndIso,
} from "@/lib/billing/subscription";
import { getEntitlement } from "@/lib/billing/entitlement";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { getTranslator } from "@/i18n/server";
import { intlLocale } from "@/i18n/format";

export type CheckoutState = { error?: string; success?: string };

function siteOrigin(headerStore: Headers): string {
  const origin = headerStore.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (host) {
    const proto = headerStore.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.peugeotcontrol.app"
  );
}

async function periodEndFromCheckout(
  checkoutId: string,
  interval: BillingInterval,
): Promise<string | null> {
  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.retrieve(checkoutId, {
    expand: ["subscription"],
  });
  const sub = checkout.subscription;
  if (sub && typeof sub !== "string") {
    return subscriptionPeriodEndIso(sub);
  }
  if (typeof sub === "string") {
    const retrieved = await stripe.subscriptions.retrieve(sub);
    return subscriptionPeriodEndIso(retrieved);
  }
  void interval;
  return null;
}

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) {
    return { error: t("billing.payFirst") };
  }
  if (!isStripeConfigured()) {
    return { error: t("billing.payUnavailable") };
  }

  const interval = parseBillingInterval(formData.get("interval"));
  const origin = siteOrigin(await headers());
  const stripe = getStripe();

  const current = await getEntitlement(session.supabase, session.userId);
  if (current.isPro) {
    return {
      error: t("billing.alreadyPro"),
    };
  }

  const priceId = await getProPriceId(interval);
  const customerId = await resolveStripeCustomerId(
    session.userId,
    session.email,
  );

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : (session.email ?? undefined),
    allow_promotion_codes: true,
    success_url: `${origin}/control/settings?pro_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/control/settings?pro=cancel`,
    metadata: {
      user_id: session.userId,
      source: "stripe",
      interval,
    },
    subscription_data: {
      metadata: {
        user_id: session.userId,
        interval,
      },
    },
    line_items: [{ quantity: 1, price: priceId }],
  });

  if (!checkout.url) {
    return { error: t("billing.startFail") };
  }

  redirect(checkout.url);
}

export async function confirmCheckoutSession(
  checkoutSessionId: string,
): Promise<CheckoutState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) {
    return { error: t("billing.payFirst") };
  }
  if (!isStripeConfigured()) {
    return { error: t("billing.payUnavailableShort") };
  }
  if (!checkoutSessionId.startsWith("cs_")) {
    return { error: t("billing.invalidSession") };
  }

  try {
    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const paid =
      checkout.payment_status === "paid" || checkout.status === "complete";
    const userId = checkout.metadata?.user_id;
    if (!paid || userId !== session.userId) {
      return { error: t("billing.confirmFail") };
    }

    const interval = parseBillingInterval(checkout.metadata?.interval ?? "year");
    const customerId =
      typeof checkout.customer === "string" ? checkout.customer : null;
    const periodEnd = await periodEndFromCheckout(checkout.id, interval);

    await grantProFromStripe({
      userId,
      source: "stripe",
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkout.id,
      interval,
      periodEnd,
    });

    return {
      success: t("billing.proActive"),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("billing.confirmFailed");
    return { error: message };
  }
}

async function requireManagedSubscription() {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) return { error: t("billing.payFirst") } as const;
  if (!isStripeConfigured()) {
    return { error: t("billing.payUnavailableShort") } as const;
  }
  const customerId = await resolveStripeCustomerId(
    session.userId,
    session.email,
  );
  if (!customerId) {
    return { error: t("billing.noStripeSub") } as const;
  }
  const sub = await getActiveSubscription(customerId);
  if (!sub) {
    return { error: t("billing.noActiveSub") } as const;
  }
  return { session, customerId, sub } as const;
}

export async function cancelSubscriptionAtPeriodEnd(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const { locale, t } = await getTranslator();
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  await getStripe().subscriptions.update(loaded.sub.id, {
    cancel_at_period_end: true,
  });
  const until = subscriptionPeriodEndIso(loaded.sub);
  return {
    success: until
      ? t("billing.canceledKeep", {
          day: new Intl.DateTimeFormat(intlLocale(locale), {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(until)),
        })
      : t("billing.canceledKeepGeneric"),
  };
}

export async function resumeSubscription(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const { t } = await getTranslator();
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  await getStripe().subscriptions.update(loaded.sub.id, {
    cancel_at_period_end: false,
  });
  return { success: t("billing.resumed") };
}

export async function changeSubscriptionPlan(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const { t } = await getTranslator();
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  const interval = parseBillingInterval(formData.get("interval"));
  const item = loaded.sub.items.data[0];
  if (!item) return { error: t("billing.itemMissing") };
  const priceId = await getProPriceId(interval);
  if (item.price.id === priceId) {
    return { error: t("billing.alreadyPlan") };
  }
  await getStripe().subscriptions.update(loaded.sub.id, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: "create_prorations",
    metadata: {
      ...(loaded.sub.metadata ?? {}),
      user_id: loaded.session.userId,
      interval,
    },
  });
  return {
    success:
      interval === "year" ? t("billing.switchedYear") : t("billing.switchedMonth"),
  };
}

export async function openBillingPortal(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) return { error: t("billing.payFirst") };
  if (!isStripeConfigured()) {
    return { error: t("billing.payUnavailableShort") };
  }
  const customerId = await resolveStripeCustomerId(
    session.userId,
    session.email,
  );
  if (!customerId) return { error: t("billing.noStripeSub") };
  const origin = siteOrigin(await headers());
  let url: string | null = null;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/control/settings#pro`,
    });
    url = portal.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("No configuration provided")) {
      return {
        error: t("billing.portalMissing"),
      };
    }
    return { error: message || t("billing.portalFail") };
  }
  if (!url) return { error: t("billing.portalFail") };
  redirect(url);
}

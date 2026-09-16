"use server";

import { headers } from "next/headers";
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

export type CheckoutState = {
  error?: string;
  success?: string;
  /** External Stripe URL — client must hard-navigate (soft redirect breaks). */
  redirectUrl?: string;
};

function stripeActionError(error: unknown, fallback: string): CheckoutState {
  console.error("billing action:", error);

  const stripeErr = error as {
    message?: string;
    code?: string;
    type?: string;
    raw?: { message?: string; code?: string };
  } | null;

  const code =
    (typeof stripeErr?.code === "string" && stripeErr.code) ||
    (typeof stripeErr?.raw?.code === "string" && stripeErr.raw.code) ||
    "";
  const rawMessage =
    (typeof stripeErr?.message === "string" && stripeErr.message) ||
    (typeof stripeErr?.raw?.message === "string" && stripeErr.raw.message) ||
    (error instanceof Error ? error.message : "") ||
    "";

  if (code === "resource_missing") {
    if (rawMessage.toLowerCase().includes("customer")) {
      return { error: "Stripe-Kunde ungültig. Bitte erneut versuchen." };
    }
    return {
      error:
        "Stripe-Preis fehlt oder passt nicht zum Schlüssel (Test/Live). Bitte Preise prüfen.",
    };
  }
  if (
    rawMessage.includes("No such price") ||
    rawMessage.includes("No such product")
  ) {
    return {
      error:
        "Stripe-Preis fehlt oder passt nicht zum Schlüssel (Test/Live). Bitte Preise prüfen.",
    };
  }
  if (
    rawMessage.includes("Invalid API Key") ||
    rawMessage.includes("api_key") ||
    code === "api_key_expired"
  ) {
    return { error: "Stripe-Schlüssel ungültig. Bitte Admin informieren." };
  }
  if (
    rawMessage.includes("live charges") ||
    rawMessage.includes("activate your account")
  ) {
    return {
      error:
        "Stripe-Konto kann noch keine Live-Zahlungen annehmen. Dashboard prüfen.",
    };
  }
  // Dashboard has no usable methods for Checkout / subscriptions.
  if (
    /no payment method|enable at least one payment method|payment methods? (are )?not available/i.test(
      rawMessage,
    )
  ) {
    return {
      error:
        "In Stripe unter Settings → Payment methods Karte (Cards) für Checkout aktivieren.",
    };
  }

  if (!rawMessage) return { error: fallback };
  const trimmed =
    rawMessage.length > 160 ? `${rawMessage.slice(0, 157)}…` : rawMessage;
  return { error: code ? `${trimmed} (${code})` : trimmed };
}

async function createCheckoutSession(input: {
  stripe: ReturnType<typeof getStripe>;
  priceId: string;
  customerId: string | null;
  email: string | null;
  origin: string;
  userId: string;
  interval: BillingInterval;
}) {
  const { stripe, priceId, customerId, email, origin, userId, interval } = input;

  if (!customerId && !email) {
    throw new Error("Keine E-Mail für Stripe Checkout.");
  }

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    ui_mode: "hosted",
    // Do not set payment_method_types — modern Stripe rejects it when the
    // Dashboard Payment Method Configuration is active; methods come from there.
    allow_promotion_codes: true,
    success_url: `${origin}/control/settings?pro_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/control/settings?pro=cancel`,
    metadata: {
      user_id: userId,
      source: "stripe",
      interval,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        interval,
      },
    },
    line_items: [{ quantity: 1, price: priceId }],
  };

  if (customerId) {
    params.customer = customerId;
  } else {
    params.customer_email = email ?? undefined;
  }

  try {
    return await stripe.checkout.sessions.create(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Stale customer id (test↔live) — retry with email only.
    if (
      customerId &&
      (message.includes("No such customer") ||
        message.includes("No such customer:"))
    ) {
      delete params.customer;
      params.customer_email = email ?? undefined;
      return await stripe.checkout.sessions.create(params);
    }
    // Older accounts without a Payment Method Configuration still need types.
    if (
      /payment method configuration|enable at least one payment method|no valid payment/i.test(
        message,
      )
    ) {
      params.payment_method_types = ["card"];
      return await stripe.checkout.sessions.create(params);
    }
    throw error;
  }
}

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
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Bitte zuerst anmelden." };
  }
  if (!isStripeConfigured()) {
    return { error: "Zahlung ist gerade nicht verfügbar. Bitte später erneut versuchen." };
  }

  const interval = parseBillingInterval(formData.get("interval"));
  const origin = siteOrigin(await headers());

  try {
    const stripe = getStripe();
    const current = await getEntitlement(session.supabase, session.userId);
    if (current.isPro) {
      return {
        error: "Pro ist schon aktiv. Unten kannst du kündigen oder den Plan wechseln.",
      };
    }

    const priceId = await getProPriceId(interval);
    const customerId = await resolveStripeCustomerId(
      session.userId,
      session.email,
    );

    const checkout = await createCheckoutSession({
      stripe,
      priceId,
      customerId,
      email: session.email,
      origin,
      userId: session.userId,
      interval,
    });

    if (!checkout.url) {
      return {
        error:
          "Stripe hat keine Checkout-URL geliefert. Zahlungsmethoden im Stripe-Dashboard prüfen.",
      };
    }

    // Hard client navigation — next/navigation redirect() to Stripe via
    // useActionState soft-nav often surfaces as "This page couldn't load".
    return { redirectUrl: checkout.url };
  } catch (error) {
    return stripeActionError(error, "Zahlung konnte nicht gestartet werden.");
  }
}

export async function confirmCheckoutSession(
  checkoutSessionId: string,
): Promise<CheckoutState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Bitte zuerst anmelden." };
  }
  if (!isStripeConfigured()) {
    return { error: "Zahlung ist nicht verfügbar." };
  }
  if (!checkoutSessionId.startsWith("cs_")) {
    return { error: "Ungültige Zahlungssitzung." };
  }

  try {
    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const paid =
      checkout.payment_status === "paid" || checkout.status === "complete";
    const userId = checkout.metadata?.user_id;
    if (!paid || userId !== session.userId) {
      return { error: "Zahlung konnte nicht bestätigt werden." };
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
      success: "Pro ist aktiv — Steuern und 80%-Limit sind freigeschaltet.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bestätigung fehlgeschlagen.";
    return { error: message };
  }
}

async function requireManagedSubscription() {
  const session = await assertOwnerSession();
  if (!session) return { error: "Bitte zuerst anmelden." } as const;
  if (!isStripeConfigured()) {
    return { error: "Zahlung ist nicht verfügbar." } as const;
  }
  const customerId = await resolveStripeCustomerId(
    session.userId,
    session.email,
  );
  if (!customerId) {
    return { error: "Kein Stripe-Abo gefunden." } as const;
  }
  const sub = await getActiveSubscription(customerId);
  if (!sub) {
    return { error: "Kein aktives Abo gefunden." } as const;
  }
  return { session, customerId, sub } as const;
}

export async function cancelSubscriptionAtPeriodEnd(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  try {
    await getStripe().subscriptions.update(loaded.sub.id, {
      cancel_at_period_end: true,
    });
    const until = subscriptionPeriodEndIso(loaded.sub);
    return {
      success: until
        ? `Gekündigt. Pro bleibt bis ${new Intl.DateTimeFormat("de-DE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(until))} aktiv, danach Free.`
        : "Gekündigt zum Periodenende. Pro bleibt bis dahin aktiv.",
    };
  } catch (error) {
    return stripeActionError(error, "Kündigung fehlgeschlagen.");
  }
}

export async function resumeSubscription(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  try {
    await getStripe().subscriptions.update(loaded.sub.id, {
      cancel_at_period_end: false,
    });
    return { success: "Kündigung zurückgenommen. Das Abo läuft weiter." };
  } catch (error) {
    return stripeActionError(error, "Wiederaufnahme fehlgeschlagen.");
  }
}

export async function changeSubscriptionPlan(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const loaded = await requireManagedSubscription();
  if ("error" in loaded) return loaded;
  const interval = parseBillingInterval(formData.get("interval"));
  const item = loaded.sub.items.data[0];
  if (!item) return { error: "Abo-Position nicht gefunden." };
  try {
    const priceId = await getProPriceId(interval);
    if (item.price.id === priceId) {
      return { error: "Das ist schon dein aktueller Plan." };
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
        interval === "year"
          ? "Wechsel auf jährlich. Stripe verrechnet die Differenz."
          : "Wechsel auf monatlich. Stripe verrechnet die Differenz.",
    };
  } catch (error) {
    return stripeActionError(error, "Planwechsel fehlgeschlagen.");
  }
}

export async function openBillingPortal(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const session = await assertOwnerSession();
  if (!session) return { error: "Bitte zuerst anmelden." };
  if (!isStripeConfigured()) {
    return { error: "Zahlung ist nicht verfügbar." };
  }
  const customerId = await resolveStripeCustomerId(
    session.userId,
    session.email,
  );
  if (!customerId) return { error: "Kein Stripe-Kunde gefunden." };
  const origin = siteOrigin(await headers());
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/control/settings#pro`,
    });
    if (!portal.url) {
      return { error: "Kundenportal konnte nicht geöffnet werden." };
    }
    return { redirectUrl: portal.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("No configuration provided")) {
      return {
        error:
          "Stripe-Kundenportal ist noch nicht eingerichtet. Kündigung und Planwechsel gehen über die Buttons oben.",
      };
    }
    return stripeActionError(error, "Kundenportal fehlgeschlagen.");
  }
}

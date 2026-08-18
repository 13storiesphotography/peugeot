"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  amountForInterval,
  parseBillingInterval,
  type BillingInterval,
} from "@/lib/billing/catalog";
import { grantProFromStripe } from "@/lib/billing/grant";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { assertOwnerSession } from "@/lib/auth/assert-owner";

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
    const end = (sub as { current_period_end?: number }).current_period_end;
    if (typeof end === "number") {
      return new Date(end * 1000).toISOString();
    }
  }
  if (typeof sub === "string") {
    const retrieved = await stripe.subscriptions.retrieve(sub);
    const end = (retrieved as { current_period_end?: number }).current_period_end;
    if (typeof end === "number") {
      return new Date(end * 1000).toISOString();
    }
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
  const stripe = getStripe();
  const yearly = interval === "year";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.email ?? undefined,
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
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountForInterval(interval),
          recurring: { interval },
          product_data: {
            name: yearly
              ? "Peugeot Control Pro (jährlich)"
              : "Peugeot Control Pro (monatlich)",
            description: yearly
              ? "Vorklima, Fernbedienung und 80%-Ladelimit — 12 Monate, günstiger als Monat für Monat."
              : "Vorklima, Fernbedienung und 80%-Ladelimit, monatlich kündbar.",
          },
        },
      },
    ],
  });

  if (!checkout.url) {
    return { error: "Zahlung konnte nicht gestartet werden." };
  }

  redirect(checkout.url);
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

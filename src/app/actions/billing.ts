"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PRO_YEAR_CENTS } from "@/lib/billing/catalog";
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

export async function startCheckout(
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Bitte zuerst anmelden." };
  }
  if (!isStripeConfigured()) {
    return { error: "Zahlung ist gerade nicht verfügbar. Bitte später erneut versuchen." };
  }

  const origin = siteOrigin(await headers());
  const stripe = getStripe();

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.email ?? undefined,
    allow_promotion_codes: true,
    success_url: `${origin}/control/settings?pro_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/control/settings?pro=cancel`,
    metadata: {
      user_id: session.userId,
      source: "stripe",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: PRO_YEAR_CENTS,
          product_data: {
            name: "Peugeot Control Pro (1 Jahr)",
            description:
              "Vorklima, Fernbedienung und 80%-Ladelimit für 12 Monate.",
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

    const customerId =
      typeof checkout.customer === "string" ? checkout.customer : null;

    await grantProFromStripe({
      userId,
      source: "stripe",
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkout.id,
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

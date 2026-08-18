"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FOUNDER_CAP, FOUNDER_CENTS, PRO_YEAR_CENTS } from "@/lib/billing/catalog";
import { founderSpotsTaken } from "@/lib/billing/entitlement";
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
    return {
      error:
        "Zahlung ist noch nicht eingerichtet (STRIPE_SECRET_KEY in Vercel setzen).",
    };
  }

  const taken = await founderSpotsTaken(session.supabase);
  const founder = taken < FOUNDER_CAP;
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
      source: founder ? "founder" : "stripe",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: founder ? FOUNDER_CENTS : PRO_YEAR_CENTS,
          product_data: {
            name: founder
              ? "E-3008 Control Pro · Founder (1 Jahr)"
              : "E-3008 Control Pro (1 Jahr)",
            description: founder
              ? "Founder-Preis für die ersten 100 — 80%-Limit und Pro-Steuerung für 12 Monate."
              : "80%-Limit und Pro-Steuerung für 12 Monate.",
          },
        },
      },
    ],
  });

  if (!checkout.url) {
    return { error: "Stripe-Checkout konnte nicht gestartet werden." };
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
    return { error: "Zahlung ist nicht eingerichtet." };
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

    const source =
      checkout.metadata?.source === "founder" ? "founder" : "stripe";
    const customerId =
      typeof checkout.customer === "string" ? checkout.customer : null;

    await grantProFromStripe({
      userId,
      source,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkout.id,
    });

    return { success: "Pro ist aktiv — 80%-Limit ist freigeschaltet." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bestätigung fehlgeschlagen.";
    return { error: message };
  }
}

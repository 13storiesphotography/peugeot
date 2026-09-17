import Stripe from "stripe";

function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

/** True when a usable Stripe *secret* key is configured (not a publishable pk_ key). */
export function isStripeConfigured(): boolean {
  const key = stripeSecretKey();
  if (!key) return false;
  // Publishable keys (pk_test_ / pk_live_) cannot create Checkout Sessions.
  if (key.startsWith("pk_")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_") || key.startsWith("rk_");
}

export function isStripeTestMode(): boolean {
  return stripeSecretKey().startsWith("sk_test_");
}

export function stripeConfigError(): string | null {
  const key = stripeSecretKey();
  if (!key) {
    return "Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt in Vercel).";
  }
  if (key.startsWith("pk_")) {
    return "In Vercel steht ein Stripe Publishable Key (pk_…). Bitte Secret Key sk_live_… (oder sk_test_…) setzen.";
  }
  if (
    !key.startsWith("sk_test_") &&
    !key.startsWith("sk_live_") &&
    !key.startsWith("rk_")
  ) {
    return "STRIPE_SECRET_KEY sieht ungültig aus. Erwartet sk_live_… oder sk_test_…";
  }
  return null;
}

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  const configError = stripeConfigError();
  if (configError) {
    throw new Error(configError);
  }
  return new Stripe(key);
}

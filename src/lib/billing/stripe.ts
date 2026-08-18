import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY fehlt.");
  }
  return new Stripe(key);
}

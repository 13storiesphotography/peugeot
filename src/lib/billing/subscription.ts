import type Stripe from "stripe";
import type { BillingInterval } from "@/lib/billing/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

export type SubscriptionSnapshot = {
  id: string;
  customerId: string;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  status: string;
};

export function subscriptionPeriodEndIso(sub: Stripe.Subscription): string | null {
  const fromItem = sub.items.data[0]?.current_period_end;
  const fromSub = (sub as { current_period_end?: number }).current_period_end;
  const end = typeof fromItem === "number" ? fromItem : fromSub;
  return typeof end === "number" ? new Date(end * 1000).toISOString() : null;
}

export function subscriptionInterval(
  sub: Stripe.Subscription,
): BillingInterval | null {
  const interval = String(sub.items.data[0]?.price?.recurring?.interval ?? "");
  if (interval === "month" || interval === "year") return interval;
  return null;
}

export async function resolveStripeCustomerId(
  userId: string,
  email: string | null,
): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("entitlements")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (typeof data?.stripe_customer_id === "string" && data.stripe_customer_id) {
    return data.stripe_customer_id;
  }
  if (!email) return null;
  const customers = await getStripe().customers.list({ email, limit: 3 });
  return customers.data[0]?.id ?? null;
}

export async function getActiveSubscription(
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();
  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  return (
    listed.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing" || sub.status === "past_due",
    ) ?? null
  );
}

export async function getSubscriptionSnapshot(
  userId: string,
  email: string | null,
): Promise<SubscriptionSnapshot | null> {
  if (!isStripeConfigured()) return null;
  try {
    const customerId = await resolveStripeCustomerId(userId, email);
    if (!customerId) return null;
    const sub = await getActiveSubscription(customerId);
    if (!sub) return null;
    return {
      id: sub.id,
      customerId,
      interval: subscriptionInterval(sub),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      periodEnd: subscriptionPeriodEndIso(sub),
      status: sub.status,
    };
  } catch (error) {
    console.warn("stripe subscription snapshot:", error);
    return null;
  }
}

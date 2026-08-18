import { createAdminClient } from "@/lib/supabase/admin";
import {
  type BillingInterval,
  periodDaysForInterval,
} from "@/lib/billing/catalog";

export async function grantProFromStripe(input: {
  userId: string;
  source?: "founder" | "stripe";
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId: string;
  interval?: BillingInterval;
  periodEnd?: string | null;
}) {
  const admin = createAdminClient();
  const periodEnd =
    input.periodEnd ??
    new Date(
      Date.now() +
        periodDaysForInterval(input.interval ?? "year") * 24 * 60 * 60 * 1000,
    ).toISOString();

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: input.userId,
      plan: "pro",
      source: input.source ?? "stripe",
      status: "active",
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function setEntitlementStatusByCustomer(input: {
  stripeCustomerId: string;
  status: "active" | "expired" | "canceled";
  periodEnd?: string | null;
}) {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.periodEnd) patch.current_period_end = input.periodEnd;

  const { error } = await admin
    .from("entitlements")
    .update(patch)
    .eq("stripe_customer_id", input.stripeCustomerId);
  if (error) {
    throw new Error(error.message);
  }
}

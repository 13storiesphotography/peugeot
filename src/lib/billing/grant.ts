import { createAdminClient } from "@/lib/supabase/admin";
import { FOUNDER_CAP, PRO_PERIOD_DAYS } from "@/lib/billing/catalog";
import { isEntitlementActive } from "@/lib/billing/entitlement";

export async function grantProFromStripe(input: {
  userId: string;
  source: "founder" | "stripe";
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId: string;
}) {
  const admin = createAdminClient();
  const periodEnd = new Date(
    Date.now() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  if (input.source === "founder") {
    const { count } = await admin
      .from("entitlements")
      .select("user_id", { count: "exact", head: true })
      .eq("source", "founder")
      .eq("status", "active");
    if ((count ?? 0) >= FOUNDER_CAP) {
      input = { ...input, source: "stripe" };
    }
  }

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: input.userId,
      plan: "pro",
      source: input.source,
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

export async function userHasPro(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("entitlements")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return isEntitlementActive(data);
}

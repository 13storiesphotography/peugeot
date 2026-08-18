import { createAdminClient } from "@/lib/supabase/admin";
import { PRO_PERIOD_DAYS } from "@/lib/billing/catalog";

export async function grantProFromStripe(input: {
  userId: string;
  source?: "founder" | "stripe";
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId: string;
}) {
  const admin = createAdminClient();
  const periodEnd = new Date(
    Date.now() + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000,
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

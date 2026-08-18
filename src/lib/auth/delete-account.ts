import { createAdminClient } from "@/lib/supabase/admin";
import {
  getActiveSubscription,
  resolveStripeCustomerId,
} from "@/lib/billing/subscription";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

const USER_TABLES = [
  "activity_log",
  "charge_samples",
  "vehicle_schedules",
  "vehicle_state",
  "peugeot_connections",
  "vehicles",
  "entitlements",
  "signups",
] as const;

export async function deleteUserAccount(userId: string, email: string | null) {
  if (isStripeConfigured()) {
    try {
      const customerId = await resolveStripeCustomerId(userId, email);
      if (customerId) {
        const sub = await getActiveSubscription(customerId);
        if (sub) {
          await getStripe().subscriptions.cancel(sub.id);
        }
      }
    } catch (error) {
      console.warn("stripe cancel on account delete:", error);
    }
  }

  const admin = createAdminClient();
  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      console.warn(`delete ${table}:`, error.message);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(error.message);
  }
}

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * peugeot_connections holds OAuth/remote tokens, vaulted passwords, and OTP state.
 * Column privileges revoke SELECT/INSERT/UPDATE on those fields from anon/authenticated,
 * so all secret-bearing access must go through the service-role client.
 * Always scope writes/reads with `.eq("user_id", userId)` (or cron RPC helpers).
 */
export function peugeotConnections() {
  return createAdminClient().from("peugeot_connections");
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type Entitlement = {
  isPro: boolean;
  plan: "free" | "pro";
  source: "stripe" | "founder" | "manual" | null;
  periodEnd: string | null;
};

export function isEntitlementActive(row: {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
} | null): boolean {
  if (!row || row.plan !== "pro" || row.status !== "active") return false;
  if (!row.current_period_end) return true;
  return new Date(row.current_period_end).getTime() > Date.now();
}

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<Entitlement> {
  const { data } = await supabase
    .from("entitlements")
    .select("plan, source, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const active = isEntitlementActive(data);
  return {
    isPro: active,
    plan: active ? "pro" : "free",
    source:
      data?.source === "stripe" ||
      data?.source === "founder" ||
      data?.source === "manual"
        ? data.source
        : null,
    periodEnd: data?.current_period_end ? String(data.current_period_end) : null,
  };
}

export async function founderSpotsTaken(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("founder_spots_taken");
  if (error) return 0;
  return Number(data ?? 0);
}

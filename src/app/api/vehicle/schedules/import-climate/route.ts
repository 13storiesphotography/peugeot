import { requireOwner } from "@/lib/auth/require-owner";
import { getEntitlement } from "@/lib/billing/entitlement";
import { PRO_REQUIRED_MESSAGE } from "@/lib/billing/pro-commands";
import { importClimateSchedulesFromVehicle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Pull MyPeugeot Vorklima programs into the app. */
export async function POST() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const entitlement = await getEntitlement(auth.supabase, auth.userId);
  if (!entitlement.isPro) {
    return Response.json({ error: PRO_REQUIRED_MESSAGE }, { status: 402 });
  }

  try {
    const result = await importClimateSchedulesFromVehicle(
      auth.supabase,
      auth.userId,
    );
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}

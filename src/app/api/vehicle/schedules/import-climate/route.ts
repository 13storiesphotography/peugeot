import { requireOwner } from "@/lib/auth/require-owner";
import { importClimateSchedulesFromVehicle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Pull MyPeugeot Vorklima programs into the app. */
export async function POST() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

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

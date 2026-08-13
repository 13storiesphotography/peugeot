import { requireOwner } from "@/lib/auth/require-owner";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  try {
    const bundle = await getVehicleBundle(auth.supabase, auth.userId);
    return Response.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}

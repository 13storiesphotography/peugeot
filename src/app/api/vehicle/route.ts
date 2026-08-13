import { requireOwner } from "@/lib/auth/require-owner";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const forceSync =
    url.searchParams.get("sync") === "1" ||
    url.searchParams.get("sync") === "true";

  try {
    const bundle = await getVehicleBundle(auth.supabase, auth.userId, {
      forceSync,
    });
    return Response.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}

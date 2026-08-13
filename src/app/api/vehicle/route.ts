import { requireOwner } from "@/lib/auth/require-owner";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
/** Hard refresh may wake the car and re-poll status (up to ~30s). */
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const hardRefresh =
    url.searchParams.get("hard") === "1" ||
    url.searchParams.get("hard") === "true";
  const forceSync =
    hardRefresh ||
    url.searchParams.get("sync") === "1" ||
    url.searchParams.get("sync") === "true";

  try {
    const bundle = await getVehicleBundle(auth.supabase, auth.userId, {
      forceSync,
      hardRefresh,
    });
    return Response.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}

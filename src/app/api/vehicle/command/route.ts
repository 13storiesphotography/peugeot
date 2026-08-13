import { requireOwner } from "@/lib/auth/require-owner";
import type { CommandRequest, VehicleCommand } from "@/lib/types";
import { runVehicleCommand } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

const ALLOWED: VehicleCommand[] = [
  "lock",
  "unlock",
  "horn",
  "flash",
  "charge_start",
  "climate_start",
  "climate_stop",
  "battery_preheat_start",
  "battery_preheat_stop",
  "wakeup",
  "set_charge_limit",
  "set_climate_temp",
];

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  let body: CommandRequest;
  try {
    body = (await request.json()) as CommandRequest;
  } catch {
    return Response.json(
      { ok: false, message: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  if (!body?.command || !ALLOWED.includes(body.command)) {
    return Response.json(
      { ok: false, message: "Unbekannter oder fehlender Befehl." },
      { status: 400 },
    );
  }

  try {
    const result = await runVehicleCommand(auth.supabase, auth.userId, body);
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ ok: false, message }, { status: 500 });
  }
}

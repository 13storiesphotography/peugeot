import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CommandRequest, VehicleCommand } from "@/lib/types";
import { runVehicleCommand } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

const ALLOWED: VehicleCommand[] = [
  "lock",
  "unlock",
  "horn",
  "flash",
  "charge_start",
  "charge_stop",
  "climate_start",
  "climate_stop",
  "battery_preheat_start",
  "battery_preheat_stop",
  "wakeup",
  "set_charge_limit",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CommandRequest;
  try {
    body = (await request.json()) as CommandRequest;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  if (!body?.command || !ALLOWED.includes(body.command)) {
    return NextResponse.json(
      { ok: false, message: "Unbekannter oder fehlender Befehl." },
      { status: 400 },
    );
  }

  try {
    const result = await runVehicleCommand(supabase, userId, body);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createVehicleClient } from "@/lib/stellantis/client";
import type { CommandRequest, VehicleCommand } from "@/lib/types";

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

  const client = createVehicleClient();
  const result = await client.sendCommand(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

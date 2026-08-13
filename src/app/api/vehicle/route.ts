import { NextResponse } from "next/server";
import { createVehicleClient } from "@/lib/stellantis/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = createVehicleClient();
  const vehicle = await client.getStatus();
  return NextResponse.json(vehicle);
}

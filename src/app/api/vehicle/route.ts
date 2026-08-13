import { NextResponse } from "next/server";
import { createVehicleClient } from "@/lib/stellantis/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createVehicleClient();
  const vehicle = await client.getStatus();
  return NextResponse.json(vehicle);
}

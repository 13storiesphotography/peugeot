import { requireOwner } from "@/lib/auth/require-owner";
import type { CommandRequest, VehicleCommand } from "@/lib/types";
import { runVehicleCommand } from "@/lib/vehicle/repository";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";
/** Climate start wakes the car and polls status (~45s). */
export const maxDuration = 60;

const ALLOWED: VehicleCommand[] = [
  "lock",
  "unlock",
  "horn",
  "flash",
  "charge_start",
  "climate_start",
  "climate_stop",
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
    const { t } = await getTranslator();
    return Response.json(
      { ok: false, message: t("cmd.invalidBody") },
      { status: 400 },
    );
  }

  if (!body?.command || !ALLOWED.includes(body.command)) {
    const { t } = await getTranslator();
    return Response.json(
      { ok: false, message: t("cmd.unknownCommand") },
      { status: 400 },
    );
  }

  try {
    const result = await runVehicleCommand(auth.supabase, auth.userId, body);
    return Response.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const { t } = await getTranslator();
    const message = error instanceof Error ? error.message : t("cmd.error");
    return Response.json({ ok: false, message }, { status: 500 });
  }
}

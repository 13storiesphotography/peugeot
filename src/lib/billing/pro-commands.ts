import type { VehicleCommand } from "@/lib/types";

const PRO_COMMANDS = new Set<VehicleCommand>([
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
]);

export function commandRequiresPro(command: VehicleCommand): boolean {
  return PRO_COMMANDS.has(command);
}

export const PRO_REQUIRED_MESSAGE =
  "Controls are Pro — unlock under Settings.";

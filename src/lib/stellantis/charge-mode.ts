import type { VehicleState } from "@/lib/types";

/** PSA chargingMode: Slow (AC), Quick (DC/boost), No. */
export type ChargeSpeedMode = "slow" | "quick" | "none" | "unknown";

export function normalizeChargeSpeedMode(
  raw: string | null | undefined,
): ChargeSpeedMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v || v === "no" || v === "none" || v === "off") return "none";
  if (v.includes("quick") || v.includes("fast") || v.includes("dc")) {
    return "quick";
  }
  if (v.includes("slow") || v.includes("ac") || v.includes("normal")) {
    return "slow";
  }
  return "unknown";
}

export function chargeSpeedLabel(mode: ChargeSpeedMode): string {
  switch (mode) {
    case "slow":
      return "Wallbox";
    case "quick":
      return "Schnellladen";
    case "none":
      return "Kein Ladevorgang";
    default:
      return "Unbekannt";
  }
}

export function chargeSpeedHint(mode: ChargeSpeedMode): string {
  switch (mode) {
    case "slow":
      return "Normale Ladeleistung";
    case "quick":
      return "Hohe Ladeleistung";
    case "none":
      return "Kein Stromfluss";
    default:
      return "";
  }
}

/** chargingType from PSA — Full / Delayed / Immediate etc. */
export function chargeTypeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v.includes("full")) return "Bis voll";
  if (v.includes("delay") || v.includes("deferred")) return "Zeitverzögert";
  if (v.includes("immediate") || v.includes("now")) return "Sofort";
  if (v.includes("stop")) return "Gestoppt";
  return raw;
}

export function describeVehicleChargeTarget(vehicle: VehicleState): {
  label: string;
  detail: string;
} {
  if (vehicle.chargeLimitKnown && vehicle.chargeLimitPercent <= 80) {
    return { label: "80%", detail: "" };
  }
  if (vehicle.chargeLimitKnown && vehicle.chargeLimitPercent >= 100) {
    return { label: "100%", detail: "" };
  }
  if (vehicle.chargeLimitKnown) {
    return { label: `${vehicle.chargeLimitPercent}%`, detail: "" };
  }
  return { label: "—", detail: "" };
}

/** Mirror of MyPeugeot „Laden auf 80% begrenzen“. */
export function isEightyPercentLimitActive(vehicle: VehicleState): boolean {
  if (vehicle.chargeLimitKnown) {
    return vehicle.chargeLimitPercent <= 80;
  }
  return (vehicle.preferredChargeLimitPercent ?? 80) <= 80;
}

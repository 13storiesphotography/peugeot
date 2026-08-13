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
      return "AC · Slow";
    case "quick":
      return "DC · Quick";
    case "none":
      return "Kein Ladevorgang";
    default:
      return "Unbekannt";
  }
}

export function chargeSpeedHint(mode: ChargeSpeedMode): string {
  switch (mode) {
    case "slow":
      return "Wallbox / Haushaltsstrom (langsam)";
    case "quick":
      return "Schnellladen (hohe Leistung)";
    case "none":
      return "Kabel kann stecken, Strom fließt nicht";
    default:
      return "MyPeugeot meldet keinen klaren Modus";
  }
}

/** chargingType from PSA — Full / Delayed / Immediate etc. */
export function chargeTypeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v.includes("full")) return "Bis voll (Full)";
  if (v.includes("delay") || v.includes("deferred")) return "Zeitverzögert";
  if (v.includes("immediate") || v.includes("now")) return "Sofort";
  if (v.includes("stop")) return "Gestoppt";
  return raw;
}

export function describeVehicleChargeTarget(vehicle: VehicleState): {
  label: string;
  detail: string;
} {
  const typeLabel = chargeTypeLabel(vehicle.chargingType);
  if (vehicle.chargeLimitKnown && vehicle.chargeLimitPercent <= 80) {
    return {
      label: "Auf 80% begrenzt",
      detail: typeLabel
        ? `Vom Auto gemeldet · ${typeLabel}`
        : "Wie „Laden auf 80% begrenzen“ in der Peugeot-App",
    };
  }
  if (vehicle.chargeLimitKnown && vehicle.chargeLimitPercent >= 100) {
    return {
      label: "Voll (100%)",
      detail: typeLabel
        ? `Vom Auto gemeldet · ${typeLabel} — 80%-Schalter aus`
        : "Vom Auto gemeldet — 80%-Schalter aus / Full",
    };
  }
  if (vehicle.chargeLimitKnown) {
    return {
      label: `${vehicle.chargeLimitPercent}%`,
      detail: typeLabel
        ? `Vom Auto gemeldet · ${typeLabel}`
        : "Vom Auto gemeldet",
    };
  }
  return {
    label: "Kein %-Limit vom Auto",
    detail: typeLabel
      ? `Status: ${typeLabel} — MyPeugeot sendet kein Zahlen-Limit`
      : "MyPeugeot Status-API liefert kein Zahlen-Ladelimit",
  };
}

/** Mirror of MyPeugeot „Laden auf 80% begrenzen“. */
export function isEightyPercentLimitActive(vehicle: VehicleState): boolean {
  if (vehicle.chargeLimitKnown) {
    return vehicle.chargeLimitPercent <= 80;
  }
  return (vehicle.preferredChargeLimitPercent ?? 80) <= 80;
}

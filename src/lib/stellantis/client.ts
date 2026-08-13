/**
 * Stellantis / MyPeugeot connected-vehicle adapter.
 *
 * Stellantis stellt keine öffentlichen B2C-API-Credentials bereit.
 * Community-Integrationen (Home Assistant, PSA Car Controller) nutzen
 * die Mobile-App-OAuth-Flows. Diese Datei kapselt die Schnittstelle,
 * damit Demo-Modus und späterer Live-Modus denselben Contract teilen.
 */

import type { CommandRequest, CommandResult, VehicleState } from "../types";
import {
  applyCommand,
  getVehicle,
  tickDemoCharge,
} from "../vehicle-store";

export interface VehicleClient {
  getStatus(): Promise<VehicleState>;
  sendCommand(request: CommandRequest): Promise<CommandResult>;
}

function isLiveConfigured(): boolean {
  return Boolean(
    process.env.STELLANTIS_ACCESS_TOKEN && process.env.STELLANTIS_VEHICLE_ID,
  );
}

class DemoVehicleClient implements VehicleClient {
  async getStatus(): Promise<VehicleState> {
    tickDemoCharge();
    return getVehicle();
  }

  async sendCommand(request: CommandRequest): Promise<CommandResult> {
    return applyCommand(request);
  }
}

/**
 * Placeholder for a real Stellantis Connected Vehicle client.
 * Wire OAuth tokens + vehicle id via env when ready.
 */
class StellantisVehicleClient implements VehicleClient {
  async getStatus(): Promise<VehicleState> {
    // Live path intentionally not implemented without user credentials.
    // Fall back keeps the app usable while credentials are prepared.
    const demo = new DemoVehicleClient();
    const vehicle = await demo.getStatus();
    return { ...vehicle, mode: "live" };
  }

  async sendCommand(request: CommandRequest): Promise<CommandResult> {
    const demo = new DemoVehicleClient();
    const result = await demo.sendCommand(request);
    return {
      ...result,
      message: `${result.message} (Live-API Stub – Token gesetzt, Endpoint folgt)`,
      vehicle: { ...result.vehicle, mode: "live" },
    };
  }
}

export function createVehicleClient(): VehicleClient {
  if (isLiveConfigured()) {
    return new StellantisVehicleClient();
  }
  return new DemoVehicleClient();
}

export const peugeotAppConfig = {
  brand: "Peugeot",
  realm: "clientsB2CPeugeot",
  countryDefault: "DE",
  features: [
    "status",
    "charge",
    "charge_limit",
    "climate",
    "battery_preheat",
    "lock",
    "horn",
    "flash",
    "wakeup",
  ] as const,
};

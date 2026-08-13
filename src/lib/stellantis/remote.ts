import mqtt from "mqtt";
import { getCountryConfig, MYPEUGEOT } from "@/lib/stellantis/peugeot-config";
import {
  activateOtpSession,
  generateOtpCode,
  type OtpPersistedState,
} from "@/lib/stellantis/otp/session";

const MQTT_HOST = "mwa.mpsa.com";
const MQTT_PORT = 8885;
const REMOTE_TOKEN_URL =
  "https://api.groupe-psa.com/connectedcar/v4/virtualkey/remoteaccess/token";
const SMS_URL = "https://api.groupe-psa.com/applications/cvs/v4/mobile/smsCode";
const USER_INFO_URL =
  "https://api.groupe-psa.com/applications/cvs/v4/mauv/car-associations";

const DEFAULT_PRECONDITIONING_PROGRAM = {
  program1: { day: [0, 0, 0, 0, 0, 0, 0], hour: 34, minute: 7, on: 0 },
  program2: { day: [0, 0, 0, 0, 0, 0, 0], hour: 34, minute: 7, on: 0 },
  program3: { day: [0, 0, 0, 0, 0, 0, 0], hour: 34, minute: 7, on: 0 },
  program4: { day: [0, 0, 0, 0, 0, 0, 0], hour: 34, minute: 7, on: 0 },
};

export type RemoteCredentials = {
  accessToken: string;
  refreshToken: string;
  updatedAt: string;
};

function apiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "x-introspect-realm": MYPEUGEOT.realm,
    Accept: "application/hal+json, application/json",
    "User-Agent": "okhttp/4.8.0",
  };
}

export async function fetchCustomerId(
  accessToken: string,
  countryCode: string,
): Promise<string> {
  const cfg = getCountryConfig(countryCode);
  const url = new URL(USER_INFO_URL);
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("locale", cfg.locale);
  const res = await fetch(url, {
    headers: {
      ...apiHeaders(accessToken),
      "x-transaction-id": "e3008-control",
    },
    cache: "no-store",
  });
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    throw new Error(`Kunden-ID konnte nicht geladen werden (${res.status}).`);
  }
  const list = Array.isArray(data) ? data : [];
  const customer = (list[0] as { customer?: string } | undefined)?.customer;
  if (!customer) throw new Error("Keine Kunden-ID in der Peugeot-Antwort.");
  return String(customer);
}

export async function requestRemoteSms(
  accessToken: string,
  countryCode: string,
): Promise<void> {
  const cfg = getCountryConfig(countryCode);
  const url = new URL(SMS_URL);
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("locale", cfg.locale);
  const res = await fetch(url, {
    method: "POST",
    headers: apiHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || `SMS-Anforderung fehlgeschlagen (${res.status}).`,
    );
  }
}

export async function setupRemotePin(input: {
  accessToken: string;
  countryCode: string;
  smsCode: string;
  pin: string;
  deviceIdSeed: string;
  previousOtp?: OtpPersistedState | null;
}): Promise<{
  otpState: OtpPersistedState;
  remote: RemoteCredentials;
  customerId: string;
}> {
  const customerId = await fetchCustomerId(
    input.accessToken,
    input.countryCode,
  );
  const otpState = await activateOtpSession({
    smsCode: input.smsCode.trim(),
    pin: input.pin.trim(),
    deviceId: input.deviceIdSeed.slice(0, 16),
    previous: input.previousOtp,
  });
  const { code, state } = await generateOtpCode(otpState);
  const remote = await exchangeRemotePassword(
    input.accessToken,
    input.countryCode,
    code,
  );
  return { otpState: state, remote, customerId };
}

async function exchangeRemotePassword(
  accessToken: string,
  countryCode: string,
  password: string,
): Promise<RemoteCredentials> {
  const cfg = getCountryConfig(countryCode);
  const url = new URL(REMOTE_TOKEN_URL);
  url.searchParams.set("client_id", cfg.client_id);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...apiHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "password", password }),
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : `Remote-Token fehlgeschlagen (${res.status}).`,
    );
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? ""),
    updatedAt: new Date().toISOString(),
  };
}

export async function refreshRemoteToken(input: {
  oauthAccessToken: string;
  countryCode: string;
  remoteRefreshToken: string;
  otpState: OtpPersistedState;
}): Promise<{ remote: RemoteCredentials; otpState: OtpPersistedState }> {
  const cfg = getCountryConfig(input.countryCode);
  const url = new URL(REMOTE_TOKEN_URL);
  url.searchParams.set("client_id", cfg.client_id);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...apiHeaders(input.oauthAccessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: input.remoteRefreshToken,
    }),
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (res.ok && data.access_token) {
    return {
      remote: {
        accessToken: String(data.access_token),
        refreshToken: String(data.refresh_token ?? input.remoteRefreshToken),
        updatedAt: new Date().toISOString(),
      },
      otpState: input.otpState,
    };
  }

  const { code, state } = await generateOtpCode(input.otpState);
  const remote = await exchangeRemotePassword(
    input.oauthAccessToken,
    input.countryCode,
    code,
  );
  return { remote, otpState: state };
}

function correlationId(): string {
  const date = new Date();
  const stamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
  return `${cryptoRandomHex(16)}${stamp}`;
}

function cryptoRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Publish one virtual-key remote and wait briefly for MQTT ack. */
async function publishRemoteCommand(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  /** Topic suffix after `/from/cid/{customerId}` e.g. `/ThermalPrecond`. */
  topicSuffix: string;
  reqParameters: Record<string, unknown>;
  /** How long to wait for MQTT ack before resolving optimistically. */
  ackTimeoutMs?: number;
}): Promise<void> {
  const topic = `psa/RemoteServices/from/cid/${input.customerId}${input.topicSuffix}`;
  const respTopic = `psa/RemoteServices/to/cid/${input.customerId}/#`;
  const payload = JSON.stringify({
    access_token: input.remoteAccessToken,
    customer_id: input.customerId,
    correlation_id: correlationId(),
    req_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    vin: input.vin,
    req_parameters: input.reqParameters,
  });
  const ackTimeoutMs = input.ackTimeoutMs ?? 10_000;

  await new Promise<void>((resolve, reject) => {
    const client = mqtt.connect({
      host: MQTT_HOST,
      port: MQTT_PORT,
      protocol: "mqtts",
      protocolVersion: 4,
      clean: true,
      username: "IMA_OAUTH_ACCESS_TOKEN",
      password: input.remoteAccessToken,
      connectTimeout: 12_000,
      reconnectPeriod: 0,
    });

    const timer = setTimeout(() => {
      client.end(true);
      // Command may still succeed server-side even without ack.
      resolve();
    }, ackTimeoutMs);

    client.on("connect", () => {
      client.subscribe(respTopic, { qos: 0 }, (err) => {
        if (err) {
          clearTimeout(timer);
          client.end(true);
          reject(err);
          return;
        }
        client.publish(topic, payload, { qos: 0 }, (pubErr) => {
          if (pubErr) {
            clearTimeout(timer);
            client.end(true);
            reject(pubErr);
          }
        });
      });
    });

    client.on("message", (_t, buf) => {
      try {
        const data = JSON.parse(buf.toString()) as { return_code?: string };
        if (data.return_code && data.return_code !== "0") {
          clearTimeout(timer);
          client.end(true);
          reject(new Error(`Remote-Fehler ${data.return_code}`));
          return;
        }
        if (data.return_code === "0") {
          clearTimeout(timer);
          client.end(true);
          resolve();
        }
      } catch {
        // ignore non-json
      }
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      client.end(true);
      reject(err);
    });
  });
}

/** Publish one ThermalPrecond command and wait briefly for MQTT ack. */
export async function sendThermalPreconditioning(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  activate: boolean;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/ThermalPrecond",
    reqParameters: {
      asap: input.activate ? "activate" : "deactivate",
      programs: DEFAULT_PRECONDITIONING_PROGRAM,
    },
  });
}

/**
 * Ask the vehicle to push a fresh state (same as MyPeugeot wake).
 * Mirrors psa_car_controller: VehCharge/state with action "state".
 */
export async function sendVehicleWakeup(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/VehCharge/state",
    reqParameters: { action: "state" },
    ackTimeoutMs: 8_000,
  });
}

import tls from "node:tls";
import mqttPacket from "mqtt-packet";
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

function encodePacket(packet: mqttPacket.Packet): Buffer {
  return mqttPacket.generate(packet);
}

/**
 * PSA MessageSight MQTT: empty clientId + clean session (like paho default).
 * Implemented with raw TLS + mqtt-packet so mqtt.js cannot inject a clientId.
 */
async function psaMqttPublish(input: {
  remoteAccessToken: string;
  publishTopic: string;
  subscribeTopic: string;
  payload: string;
  ackTimeoutMs: number;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.end();
      } catch {
        // ignore
      }
      fn();
    };

    const socket = tls.connect({
      host: MQTT_HOST,
      port: MQTT_PORT,
      servername: MQTT_HOST,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });

    const parser = mqttPacket.parser();
    const timer = setTimeout(() => {
      // Command may still succeed server-side even without ack.
      finish(() => resolve());
    }, input.ackTimeoutMs);

    const write = (packet: mqttPacket.Packet) => {
      socket.write(encodePacket(packet));
    };

    parser.on("packet", (packet) => {
      if (packet.cmd === "connack") {
        const code =
          "returnCode" in packet
            ? Number(packet.returnCode)
            : "reasonCode" in packet
              ? Number(packet.reasonCode)
              : -1;
        if (code !== 0) {
          finish(() =>
            reject(
              new Error(
                code === 2
                  ? "Connection refused: Identifier rejected"
                  : `MQTT connection refused (code ${code})`,
              ),
            ),
          );
          return;
        }
        write({
          cmd: "subscribe",
          messageId: 1,
          subscriptions: [{ topic: input.subscribeTopic, qos: 0 }],
        });
        return;
      }

      if (packet.cmd === "suback") {
        write({
          cmd: "publish",
          topic: input.publishTopic,
          payload: input.payload,
          qos: 0,
          dup: false,
          retain: false,
        });
        return;
      }

      if (packet.cmd === "publish" && packet.payload) {
        try {
          const data = JSON.parse(String(packet.payload)) as {
            return_code?: string;
          };
          if (data.return_code && data.return_code !== "0") {
            finish(() =>
              reject(new Error(`Remote-Fehler ${data.return_code}`)),
            );
            return;
          }
          if (data.return_code === "0") {
            finish(() => resolve());
          }
        } catch {
          // ignore non-json
        }
      }
    });

    parser.on("error", (err) => {
      finish(() => reject(err));
    });

    socket.on("secureConnect", () => {
      write({
        cmd: "connect",
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        clientId: "",
        keepalive: 60,
        username: "IMA_OAUTH_ACCESS_TOKEN",
        password: Buffer.from(input.remoteAccessToken, "utf8"),
      });
    });

    socket.on("data", (chunk) => {
      parser.parse(chunk);
    });

    socket.on("error", (err) => {
      finish(() => reject(err));
    });

    socket.on("timeout", () => {
      finish(() => reject(new Error("MQTT timeout")));
    });

    socket.setTimeout(Math.max(input.ackTimeoutMs + 2_000, 14_000));
  });
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

  await psaMqttPublish({
    remoteAccessToken: input.remoteAccessToken,
    publishTopic: topic,
    subscribeTopic: respTopic,
    payload,
    ackTimeoutMs: input.ackTimeoutMs ?? 10_000,
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

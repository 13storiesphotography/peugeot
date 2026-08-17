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

export type PrecondProgramSlot = {
  day: number[];
  hour: number;
  minute: number;
  on: number;
};

export type PrecondPrograms = {
  program1: PrecondProgramSlot;
  program2: PrecondProgramSlot;
  program3: PrecondProgramSlot;
  program4: PrecondProgramSlot;
};

export function emptyPrecondPrograms(): PrecondPrograms {
  return structuredClone(DEFAULT_PRECONDITIONING_PROGRAM);
}

/** Map app climate schedules (Mo=1…So=7) onto Peugeot’s 4 program slots. */
export function climateSchedulesToPrograms(
  schedules: Array<{
    enabled: boolean;
    timeLocal: string;
    daysOfWeek: number[];
  }>,
): PrecondPrograms {
  const programs = emptyPrecondPrograms();
  const climate = schedules.slice(0, 4);
  climate.forEach((schedule, index) => {
    const [hourRaw, minuteRaw] = schedule.timeLocal.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const day = [0, 0, 0, 0, 0, 0, 0];
    for (const d of schedule.daysOfWeek) {
      if (d >= 1 && d <= 7) day[d - 1] = 1;
    }
    const key = `program${index + 1}` as keyof PrecondPrograms;
    const validTime =
      Number.isFinite(hour) &&
      Number.isFinite(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59;
    programs[key] = {
      day,
      hour: schedule.enabled && validTime ? hour : 34,
      minute: schedule.enabled && validTime ? minute : 7,
      on: schedule.enabled && validTime ? 1 : 0,
    };
  });
  return programs;
}

/** Read existing Peugeot slots from status so start/stop does not wipe them. */
export function programsFromVehicleStatus(status: unknown): PrecondPrograms | null {
  const dig = (obj: unknown, path: Array<string | number>): unknown => {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = Array.isArray(cur)
        ? cur[key as number]
        : (cur as Record<string, unknown>)[key as string];
    }
    return cur;
  };

  const raw =
    dig(status, ["preconditionning", "airConditioning", "programs"]) ??
    dig(status, ["preconditioning", "airConditioning", "programs"]) ??
    dig(status, ["preconditionning", "air_conditioning", "programs"]) ??
    dig(status, ["preconditioning", "air_conditioning", "programs"]);
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const programs = emptyPrecondPrograms();
  let found = false;
  for (const program of raw) {
    if (!program || typeof program !== "object") continue;
    const rec = program as Record<string, unknown>;
    const slot = Number(rec.slot);
    if (!Number.isFinite(slot) || slot < 1 || slot > 4) continue;
    const occurence =
      (rec.occurence as Record<string, unknown> | undefined) ??
      (rec.occurrence as Record<string, unknown> | undefined);
    const daysRaw = occurence?.day;
    const day = [0, 0, 0, 0, 0, 0, 0];
    if (Array.isArray(daysRaw)) {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < labels.length; i++) {
        if (daysRaw.includes(labels[i]) || daysRaw.includes(i + 1)) day[i] = 1;
      }
    }
    const start = typeof rec.start === "string" ? rec.start : "";
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?/i.exec(start);
    const hour = match?.[1] != null ? Number(match[1]) : 34;
    const minute = match?.[2] != null ? Number(match[2]) : 7;
    const enabled = Boolean(rec.enabled);
    const key = `program${slot}` as keyof PrecondPrograms;
    programs[key] = {
      day,
      hour: enabled && hour <= 23 ? hour : 34,
      minute: enabled && hour <= 23 ? minute : 7,
      on: enabled && hour <= 23 ? 1 : 0,
    };
    found = true;
  }
  return found ? programs : null;
}

export type ClimateScheduleDraft = {
  enabled: boolean;
  timeLocal: string;
  daysOfWeek: number[];
  slot: number;
};

/**
 * Parse MyPeugeot/status preconditioning programs into app schedule drafts.
 * Days: Mon…Sun → 1…7. Start is ISO-8601 duration from midnight (PT7H15M).
 */
export function climateScheduleDraftsFromStatus(
  status: unknown,
): ClimateScheduleDraft[] {
  const dig = (obj: unknown, path: Array<string | number>): unknown => {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = Array.isArray(cur)
        ? cur[key as number]
        : (cur as Record<string, unknown>)[key as string];
    }
    return cur;
  };

  const raw =
    dig(status, ["preconditionning", "airConditioning", "programs"]) ??
    dig(status, ["preconditioning", "airConditioning", "programs"]) ??
    dig(status, ["preconditionning", "air_conditioning", "programs"]) ??
    dig(status, ["preconditioning", "air_conditioning", "programs"]);
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const drafts: ClimateScheduleDraft[] = [];
  for (const program of raw) {
    if (!program || typeof program !== "object") continue;
    const rec = program as Record<string, unknown>;
    let slot = Number(rec.slot);
    // B2B docs use 0–3; status samples often use 1–4.
    if (slot === 0) slot = 1;
    if (!Number.isFinite(slot) || slot < 1 || slot > 4) continue;

    const occurence =
      (rec.occurence as Record<string, unknown> | undefined) ??
      (rec.occurrence as Record<string, unknown> | undefined);
    const daysRaw = occurence?.day;
    const daysOfWeek: number[] = [];
    if (Array.isArray(daysRaw)) {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < labels.length; i++) {
        if (daysRaw.includes(labels[i]) || daysRaw.includes(i + 1)) {
          daysOfWeek.push(i + 1);
        }
      }
    }

    const start = typeof rec.start === "string" ? rec.start : "";
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?/i.exec(start);
    const hour = match?.[1] != null ? Number(match[1]) : NaN;
    const minute = match?.[2] != null ? Number(match[2]) : 0;
    if (!Number.isFinite(hour) || hour > 23 || hour < 0) continue;

    const enabled = Boolean(rec.enabled);
    // Skip unused factory slots (disabled, no days).
    if (!enabled && daysOfWeek.length === 0) continue;

    drafts.push({
      slot,
      enabled,
      timeLocal: `${String(hour).padStart(2, "0")}:${String(
        Number.isFinite(minute) ? minute : 0,
      ).padStart(2, "0")}`,
      daysOfWeek: daysOfWeek.length ? daysOfWeek : [1, 2, 3, 4, 5],
    });
  }

  return drafts.sort(
    (a, b) => a.slot - b.slot || a.timeLocal.localeCompare(b.timeLocal),
  );
}

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
            reason?: string;
          };
          if (data.return_code && data.return_code !== "0") {
            const reason =
              typeof data.reason === "string" && data.reason
                ? `: ${data.reason}`
                : "";
            finish(() =>
              reject(new Error(`Remote-Fehler ${data.return_code}${reason}`)),
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
  /** When omitted, empty/disabled slots are sent — prefer passing app schedules. */
  programs?: PrecondPrograms;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/ThermalPrecond",
    reqParameters: {
      asap: input.activate ? "activate" : "deactivate",
      programs: input.programs ?? emptyPrecondPrograms(),
    },
    // Deep-sleep cars are slow to ack; don't treat silence as failure too early.
    ackTimeoutMs: 18_000,
  });
}

/** Push schedule slots only (does not start Vorklima now). */
export async function sendThermalPreconditioningPrograms(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  programs: PrecondPrograms;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/ThermalPrecond",
    reqParameters: {
      asap: "deactivate",
      programs: input.programs,
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

/** Start (immediate) or pause (delayed) charging — psa_car_controller `/VehCharge`. */
export async function sendChargeControl(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  chargeNow: boolean;
  hour: number;
  minute: number;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/VehCharge",
    reqParameters: {
      program: { hour: input.hour, minute: input.minute },
      type: input.chargeNow ? "immediate" : "delayed",
    },
    ackTimeoutMs: 18_000,
  });
}

/**
 * MyPeugeot „Laden auf 80% begrenzen“ — chargingType Partial vs Full on `/VehCharge`.
 * Not all firmware accepts this; callers should fall back to delayed-stop enforcement.
 */
export async function sendChargeTargetType(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  limit80: boolean;
  hour: number;
  minute: number;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/VehCharge",
    reqParameters: {
      program: { hour: input.hour, minute: input.minute },
      type: input.limit80 ? "partial" : "full",
    },
    ackTimeoutMs: 18_000,
  });
}

/** Lock or unlock doors via MQTT `/Doors`. */
export async function sendDoorLock(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  lock: boolean;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/Doors",
    reqParameters: { action: input.lock ? "lock" : "unlock" },
  });
}

/** Honk the horn (`nb_horn` times). */
export async function sendHorn(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  count?: number;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/Horn",
    reqParameters: {
      action: "activate",
      nb_horn: Math.max(1, Math.min(10, input.count ?? 2)),
    },
  });
}

/** Flash exterior lights (~duration seconds; car often uses ~10s anyway). */
export async function sendLights(input: {
  customerId: string;
  vin: string;
  remoteAccessToken: string;
  durationSec?: number;
}): Promise<void> {
  await publishRemoteCommand({
    customerId: input.customerId,
    vin: input.vin,
    remoteAccessToken: input.remoteAccessToken,
    topicSuffix: "/Lights",
    reqParameters: {
      action: "activate",
      duration: Math.max(1, Math.min(30, input.durationSec ?? 10)),
    },
  });
}

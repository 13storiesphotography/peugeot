import { createHash } from "node:crypto";
import {
  aesEcbDecrypt,
  aesEcbEncryptRaw,
  oaepEncrypt,
  oaepPublicDecode,
  randomBuf,
  randomHex,
  sha256Hex,
} from "./crypto";

const IW_HOST = "https://otp.mpsa.com";
const MAC_ID = "bb8e981582b0f31353108fb020bead1c";
const BASE36 = "abcdefghijklmnopqrstuvwxyz0123456789";

export type OtpPersistedState = {
  deviceId: string;
  iwalea: string;
  codePin: string;
  Kiw: string | null;
  Kfact: string | null;
  iwid: string;
  iwTsync: number;
  iwK0: string;
  iwK1: string;
  iwsecid: string;
  iwsecval: string;
  iwsecn: number;
};

function numberToBase36(n: number): string {
  if (n === 0) return "a";
  let digits = "";
  let x = n;
  while (x) {
    digits += BASE36[x % 36]!;
    x = Math.floor(x / 36);
  }
  return digits;
}

function parseXml(raw: string): Record<string, unknown> {
  // Minimal tag extractor for Inwebo ActionSetup/ActionFinalize responses.
  const rootMatch = raw.match(/<(ActionSetup|ActionFinalize)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!rootMatch) {
    // Sometimes attributes-only / self-closing style with nested tags still works via flat map
    const flat: Record<string, unknown> = {};
    for (const m of raw.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g)) {
      flat[m[1]!] = m[2];
    }
    flat.err = flat.err ?? (raw.includes(">OK<") ? "OK" : "PARSE");
    return flat;
  }
  const body = rootMatch[2] ?? "";
  const out: Record<string, unknown> = {};
  for (const m of body.matchAll(/<([A-Za-z0-9_]+)>([^<]*)<\/\1>/g)) {
    out[m[1]!] = m[2];
  }
  // err can be attribute on root
  const errAttr = rootMatch[0].match(/\berr="([^"]+)"/i);
  if (errAttr) out.err = errAttr[1];
  if (!out.err && body.includes("")) out.err = out.err ?? "OK";
  return { [rootMatch[1]!]: out };
}

async function iwRequest(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${IW_HOST}/iwws/MAC`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      Connection: "Keep-Alive",
      Host: "otp.mpsa.com",
      "User-Agent":
        "Dalvik/2.1.0 (Linux; U; Android 8.0.0; Android SDK built for x86_64 Build/OSR1.180418.004)",
    },
    cache: "no-store",
  });
  const text = await res.text();
  const parsed = parseXml(text);
  return parsed;
}

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" || typeof v === "number" ? String(v) : fallback;
}

export function createEmptyOtpState(deviceId: string): OtpPersistedState {
  return {
    deviceId,
    iwalea: randomHex(16),
    codePin: "",
    Kiw: null,
    Kfact: null,
    iwid: "",
    iwTsync: 0,
    iwK0: "",
    iwK1: "",
    iwsecid: "",
    iwsecval: "",
    iwsecn: 0,
  };
}

function serial(state: OtpPersistedState): string {
  return `${state.deviceId}/_/${state.iwalea}`;
}

function generateKma(state: OtpPersistedState, pin: string): string {
  return sha256Hex(`${pin};${serial(state)}`).slice(0, 32);
}

function getR(
  state: OtpPersistedState,
  challenge: string,
  action: string,
  pin: string,
): { R0: string; R1: string; R2: string } {
  const iw = action === "upgrade" ? state.iwK1 : state.iwK0;
  const R2 =
    action === "synchro"
      ? `${challenge};${iw};${pin}`
      : `${challenge};${iw};`;
  const R0 = `${challenge};${iw};${serial(state)}`;
  const R1 = `${challenge};${iw};${state.iwK1}`;
  return {
    R0: sha256Hex(R0),
    R1: sha256Hex(R1),
    R2: sha256Hex(R2),
  };
}

function synchroKeys(
  state: OtpPersistedState,
  xml: Record<string, unknown>,
  kma: string,
): void {
  const id = str(xml.id);
  if (id) state.iwid = id;
  const k0 = str(xml.K0);
  if (k0) state.iwK0 = aesEcbDecrypt(kma, Buffer.from(k0, "hex")).toString("hex");
  const k1 = str(xml.K1);
  if (k1) state.iwK1 = aesEcbDecrypt(kma, Buffer.from(k1, "hex")).toString("hex");
  const dK1 = str(xml.dK1);
  if (dK1) {
    state.iwK1 = sha256Hex(`${state.iwK1};${dK1}`).slice(0, 32);
  }
  const tsync = xml.Tsync;
  if (tsync != null) state.iwTsync = Number(tsync) || state.iwTsync;
}

/** Activate OTP device with SMS code + 4-digit MyPeugeot PIN. */
export async function activateOtpSession(input: {
  smsCode: string;
  pin: string;
  deviceId: string;
  previous?: OtpPersistedState | null;
}): Promise<OtpPersistedState> {
  const state = input.previous
    ? {
        ...input.previous,
        deviceId: input.previous.deviceId || input.deviceId,
        codePin: input.pin,
      }
    : { ...createEmptyOtpState(input.deviceId), codePin: input.pin };

  const setupXml = await iwRequest({
    action: "ActionSetup",
    mode: "activate",
    id: state.iwid || "0",
    lastsync: String(state.iwTsync || 0),
    version: "Generator-1.0/0.2.11",
    macid: MAC_ID,
    code: input.smsCode,
  });
  const setup = asRec(setupXml.ActionSetup) ?? setupXml;
  if (str(setup.err) !== "OK") {
    throw new Error(`OTP-Aktivierung fehlgeschlagen: ${JSON.stringify(setup.err ?? setup)}`);
  }

  const Kfact = str(setup.Kfact);
  const KiwEnc = str(setup.Kiw);
  if (!Kfact || !KiwEnc) throw new Error("OTP-Antwort unvollständig (Kfact/Kiw).");
  state.Kfact = Kfact;
  state.Kiw = oaepPublicDecode(Kfact, KiwEnc);

  const kma = generateKma(state, input.pin);
  const kmaCrypt = oaepEncrypt(state.Kiw, Buffer.from(kma, "hex")).toString("hex");
  const pinCrypt = oaepEncrypt(state.Kiw, Buffer.from(input.pin, "utf8")).toString(
    "hex",
  );
  const R = getR(state, "", "", input.pin);

  const finalXml = await iwRequest({
    action: "ActionFinalize",
    mode: "activate",
    id: state.iwid || "0",
    lastsync: String(state.iwTsync || 0),
    version: "Generator-1.0/0.2.11",
    lang: "de",
    ack: "",
    macid: MAC_ID,
    serial: serial(state),
    code: input.smsCode,
    Kma: kmaCrypt,
    pin: pinCrypt,
    name: "E3008Control / Web",
    ...R,
  });
  const final = asRec(finalXml.ActionFinalize) ?? finalXml;
  if (str(final.err) !== "OK") {
    throw new Error(`OTP Finalize fehlgeschlagen: ${JSON.stringify(final.err ?? final)}`);
  }
  synchroKeys(state, final, kma);

  const msN = Number(final.ms_n ?? 0);
  if (msN > 0) {
    if (msN > 1) throw new Error("Mehrere ms_n werden nicht unterstützt.");
    const challenge = str(final.challenge);
    const msKey = str(final.ms_key);
    const tempMod = oaepPublicDecode(Kfact, msKey);
    const random = randomBuf(16);
    const kpubEncode = oaepEncrypt(tempMod, random);
    const encodeAes = aesEcbEncryptRaw(kma, random).toString("hex");
    state.iwsecval = encodeAes;
    state.iwsecid = str(final.s_id);
    state.iwsecn = 1;

    const R2 = getR(state, challenge, "synchro", input.pin);
    const msXml = await iwRequest({
      action: "ActionFinalize",
      mode: "ms",
      [`ms_id0`]: str(final.ms_id),
      [`ms_val0`]: kpubEncode.toString("hex"),
      macid: MAC_ID,
      id: state.iwid,
      lastsync: String(state.iwTsync || 0),
      ms_n: "1",
      ...R2,
    });
    const ms = asRec(msXml.ActionFinalize) ?? msXml;
    if (str(ms.err) !== "OK") {
      throw new Error(`OTP MS-Finalize fehlgeschlagen: ${JSON.stringify(ms.err ?? ms)}`);
    }
    synchroKeys(state, ms, kma);
  }

  return state;
}

/** Generate a one-time remote password from persisted OTP state. */
export async function generateOtpCode(
  state: OtpPersistedState,
): Promise<{ code: string; state: OtpPersistedState }> {
  const next = { ...state };
  let defi = "";

  const runOnce = async () => {
    const setupXml = await iwRequest({
      action: "ActionSetup",
      mode: "otp",
      id: next.iwid,
      lastsync: String(next.iwTsync || 0),
      version: "Generator-1.0/0.2.11",
      macid: MAC_ID,
      sid: next.iwsecid,
    });
    const setup = asRec(setupXml.ActionSetup) ?? setupXml;
    if (str(setup.err) !== "OK") {
      throw new Error(`OTP Setup fehlgeschlagen: ${JSON.stringify(setup.err ?? setup)}`);
    }
    const challenge = str(setup.challenge);
    const R = getR(next, challenge, "", next.codePin);
    const finalXml = await iwRequest({
      action: "ActionFinalize",
      mode: "otp",
      id: next.iwid,
      lastsync: String(next.iwTsync || 0),
      version: "Generator-1.0/0.2.11",
      lang: "de",
      ack: "",
      macid: MAC_ID,
      keytype: "0",
      sid: next.iwsecid,
      ...R,
    });
    const final = asRec(finalXml.ActionFinalize) ?? finalXml;
    if (str(final.err) !== "OK") {
      throw new Error(`OTP Code fehlgeschlagen: ${JSON.stringify(final.err ?? final)}`);
    }
    synchroKeys(next, final, generateKma(next, next.codePin));
    defi = str(final.defi);
    return Boolean(final.J);
  };

  const needTwice = await runOnce();
  if (needTwice) await runOnce();
  if (!defi) throw new Error("OTP defi fehlt.");

  const password = `${next.iwK1}:${defi}:${next.iwsecval}`;
  const digest = createHash("sha256").update(password, "utf8").digest();
  const nb =
    ((digest.readUInt32BE(0) & 0xfffffff) * 1024) +
    (digest.readUInt32BE(4) & 1023);
  return { code: numberToBase36(nb), state: next };
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision } from "@/lib/auth/mfa";

async function requireAllowlistedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isEmailAllowed(user.email)) {
    redirect("/");
  }

  return { supabase, user };
}

export async function enrollTotpAction() {
  const { supabase } = await requireAllowlistedUser();
  const decision = await getMfaDecision(supabase);

  if (decision.status === "ok") {
    return { ok: true as const, alreadyVerified: true as const };
  }

  if (decision.status === "challenge") {
    return {
      ok: false as const,
      error: "MFA ist bereits eingerichtet. Bitte Challenge abschließen.",
    };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Peugeot Control",
  });

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message ?? "TOTP-Enrollment fehlgeschlagen.",
    };
  }

  return {
    ok: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyTotpEnrollmentAction(input: {
  factorId: string;
  code: string;
}) {
  const { supabase } = await requireAllowlistedUser();
  const code = input.code.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "Bitte einen 6-stelligen Code eingeben." };
  }

  const challenge = await supabase.auth.mfa.challenge({ factorId: input.factorId });
  if (challenge.error || !challenge.data) {
    return {
      ok: false as const,
      error: challenge.error?.message ?? "Challenge konnte nicht erstellt werden.",
    };
  }

  const verify = await supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: challenge.data.id,
    code,
  });

  if (verify.error) {
    return { ok: false as const, error: verify.error.message };
  }

  redirect("/control");
}

export async function verifyTotpChallengeAction(input: {
  factorId: string;
  code: string;
}) {
  const { supabase } = await requireAllowlistedUser();
  const code = input.code.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "Bitte einen 6-stelligen Code eingeben." };
  }

  const challenge = await supabase.auth.mfa.challenge({ factorId: input.factorId });
  if (challenge.error || !challenge.data) {
    return {
      ok: false as const,
      error: challenge.error?.message ?? "Challenge konnte nicht erstellt werden.",
    };
  }

  const verify = await supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: challenge.data.id,
    code,
  });

  if (verify.error) {
    return { ok: false as const, error: verify.error.message };
  }

  redirect("/control");
}

export async function unenrollTotpAction(factorId: string) {
  const { supabase } = await requireAllowlistedUser();
  const decision = await getMfaDecision(supabase);

  if (decision.status !== "ok") {
    return {
      ok: false as const,
      error: "Zum Entfernen von MFA musst du mit AAL2 eingeloggt sein.",
    };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

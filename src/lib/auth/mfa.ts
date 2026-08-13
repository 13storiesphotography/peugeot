import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateMfaPolicy,
  type MfaDecision,
  MFA_GRACE_DAYS,
} from "@/lib/auth/mfa-policy";

export type MfaDecisionResult = MfaDecision & {
  factorId: string | null;
  graceDays: number;
};

export async function getMfaDecision(
  supabase: SupabaseClient,
): Promise<MfaDecisionResult> {
  const [{ data: aal }, { data: factors }, { data: userData }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
      supabase.auth.getUser(),
    ]);

  const verifiedTotp = (factors?.totp ?? []).find((f) => f.status === "verified");
  const verifiedPhone = (factors?.phone ?? []).find(
    (f) => f.status === "verified",
  );
  const hasVerifiedFactor = Boolean(verifiedTotp || verifiedPhone);

  const decision = evaluateMfaPolicy({
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
    hasVerifiedFactor,
    userCreatedAt: userData.user?.created_at ?? null,
  });

  return {
    ...decision,
    factorId: verifiedTotp?.id ?? verifiedPhone?.id ?? null,
    graceDays: MFA_GRACE_DAYS,
  };
}

export function mfaBlocksAccess(decision: MfaDecision): boolean {
  return (
    decision.status === "challenge" || decision.status === "enroll_required"
  );
}

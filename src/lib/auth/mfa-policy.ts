export const MFA_GRACE_DAYS = Number(process.env.MFA_GRACE_DAYS ?? "7");

export type MfaDecision =
  | { status: "ok" }
  | { status: "challenge" }
  | { status: "enroll_required"; daysLeft: 0 }
  | { status: "enroll_optional"; daysLeft: number };

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.floor((Date.now() - created) / (24 * 60 * 60 * 1000));
}

export function evaluateMfaPolicy(input: {
  currentLevel: string | null;
  nextLevel: string | null;
  hasVerifiedFactor: boolean;
  userCreatedAt: string | null;
}): MfaDecision {
  const current = input.currentLevel ?? "aal1";
  const next = input.nextLevel ?? "aal1";
  const ageDays = daysSince(input.userCreatedAt);
  const daysLeft = Math.max(0, MFA_GRACE_DAYS - ageDays);

  // Already verified MFA this session
  if (current === "aal2") {
    return { status: "ok" };
  }

  // Has MFA enrolled → must challenge
  if (input.hasVerifiedFactor || next === "aal2") {
    return { status: "challenge" };
  }

  // No MFA yet — grace period then force enroll
  if (daysLeft <= 0) {
    return { status: "enroll_required", daysLeft: 0 };
  }

  return { status: "enroll_optional", daysLeft };
}

import "server-only";
import { cookies } from "next/headers";
import { GOALS_COOKIE } from "@/lib/auth/constants";
import type { MoneyCents, SavingsGoal } from "./types";

export type { SavingsGoal };

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const jar = await cookies();
  const raw = jar.get(GOALS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavingsGoal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSavingsGoals(goals: SavingsGoal[]) {
  const jar = await cookies();
  jar.set(GOALS_COOKIE, JSON.stringify(goals.slice(0, 8)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function upsertSavingsGoal(
  input: Omit<SavingsGoal, "id" | "createdAt" | "savedCents"> & {
    savedCents?: MoneyCents;
  },
): Promise<SavingsGoal> {
  const goals = await getSavingsGoals();
  const existing = goals.find(
    (g) => g.label.toLowerCase() === input.label.toLowerCase(),
  );
  const goal: SavingsGoal = existing
    ? {
        ...existing,
        targetCents: input.targetCents,
        monthlySaveCents: input.monthlySaveCents,
        savedCents: input.savedCents ?? existing.savedCents,
      }
    : {
        id: crypto.randomUUID(),
        label: input.label,
        targetCents: input.targetCents,
        savedCents: input.savedCents ?? 0,
        monthlySaveCents: input.monthlySaveCents,
        createdAt: new Date().toISOString(),
      };

  const next = existing
    ? goals.map((g) => (g.id === existing.id ? goal : g))
    : [goal, ...goals];
  await saveSavingsGoals(next);
  return goal;
}

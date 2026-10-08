"use server";

import { revalidatePath } from "next/cache";
import { requireDemoSession } from "@/lib/auth/demo-session";
import {
  getSavingsGoals,
  saveSavingsGoals,
  upsertSavingsGoal,
} from "@/lib/finance/goals";
import { parseEuroInput } from "@/lib/finance/money";

export async function createGoalFromForm(formData: FormData) {
  await requireDemoSession();
  const label = String(formData.get("label") ?? "").trim();
  const target = parseEuroInput(String(formData.get("target") ?? ""));
  const monthly = parseEuroInput(String(formData.get("monthly") ?? "")) ?? 0;
  if (!label || target === null || target <= 0) {
    return { ok: false as const, error: "Bitte Bezeichnung und Zielbetrag prüfen." };
  }
  await upsertSavingsGoal({
    label,
    targetCents: target,
    monthlySaveCents: monthly,
  });
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  return { ok: true as const };
}

export async function addToGoal(formData: FormData) {
  await requireDemoSession();
  const id = String(formData.get("id") ?? "");
  const amount = parseEuroInput(String(formData.get("amount") ?? ""));
  if (!id || amount === null || amount <= 0) {
    return { ok: false as const, error: "Ungültiger Betrag." };
  }
  const goals = await getSavingsGoals();
  const next = goals.map((g) =>
    g.id === id
      ? { ...g, savedCents: Math.min(g.targetCents, g.savedCents + amount) }
      : g,
  );
  await saveSavingsGoals(next);
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  return { ok: true as const };
}

export async function deleteGoal(formData: FormData) {
  await requireDemoSession();
  const id = String(formData.get("id") ?? "");
  const goals = await getSavingsGoals();
  await saveSavingsGoals(goals.filter((g) => g.id !== id));
  revalidatePath("/dashboard");
  revalidatePath("/goals");
}

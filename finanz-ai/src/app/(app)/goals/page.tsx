import { AppShell } from "@/components/app/AppShell";
import { GoalCreateForm } from "@/components/app/GoalCreateForm";
import { GoalList } from "@/components/app/GoalList";
import { getSavingsGoals } from "@/lib/finance/goals";

export const metadata = { title: "Sparziele" };

export default async function GoalsPage() {
  const goals = await getSavingsGoals();

  return (
    <AppShell title="Sparziele">
      <p className="max-w-2xl text-ink-soft">
        Ziele aus der AI („Schrank sparen“) oder manuell anlegen — lokal in der
        Demo-Session gespeichert.
      </p>
      <GoalCreateForm />
      <GoalList goals={goals} />
    </AppShell>
  );
}

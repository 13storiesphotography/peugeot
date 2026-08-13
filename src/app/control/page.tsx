import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { MfaGraceBanner } from "@/components/MfaGraceBanner";
import { VehicleDashboard } from "@/components/VehicleDashboard";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export default async function ControlPage() {
  const session = await assertOwnerSession();
  if (!session) {
    redirect("/");
  }

  const bundle = await getVehicleBundle(session.supabase, session.userId);
  const graceDaysLeft =
    session.mfa.status === "enroll_optional" ? session.mfa.daysLeft : 0;

  return (
    <main className="min-h-full">
      {graceDaysLeft > 0 ? <MfaGraceBanner daysLeft={graceDaysLeft} /> : null}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <p className="truncate text-sm text-[var(--fg-muted)]">{session.email}</p>
        <div className="flex items-center gap-2">
          <Link
            href="/control/settings"
            className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--fg-muted)]"
          >
            Einstellungen
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="action-btn rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--fg-muted)]"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
      <VehicleDashboard initial={bundle} />
    </main>
  );
}

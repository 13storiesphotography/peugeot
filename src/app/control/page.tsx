import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { VehicleDashboard } from "@/components/VehicleDashboard";
import { createClient } from "@/lib/supabase/server";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export default async function ControlPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    redirect("/");
  }

  const bundle = await getVehicleBundle(supabase, userId);
  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Angemeldet";

  return (
    <main className="min-h-full">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <p className="truncate text-sm text-[var(--fg-muted)]">{email}</p>
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

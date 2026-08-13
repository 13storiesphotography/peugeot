import { VehicleDashboard } from "@/components/VehicleDashboard";
import { signOut } from "@/app/actions/auth";
import { createVehicleClient } from "@/lib/stellantis/client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ControlPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/");
  }

  const client = createVehicleClient();
  const vehicle = await client.getStatus();
  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Angemeldet";

  return (
    <main className="min-h-full">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <p className="truncate text-sm text-[var(--fg-muted)]">{email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="action-btn rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--fg-muted)]"
          >
            Abmelden
          </button>
        </form>
      </div>
      <VehicleDashboard initial={vehicle} />
    </main>
  );
}

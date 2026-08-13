import { redirect } from "next/navigation";
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
      <VehicleDashboard initial={bundle} />
    </main>
  );
}

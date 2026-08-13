import Link from "next/link";
import { redirect } from "next/navigation";
import { PeugeotConnectForm } from "@/components/PeugeotConnectForm";
import { SettingsForm } from "@/components/SettingsForm";
import { createClient } from "@/lib/supabase/server";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    redirect("/");
  }

  const bundle = await getVehicleBundle(supabase, userId);

  return (
    <main className="min-h-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/control"
          className="text-sm text-[var(--accent-bright)] hover:underline"
        >
          ← Zurück zur Steuerung
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Einstellungen
        </h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          Hier verbindest du deinen echten Peugeot E-3008 über MyPeugeot.
        </p>
        <div className="mt-8 space-y-6">
          <PeugeotConnectForm connection={bundle.connection} />
          <SettingsForm vehicle={bundle.vehicle} />
        </div>
      </div>
    </main>
  );
}

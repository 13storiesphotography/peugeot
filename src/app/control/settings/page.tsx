import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { PeugeotConnectForm } from "@/components/PeugeotConnectForm";
import { RemotePinForm } from "@/components/RemotePinForm";
import { SettingsForm } from "@/components/SettingsForm";
import { SyncIntervalForm } from "@/components/SyncIntervalForm";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { MFA_GRACE_DAYS } from "@/lib/auth/mfa-policy";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await assertOwnerSession();
  if (!session) {
    redirect("/");
  }

  const bundle = await getVehicleBundle(session.supabase, session.userId);
  const mfa = session.mfa;

  return (
    <main className="min-h-full">
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:max-w-xl sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/control"
            className="text-sm text-[var(--accent-bright)] hover:underline"
          >
            ← Zurück
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline"
            >
              Abmelden
            </button>
          </form>
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Einstellungen
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{session.email}</p>
        <div className="mt-8 space-y-6">
          <section className="panel rounded-[1.75rem] p-6 sm:p-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Zwei-Faktor-Authentifizierung
            </h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {mfa.status === "ok"
                ? "MFA ist aktiv und für diese Sitzung bestätigt."
                : mfa.status === "enroll_optional"
                  ? `Noch nicht eingerichtet. Spätestens nach ${MFA_GRACE_DAYS} Tagen Pflicht (noch ${mfa.daysLeft} Tag${mfa.daysLeft === 1 ? "" : "e"}).`
                  : "MFA-Status prüfen oder Authenticator einrichten."}
            </p>
            {mfa.status !== "ok" ? (
              <Link
                href="/mfa"
                className="action-btn mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                  color: "#031016",
                }}
              >
                MFA einrichten
              </Link>
            ) : null}
          </section>
          <PeugeotConnectForm connection={bundle.connection} />
          <div className="panel rounded-[1.75rem] p-6 sm:p-8">
            <RemotePinForm ready={bundle.connection.remoteReady} />
          </div>
          <div className="panel rounded-[1.75rem] p-6 sm:p-8">
            <SyncIntervalForm
              syncIntervalSec={bundle.connection.syncIntervalSec}
            />
          </div>
          <SettingsForm vehicle={bundle.vehicle} />
        </div>
      </div>
    </main>
  );
}

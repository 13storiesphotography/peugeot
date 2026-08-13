import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision } from "@/lib/auth/mfa";
import { MfaEnrollForm } from "@/components/MfaEnrollForm";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (!isEmailAllowed(user.email)) {
    redirect("/?denied=1");
  }

  const decision = await getMfaDecision(supabase);

  if (decision.status === "ok") {
    redirect("/control");
  }

  if (decision.status === "enroll_optional") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
          Sicherheit
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
          MFA einrichten
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Noch {decision.daysLeft} Tag{decision.daysLeft === 1 ? "" : "e"} Grace-Zeit.
          Danach ist MFA verpflichtend.
        </p>
        <div className="mt-8">
          <MfaEnrollForm />
        </div>
        <Link
          href="/control"
          className="mt-6 text-center text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline"
        >
          Später fortfahren
        </Link>
      </main>
    );
  }

  if (decision.status === "enroll_required") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--danger)]">
          MFA erforderlich
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
          Authenticator einrichten
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Die {decision.graceDays}-Tage-Grace-Periode ist abgelaufen. Richte jetzt MFA
          ein, um fortzufahren.
        </p>
        <div className="mt-8">
          <MfaEnrollForm forced />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
        Zweiter Faktor
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        MFA bestätigen
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        Gib den Code aus deiner Authenticator-App ein.
      </p>
      <div className="mt-8">
        <MfaChallengeForm />
      </div>
    </main>
  );
}

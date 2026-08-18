import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision } from "@/lib/auth/mfa";
import { MfaEnrollForm } from "@/components/MfaEnrollForm";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const { t } = await getTranslator();
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
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
          {t("mfa.security")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
          {t("mfa.setupTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {t("mfa.graceLeft", { n: decision.daysLeft })}
        </p>
        <div className="mt-8">
          <MfaEnrollForm />
        </div>
        <Link
          href="/control"
          className="mt-6 text-center text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline"
        >
          {t("mfa.later")}
        </Link>
      </main>
    );
  }

  if (decision.status === "enroll_required") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--danger)]">
          {t("mfa.required")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
          {t("mfa.setupAuth")}
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {t("mfa.graceOver", { n: decision.graceDays })}
        </p>
        <div className="mt-8">
          <MfaEnrollForm forced />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher compact />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
        {t("mfa.secondFactor")}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        {t("mfa.confirmTitle")}
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        {t("mfa.enterCode")}
      </p>
      <div className="mt-8">
        <MfaChallengeForm />
      </div>
    </main>
  );
}

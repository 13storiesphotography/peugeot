import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountDeleteCard } from "@/components/AccountDeleteCard";
import { ControlPageShell } from "@/components/ControlPageShell";
import { MfaManageCard } from "@/components/MfaManageCard";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
import { assertOwnerSession } from "@/lib/auth/assert-owner";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await assertOwnerSession();
  if (!session) {
    redirect("/");
  }

  const mfa = session.mfa;

  return (
    <ControlPageShell section="account">
        <header className="animate-rise flex items-center justify-between gap-3">
          <Link
            href="/control/settings"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)] lg:hidden"
            aria-label="Zurück zu Einstellungen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="min-w-0 flex-1 text-center lg:text-left">
            <p className="eyebrow">Peugeot Control</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight lg:text-3xl">
              Konto
            </h1>
          </div>
          <SignOutButton className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--fg-muted)]" />
        </header>

        <section className="animate-rise-delay-1 mt-6 ui-surface p-4 sm:p-5 lg:max-w-xl">
          <p className="eyebrow">Profil</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
            E-Mail
          </h2>
          <p className="mt-2 break-all text-sm text-[var(--fg)]">
            {session.email ?? "—"}
          </p>
          <p className="mt-2 text-[11px] text-[var(--fg-muted)]">
            Die Login-Adresse kann hier nicht geändert werden. Bei Bedarf neuen
            Account anlegen oder Support kontaktieren.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <PasswordChangeForm />
          </div>
          <div className="space-y-4">
            <MfaManageCard mfa={mfa} />
            <AccountDeleteCard />
          </div>
        </div>

        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-2 text-center text-xs text-[var(--fg-muted)] lg:justify-start">
          <Link
            href="/impressum"
            className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
          >
            Datenschutz
          </Link>
          <Link
            href="/agb"
            className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
          >
            AGB
          </Link>
          <Link
            href="/widerruf"
            className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
          >
            Widerruf
          </Link>
        </p>
    </ControlPageShell>
  );
}

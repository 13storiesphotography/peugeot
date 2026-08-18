import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Neues Passwort · Peugeot Control",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    token_hash?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const invalidLink = error === "invalid";
  const tokenHashRaw = Array.isArray(params.token_hash)
    ? params.token_hash[0]
    : params.token_hash;
  const tokenHash = tokenHashRaw?.trim() || undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
        Konto
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        Neues Passwort
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        Wähle ein Passwort mit mindestens 8 Zeichen.
      </p>
      <div className="panel mt-8 w-full rounded-[1.75rem] p-6 sm:p-8">
        <ResetPasswordForm invalidLink={invalidLink} tokenHash={tokenHash} />
      </div>
      <Link
        href="/#start"
        className="mt-6 text-center text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline"
      >
        Zurück zur Anmeldung
      </Link>
    </main>
  );
}

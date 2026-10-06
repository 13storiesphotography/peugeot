import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmEmailForm } from "@/components/ConfirmEmailForm";
import { otpType } from "@/lib/auth/otp-type";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-Mail bestätigen · Peugeot Control",
  robots: { index: false, follow: false },
};

/**
 * Landing for signup confirmation links.
 * Must NOT verify the OTP on GET — Microsoft 365 Safe Links and other
 * mail scanners prefetch URLs and would consume the one-time token.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const tokenHashRaw = Array.isArray(params.token_hash)
    ? params.token_hash[0]
    : params.token_hash;
  const typeRaw = Array.isArray(params.type) ? params.type[0] : params.type;
  const tokenHash = tokenHashRaw?.trim() ?? "";
  const type = otpType(typeRaw ?? null);

  if (!tokenHash) {
    redirect("/?confirm=failed");
  }

  // Recovery belongs on the reset form (also prefetch-safe).
  if (type === "recovery") {
    const q = new URLSearchParams({
      token_hash: tokenHash,
      type: "recovery",
    });
    redirect(`/auth/reset?${q.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
        Konto
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        E-Mail bestätigen
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">
        Fast geschafft — ein Tipp aktiviert dein Peugeot-Control-Konto.
      </p>
      <div className="panel mt-8 w-full rounded-[1.75rem] p-6 sm:p-8">
        <ConfirmEmailForm tokenHash={tokenHash} type={type} />
      </div>
      <Link
        href="/"
        className="mt-6 block rounded-full border border-[var(--line)] px-5 py-3 text-center text-sm font-semibold text-[var(--fg)]"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}

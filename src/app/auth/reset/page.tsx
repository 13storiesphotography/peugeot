import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getTranslator();
  return {
    title: t("reset.title"),
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    token_hash?: string | string[];
  }>;
}) {
  const { t } = await getTranslator();
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const invalidLink = error === "invalid";
  const tokenHashRaw = Array.isArray(params.token_hash)
    ? params.token_hash[0]
    : params.token_hash;
  const tokenHash = tokenHashRaw?.trim() || undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher compact />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
        {t("landing.brand")}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fg)]">
        {t("auth.resetTitle")}
      </h1>
      <p className="mt-3 text-sm text-[var(--fg-muted)]">{t("auth.resetLead")}</p>
      <div className="panel mt-8 w-full rounded-[1.75rem] p-6 sm:p-8">
        <ResetPasswordForm invalidLink={invalidLink} tokenHash={tokenHash} />
      </div>
      <Link
        href="/#start"
        className="mt-6 text-center text-sm text-[var(--fg-muted)] underline-offset-2 hover:underline"
      >
        {t("common.backToSignIn")}
      </Link>
    </main>
  );
}

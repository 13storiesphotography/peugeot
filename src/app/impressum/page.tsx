import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getTranslator } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: `${t("legal.title")} · Peugeot Control`,
    description: t("legal.lead"),
  };
}

export default async function ImpressumPage() {
  const { t } = await getTranslator();
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        >
          Peugeot Control
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          <Link
            href="/"
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {t("legal.backHome")}
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          {t("legal.kicker")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          {t("legal.title")}
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">{t("legal.lead")}</p>

        <section className="panel mt-10 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {t("legal.section5")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            Florian Knoll
            <br />
            Kellerwiese 10
            <br />
            82327 Tutzing
            <br />
            {t("legal.germany")}
          </p>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            {t("legal.responsible")}
          </p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Kontakt
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            Telefon:{" "}
            <a className="underline decoration-[var(--line)] underline-offset-4" href="tel:+4917631256822">
              +49 176 31256822
            </a>
            <br />
            E-Mail:{" "}
            <a
              className="underline decoration-[var(--line)] underline-offset-4"
              href="mailto:mail@florianknoll.de"
            >
              mail@florianknoll.de
            </a>
          </p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {t("legal.vat")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            {t("legal.vatBody")}
          </p>
          <p className="mt-2 text-sm">DE 54968762136</p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {t("legal.insurance")}
          </h2>
          <p className="mt-3 text-sm font-semibold">{t("legal.insurer")}</p>
          <p className="mt-1 text-sm leading-relaxed">
            erpam GmbH
            <br />
            Berger Str. 8
            <br />
            82319 Starnberg
          </p>
          <p className="mt-4 text-sm font-semibold">{t("legal.coverage")}</p>
          <p className="mt-1 text-sm">{t("legal.germany")}</p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            {t("legal.dispute")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            {t("legal.disputeBody")}
          </p>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}

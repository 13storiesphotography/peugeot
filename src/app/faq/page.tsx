import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd } from "@/components/landing/LandingJsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMetadata, SITE_FAQS, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Häufige Fragen · ${SITE_NAME}`,
  description:
    "FAQ zu Peugeot Control: MyPeugeot-Verbindung, Free und Pro, Handy und Browser, Voraussetzungen und Datenschutz.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <FaqJsonLd />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        >
          Peugeot Control
        </Link>
        <Link
          href="/#start"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Anmelden
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          FAQ
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Häufige Fragen
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Kurz und klar — von der Einrichtung bis Free/Pro. Peugeot Control ist
          eine inoffizielle Web-App und nicht von Stellantis oder Peugeot.
        </p>

        <div className="mt-10 space-y-4">
          {SITE_FAQS.map((faq) => (
            <section
              key={faq.question}
              className="panel rounded-2xl p-6 sm:p-8"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                {faq.question}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                {faq.answer}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-[var(--fg-muted)]">
          Noch Fragen?{" "}
          <Link
            href="/#start"
            className="font-semibold text-[var(--accent-bright)] hover:underline"
          >
            Konto anlegen
          </Link>{" "}
          oder im{" "}
          <Link
            href="/impressum"
            className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
          >
            Impressum
          </Link>{" "}
          Kontakt aufnehmen.
        </p>
      </article>

      <SiteFooter />
    </div>
  );
}

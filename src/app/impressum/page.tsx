import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Impressum · E-3008 Control",
  description: "Angaben gemäß § 5 DDG zum Anbieter von E-3008 Control.",
};

export default function ImpressumPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        >
          E-3008 Control
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Zur Startseite
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          Rechtliches
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          Impressum
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Anbieterkennzeichnung für die Web-App E-3008 Control
          (peugeotcontrol.app).
        </p>

        <section className="panel mt-10 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Angaben gemäß § 5 DDG
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            Florian Knoll
            <br />
            Kellerwiese 10
            <br />
            82327 Tutzing
            <br />
            Deutschland
          </p>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            Verantwortlich für das Angebot E-3008 Control, eine inoffizielle
            Steuerungs-Oberfläche für Peugeot-Fahrzeuge. Keine Verbindung zu
            Stellantis N.V., Peugeot oder verbundenen Marken.
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
            Umsatzsteuer-ID
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
          </p>
          <p className="mt-2 text-sm">DE 54968762136</p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Berufshaftpflichtversicherung
          </h2>
          <p className="mt-3 text-sm font-semibold">Name und Sitz des Versicherers</p>
          <p className="mt-1 text-sm leading-relaxed">
            erpam GmbH
            <br />
            Berger Str. 8
            <br />
            82319 Starnberg
          </p>
          <p className="mt-4 text-sm font-semibold">Geltungsraum der Versicherung</p>
          <p className="mt-1 text-sm">Deutschland</p>
        </section>

        <section className="panel mt-4 rounded-2xl p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Verbraucherstreitbeilegung
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}

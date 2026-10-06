import { AuthForm } from "@/components/AuthForm";
import { LandingScreens } from "@/components/landing/LandingScreens";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/SiteFooter";
import {
  PRO_MONTH_CENTS,
  formatEuroFromCents,
} from "@/lib/billing/catalog";

const pains = [
  {
    bad: "Serien-App: Menüs, Wartezeiten, Tippen im Kreis.",
    good: "Hier: Status und Aktionen in einem Blick.",
  },
  {
    bad: "Vorklima? Versteckt. Schloss? Noch ein Tap.",
    good: "Vorklima, Entriegeln, Finden — ein Tipp. Mit Pro.",
  },
  {
    bad: "Nur auf dem Handy. Nur wenn die App mag.",
    good: "Browser oder PWA — Desktop, Tablet, Smartphone.",
  },
];

const features = [
  {
    title: "Live-Übersicht",
    body: "SoC, Reichweite, Schloss, Standort — sofort da. Kein Suchen.",
  },
  {
    title: "Laden unter Kontrolle",
    body: "Kurve, ETA, Wallbox vs. DC. Mit Pro: hartes 80%-Limit.",
  },
  {
    title: "Vorklima vor Abfahrt",
    body: "Heizen oder kühlen starten — Fortschritt sichtbar. Pro.",
  },
  {
    title: "Fernbedienung",
    body: "Entriegeln, Verriegeln, Finden, Hupe, Wecken. Wenn e-Remote freigeschaltet ist.",
  },
  {
    title: "Standort → Karte",
    body: "Letzte Position sehen und direkt in die Navigation springen.",
  },
  {
    title: "Dein Konto, dein Auto",
    body: "Jeder verbindet sein eigenes MyPeugeot — getrennt und sicher.",
  },
];

const steps = [
  {
    n: "1",
    title: "Kostenlos registrieren",
    body: "E-Mail + Passwort. Unter einer Minute.",
  },
  {
    n: "2",
    title: "MyPeugeot verbinden",
    body: "In den Einstellungen — Login wie in der Serien-App.",
  },
  {
    n: "3",
    title: "e-Remote freischalten",
    body: "SMS-Code + PIN einmalig. Dann steuerst du richtig.",
  },
  {
    n: "4",
    title: "Pro holen — oder Free ansehen",
    body: `Free zeigt alles. Pro steuert alles — ${formatEuroFromCents(PRO_MONTH_CENTS)}/Monat.`,
  },
];

export function LandingPage({
  publicSignup,
  denied,
  confirmError,
  deleted,
}: {
  publicSignup: boolean;
  denied?: boolean;
  confirmError?: boolean;
  deleted?: boolean;
}) {
  const proPrice = formatEuroFromCents(PRO_MONTH_CENTS);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 560px at 72% 8%, rgba(95,227,192,0.18), transparent 55%), radial-gradient(720px 420px at 12% 78%, rgba(63,140,170,0.2), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <a
          href="#start"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight sm:text-xl"
        >
          Peugeot Control
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[var(--fg-muted)] sm:flex">
          <a href="#vergleich" className="hover:text-[var(--fg)]">
            Warum besser
          </a>
          <a href="#features" className="hover:text-[var(--fg)]">
            Funktionen
          </a>
          <a href="#preise" className="hover:text-[var(--fg)]">
            Preise
          </a>
        </nav>
        <a
          href="#start"
          className="action-btn rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {publicSignup ? "Jetzt starten" : "Anmelden"}
        </a>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-14">
          <div className="order-2 animate-rise max-w-xl lg:order-1 lg:pt-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--accent-bright)] sm:text-3xl">
              Peugeot Control
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              Die Serien-App ist zu langsam.
              <br />
              <span className="text-[var(--accent-bright)]">
                Steuer dein Auto hier.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-[var(--fg-muted)] sm:text-lg">
              Laden, Vorklima, Schloss und Standort — klarer und schneller als
              MyPeugeot. Im Browser. Als PWA auf dem Handy.
            </p>
            <p className="mt-4 text-sm font-medium text-[var(--fg)]">
              Free zeigt alles. Pro steuert alles — {proPrice}/Monat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#start"
                className="action-btn animate-rise-delay-1 rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                  color: "#031016",
                }}
              >
                {publicSignup ? "Kostenlos Konto anlegen" : "Zur Anmeldung"}
              </a>
              <a
                href="#preise"
                className="action-btn animate-rise-delay-2 rounded-full border border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--fg)]"
              >
                Pro für {proPrice}
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--fg-muted)]">
              Getestet am E-3008 · Andere MyPeugeot-Modelle können funktionieren
            </p>
          </div>
          <div className="order-1 animate-rise-delay-1 lg:order-2">
            {deleted ? (
              <p
                role="status"
                className="mb-4 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--accent-bright)]"
              >
                Konto gelöscht. Du kannst dich jederzeit neu registrieren.
              </p>
            ) : null}
            <AuthForm
              publicSignup={publicSignup}
              denied={denied}
              confirmError={confirmError}
              defaultMode={publicSignup ? "register" : "login"}
            />
          </div>
        </section>

        <section className="border-t border-[var(--line)] bg-black/10 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              So sieht Steuerung aus
            </p>
            <h2 className="mt-2 text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
              Weniger Tippen. Mehr Auto.
            </h2>
            <div className="mt-10">
              <LandingScreens />
            </div>
          </div>
        </section>

        <section
          id="vergleich"
          className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Der Unterschied
            </p>
            <h2 className="mt-2 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              MyPeugeot nervt. Das hier nicht.
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
              Gleiches Fahrzeugkonto — andere Oberfläche. Gebaut für den Moment,
              in dem du wirklich was steuern willst.
            </p>
            <ul className="mt-10 space-y-6">
              {pains.map((row) => (
                <li
                  key={row.bad}
                  className="grid gap-2 border-b border-[var(--line)] pb-6 last:border-0 last:pb-0 sm:grid-cols-2 sm:gap-8"
                >
                  <p className="text-sm text-[var(--fg-muted)] line-through decoration-[var(--danger)]/50">
                    {row.bad}
                  </p>
                  <p className="text-sm font-semibold text-[var(--accent-bright)]">
                    {row.good}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-20 border-t border-[var(--line)] bg-black/15 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Funktionen
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              Alles, was du am Auto brauchst
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
              Übersicht, Klima, Laden, Steuern — ohne Umwege.
            </p>
            <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.title}>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <PricingSection />

        <section className="border-t border-[var(--line)] bg-black/15 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Einrichtung
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              In Minuten startklar
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n}>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--accent-bright)]">
                    {s.n}
                  </span>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 border-t border-[var(--line)] pt-8 text-sm text-[var(--fg-muted)]">
              <p className="font-semibold text-[var(--fg)]">Voraussetzungen</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Peugeot mit MyPeugeot-Konto</li>
                <li>Aktuell getestet: E-3008</li>
                <li>e-Remote / Connect für Vorklima und Fernbedienung</li>
                <li>Connect PLUS optional für Schloss-Status und Hupe</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(600px 280px at 50% 50%, rgba(95,227,192,0.16), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--accent-bright)] sm:text-2xl">
              Peugeot Control
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-5xl">
              Hör auf, die Serien-App zu ertragen.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[var(--fg-muted)]">
              {publicSignup
                ? `Konto anlegen, MyPeugeot verbinden, Pro für ${proPrice}/Monat — und steuern statt warten.`
                : "Privater Zugang — nur freigeschaltete Konten."}
            </p>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-full px-8 py-3.5 text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                color: "#031016",
              }}
            >
              {publicSignup ? "Jetzt kostenlos starten" : "Zur Anmeldung"}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

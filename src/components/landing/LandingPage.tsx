import { AuthForm } from "@/components/AuthForm";
import { LandingScreens } from "@/components/landing/LandingScreens";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/SiteFooter";

const steps = [
  {
    n: "01",
    title: "Konto anlegen",
    body: "E-Mail und Passwort, kostenlos, in unter einer Minute.",
  },
  {
    n: "02",
    title: "MyPeugeot verbinden",
    body: "In den Einstellungen mit E-Mail/Passwort oder OAuth.",
  },
  {
    n: "03",
    title: "Fernbedienung freischalten",
    body: "SMS-Code und 4-stellige PIN einmalig hinterlegen.",
  },
  {
    n: "04",
    title: "Loslegen",
    body: "Übersicht, Laden, Klima und Steuern auf Handy oder Desktop.",
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
  return (
    <div className="relative overflow-x-hidden">
      <div className="landing-atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <a
          href="#"
          className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight sm:text-lg"
        >
          Peugeot Control
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[var(--fg-muted)] sm:flex">
          <a href="#app" className="hover:text-[var(--fg)]">
            App
          </a>
          <a href="#preise" className="hover:text-[var(--fg)]">
            Preise
          </a>
          <a href="#start" className="hover:text-[var(--fg)]">
            Anmelden
          </a>
        </nav>
        <a
          href="#start"
          className="action-btn rounded-xl bg-[var(--accent-bright)] px-4 py-2 text-sm font-semibold text-[#031016]"
        >
          Anmelden
        </a>
      </header>

      <main className="relative z-10">
        {/* Hero: one composition — brand, headline, line, CTAs, product */}
        <section className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl items-center gap-10 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-16 lg:pt-2">
          <div className="order-2 max-w-xl lg:order-1">
            <h1 className="landing-hero-brand font-[family-name:var(--font-display)] text-[clamp(2.75rem,8vw,5.25rem)] font-extrabold leading-[0.92] tracking-tight">
              Peugeot
              <br />
              Control
            </h1>
            <p className="landing-hero-line mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--accent-bright)] sm:text-3xl">
              Klar gesteuert.
            </p>
            <p className="landing-hero-copy mt-4 max-w-md text-base text-[var(--fg-muted)] sm:text-lg">
              Laden, Vorklima und Fernbedienung im Browser. Schneller als die
              Serien-App, getestet am E-3008.
            </p>
            <div className="landing-hero-cta mt-8 flex flex-wrap gap-3">
              <a
                href="#start"
                className="action-btn rounded-xl bg-[var(--accent-bright)] px-6 py-3 text-sm font-semibold text-[#031016]"
              >
                {publicSignup ? "Kostenlos starten" : "Anmelden"}
              </a>
              <a
                href="#app"
                className="action-btn rounded-xl border border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--fg)]"
              >
                App ansehen
              </a>
            </div>
          </div>

          <div className="landing-hero-visual order-1 lg:order-2 lg:sticky lg:top-24">
            <LandingScreens compact autoCycle />
          </div>
        </section>

        <section
          id="app"
          className="scroll-mt-20 border-t border-[var(--line)] bg-black/15 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <LandingScreens autoCycle={false} />
          </div>
        </section>

        <section className="border-t border-[var(--line)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              Weniger Tippen bis zur Aktion
            </h2>
            <p className="mt-4 max-w-xl text-[var(--fg-muted)]">
              Große Steuerelemente, klare Status-Texte und ein ruhiges Layout für
              die Ladesäule nachts.
            </p>
            <dl className="mt-12 grid gap-10 sm:grid-cols-3">
              <div>
                <dt className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Schneller als die Serien-App
                </dt>
                <dd className="mt-2 text-sm text-[var(--fg-muted)]">
                  Direkte Wege zu Laden, Klima und Fernbedienung, als PWA auf dem
                  Homescreen.
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Eigenes MyPeugeot-Konto
                </dt>
                <dd className="mt-2 text-sm text-[var(--fg-muted)]">
                  Jeder Nutzer verbindet nur sein Fahrzeug. Getrennt und
                  serverseitig abgesichert.
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  Live am Fahrzeug
                </dt>
                <dd className="mt-2 text-sm text-[var(--fg-muted)]">
                  Batterie, Standort und Ladekurve aktualisieren sich, während die
                  Übersicht offen ist.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <PricingSection />

        <section className="border-t border-[var(--line)] bg-black/15 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
              In vier Schritten startklar
            </h2>
            <ol className="mt-10 space-y-6">
              {steps.map((s) => (
                <li
                  key={s.n}
                  className="grid gap-2 border-t border-[var(--line)] pt-6 sm:grid-cols-[4rem_1fr] sm:gap-6"
                >
                  <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-[var(--accent-bright)]">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[var(--fg)]">{s.title}</h3>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 text-sm text-[var(--fg-muted)]">
              Voraussetzung: Peugeot mit MyPeugeot. Aktuell getestet am E-3008.
              e-Remote / Connect für Vorklima und Fernbedienung.
            </p>
          </div>
        </section>

        <section
          id="start"
          className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_26rem] lg:items-start">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
                {publicSignup ? "Konto anlegen oder anmelden" : "Anmelden"}
              </h2>
              <p className="mt-3 max-w-md text-[var(--fg-muted)]">
                {publicSignup
                  ? "Kostenlos starten, MyPeugeot verbinden. Jedes Konto steuert nur das eigene Fahrzeug."
                  : "Privater Zugang für freigeschaltete E-Mail-Adressen."}
              </p>
            </div>
            <div>
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
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

import { AuthForm } from "@/components/AuthForm";
import { LandingScreens } from "@/components/landing/LandingScreens";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/SiteFooter";

const features = [
  {
    title: "Übersicht auf einen Blick",
    body: "Ladezustand, Reichweite, Verriegelung und Standort — live und ohne Menü-Wirrwarr.",
  },
  {
    title: "Laden im Blick",
    body: "SoC, Wallbox vs. Schnellladen, Ladekurve und ETA ansehen. 80%-Limit mit Pro.",
  },
  {
    title: "Vorklima per Tipp",
    body: "Vor Abfahrt heizen oder kühlen — mit Pro, inkl. Fortschrittsanzeige.",
  },
  {
    title: "Fernbedienung",
    body: "Entriegeln, Verriegeln, Finden, Hupe und Wecken — mit Pro, wenn e-Remote freigeschaltet ist.",
  },
  {
    title: "Standort & Navigation",
    body: "Sieh, wo dein Peugeot zuletzt gemeldet wurde, und spring direkt in die Karten-App.",
  },
  {
    title: "Dein MyPeugeot-Konto",
    body: "Jeder Nutzer verbindet sein eigenes Peugeot-Konto in den Einstellungen — getrennt und sicher.",
  },
];

const benefits = [
  {
    title: "Schneller als die Serien-App",
    body: "Weniger Klicks bis zu Laden, Klima und Fernbedienung — optimiert für den Browser und als PWA.",
  },
  {
    title: "Klare Oberfläche",
    body: "Große Aktionen, verständliche Status-Texte und ein ruhiges Dark-Design — auch nachts am Ladekabel.",
  },
  {
    title: "Offen für alle Peugeot-Fahrer",
    body: "Registrieren, MyPeugeot verbinden, Fernbedienung freischalten — kein Einladungscode nötig.",
  },
];

const steps = [
  {
    n: "1",
    title: "Konto anlegen",
    body: "E-Mail und Passwort — kostenlos und in unter einer Minute.",
  },
  {
    n: "2",
    title: "MyPeugeot verbinden",
    body: "In den Einstellungen mit E-Mail/Passwort oder OAuth — wie in der offiziellen App.",
  },
  {
    n: "3",
    title: "Fernbedienung freischalten",
    body: "SMS-Code und 4-stellige PIN einmalig hinterlegen (e-Remote / Connect).",
  },
  {
    n: "4",
    title: "Loslegen",
    body: "Übersicht, Laden, Klima und Steuern — auf dem Handy oder Desktop.",
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
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 70% 10%, rgba(95,227,192,0.14), transparent 55%), radial-gradient(700px 400px at 15% 80%, rgba(63,140,170,0.18), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <a href="#" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          Peugeot Control
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[var(--fg-muted)] sm:flex">
          <a href="#features" className="hover:text-[var(--fg)]">
            Funktionen
          </a>
          <a href="#vorteile" className="hover:text-[var(--fg)]">
            Vorteile
          </a>
          <a href="#preise" className="hover:text-[var(--fg)]">
            Preise
          </a>
          <a href="#start" className="hover:text-[var(--fg)]">
            Starten
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
          {publicSignup ? "Registrieren" : "Anmelden"}
        </a>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="animate-rise max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-bright)]">
              Peugeot Control
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Dein Peugeot.
              <br />
              <span className="text-[var(--accent-bright)]">Klar gesteuert.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-[var(--fg-muted)] sm:text-lg">
              Laden, Vorklima und Fernbedienung im Browser — übersichtlicher und
              schneller als die Serien-App. Registriere dich, verbinde dein
              MyPeugeot-Konto und steuere dein Auto.
            </p>
            <p className="mt-4 text-sm text-[var(--fg-muted)]">
              Aktuell getestet: <span className="text-[var(--fg)]">E-3008</span>.
              Andere Modelle mit MyPeugeot können funktionieren.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#start"
                className="action-btn rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                  color: "#031016",
                }}
              >
                {publicSignup ? "Kostenlos starten" : "Zur Anmeldung"}
              </a>
              <a
                href="#features"
                className="action-btn rounded-full border border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--fg)]"
              >
                Was die App kann
              </a>
            </div>
          </div>
          <div className="animate-rise-delay-1">
            <LandingScreens />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-[var(--line)] bg-black/15 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Funktionen
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              Alles Wichtige in vier Tabs
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
              Übersicht, Klima, Laden und Steuern — so wie in der App, die du nach
              dem Login siehst.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="ui-surface rounded-2xl p-5 transition hover:border-[var(--accent-bright)]/25"
                >
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="vorteile" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Vorteile
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              Warum Peugeot Control?
            </h2>
            <ul className="mt-10 grid gap-6 lg:grid-cols-3">
              {benefits.map((b) => (
                <li key={b.title} className="panel rounded-2xl p-6">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{b.body}</p>
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
              In vier Schritten startklar
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="ui-surface rounded-2xl p-5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-bright)]/15 text-sm font-bold text-[var(--accent-bright)]">
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-[var(--fg-muted)]">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 rounded-2xl border border-[var(--line)] bg-black/20 p-5 text-sm text-[var(--fg-muted)]">
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

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
                {publicSignup ? "Registrierung" : "Zugang"}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
                {publicSignup
                  ? "Jetzt Konto anlegen"
                  : "Anmelden"}
              </h2>
              <p className="mt-3 max-w-md text-[var(--fg-muted)]">
                {publicSignup
                  ? "Erstelle dein Konto, melde dich an und verbinde in den Einstellungen dein MyPeugeot-Login. Jedes Konto verwaltet nur sein eigenes Fahrzeug."
                  : "Privater Zugang — nur freigeschaltete E-Mail-Adressen."}
              </p>
            </div>
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

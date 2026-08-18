import {
  FOUNDER_CAP,
  FOUNDER_CENTS,
  PRO_YEAR_CENTS,
  formatEuroFromCents,
} from "@/lib/billing/catalog";

const freeItems = [
  "Konto & MyPeugeot verbinden",
  "Live-Status: SoC, Reichweite, Standort",
  "Ladekurve ansehen",
  "Vorklima, Finden, Schloss (e-Remote)",
];

const proItems = [
  "Alles aus Free",
  "80%-Ladelimit, das wirklich stoppt",
  "Priorität für neue Steuerungs-Features",
];

export function PricingSection({
  founderTaken,
}: {
  founderTaken: number;
}) {
  const remaining = Math.max(0, FOUNDER_CAP - founderTaken);
  const founderOpen = remaining > 0;

  return (
    <section
      id="preise"
      className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          Preise
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
          Free zum Ankommen. Pro fürs Limit.
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          Status und Fernbedienung bleiben frei. Das 80%-Limit — der Grund, warum
          viele wechseln — ist Pro.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="ui-surface rounded-2xl p-6">
            <p className="text-sm font-semibold text-[var(--fg-muted)]">Free</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              0 €
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">Für immer</p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg-muted)]">
              {freeItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold"
            >
              Kostenlos starten
            </a>
          </article>

          <article className="panel rounded-2xl p-6 ring-1 ring-[var(--accent-bright)]/35">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--accent-bright)]">
                Pro · Founder
              </p>
              {founderOpen ? (
                <span className="rounded-full bg-[var(--accent-bright)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-bright)]">
                  Noch {remaining} von {FOUNDER_CAP}
                </span>
              ) : (
                <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--fg-muted)]">
                  Founder voll
                </span>
              )}
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatEuroFromCents(founderOpen ? FOUNDER_CENTS : PRO_YEAR_CENTS)}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {founderOpen
                ? `fürs erste Jahr, danach ${formatEuroFromCents(PRO_YEAR_CENTS)} / Jahr`
                : "pro Jahr"}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg)]">
              {proItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn btn-primary mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {founderOpen ? "Founder sichern" : "Pro holen"}
            </a>
            <p className="mt-3 text-xs text-[var(--fg-muted)]">
              Nach der Anmeldung unter Einstellungen mit Karte zahlen — auch als
              Testkauf.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

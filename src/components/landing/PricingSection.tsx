import {
  PRO_YEAR_CENTS,
  formatEuroFromCents,
} from "@/lib/billing/catalog";

const freeItems = [
  "Konto anlegen und MyPeugeot verbinden",
  "Live-Status: Batterie, Reichweite, Ladezustand",
  "Standort ansehen",
  "Ladekurve ansehen",
];

const proItems = [
  "Alles aus Free",
  "Vorklima starten und stoppen",
  "Entriegeln, Verriegeln, Finden, Hupe",
  "80%-Ladelimit, das wirklich stoppt",
];

export function PricingSection() {
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
          Kostenlos zuschauen. Mit Pro steuern.
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
          Free zeigt den Stand deines Peugeots. Befehle ans Auto — Vorklima,
          Schloss, 80%-Limit — sind Pro.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="ui-surface rounded-2xl p-6">
            <p className="text-sm font-semibold text-[var(--fg-muted)]">Free</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              0 €
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">Nur ansehen</p>
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
            <p className="text-sm font-semibold text-[var(--accent-bright)]">
              Pro
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatEuroFromCents(PRO_YEAR_CENTS)}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">pro Jahr</p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg)]">
              {proItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn btn-primary mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Pro holen
            </a>
            <p className="mt-3 text-xs text-[var(--fg-muted)]">
              Nach der Anmeldung unter Einstellungen freischalten.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

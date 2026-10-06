import { PRO_MONTH_CENTS, formatEuroFromCents } from "@/lib/billing/catalog";

const freeItems = [
  "Live-Status: Batterie, Reichweite, Ladezustand",
  "Standort ansehen",
  "Ladekurve ansehen",
];

const proItems = [
  "Alles aus Free",
  "Vorklima starten und stoppen",
  "Entriegeln, Verriegeln, Finden, Hupe",
  "80%-Ladelimit",
];

export function PricingSection() {
  const proPrice = formatEuroFromCents(PRO_MONTH_CENTS);

  return (
    <section
      id="preise"
      className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          Preise
        </p>
        <p className="mt-3 max-w-xl text-lg text-[var(--fg)] sm:text-xl">
          Free zum Zuschauen. Pro zum Steuern — {proPrice} im Monat, inkl. MwSt.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="ui-surface rounded-2xl p-6">
            <p className="text-sm font-semibold text-[var(--fg-muted)]">Free</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              0 €
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Status ansehen. Keine Fernbedienung.
            </p>
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

          <article className="panel relative rounded-2xl p-6 ring-1 ring-[var(--accent-bright)]/45">
            <p className="absolute right-5 top-5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-bright)]">
              Empfohlen
            </p>
            <p className="text-sm font-semibold text-[var(--accent-bright)]">
              Pro
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {proPrice}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              / Monat · inkl. MwSt. · jederzeit kündbar
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
              Pro holen — {proPrice}/Monat
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

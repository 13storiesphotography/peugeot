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
  return (
    <section
      id="preise"
      className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Preise
        </h2>
        <p className="mt-3 max-w-xl text-[var(--fg-muted)]">
          Status gratis. Fernbedienung und Vorklima mit Pro.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <article>
            <p className="text-sm font-semibold text-[var(--fg-muted)]">Free</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              0 €
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg-muted)]">
              {freeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-xl border border-[var(--line)] px-5 py-2.5 text-sm font-semibold"
            >
              Kostenlos starten
            </a>
          </article>

          <article className="lg:border-l lg:border-[var(--line)] lg:pl-8">
            <p className="text-sm font-semibold text-[var(--accent-bright)]">Pro</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatEuroFromCents(PRO_MONTH_CENTS)}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              / Monat inkl. MwSt.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg)]">
              {proItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-xl bg-[var(--accent-bright)] px-5 py-2.5 text-sm font-semibold text-[#031016]"
            >
              Pro holen
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

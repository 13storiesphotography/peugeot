import {
  PRO_MONTH_CENTS,
  PRO_YEAR_CENTS,
  PRO_YEAR_IF_MONTHLY_CENTS,
  formatEuroFromCents,
  yearlySavingsCents,
} from "@/lib/billing/catalog";
import { getTranslator } from "@/i18n/server";

export async function PricingSection() {
  const { t } = await getTranslator();
  const yearPerMonth = Math.round(PRO_YEAR_CENTS / 12);
  const freeItems = [
    t("pricing.free1"),
    t("pricing.free2"),
    t("pricing.free3"),
    t("pricing.free4"),
  ];
  const proItems = [
    t("pricing.pro1"),
    t("pricing.pro2"),
    t("pricing.pro3"),
    t("pricing.pro4"),
  ];

  return (
    <section
      id="preise"
      className="scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          {t("pricing.kicker")}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
          {t("pricing.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">{t("pricing.lead")}</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="ui-surface rounded-2xl p-6">
            <p className="text-sm font-semibold text-[var(--fg-muted)]">
              {t("pricing.free")}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              0 €
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("pricing.viewOnly")}</p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--fg-muted)]">
              {freeItems.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold"
            >
              {t("pricing.startFree")}
            </a>
          </article>

          <article className="panel rounded-2xl p-6 ring-1 ring-[var(--accent-bright)]/35">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--accent-bright)]">
                {t("pricing.pro")}
              </p>
              <span className="rounded-full bg-[var(--accent-bright)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-bright)]">
                {t("pricing.saveYear", {
                  amount: formatEuroFromCents(yearlySavingsCents()),
                })}
              </span>
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatEuroFromCents(PRO_YEAR_CENTS)}
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              {t("pricing.perYear", { amount: formatEuroFromCents(yearPerMonth) })}
            </p>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {t("pricing.monthlyWould", {
                month: formatEuroFromCents(PRO_MONTH_CENTS),
                year: formatEuroFromCents(PRO_YEAR_IF_MONTHLY_CENTS),
              })}
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
              {t("pricing.getPro")}
            </a>
            <p className="mt-3 text-xs text-[var(--fg-muted)]">{t("pricing.afterSignIn")}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

import { AuthForm } from "@/components/AuthForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { LandingScreens } from "@/components/landing/LandingScreens";
import { PricingSection } from "@/components/landing/PricingSection";
import { SiteFooter } from "@/components/SiteFooter";
import { getTranslator } from "@/i18n/server";

export async function LandingPage({
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
  const { t } = await getTranslator();
  const features = [
    { title: t("landing.f1t"), body: t("landing.f1b") },
    { title: t("landing.f2t"), body: t("landing.f2b") },
    { title: t("landing.f3t"), body: t("landing.f3b") },
    { title: t("landing.f4t"), body: t("landing.f4b") },
    { title: t("landing.f5t"), body: t("landing.f5b") },
    { title: t("landing.f6t"), body: t("landing.f6b") },
  ];
  const benefits = [
    { title: t("landing.b1t"), body: t("landing.b1b") },
    { title: t("landing.b2t"), body: t("landing.b2b") },
    { title: t("landing.b3t"), body: t("landing.b3b") },
  ];
  const steps = [
    { n: "1", title: t("landing.s1t"), body: t("landing.s1b") },
    { n: "2", title: t("landing.s2t"), body: t("landing.s2b") },
    { n: "3", title: t("landing.s3t"), body: t("landing.s3b") },
    { n: "4", title: t("landing.s4t"), body: t("landing.s4b") },
  ];

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 70% 10%, rgba(95,227,192,0.14), transparent 55%), radial-gradient(700px 400px at 15% 80%, rgba(63,140,170,0.18), transparent 50%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <a href="#" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          {t("landing.brand")}
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[var(--fg-muted)] sm:flex">
          <a href="#features" className="hover:text-[var(--fg)]">
            {t("landing.navFeatures")}
          </a>
          <a href="#vorteile" className="hover:text-[var(--fg)]">
            {t("landing.navBenefits")}
          </a>
          <a href="#preise" className="hover:text-[var(--fg)]">
            {t("landing.navPricing")}
          </a>
          <a href="#start" className="hover:text-[var(--fg)]">
            {t("landing.navSignIn")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <a
            href="#start"
            className="action-btn rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
              color: "#031016",
            }}
          >
            {t("landing.navSignIn")}
          </a>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-14">
          <div className="order-2 animate-rise max-w-xl lg:order-1 lg:pt-4">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-bright)]">
              {t("landing.heroKicker")}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle1")}
              <br />
              <span className="text-[var(--accent-bright)]">{t("landing.heroTitle2")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-[var(--fg-muted)] sm:text-lg">
              {t("landing.heroBody")}
            </p>
            <p className="mt-4 text-sm text-[var(--fg-muted)]">
              {t("landing.tested")}{" "}
              <span className="text-[var(--fg)]">E-3008</span>.{" "}
              {t("landing.modelsNote")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#features"
                className="action-btn rounded-full border border-[var(--line)] px-6 py-3 text-sm font-semibold text-[var(--fg)]"
              >
                {t("landing.whatItDoes")}
              </a>
            </div>
          </div>
          <div className="order-1 animate-rise-delay-1 lg:order-2">
            {deleted ? (
              <p
                role="status"
                className="mb-4 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--accent-bright)]"
              >
                {t("landing.deleted")}
              </p>
            ) : null}
            <AuthForm
              publicSignup={publicSignup}
              denied={denied}
              confirmError={confirmError}
            />
          </div>
        </section>

        <section className="border-t border-[var(--line)] bg-black/10 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <LandingScreens />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-[var(--line)] bg-black/15 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              {t("landing.featuresKicker")}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {t("landing.featuresTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--fg-muted)]">
              {t("landing.featuresLead")}
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
              {t("landing.benefitsKicker")}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {t("landing.benefitsTitle")}
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
              {t("landing.setupKicker")}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {t("landing.setupTitle")}
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
              <p className="font-semibold text-[var(--fg)]">{t("landing.reqTitle")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{t("landing.req1")}</li>
                <li>{t("landing.req2")}</li>
                <li>{t("landing.req3")}</li>
                <li>{t("landing.req4")}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              {t("landing.ctaKicker")}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {publicSignup ? t("landing.ctaTitle") : t("auth.signIn")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[var(--fg-muted)]">
              {publicSignup ? t("landing.ctaBody") : t("landing.ctaPrivate")}
            </p>
            <a
              href="#start"
              className="action-btn mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                color: "#031016",
              }}
            >
              {t("landing.ctaButton")}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

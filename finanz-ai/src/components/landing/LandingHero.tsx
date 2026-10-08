import Link from "next/link";
import { startDemoSession } from "@/app/actions/demo-auth";

export function LandingHero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=2400&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#10253a]/92 via-[#10253a]/78 to-[#0f7b6c]/55"
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-6 pb-10 pt-8">
        <header className="animate-rise flex items-center justify-between">
          <p className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            Kontura
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-white/85 transition hover:text-white"
          >
            Anmelden
          </Link>
        </header>

        <div className="mt-auto max-w-2xl pb-8 pt-24 md:pb-16">
          <h1 className="animate-rise-delay-1 font-display text-5xl font-extrabold leading-[0.95] text-white md:text-7xl">
            Finanzen im Klarblick.
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-lg text-lg text-white/85 md:text-xl">
            Konten, Budgets und eine AI, die ehrlich sagt, ob der Schrank diesen
            Monat drin ist.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
            <form action={startDemoSession}>
              <button
                type="submit"
                className="rounded-md bg-teal px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(15,123,108,0.35)] transition hover:bg-teal-deep"
              >
                Demo starten
              </button>
            </form>
            <Link
              href="#sicherheit"
              className="rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              So bleibt es sicher
            </Link>
          </div>
        </div>

        <svg
          aria-hidden
          className="pointer-events-none absolute bottom-24 right-6 hidden h-40 w-64 text-teal md:block"
          viewBox="0 0 260 140"
          fill="none"
        >
          <path
            className="hero-line"
            d="M10 110 C60 110, 70 40, 120 40 S180 100, 250 30"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  );
}

import { LoginForm } from "@/components/LoginForm";

export default function HomePage() {
  return (
    <main className="relative min-h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 70% 10%, rgba(95,227,192,0.14), transparent 55%), radial-gradient(700px 400px at 15% 80%, rgba(63,140,170,0.18), transparent 50%)",
        }}
      />
      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:gap-16">
        <section className="animate-rise max-w-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent-bright)]">
            Peugeot
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight sm:text-6xl">
            E-3008 Control
          </h1>
          <p className="mt-4 max-w-md text-base text-[var(--fg-muted)] sm:text-lg">
            Melde dich im Browser an und steuere Laden, Klima und Fernbedienung —
            klarer und schneller als die Serien-App.
          </p>
        </section>

        <section className="animate-rise-delay-1 w-full max-w-md">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

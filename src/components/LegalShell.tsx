import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

export function LegalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        >
          Peugeot Control
        </Link>
        <Link
          href="/"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Zur Startseite
        </Link>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
          Rechtliches
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">{description}</p>
        <div className="mt-10 space-y-4">{children}</div>
      </article>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--fg)] [&_a]:underline [&_a]:decoration-[var(--line)] [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-[var(--fg)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

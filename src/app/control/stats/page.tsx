import Link from "next/link";
import { redirect } from "next/navigation";
import { StatsDashboard } from "@/components/StatsDashboard";
import { isAdminEmail } from "@/lib/auth/admin";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { getTrafficStats } from "@/lib/traffic/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const session = await assertOwnerSession();
  if (!session || !isAdminEmail(session.email)) {
    redirect("/control");
  }

  const stats = await getTrafficStats();

  return (
    <main className="min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <header className="animate-rise flex items-center gap-3">
          <Link
            href="/control/settings"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)]"
            aria-label="Zurück zu Einstellungen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
              Peugeot Control
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Stats
            </h1>
          </div>
        </header>

        <div className="animate-rise-delay-1 mt-6">
          <StatsDashboard initial={stats} />
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-[var(--fg-muted)]">
          Eigenes Tracking (anonym). Zusätzlich: Vercel → Project → Analytics
          aktivieren für das offizielle Traffic-Dashboard.
        </p>
      </div>
    </main>
  );
}

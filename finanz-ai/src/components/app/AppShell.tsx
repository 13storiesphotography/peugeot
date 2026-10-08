import Link from "next/link";
import { endDemoSession } from "@/app/actions/demo-auth";

const NAV = [
  { href: "/dashboard", label: "Überblick" },
  { href: "/transactions", label: "Umsätze" },
  { href: "/chat", label: "AI" },
  { href: "/goals", label: "Ziele" },
  { href: "/connect", label: "Bank" },
];

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-4 pb-24 pt-6 md:px-6 md:pb-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-lg font-bold text-teal">Kontura</p>
          <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
            {title}
          </h1>
        </div>
        <form action={endDemoSession}>
          <button
            type="submit"
            className="text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            Abmelden
          </button>
        </form>
      </header>

      <div className="mt-8 flex-1">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[#10253a]/10 bg-[#f3f7fa]/92 backdrop-blur md:static md:mt-10 md:border-0 md:bg-transparent md:backdrop-blur-none">
        <ul className="mx-auto flex max-w-6xl items-center justify-around gap-0.5 overflow-x-auto px-1 py-3 md:justify-start md:gap-5 md:px-0">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-md px-2.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-mist hover:text-ink md:px-3"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

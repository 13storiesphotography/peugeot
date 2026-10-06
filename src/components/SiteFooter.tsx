import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--line)] py-8 text-center text-xs text-[var(--fg-muted)]">
      <p>Peugeot Control — inoffizielle Steuerungs-App für Peugeot mit MyPeugeot.</p>
      <p className="mx-auto mt-2 max-w-xl px-4">
        Nicht von Stellantis / Peugeot. Nutzung auf eigenes Risiko. Aktuell
        getestet am E-3008. Fernbedienung erfordert gültiges Peugeot-Abo.
      </p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link
          href="/faq"
          className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
        >
          FAQ
        </Link>
        <Link
          href="/impressum"
          className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
        >
          Impressum
        </Link>
        <Link
          href="/datenschutz"
          className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
        >
          Datenschutz
        </Link>
        <Link
          href="/agb"
          className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
        >
          AGB
        </Link>
        <Link
          href="/widerruf"
          className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
        >
          Widerruf
        </Link>
      </p>
    </footer>
  );
}

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--line)] py-8 text-center text-xs text-[var(--fg-muted)]">
      <p>Peugeot Control — inoffizielle Steuerungs-App für Peugeot mit MyPeugeot.</p>
      <p className="mx-auto mt-2 max-w-xl px-4">
        Nicht von Stellantis / Peugeot. Nutzung auf eigenes Risiko. Aktuell
        getestet am E-3008. Fernbedienung erfordert gültiges Peugeot-Abo.
      </p>
      <p className="mt-3">
        <Link href="/impressum" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
          Impressum
        </Link>
      </p>
    </footer>
  );
}

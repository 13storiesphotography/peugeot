import Link from "next/link";
import { startDemoSession } from "@/app/actions/demo-auth";

export const metadata = {
  title: "Anmelden",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-display text-2xl font-bold text-ink">
        Kontura
      </Link>
      <h1 className="mt-8 font-display text-4xl font-bold text-ink">
        Willkommen zurück
      </h1>
      <p className="mt-3 text-ink-soft">
        Supabase-Login kommt mit dem eigenen Projekt. Fürs Erste reicht die
        sichere Demo-Session mit Sparkasse-ähnlichen Beispieldaten.
      </p>
      <form action={startDemoSession} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-md bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep"
        >
          Demo-Konto öffnen
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Später: E-Mail-Magic-Link + MFA über Supabase Auth.
      </p>
    </main>
  );
}

import { signOut } from "@/app/actions/auth";

/** Escape hatch when the user realizes they signed in as the wrong account. */
export function MfaSwitchAccount({ email }: { email: string | null | undefined }) {
  return (
    <div className="mt-8 space-y-2 text-center">
      {email ? (
        <p className="truncate text-sm text-[var(--fg-muted)]">
          Angemeldet als <span className="text-[var(--fg)]">{email}</span>
        </p>
      ) : null}
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm font-semibold text-[var(--fg-muted)] underline-offset-4 hover:text-[var(--fg)] hover:underline"
        >
          Falscher Benutzer? Abmelden und neu anmelden
        </button>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { deleteOwnAccount, type AccountState } from "@/app/actions/account";

const initial: AccountState = {};

export function AccountDeleteCard() {
  const [state, action, pending] = useActionState(deleteOwnAccount, initial);

  return (
    <section className="ui-surface border border-[var(--danger)]/25 p-4 sm:p-5">
      <p className="eyebrow text-[var(--danger)]">Konto</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        Konto löschen
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Löscht Zugang, MyPeugeot-Verbindung und Fahrzeugdaten. Ein laufendes
        Pro-Abo wird sofort beendet, damit nichts weiter abgebucht wird.
      </p>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">Passwort</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 ui-field w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">
            Zur Bestätigung <span className="font-semibold">LÖSCHEN</span> tippen
          </span>
          <input
            name="confirm"
            type="text"
            autoComplete="off"
            required
            className="mt-1 ui-field w-full"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-btn w-full rounded-full border border-[var(--danger)]/50 px-5 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
        >
          {pending ? "Lösche Konto…" : "Konto unwiderruflich löschen"}
        </button>
      </form>
    </section>
  );
}

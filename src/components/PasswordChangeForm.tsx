"use client";

import { useActionState } from "react";
import {
  changeOwnPassword,
  type AccountState,
} from "@/app/actions/account";

const initial: AccountState = {};

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, initial);

  return (
    <section id="password" className="ui-surface scroll-mt-24 p-4 sm:p-5">
      <p className="eyebrow">Sicherheit</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
        Passwort ändern
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Mindestens 8 Zeichen. Danach bleibst du angemeldet.
      </p>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-3 text-sm text-[var(--accent-bright)]">
          {state.success}
        </p>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">Aktuelles Passwort</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 ui-field w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">Neues Passwort</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 ui-field w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--fg-muted)]">Neues Passwort wiederholen</span>
          <input
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 ui-field w-full"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="action-btn btn-primary w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Speichere…" : "Passwort speichern"}
        </button>
      </form>
    </section>
  );
}

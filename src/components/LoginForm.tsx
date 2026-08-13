"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <div className="panel w-full max-w-md rounded-[1.75rem] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        Anmelden
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        Privater Zugang — nur freigeschaltete Konten.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            E-Mail
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Passwort
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="action-btn w-full rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending ? "Bitte warten…" : "Zur Steuerung"}
        </button>
      </form>
    </div>
  );
}

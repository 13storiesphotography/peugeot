"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

const initial: AuthState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="panel w-full max-w-md rounded-[1.75rem] p-6 sm:p-8">
      <div className="mb-6 flex gap-2 rounded-full border border-[var(--line)] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="flex-1 rounded-full px-3 py-2 text-sm font-semibold transition"
          style={{
            background:
              mode === "signin" ? "rgba(95,227,192,0.16)" : "transparent",
            color: mode === "signin" ? "var(--accent-bright)" : "var(--fg-muted)",
          }}
        >
          Anmelden
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="flex-1 rounded-full px-3 py-2 text-sm font-semibold transition"
          style={{
            background:
              mode === "signup" ? "rgba(95,227,192,0.16)" : "transparent",
            color: mode === "signup" ? "var(--accent-bright)" : "var(--fg-muted)",
          }}
        >
          Konto anlegen
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            E-Mail
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="du@beispiel.de"
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
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Mindestens 8 Zeichen"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-[var(--accent-bright)]">
            {state.success}
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
          {pending
            ? "Bitte warten…"
            : mode === "signin"
              ? "Zur Steuerung"
              : "Konto erstellen"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--fg-muted)]">
        Persönlicher Web-Zugang für deinen E-3008 — nicht die MyPeugeot-App.
      </p>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  type AuthState,
} from "@/app/actions/auth";

const initial: AuthState = {};

type AuthMode = "login" | "register" | "forgot";

export function AuthForm({
  publicSignup,
  denied,
}: {
  publicSignup: boolean;
  denied?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>(
    publicSignup ? "register" : "login",
  );
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initial,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    signUp,
    initial,
  );
  const [forgotState, forgotAction, forgotPending] = useActionState(
    requestPasswordReset,
    initial,
  );

  const pending = loginPending || registerPending || forgotPending;
  const state =
    mode === "login"
      ? loginState
      : mode === "register"
        ? registerState
        : forgotState;
  const formAction =
    mode === "login"
      ? loginAction
      : mode === "register"
        ? registerAction
        : forgotAction;

  return (
    <div
      id="start"
      className="panel w-full max-w-md scroll-mt-24 rounded-[1.75rem] p-6 sm:p-8"
    >
      {mode !== "forgot" ? (
        <div className="flex gap-1 rounded-full border border-[var(--line)] bg-black/20 p-1">
          {publicSignup ? (
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[var(--accent-bright)] text-[#031016]"
                  : "text-[var(--fg-muted)]"
              }`}
            >
              Registrieren
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "text-[var(--fg-muted)]"
            }`}
          >
            Anmelden
          </button>
        </div>
      ) : null}

      <h2
        className={`${mode === "forgot" ? "mt-0" : "mt-6"} font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight`}
      >
        {mode === "register"
          ? "Konto anlegen"
          : mode === "forgot"
            ? "Passwort vergessen"
            : "Willkommen zurück"}
      </h2>
      <p className="mt-2 text-sm text-[var(--fg-muted)]">
        {mode === "register"
          ? "Eigener Zugang — danach MyPeugeot in den Einstellungen verbinden."
          : mode === "forgot"
            ? "Wir schicken dir einen Link zum Setzen eines neuen Passworts."
            : publicSignup
              ? "Melde dich an und steuere deinen Peugeot."
              : "Privater Zugang — nur freigeschaltete Konten."}
      </p>

      {denied ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          Zugang nicht freigeschaltet.{" "}
          {publicSignup
            ? "Bitte registrieren oder anmelden."
            : "Nur eingeladene Konten."}
        </p>
      ) : null}

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

        {mode !== "forgot" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Passwort
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
            />
          </label>
        ) : null}

        {mode === "login" ? (
          <p className="text-right text-sm">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-[var(--fg-muted)] underline-offset-2 hover:text-[var(--fg)] hover:underline"
            >
              Passwort vergessen?
            </button>
          </p>
        ) : null}

        {mode === "register" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Passwort wiederholen
            </span>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
            />
          </label>
        ) : null}

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
            : mode === "register"
              ? "Kostenlos starten"
              : mode === "forgot"
                ? "Link senden"
                : "Zur Steuerung"}
        </button>
      </form>

      {mode === "forgot" ? (
        <p className="mt-4 text-center text-sm text-[var(--fg-muted)]">
          <button
            type="button"
            onClick={() => setMode("login")}
            className="underline-offset-2 hover:text-[var(--fg)] hover:underline"
          >
            Zurück zur Anmeldung
          </button>
        </p>
      ) : null}
    </div>
  );
}

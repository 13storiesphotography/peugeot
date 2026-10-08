"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  type AuthState,
} from "@/app/actions/auth";

const initial: AuthState = {};

type AuthMode = "login" | "register" | "forgot";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function signalAbandoned(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!looksLikeEmail(normalized)) return;
  try {
    const key = `pc_signup_abandon_${normalized}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage may be blocked
  }

  const body = JSON.stringify({ type: "abandoned", email: normalized });
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/signup-signal", blob);
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/signup-signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // best-effort
  });
}

export function AuthForm({
  publicSignup,
  denied,
  confirmError,
}: {
  publicSignup: boolean;
  denied?: boolean;
  confirmError?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
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
  const [resendState, resendAction, resendPending] = useActionState(
    resendConfirmation,
    initial,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const registerSucceeded = useRef(false);

  useEffect(() => {
    if (registerState.success || registerState.needsConfirmation) {
      registerSucceeded.current = true;
    }
  }, [registerState.success, registerState.needsConfirmation]);

  useEffect(() => {
    if (!publicSignup || mode !== "register") return;

    const onLeave = () => {
      if (registerSucceeded.current) return;
      const email = emailRef.current?.value ?? "";
      if (!looksLikeEmail(email)) return;
      signalAbandoned(email);
    };

    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [mode, publicSignup]);

  const pending =
    loginPending || registerPending || forgotPending || resendPending;
  const offerResend =
    publicSignup &&
    (Boolean(confirmError) ||
      Boolean(registerState.needsConfirmation) ||
      Boolean(loginState.needsConfirmation) ||
      Boolean(resendState.needsConfirmation));
  const state =
    resendState.success || resendState.error
      ? resendState
      : mode === "login"
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
    <div className="panel mx-auto w-full max-w-md rounded-[1.75rem] p-6 sm:p-8 lg:mx-0">
      {mode !== "forgot" ? (
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "text-[var(--fg-muted)]"
            }`}
          >
            Anmelden
          </button>
          {publicSignup ? (
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[var(--accent-bright)] text-[#031016]"
                  : "text-[var(--fg-muted)]"
              }`}
            >
              Registrieren
            </button>
          ) : null}
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

      {confirmError ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          Bestätigungslink ungültig oder schon benutzt. Bei Outlook / Microsoft
          365 wird der Link oft vorab geprüft — dann einfach anmelden. Sonst
          unten Bestätigungsmail erneut senden.
        </p>
      ) : null}

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
            ref={emailRef}
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
          className="action-btn w-full rounded-xl px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending && !resendPending
            ? "Bitte warten…"
            : mode === "register"
              ? "Kostenlos starten"
              : mode === "forgot"
                ? "Link senden"
                : "Zur Steuerung"}
        </button>

        {offerResend && mode !== "forgot" ? (
          <button
            type="submit"
            formAction={resendAction}
            formNoValidate
            disabled={pending}
            className="w-full pt-1 text-center text-sm text-[var(--fg-muted)] underline-offset-4 hover:text-[var(--fg)] hover:underline disabled:opacity-60"
          >
            {resendPending
              ? "Sende Bestätigungsmail…"
              : "Bestätigungsmail erneut senden"}
          </button>
        ) : null}
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

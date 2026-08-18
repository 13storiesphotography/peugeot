"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  completePasswordReset,
  requestPasswordReset,
  type AuthState,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import {
  clearPasswordRecoveryInBrowser,
  markPasswordRecoveryInBrowser,
} from "@/lib/auth/recovery-cookie";
import { mapPasswordUpdateError } from "@/lib/auth/password-update-error";

const initial: AuthState = {};

export function ResetPasswordForm({
  invalidLink,
  tokenHash,
}: {
  invalidLink?: boolean;
  tokenHash?: string;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "request">(
    invalidLink ? "request" : tokenHash ? "ready" : "loading",
  );
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updatePending, setUpdatePending] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initial,
  );

  useEffect(() => {
    if (invalidLink || tokenHash) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const next = new URL("/auth/callback", window.location.origin);
      next.searchParams.set("code", code);
      next.searchParams.set("next", "/auth/reset");
      window.location.replace(next.toString());
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const ready = () => {
      if (cancelled) return;
      markPasswordRecoveryInBrowser();
      window.history.replaceState({}, "", "/auth/reset");
      setPhase("ready");
    };

    const fail = () => {
      if (cancelled) return;
      setPhase("request");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) ready();
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => (error ? fail() : ready()));
    } else {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) ready();
        else fail();
      });
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [invalidLink, tokenHash]);

  async function onSavePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updatePending) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (password.length < 8) {
      setUpdateError("Passwort mindestens 8 Zeichen.");
      return;
    }
    if (password !== passwordConfirm) {
      setUpdateError("Passwörter stimmen nicht überein.");
      return;
    }

    setUpdatePending(true);
    setUpdateError(null);

    try {
      const supabase = createClient();
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (verifyError) {
          setUpdateError(
            "Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern.",
          );
          setUpdatePending(false);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUpdateError(
          "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
        );
        setUpdatePending(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setUpdateError(mapPasswordUpdateError(error));
        setUpdatePending(false);
        return;
      }
    } catch {
      setUpdateError(
        "Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.",
      );
      setUpdatePending(false);
      return;
    }

    // Redirect throws; keep it outside the catch so Next can follow it.
    clearPasswordRecoveryInBrowser();
    await completePasswordReset();
  }

  if (phase === "loading") {
    return (
      <p className="text-sm text-[var(--fg-muted)]" role="status">
        Link wird geprüft…
      </p>
    );
  }

  if (phase === "request") {
    return (
      <form action={resetAction} className="space-y-4">
        <p className="text-sm text-[var(--fg-muted)]">
          {invalidLink
            ? "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an."
            : "Kein gültiger Reset-Link. Gib deine E-Mail ein — wir schicken einen neuen."}
        </p>
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
        {resetState.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {resetState.error}
          </p>
        ) : null}
        {resetState.success ? (
          <p role="status" className="text-sm text-[var(--accent-bright)]">
            {resetState.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={resetPending}
          className="action-btn w-full rounded-full px-5 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {resetPending ? "Bitte warten…" : "Link senden"}
        </button>
        <p className="text-center text-sm text-[var(--fg-muted)]">
          <Link href="/#start" className="underline-offset-2 hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onSavePassword} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Neues Passwort
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
        />
      </label>
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
      {updateError ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {updateError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={updatePending}
        className="action-btn w-full rounded-full px-5 py-3 text-sm font-semibold"
        style={{
          background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
          color: "#031016",
        }}
      >
        {updatePending ? "Bitte warten…" : "Passwort speichern"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { otpType } from "@/lib/auth/otp-type";
import { markPasswordRecoveryInBrowser } from "@/lib/auth/recovery-cookie";

const initial: AuthState = {};

export function ResetPasswordForm({
  invalidLink,
}: {
  invalidLink?: boolean;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "request">(
    invalidLink ? "request" : "loading",
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updatePassword,
    initial,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initial,
  );

  useEffect(() => {
    if (invalidLink) return;

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

    const tokenHash = url.searchParams.get("token_hash");
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (tokenHash) {
      void supabase.auth
        .verifyOtp({
          token_hash: tokenHash,
          type: otpType(url.searchParams.get("type")),
        })
        .then(({ error }) => (error ? fail() : ready()));
    } else if (accessToken && refreshToken) {
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
  }, [invalidLink]);

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
    <form action={updateAction} className="space-y-4">
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
      {updateState.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {updateState.error}
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

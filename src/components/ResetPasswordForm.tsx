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

function urlLooksLikeRecovery(): boolean {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (url.searchParams.get("type") === "recovery") return true;
  if (hash.get("type") === "recovery") return true;
  return (
    url.searchParams.has("code") ||
    url.searchParams.has("token_hash") ||
    hash.has("access_token")
  );
}

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

    const supabase = createClient();
    let done = false;
    const recovery = urlLooksLikeRecovery();

    const ready = (markRecovery: boolean) => {
      if (done) return;
      done = true;
      if (markRecovery) markPasswordRecoveryInBrowser();
      window.history.replaceState({}, "", "/auth/reset");
      setPhase("ready");
    };

    const fail = () => {
      if (done) return;
      done = true;
      setPhase("request");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        ready(true);
      }
    });

    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get("token_hash");
    const code = url.searchParams.get("code");
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (tokenHash) {
      void supabase.auth
        .verifyOtp({
          token_hash: tokenHash,
          type: otpType(url.searchParams.get("type")),
        })
        .then(({ error }) => (error ? fail() : ready(true)));
    } else if (code) {
      void supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => (error ? fail() : ready(true)));
    } else if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => (error ? fail() : ready(true)));
    } else {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) ready(false);
        else fail();
      });
    }

    const timeout = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) ready(recovery);
        else fail();
      });
    }, 4000);

    return () => {
      done = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
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

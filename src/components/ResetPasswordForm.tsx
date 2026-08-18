"use client";

import { useActionState, useEffect, useState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { markPasswordRecoveryInBrowser } from "@/lib/auth/recovery-cookie";
import { CancelRecoveryLink } from "@/components/CancelRecoveryLink";

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
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [totp, setTotp] = useState("");
  const [updateState, updateAction, updatePending] = useActionState(
    updatePassword,
    initial,
  );
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

    const ready = (token?: string) => {
      if (cancelled) return;
      if (token) setAccessToken(token);
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
      if (event === "PASSWORD_RECOVERY" && session) {
        ready(session.access_token);
      }
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccess = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (hashAccess && refreshToken) {
      void supabase.auth
        .setSession({ access_token: hashAccess, refresh_token: refreshToken })
        .then(({ error }) => (error ? fail() : ready(hashAccess)));
    } else {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) ready(data.session.access_token);
        else fail();
      });
    }

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [invalidLink, tokenHash]);

  const sessionAccess = updateState.recoveryAccessToken || accessToken;

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
          <CancelRecoveryLink className="font-medium text-[var(--fg)] underline-offset-2 hover:underline" />
        </p>
      </form>
    );
  }

  return (
    <form action={updateAction} className="space-y-4">
      {tokenHash ? (
        <>
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value="recovery" />
        </>
      ) : null}
      {sessionAccess ? (
        <input type="hidden" name="access_token" value={sessionAccess} />
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Neues Passwort
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
          className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
        />
      </label>
      {updateState.needsMfa ? (
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Authenticator-Code
          </span>
          <input
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            value={totp}
            onChange={(event) => setTotp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent-bright)]"
          />
        </label>
      ) : null}
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
      <p className="text-center text-sm text-[var(--fg-muted)]">
        <CancelRecoveryLink className="font-medium text-[var(--fg)] underline-offset-2 hover:underline" />
      </p>
    </form>
  );
}

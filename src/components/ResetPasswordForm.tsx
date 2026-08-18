"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { markPasswordRecoveryInBrowser } from "@/lib/auth/recovery-cookie";
import { useI18n } from "@/components/i18n/I18nProvider";

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
  const [updateState, updateAction, updatePending] = useActionState(
    updatePassword,
    initial,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initial,
  );
  const { t } = useI18n();

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

  if (phase === "loading") {
    return (
      <p className="text-sm text-[var(--fg-muted)]" role="status">
        {t("auth.checkingLink")}
      </p>
    );
  }

  if (phase === "request") {
    return (
      <form action={resetAction} className="space-y-4">
        <p className="text-sm text-[var(--fg-muted)]">
          {invalidLink
            ? t("auth.invalidOrExpired")
            : t("auth.noResetLink")}
        </p>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            {t("common.email")}
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
          {resetPending ? t("common.wait") : t("auth.sendLink")}
        </button>
        <p className="text-center text-sm text-[var(--fg-muted)]">
          <Link href="/#start" className="underline-offset-2 hover:underline">
            {t("common.backToSignIn")}
          </Link>
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
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          {t("auth.newPassword")}
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
          {t("common.passwordRepeat")}
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
        {updatePending ? t("common.wait") : t("auth.savePassword")}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function hasAuthPayload(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.has("code") || url.searchParams.has("token_hash")) {
    return true;
  }
  const hash = window.location.hash;
  return hash.includes("access_token") || hash.includes("refresh_token");
}

function otpType(raw: string | null): EmailOtpType {
  if (
    raw === "signup" ||
    raw === "invite" ||
    raw === "magiclink" ||
    raw === "recovery" ||
    raw === "email_change" ||
    raw === "email"
  ) {
    return raw;
  }
  return "email";
}

/** Completes email-confirm / magic-link sessions that arrive as ?code= or #access_token=. */
export function AuthUrlSession() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/auth/reset")) return;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (
      url.searchParams.get("type") === "recovery" ||
      hash.get("type") === "recovery"
    ) {
      return;
    }
    if (!hasAuthPayload()) return;
    setBusy(true);

    const supabase = createClient();
    const url = new URL(window.location.href);
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.location.replace(ok ? "/control" : "/?confirm=failed");
    };

    const tokenHash = url.searchParams.get("token_hash");
    if (tokenHash) {
      void supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: otpType(url.searchParams.get("type")) })
        .then(({ error }) => finish(!error));
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        finish(true);
      }
    });

    const code = url.searchParams.get("code");
    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session) finish(true);
      });
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (!error && data.session) finish(true);
        });
    }

    const timeout = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data }) => finish(Boolean(data.session)));
    }, 2500);

    return () => {
      done = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  if (!busy) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#071018]/92 px-6 text-center text-sm text-[var(--fg)]"
      role="status"
    >
      Konto wird bestätigt…
    </div>
  );
}

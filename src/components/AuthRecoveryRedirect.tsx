"use client";

import { useEffect } from "react";

/**
 * Recovery links often land on the Site URL (`/`) with `#…&type=recovery`.
 * Move them to `/auth/reset` before a signed-in session would skip the form.
 */
export function AuthRecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth/reset")) return;

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecovery =
      url.searchParams.get("type") === "recovery" ||
      hash.get("type") === "recovery";
    if (!isRecovery) return;

    window.location.replace(
      `/auth/reset${url.search}${window.location.hash}`,
    );
  }, []);

  return null;
}

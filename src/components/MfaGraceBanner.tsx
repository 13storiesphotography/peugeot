"use client";

import Link from "next/link";

export function MfaGraceBanner({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 0) return null;
  return (
    <div
      className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6"
      role="status"
    >
      <div
        className="rounded-2xl border px-4 py-3 text-sm"
        style={{
          borderColor: "rgba(232,184,109,0.45)",
          background: "rgba(232,184,109,0.1)",
        }}
      >
        <span className="text-[var(--warn)]">
          MFA noch nicht aktiv. Noch {daysLeft} Tag{daysLeft === 1 ? "" : "e"}{" "}
          Zeit — danach Pflicht.
        </span>{" "}
        <Link href="/mfa" className="font-semibold text-[var(--accent-bright)]">
          Jetzt einrichten →
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  COOKIE_CONSENT_EVENT,
  type CookieConsentValue,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookie-consent";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(COOKIE_CONSENT_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return readCookieConsent();
}

function getServerSnapshot(): CookieConsentValue | null {
  // Hide banner during SSR; client snapshot decides after hydrate.
  return "rejected";
}

export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (consent !== null) return null;

  function choose(value: CookieConsentValue) {
    writeCookieConsent(value);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--bg)]/95 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 text-sm leading-relaxed text-[var(--fg-muted)]">
          <p className="font-semibold text-[var(--fg)]">Cookies & Statistik</p>
          <p className="mt-1">
            Wir nutzen optionale Reichweitenmessung (anonyme Seitenaufrufe und
            Vercel Analytics) nur mit deiner Einwilligung. Technisch notwendige
            Speicherung für Login und App-Betrieb bleibt davon unberührt. Mehr in
            der{" "}
            <Link
              href="/datenschutz"
              className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="action-btn rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="action-btn btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}

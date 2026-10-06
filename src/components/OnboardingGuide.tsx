"use client";

import { useEffect, useState } from "react";
import {
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from "@/lib/onboarding-dismiss";

export type OnboardingState = {
  connected: boolean;
  needsReconnect: boolean;
  remoteReady: boolean;
  isPro: boolean;
  demoMode: boolean;
};

type StepId = "connect" | "remote" | "pro";

type Step = {
  id: StepId;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
};

function buildSteps(state: OnboardingState): Step[] {
  const needsConnect =
    state.demoMode || !state.connected || state.needsReconnect;

  return [
    {
      id: "connect",
      title: state.needsReconnect
        ? "MyPeugeot erneut verbinden"
        : "MyPeugeot verbinden",
      body: state.needsReconnect
        ? "Die Anmeldung ist abgelaufen. Bitte einmal neu verbinden, dann kommen wieder Live-Daten."
        : "Verbinde dein MyPeugeot-Konto — danach siehst du dein echtes Fahrzeug.",
      href: "/control/settings#peugeot",
      cta: state.needsReconnect ? "Neu verbinden" : "Jetzt verbinden",
      done: !needsConnect,
    },
    {
      id: "remote",
      title: "Fernbedienung freischalten",
      body: "Einmal SMS-Code und PIN hinterlegen (e-Remote / Connect). Danach gehen Vorklima und Schloss.",
      href: "/control/settings#remote",
      cta: "PIN einrichten",
      done: !needsConnect && state.remoteReady,
    },
    {
      id: "pro",
      title: "Pro für die Fernbedienung",
      body: "Mit Pro startest du Vorklima, Schloss, Finden und das 80%-Ladelimit — jederzeit kündbar.",
      href: "/control/settings#pro",
      cta: "Pro ansehen",
      done: state.isPro,
    },
  ];
}

/** Friendly setup guide until MyPeugeot, remote PIN and (optionally) Pro are ready. */
export function OnboardingGuide({ state }: { state: OnboardingState }) {
  const steps = buildSteps(state);
  const next = steps.find((step) => !step.done) ?? null;
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(readOnboardingDismissed());
    setReady(true);
  }, []);

  if (!next) return null;
  // Avoid flash of guide before sessionStorage is read.
  if (!ready || dismissed) return null;

  const dismiss = () => {
    writeOnboardingDismissed();
    setDismissed(true);
  };

  return (
    <section
      className="rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-4 lg:px-5 lg:py-5"
      aria-labelledby="onboarding-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-bright)]">
            Einrichtung
          </p>
          <h2
            id="onboarding-title"
            className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold"
          >
            {next.title}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{next.body}</p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const active = step.id === next.id;
          const labelClass = step.done
            ? "text-[var(--fg-muted)] line-through decoration-[var(--line)]"
            : active
              ? "font-semibold text-[var(--fg)]"
              : "text-[var(--fg-muted)]";
          const rowClass = `flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition ${
            active ? "bg-[var(--accent-bright)]/10" : ""
          } ${!step.done ? "hover:bg-white/[0.04]" : ""}`;

          const inner = (
            <>
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.done
                    ? "bg-[var(--accent-bright)] text-[#031016]"
                    : active
                      ? "border border-[var(--accent-bright)] text-[var(--accent-bright)]"
                      : "border border-[var(--line)] text-[var(--fg-muted)]"
                }`}
                aria-hidden
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className={labelClass}>{step.title}</span>
            </>
          );

          return (
            <li key={step.id}>
              {step.done ? (
                <div className={rowClass}>{inner}</div>
              ) : (
                <a href={step.href} className={rowClass}>
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* Native <a>: Next Link + hash can fail to navigate on iOS/PWA. */}
        <a
          href={next.href}
          className="action-btn btn-primary inline-flex rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          {next.cta}
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-[var(--fg-muted)] underline-offset-2 hover:text-[var(--fg)] hover:underline"
        >
          Später
        </button>
        {next.id === "pro" ? (
          <p className="w-full text-xs text-[var(--fg-muted)] sm:w-auto">
            Free bleibt — Status und Ladekurve siehst du weiter.
          </p>
        ) : null}
      </div>
    </section>
  );
}

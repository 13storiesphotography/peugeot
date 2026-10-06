"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { clearOnboardingDismiss } from "@/lib/onboarding-dismiss";

/** Abmelden — clears session-scoped onboarding dismiss so Einrichtung returns next login. */
export function SignOutButton({
  className,
  children = "Abmelden",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={async () => {
        clearOnboardingDismiss();
        await signOut();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}

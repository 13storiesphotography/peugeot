/** Session-scoped dismiss for the Einrichtung guide. Cleared on logout / new tab. */
export const ONBOARDING_DISMISS_KEY = "pc_onboarding_dismiss";
/** Legacy key from Pro-only dismiss — cleared together on logout. */
export const ONBOARDING_PRO_DISMISS_KEY = "pc_onboarding_pro_dismiss";

export function readOnboardingDismissed(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeOnboardingDismissed(): void {
  try {
    sessionStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearOnboardingDismiss(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_DISMISS_KEY);
    sessionStorage.removeItem(ONBOARDING_PRO_DISMISS_KEY);
  } catch {
    // ignore
  }
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { confirmCheckoutSession, type CheckoutState } from "@/app/actions/billing";
import { ControlPageShell } from "@/components/ControlPageShell";
import { ProCardSkeleton } from "@/components/ControlSkeletons";
import { SignOutButton } from "@/components/SignOutButton";
import { PeugeotConnectForm } from "@/components/PeugeotConnectForm";
import { ProUpgradeCard } from "@/components/ProUpgradeCard";
import { RemotePinForm } from "@/components/RemotePinForm";
import { SettingsForm } from "@/components/SettingsForm";
import { SyncIntervalForm } from "@/components/SyncIntervalForm";
import { isAdminEmail } from "@/lib/auth/admin";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import type { Entitlement } from "@/lib/billing/entitlement";
import { isStripeConfigured, isStripeTestMode, stripeConfigError } from "@/lib/billing/stripe";
import { getSubscriptionSnapshot } from "@/lib/billing/subscription";
import { getSettingsBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
/** Password auto-login runs headless Chromium — needs a long function window. */
export const maxDuration = 60;

async function ProBillingSection({
  entitlement,
  userId,
  email,
  checkoutId,
  checkoutCanceled,
}: {
  entitlement: Entitlement;
  userId: string;
  email: string | null;
  checkoutId?: string;
  checkoutCanceled: boolean;
}) {
  const [checkoutNotice, subscription] = await Promise.all([
    checkoutId
      ? confirmCheckoutSession(checkoutId)
      : Promise.resolve(
          checkoutCanceled ? ({ error: "Zahlung abgebrochen." } as CheckoutState) : undefined,
        ),
    getSubscriptionSnapshot(userId, email),
  ]);

  return (
    <ProUpgradeCard
      entitlement={entitlement}
      subscription={subscription}
      stripeReady={isStripeConfigured()}
      stripeTestMode={isStripeTestMode()}
      stripeSetupError={stripeConfigError() ?? undefined}
      notice={checkoutNotice}
    />
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await assertOwnerSession();
  if (!session) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const oauthFlag = Array.isArray(params.peugeot_oauth)
    ? params.peugeot_oauth[0]
    : params.peugeot_oauth;
  const handoff = oauthFlag === "1" || oauthFlag === "true";
  const handoffError = oauthFlag === "error";
  const rawCode = handoff ? params.code : undefined;
  const rawCountry = handoff || handoffError ? params.country : undefined;
  const rawMsg = handoffError ? params.msg : undefined;
  const initialOAuthCode = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const initialOAuthCountry = Array.isArray(rawCountry)
    ? rawCountry[0]
    : rawCountry;
  const initialOAuthError = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
  const checkoutId = Array.isArray(params.pro_session)
    ? params.pro_session[0]
    : params.pro_session;
  const checkoutCanceled =
    params.pro === "cancel" ||
    (Array.isArray(params.pro) && params.pro[0] === "cancel");

  // Fast path: Supabase only — page paints before Stripe billing details.
  const bundle = await getSettingsBundle(session.supabase, session.userId);
  const mfa = session.mfa;
  const { connection, vehicle, entitlement } = bundle;

  return (
    <ControlPageShell section="settings">
        <header className="animate-rise flex items-center justify-between gap-3">
          <Link
            href="/control"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)] lg:hidden"
            aria-label="Zurück zur Steuerung"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="min-w-0 flex-1 text-center lg:text-left">
            <p className="eyebrow">Peugeot Control</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight lg:text-3xl">
              Einstellungen
            </h1>
          </div>
          <SignOutButton className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--fg-muted)]" />
        </header>

        <p className="animate-rise-delay-1 mt-3 truncate text-center text-sm text-[var(--fg-muted)] lg:text-left">
          {session.email}
        </p>

        <Link
          href={mfa.status !== "ok" ? "/control/account#mfa" : "/control/account"}
          className="animate-rise-delay-1 mt-4 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm font-semibold"
        >
          <span className="min-w-0">
            <span className="block">Konto · Passwort & MFA</span>
            {mfa.status !== "ok" ? (
              <span className="mt-0.5 block text-xs font-normal text-[var(--fg-muted)]">
                {mfa.status === "enroll_optional"
                  ? `Zwei-Faktor optional · noch ${mfa.daysLeft} Tag${mfa.daysLeft === 1 ? "" : "e"}`
                  : "Zwei-Faktor einrichten"}
              </span>
            ) : null}
          </span>
          <span className="text-[var(--fg-muted)]" aria-hidden>
            →
          </span>
        </Link>

        {isAdminEmail(session.email) ? (
          <Link
            href="/control/stats"
            className="animate-rise-delay-1 mt-3 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm font-semibold"
          >
            <span>Traffic & Stats</span>
            <span className="text-[var(--fg-muted)]" aria-hidden>
              →
            </span>
          </Link>
        ) : null}

        <div className="mt-6 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
          <div className="lg:col-span-2">
            <Suspense fallback={<ProCardSkeleton />}>
              <ProBillingSection
                entitlement={entitlement}
                userId={session.userId}
                email={session.email}
                checkoutId={checkoutId}
                checkoutCanceled={checkoutCanceled}
              />
            </Suspense>
          </div>

          <section
            id="peugeot"
            className="animate-rise-delay-2 ui-surface scroll-mt-24 p-4 sm:p-5"
          >
            <PeugeotConnectForm
              connection={connection}
              compact
              initialOAuthCode={initialOAuthCode ?? null}
              initialOAuthCountry={initialOAuthCountry ?? null}
              initialOAuthError={initialOAuthError ?? null}
            />
          </section>

          <section
            id="remote"
            className="animate-rise-delay-2 ui-surface scroll-mt-24 p-4 sm:p-5"
          >
            <RemotePinForm
              ready={connection.remoteReady}
              mypeugeotEmail={connection.mypeugeotEmail}
            />
          </section>

          <section className="animate-rise-delay-3 ui-surface p-4 sm:p-5">
            <SyncIntervalForm syncIntervalSec={connection.syncIntervalSec} />
          </section>

          <section className="animate-rise-delay-3">
            <SettingsForm vehicle={vehicle} />
          </section>
        </div>

        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-2 text-center text-xs text-[var(--fg-muted)] lg:justify-start">
          <Link href="/impressum" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
            Impressum
          </Link>
          <Link href="/datenschutz" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
            Datenschutz
          </Link>
          <Link href="/agb" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
            AGB
          </Link>
          <Link href="/widerruf" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
            Widerruf
          </Link>
        </p>
    </ControlPageShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { confirmCheckoutSession } from "@/app/actions/billing";
import { PeugeotConnectForm } from "@/components/PeugeotConnectForm";
import { ProUpgradeCard } from "@/components/ProUpgradeCard";
import { AccountDeleteCard } from "@/components/AccountDeleteCard";
import { RemotePinForm } from "@/components/RemotePinForm";
import { SettingsForm } from "@/components/SettingsForm";
import { SyncIntervalForm } from "@/components/SyncIntervalForm";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { getSubscriptionSnapshot } from "@/lib/billing/subscription";
import { MFA_GRACE_DAYS } from "@/lib/auth/mfa-policy";
import { getSettingsBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
/** Password auto-login runs headless Chromium — needs a long function window. */
export const maxDuration = 60;

function StatusDot({
  tone,
}: {
  tone: "ok" | "warn" | "off";
}) {
  const color =
    tone === "ok"
      ? "var(--accent-bright)"
      : tone === "warn"
        ? "var(--warn)"
        : "var(--fg-muted)";
  return (
    <span
      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color, boxShadow: `0 0 10px ${color}` }}
      aria-hidden
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
  const checkoutNotice = checkoutId
    ? await confirmCheckoutSession(checkoutId)
    : params.pro === "cancel" ||
        (Array.isArray(params.pro) && params.pro[0] === "cancel")
      ? { error: "Zahlung abgebrochen." }
      : undefined;

  const bundle = await getSettingsBundle(session.supabase, session.userId);
  const subscription = await getSubscriptionSnapshot(
    session.userId,
    session.email,
  );
  const mfa = session.mfa;
  const { connection, vehicle, entitlement } = bundle;

  const mfaTone =
    mfa.status === "ok" ? "ok" : mfa.status === "enroll_optional" ? "warn" : "off";
  const mfaLabel =
    mfa.status === "ok"
      ? "Aktiv"
      : mfa.status === "enroll_optional"
        ? `Optional · noch ${mfa.daysLeft} Tag${mfa.daysLeft === 1 ? "" : "e"}`
        : "Einrichten";

  const peugeotTone = connection.needsReconnect
    ? "warn"
    : connection.connected
      ? "ok"
      : "off";
  const peugeotLabel = connection.needsReconnect
    ? "Neu verbinden"
    : connection.connected
      ? "Verbunden"
      : "Nicht verbunden";

  const remoteTone = connection.remoteReady ? "ok" : "off";
  const remoteLabel = connection.remoteReady ? "Freigeschaltet" : "Nicht eingerichtet";
  const proTone = entitlement.isPro ? "ok" : "off";
  const proLabel = entitlement.isPro ? "Aktiv" : "Free";

  return (
    <main className="min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <header className="animate-rise flex items-center justify-between gap-3">
          <Link
            href="/control"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--fg-muted)]"
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
          <div className="min-w-0 flex-1 text-center">
            <p className="eyebrow">Peugeot Control</p>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Einstellungen
            </h1>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--fg-muted)]"
            >
              Abmelden
            </button>
          </form>
        </header>

        <p className="animate-rise-delay-1 mt-3 truncate text-center text-sm text-[var(--fg-muted)]">
          {session.email}
        </p>

        <section
          className="animate-rise-delay-1 mt-6 ui-surface divide-y divide-[var(--line)] overflow-hidden"
          aria-label="Status"
        >
          <div className="flex items-start gap-3 px-4 py-3.5">
            <StatusDot tone={peugeotTone} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">MyPeugeot</p>
              <p className="text-xs text-[var(--fg-muted)]">{peugeotLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <StatusDot tone={remoteTone} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Fernbedienung</p>
              <p className="text-xs text-[var(--fg-muted)]">{remoteLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <StatusDot tone={mfaTone} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Zwei-Faktor</p>
                  <p className="text-xs text-[var(--fg-muted)]">{mfaLabel}</p>
                </div>
                {mfa.status !== "ok" ? (
                  <Link
                    href="/mfa"
                    className="action-btn btn-primary shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    Einrichten
                  </Link>
                ) : null}
              </div>
              {mfa.status === "enroll_optional" ? (
                <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                  Pflicht nach {MFA_GRACE_DAYS} Tagen.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3.5">
            <StatusDot tone={proTone} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Pro</p>
              <p className="text-xs text-[var(--fg-muted)]">{proLabel}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          <ProUpgradeCard
            entitlement={entitlement}
            subscription={subscription}
            stripeReady={isStripeConfigured()}
            notice={checkoutNotice}
          />

          <section className="animate-rise-delay-2 ui-surface p-4 sm:p-5">
            <PeugeotConnectForm
              connection={connection}
              compact
              initialOAuthCode={initialOAuthCode ?? null}
              initialOAuthCountry={initialOAuthCountry ?? null}
              initialOAuthError={initialOAuthError ?? null}
            />
          </section>

          <section className="animate-rise-delay-2 ui-surface p-4 sm:p-5">
            <RemotePinForm ready={connection.remoteReady} />
          </section>

          <section className="animate-rise-delay-3 ui-surface p-4 sm:p-5">
            <SyncIntervalForm syncIntervalSec={connection.syncIntervalSec} />
          </section>

          <section className="animate-rise-delay-3">
            <SettingsForm vehicle={vehicle} />
          </section>

          <AccountDeleteCard />
        </div>

        <p className="mt-10 pb-2 text-center text-xs text-[var(--fg-muted)]">
          <Link href="/impressum" className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--fg)]">
            Impressum
          </Link>
        </p>
      </div>
    </main>
  );
}

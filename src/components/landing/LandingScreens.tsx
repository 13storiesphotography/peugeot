"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type ScreenId = "overview" | "charge" | "climate";

const tabs: { id: ScreenId; labelKey: string }[] = [
  { id: "overview", labelKey: "landing.screenOverview" },
  { id: "charge", labelKey: "landing.screenCharge" },
  { id: "climate", labelKey: "landing.screenClimate" },
];

function PhoneFrame({
  children,
  active,
}: {
  children: React.ReactNode;
  active: ScreenId;
}) {
  const { t } = useI18n();
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-[var(--accent-bright)]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[#0a1622] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[var(--fg-muted)]">
          <span>9:41</span>
          <span className="h-5 w-16 rounded-full bg-black/40" />
          <span>LTE</span>
        </div>
        {children}
        <div className="flex justify-around border-t border-[var(--line)] bg-[#071018]/90 px-2 py-2.5 text-[10px] font-semibold">
          {tabs.map((tab) => (
            <span
              key={tab.id}
              className={
                tab.id === active
                  ? "text-[var(--accent-bright)]"
                  : "text-[var(--fg-muted)]"
              }
            >
              {t(tab.labelKey)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewScreen() {
  const { t } = useI18n();
  return (
    <>
      <div className="px-4 pb-3 pt-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          E-3008
        </p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold">
              68<span className="text-lg text-[var(--fg-muted)]">%</span>
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">{t("landing.mockRange")}</p>
          </div>
          <p className="text-[10px] text-[var(--fg-muted)]">
            {t("landing.mockLockedCharging")}
          </p>
        </div>
        <div className="mt-3 h-16 rounded-xl bg-gradient-to-r from-[#1f6f5f]/40 to-[#5fe3c0]/20" />
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/25 p-3">
        <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
          {t("landing.mockQuick")}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[t("landing.mockPrecond"), t("landing.mockUnlock"), t("landing.mockFind")].map(
            (label) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--line)] bg-[#0d1b28] px-1 py-2 text-center text-[9px] font-semibold"
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--accent-bright)]/30 bg-[var(--accent-bright)]/10 px-3 py-2">
        <p className="text-[11px] font-semibold text-[var(--accent-bright)]">
          {t("landing.mockCharging")}
        </p>
        <p className="text-[10px] text-[var(--fg-muted)]">{t("landing.mockWallbox")}</p>
      </div>
    </>
  );
}

function ChargeScreen() {
  const { t } = useI18n();
  return (
    <>
      <div className="px-4 pb-2 pt-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          {t("landing.mockCharge")}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
          68%
        </p>
        <p className="text-[11px] text-[var(--fg-muted)]">{t("landing.mockTarget")}</p>
      </div>
      <div className="mx-4 mb-3 flex gap-2">
        <div className="flex-1 rounded-lg border border-[var(--accent-bright)] bg-[var(--accent-bright)]/15 px-2 py-2 text-center text-[9px] font-semibold text-[var(--accent-bright)]">
          {t("landing.mockLimit")}
        </div>
        <div className="flex-1 rounded-lg border border-[var(--line)] px-2 py-2 text-center text-[9px] text-[var(--fg-muted)]">
          100%
        </div>
      </div>
      <div className="mx-4 mb-2 h-20 rounded-xl border border-[var(--line)] bg-black/20 p-2">
        <p className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)]">
          {t("landing.mockCurve")}
        </p>
        <svg viewBox="0 0 200 40" className="mt-1 h-10 w-full">
          <polyline
            fill="none"
            stroke="var(--accent-bright)"
            strokeWidth="2"
            points="0,35 40,28 80,18 120,14 160,12 200,10"
          />
        </svg>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg border border-[var(--line)] p-2">
          <p className="text-[var(--fg-muted)]">{t("landing.mockPower")}</p>
          <p className="font-semibold">7,4 kW</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] p-2">
          <p className="text-[var(--fg-muted)]">{t("landing.mockEta")}</p>
          <p className="font-semibold">22:15</p>
        </div>
      </div>
    </>
  );
}

function ClimateScreen() {
  const { t } = useI18n();
  return (
    <>
      <div className="px-4 pb-2 pt-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-bright)]">
          {t("landing.screenClimate")}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold">
          {t("landing.mockPrecond")}
        </p>
        <p className="text-[11px] text-[var(--fg-muted)]">{t("landing.mockCabin")}</p>
      </div>
      <div className="mx-4 mb-3 rounded-xl border border-[var(--line)] bg-black/25 p-4 text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full border-2 border-[var(--accent-bright)]/50 bg-[var(--accent-bright)]/10" />
        <p className="text-[11px] font-semibold">{t("landing.mockStartClimate")}</p>
        <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
          {t("landing.mockStartClimateHint")}
        </p>
      </div>
      <div className="mx-4 mb-4 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-3 py-2">
        <p className="text-[10px] font-semibold text-[var(--warn)]">
          {t("landing.mockClimateOn")}
        </p>
        <p className="text-[9px] text-[var(--fg-muted)]">{t("landing.mockClimateLeft")}</p>
      </div>
    </>
  );
}

const screens: Record<ScreenId, () => React.ReactNode> = {
  overview: OverviewScreen,
  charge: ChargeScreen,
  climate: ClimateScreen,
};

export function LandingScreens() {
  const { t } = useI18n();
  const [active, setActive] = useState<ScreenId>("overview");
  const Screen = screens[active];

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === tab.id
                ? "bg-[var(--accent-bright)] text-[#031016]"
                : "border border-[var(--line)] text-[var(--fg-muted)] hover:border-[var(--accent-bright)]/40"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <PhoneFrame active={active}>
        <Screen />
      </PhoneFrame>
    </div>
  );
}
